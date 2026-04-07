// zano-state.ts — shared singletons used by both HTTP routes and the RPC entrypoint.
//
// Kept separate so routes/zano.ts and the WorkerEntrypoint in index.ts can both
// import without circular dependencies.

import { HTTPException } from 'hono/http-exception';
import { Workspace, createWorkspaceStateBackend } from '@cloudflare/shell';
import { zanzoPlugin, PermissionedBackend } from './lib';
import { engine } from './schema';
import type { Bindings } from './types';

// ── Singletons ────────────────────────────────────────────────────────────────

let _zanzo: ReturnType<typeof zanzoPlugin> | null = null;
let _workspace: Workspace | null = null;
let _r2: R2Bucket | undefined;

export function getZanzo(db: D1Database): ReturnType<typeof zanzoPlugin> {
  _zanzo ??= zanzoPlugin({ engine, db });
  return _zanzo;
}

export function getWorkspace(db: D1Database, actor: string, r2?: R2Bucket): Workspace {
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

export function getPermissionedBackend(db: D1Database, actor: string, r2?: R2Bucket): PermissionedBackend {
  const rawBackend = createWorkspaceStateBackend(getWorkspace(db, actor, r2));
  return new PermissionedBackend(rawBackend, actor, (a, action, type, path) =>
    getZanzo(db).check(a, action, type, path),
  );
}

// ── Path helpers ──────────────────────────────────────────────────────────────

export function stripPrefix(prefix: string, reqPath: string): string {
  return '/' + reqPath.replace(new RegExp('^/zano/' + prefix + '/?'), '');
}

export function forbid(e: unknown): never {
  const msg = (e as any)?.message ?? '';
  if (msg.startsWith('Forbidden')) throw new HTTPException(403, { message: msg });
  if (msg.includes('ENOENT') || msg.includes('not found')) throw new HTTPException(404, { message: 'Not found' });
  throw e as Error;
}

// ── Actor resolution ──────────────────────────────────────────────────────────

export function getActorFromContext(c: {
  req: { query(k: string): string | undefined; header(k: string): string | undefined };
  get(key: 'user'): { id: string } | null;
}): string {
  // ?actor= and x-actor override the session (dev/test override — ADR actor resolution order)
  const override = c.req.query('actor') ?? c.req.header('x-actor');
  if (override) return override;
  const user = c.get('user');
  if (user?.id) return `User:${user.id}`;
  return 'User:anonymous';
}
