/**
 * auth-zano-worker — ReBAC permission API + filesystem worker
 *
 * Provides:
 *   @zanzojs/better-auth  — zanzoPlugin: check/grant/revoke/snapshot
 *   @cloudflare/shell     — Workspace (D1 + R2) + PermissionedBackend
 *
 * All routes are prefixed with /zano (router strips nothing — full path forwarded).
 *
 * Permission API:
 *   GET  /zano/check       ?actor=&action=&type=&id=
 *   PUT  /zano/grant       { subject, relation, type, id }
 *   DELETE /zano/revoke    { subject, relation, type, id }
 *   GET  /zano/snapshot    ?actor=
 *
 * Filesystem API (actor passed as ?actor= or x-actor header):
 *   GET/PUT/DELETE /zano/files/*path
 *   POST           /zano/append/*path
 *   GET            /zano/ls/*path
 *   GET            /zano/exists/*path
 *   GET            /zano/stat/*path
 *   POST           /zano/mkdir/*path
 *   DELETE         /zano/rmdir/*path
 *   GET            /zano/glob         ?pattern=
 *   POST           /zano/cp           { from, to }
 *   POST           /zano/mv           { from, to }
 *   POST           /zano/cpdir        { from, to }
 *   POST           /zano/mvdir        { from, to }
 *
 * Debug:
 *   GET /zano/tuples       — list all permission tuples
 *   GET /zano/fs           — glob all files
 *   GET /zano/health       — health check
 *
 * Actor format: "User:alice" | "Agent:claude-mcp" | "Service:ricos"
 * For production: replace getActor() with Better Auth session lookup.
 */

import { WorkerEntrypoint } from 'cloudflare:workers';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Workspace, createWorkspaceStateBackend } from '@cloudflare/shell';
import { zanzoPlugin, PermissionedBackend } from './lib';
import { engine } from './schema';
import type { AuthZanoRPC, FileStat } from './types';

interface Env {
  DB:    D1Database;
  FILES: R2Bucket;
}

// ── zanzoPlugin singleton ─────────────────────────────────────────────────────
// Captured lazily on first request so env.DB is available.

let _zanzo: ReturnType<typeof zanzoPlugin> | null = null;

function getZanzo(db: D1Database): ReturnType<typeof zanzoPlugin> {
  _zanzo ??= zanzoPlugin({ engine, db });
  return _zanzo;
}

// ── Workspace singleton ───────────────────────────────────────────────────────

let _workspace: Workspace | null = null;
let _r2: R2Bucket | undefined;

function getWorkspace(db: D1Database, actor: string, r2?: R2Bucket): Workspace {
  if (r2) _r2 = r2;
  if (!_workspace) {
    _workspace = new Workspace({
      sql: db,
      r2: _r2,
      r2Prefix: 'workspace',
      onChange: (event) => void getZanzo(db).onWorkspaceChange(event, actor),
    });
  }
  return _workspace;
}

function getPermissionedBackend(db: D1Database, actor: string, r2?: R2Bucket): PermissionedBackend {
  const rawBackend = createWorkspaceStateBackend(getWorkspace(db, actor, r2));
  const zanzo = getZanzo(db);
  return new PermissionedBackend(rawBackend, actor, (a, action, type, path) =>
    zanzo.check(a, action, type, path),
  );
}

// ── Hono app ──────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  throw err;
});

function getActor(c: { req: { query(k: string): string | undefined; header(k: string): string | undefined } }): string {
  return c.req.query('actor') ?? c.req.header('x-actor') ?? 'User:anonymous';
}

/** Strip /zano/<prefix>/ from a path to get the resource path. */
function pp(prefix: string, reqPath: string): string {
  return '/' + reqPath.replace(new RegExp('^/zano/' + prefix + '/?'), '');
}

function forbid(e: unknown): never {
  const msg = (e as any)?.message ?? '';
  if (msg.startsWith('Forbidden')) throw new HTTPException(403, { message: msg });
  if (msg.includes('ENOENT') || msg.includes('not found')) throw new HTTPException(404, { message: 'Not found' });
  throw e as Error;
}

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/zano/health', (c) => c.json({ ok: true, service: 'auth-zano-worker' }));

// ── Permission API ────────────────────────────────────────────────────────────

app.get('/zano/snapshot', async (c) => {
  const actor = getActor(c);
  const snap  = await getZanzo(c.env.DB).snapshot(actor);
  return c.json({ actor, snapshot: snap });
});

app.get('/zano/check', async (c) => {
  const actor  = getActor(c);
  const action = c.req.query('action') ?? '';
  const type   = c.req.query('type')   ?? '';
  const id     = c.req.query('id')     ?? '';
  if (!action || !type || !id) return c.json({ error: 'Missing required params: action, type, id' }, 400);
  const allowed = await getZanzo(c.env.DB).check(actor, action, type, id);
  return c.json({ allowed, actor, action, type, id });
});

app.put('/zano/grant', async (c) => {
  const { subject, relation, type, id } = await c.req.json<{ subject: string; relation: string; type: string; id: string }>();
  await getZanzo(c.env.DB).grant(subject, relation, type, id);
  return c.json({ granted: { subject, relation, object: `${type}:${id}` } });
});

app.delete('/zano/revoke', async (c) => {
  const { subject, relation, type, id } = await c.req.json<{ subject: string; relation: string; type: string; id: string }>();
  const count = await getZanzo(c.env.DB).revoke(subject, relation, type, id);
  return c.json({ revoked: { subject, relation, object: `${type}:${id}` }, count });
});

// ── Debug ─────────────────────────────────────────────────────────────────────

app.get('/zano/tuples', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM zanzo_tuples ORDER BY object').all();
  return c.json(rows.results);
});

app.get('/zano/fs', async (c) => {
  const backend = createWorkspaceStateBackend(getWorkspace(c.env.DB, 'User:system', c.env.FILES));
  return c.json(await backend.glob('**/*'));
});

// ── Filesystem API ────────────────────────────────────────────────────────────

app.get('/zano/files/*', async (c) => {
  const p = pp('files', c.req.path);
  const content = await getPermissionedBackend(c.env.DB, getActor(c), c.env.FILES).readFile(p).catch(forbid);
  return c.text(content);
});

app.put('/zano/files/*', async (c) => {
  const p = pp('files', c.req.path);
  const content = await c.req.text();
  await getPermissionedBackend(c.env.DB, getActor(c), c.env.FILES).writeFile(p, content).catch(forbid);
  return c.json({ written: p, bytes: content.length });
});

app.delete('/zano/files/*', async (c) => {
  const p = pp('files', c.req.path);
  await getPermissionedBackend(c.env.DB, getActor(c), c.env.FILES).rm(p).catch(forbid);
  return c.json({ deleted: p });
});

app.post('/zano/append/*', async (c) => {
  const p = pp('append', c.req.path);
  const content = await c.req.text();
  await getPermissionedBackend(c.env.DB, getActor(c), c.env.FILES).appendFile(p, content).catch(forbid);
  return c.json({ appended: p, bytes: content.length });
});

app.get('/zano/exists/*', async (c) => {
  const p = pp('exists', c.req.path);
  const exists = await getPermissionedBackend(c.env.DB, getActor(c), c.env.FILES).exists(p).catch(forbid);
  return c.json({ path: p, exists });
});

app.get('/zano/stat/*', async (c) => {
  const p = pp('stat', c.req.path);
  const s = await getPermissionedBackend(c.env.DB, getActor(c), c.env.FILES).stat(p).catch(forbid);
  if (!s) return c.json({ error: 'Not found' }, 404);
  return c.json({ path: p, stat: { type: s.type, size: s.size, mtime: s.mtime } });
});

app.get('/zano/ls/*', async (c) => {
  const p = pp('ls', c.req.path);
  const entries = await getPermissionedBackend(c.env.DB, getActor(c), c.env.FILES).readdir(p).catch(forbid);
  return c.json({ path: p, entries });
});

app.post('/zano/mkdir/*', async (c) => {
  const p = pp('mkdir', c.req.path);
  await getPermissionedBackend(c.env.DB, getActor(c), c.env.FILES).mkdir(p, { recursive: true }).catch(forbid);
  return c.json({ created: p });
});

app.delete('/zano/rmdir/*', async (c) => {
  const p = pp('rmdir', c.req.path);
  await getPermissionedBackend(c.env.DB, getActor(c), c.env.FILES).rm(p, { recursive: true }).catch(forbid);
  return c.json({ deleted: p, recursive: true });
});

app.get('/zano/glob', async (c) => {
  const pattern = c.req.query('pattern') ?? '**/*';
  const matches = await getPermissionedBackend(c.env.DB, getActor(c), c.env.FILES).glob(pattern).catch(forbid);
  return c.json({ pattern, matches });
});

app.post('/zano/cp', async (c) => {
  const { from, to } = await c.req.json<{ from: string; to: string }>();
  await getPermissionedBackend(c.env.DB, getActor(c), c.env.FILES).cp(from, to).catch(forbid);
  return c.json({ copied: { from, to } });
});

app.post('/zano/mv', async (c) => {
  const { from, to } = await c.req.json<{ from: string; to: string }>();
  await getPermissionedBackend(c.env.DB, getActor(c), c.env.FILES).mv(from, to).catch(forbid);
  return c.json({ moved: { from, to } });
});

app.post('/zano/cpdir', async (c) => {
  const { from, to } = await c.req.json<{ from: string; to: string }>();
  await getPermissionedBackend(c.env.DB, getActor(c), c.env.FILES).copyTree(from, to).catch(forbid);
  return c.json({ copied: { from, to } });
});

app.post('/zano/mvdir', async (c) => {
  const { from, to } = await c.req.json<{ from: string; to: string }>();
  await getPermissionedBackend(c.env.DB, getActor(c), c.env.FILES).moveTree(from, to).catch(forbid);
  return c.json({ moved: { from, to } });
});

// ── RPC entrypoint ────────────────────────────────────────────────────────────

export default class AuthZanoWorker extends WorkerEntrypoint<Env> implements AuthZanoRPC {
  async fetch(request: Request): Promise<Response> {
    return app.fetch(request, this.env, this.ctx);
  }

  private fs(actor: string): PermissionedBackend {
    return getPermissionedBackend(this.env.DB, actor, this.env.FILES);
  }

  async grant(subject: string, relation: string, type: string, id: string): Promise<void> {
    await getZanzo(this.env.DB).grant(subject, relation, type, id);
  }

  async revoke(subject: string, relation: string, type: string, id: string): Promise<number> {
    return getZanzo(this.env.DB).revoke(subject, relation, type, id);
  }

  check(actor: string, action: string, type: string, id: string): Promise<boolean> {
    return getZanzo(this.env.DB).check(actor, action, type, id);
  }

  async readFile(path: string, actor: string): Promise<string | null> {
    try { return await this.fs(actor).readFile(path); }
    catch (e: any) {
      if (e?.message?.includes('not found') || e?.message?.includes('ENOENT')) return null;
      throw e;
    }
  }

  async exists(path: string, actor: string): Promise<boolean>        { return this.fs(actor).exists(path); }
  async stat(path: string, actor: string): Promise<FileStat | null>  {
    const s = await this.fs(actor).stat(path);
    return s ? { type: s.type, size: s.size, mtime: s.mtime } : null;
  }
  async listDir(path: string, actor: string): Promise<string[]>      { return this.fs(actor).readdir(path); }
  async glob(pattern: string, actor: string): Promise<string[]>      { return this.fs(actor).glob(pattern); }

  async writeFile(path: string, content: string, actor: string): Promise<void>  { await this.fs(actor).writeFile(path, content); }
  async appendFile(path: string, content: string, actor: string): Promise<void> { await this.fs(actor).appendFile(path, content); }
  async mkdir(path: string, actor: string): Promise<void>                       { await this.fs(actor).mkdir(path, { recursive: true }); }
  async moveFile(from: string, to: string, actor: string): Promise<void>        { await this.fs(actor).mv(from, to); }
  async copyFile(from: string, to: string, actor: string): Promise<void>        { await this.fs(actor).cp(from, to); }
  async moveDir(from: string, to: string, actor: string): Promise<void>         { await this.fs(actor).moveTree(from, to); }
  async copyDir(from: string, to: string, actor: string): Promise<void>         { await this.fs(actor).copyTree(from, to); }
  async deleteFile(path: string, actor: string): Promise<void>                  { await this.fs(actor).rm(path); }
  async deleteDir(path: string, actor: string): Promise<void>                   { await this.fs(actor).rm(path, { recursive: true }); }
}
