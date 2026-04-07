import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createWorkspaceStateBackend } from '@cloudflare/shell';
import type { AppEnv } from '../types';
import {
  getZanzo, getWorkspace, getPermissionedBackend,
  stripPrefix, forbid, getActorFromContext,
} from '../zano-state';

// ── Shared schemas ────────────────────────────────────────────────────────────

const ErrorSchema = z.object({ error: z.string() }).openapi('Error');

const TupleRow = z.object({
  subject:  z.string(),
  relation: z.string(),
  object:   z.string(),
}).openapi('TupleRow');

const TupleBody = z.object({
  subject:  z.string().min(1),
  relation: z.string().min(1),
  type:     z.string().min(1),
  id:       z.string().min(1),
}).openapi('TupleBody');

const CheckQuery = z.object({
  action: z.string().min(1),
  type:   z.string().min(1),
  id:     z.string().min(1),
  actor:  z.string().optional(),
}).openapi('CheckQuery');

const CheckResult = z.object({
  allowed: z.boolean(),
  actor:   z.string(),
  action:  z.string(),
  type:    z.string(),
  id:      z.string(),
}).openapi('CheckResult');

const SnapshotResult = z.object({
  actor:    z.string(),
  snapshot: z.record(z.string(), z.array(z.string())),
}).openapi('SnapshotResult');

const HealthResult = z.object({
  ok:        z.boolean(),
  service:   z.string(),
  subsystem: z.string().optional(),
}).openapi('HealthResult');

const MigrateResult = z.object({
  ok:      z.boolean(),
  message: z.string(),
}).openapi('MigrateResult');

// ── Router ────────────────────────────────────────────────────────────────────

const zano = new OpenAPIHono<AppEnv>();

// ── Health ────────────────────────────────────────────────────────────────────

zano.openapi(createRoute({
  method: 'get', path: '/zano/health',
  tags: ['Zano'],
  responses: {
    200: { description: 'Zanzo subsystem health', content: { 'application/json': { schema: HealthResult } } },
  },
}), (c) => c.json({ ok: true, service: 'auth-worker', subsystem: 'zanzo' }));

// ── Migrate ───────────────────────────────────────────────────────────────────

zano.openapi(createRoute({
  method: 'post', path: '/zano/migrate',
  tags: ['Zano'],
  responses: {
    200: { description: 'Migration result', content: { 'application/json': { schema: MigrateResult } } },
    500: { description: 'Error',            content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  try {
    await c.env.AUTH_DB.batch([
      c.env.AUTH_DB.prepare('CREATE TABLE IF NOT EXISTS zanzo_tuples (subject TEXT NOT NULL, relation TEXT NOT NULL, object TEXT NOT NULL, UNIQUE(subject, relation, object))'),
      c.env.AUTH_DB.prepare('CREATE INDEX IF NOT EXISTS idx_zanzo_subject_relation ON zanzo_tuples (subject, relation)'),
      c.env.AUTH_DB.prepare('CREATE INDEX IF NOT EXISTS idx_zanzo_object_relation  ON zanzo_tuples (object, relation)'),
      c.env.AUTH_DB.prepare('CREATE INDEX IF NOT EXISTS idx_zanzo_subject_object   ON zanzo_tuples (subject, object)'),
    ]);
    return c.json({ ok: true, message: 'zanzo_tuples table ready' }, 200);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ── Check permission ──────────────────────────────────────────────────────────

zano.openapi(createRoute({
  method: 'get', path: '/zano/check',
  tags: ['Zano'],
  request: { query: CheckQuery },
  responses: {
    200: { description: 'Permission check result', content: { 'application/json': { schema: CheckResult } } },
  },
}), async (c) => {
  const { action, type, id } = c.req.valid('query');
  const actor = getActorFromContext(c);
  const allowed = await getZanzo(c.env.AUTH_DB).check(actor, action, type, id);
  return c.json({ allowed, actor, action, type, id });
});

// ── Grant ─────────────────────────────────────────────────────────────────────

zano.openapi(createRoute({
  method: 'put', path: '/zano/grant',
  tags: ['Zano'],
  request: { body: { content: { 'application/json': { schema: TupleBody } } } },
  responses: {
    200: { description: 'Tuple granted', content: { 'application/json': { schema: z.object({ granted: TupleRow }) } } },
  },
  security: [{ Session: [] }],
}), async (c) => {
  const { subject, relation, type, id } = c.req.valid('json');
  await getZanzo(c.env.AUTH_DB).grant(subject, relation, type, id);
  return c.json({ granted: { subject, relation, object: `${type}:${id}` } });
});

// ── Revoke ────────────────────────────────────────────────────────────────────

zano.openapi(createRoute({
  method: 'delete', path: '/zano/revoke',
  tags: ['Zano'],
  request: { body: { content: { 'application/json': { schema: TupleBody } } } },
  responses: {
    200: { description: 'Tuple revoked', content: { 'application/json': { schema: z.object({ revoked: TupleRow, count: z.number() }) } } },
  },
  security: [{ Session: [] }],
}), async (c) => {
  const { subject, relation, type, id } = c.req.valid('json');
  const count = await getZanzo(c.env.AUTH_DB).revoke(subject, relation, type, id);
  return c.json({ revoked: { subject, relation, object: `${type}:${id}` }, count });
});

// ── Snapshot ──────────────────────────────────────────────────────────────────

zano.openapi(createRoute({
  method: 'get', path: '/zano/snapshot',
  tags: ['Zano'],
  responses: {
    200: { description: 'Permission snapshot for current actor', content: { 'application/json': { schema: SnapshotResult } } },
  },
}), async (c) => {
  const actor = getActorFromContext(c);
  const snapshot = await getZanzo(c.env.AUTH_DB).snapshot(actor);
  return c.json({ actor, snapshot });
});

// ── Tuples (debug) ────────────────────────────────────────────────────────────

zano.openapi(createRoute({
  method: 'get', path: '/zano/tuples',
  tags: ['Zano'],
  responses: {
    200: { description: 'All tuples in the database', content: { 'application/json': { schema: z.array(TupleRow) } } },
  },
}), async (c) => {
  const rows = await c.env.AUTH_DB.prepare('SELECT * FROM zanzo_tuples ORDER BY object').all();
  return c.json(rows.results as any);
});

// ── Filesystem debug ──────────────────────────────────────────────────────────

zano.openapi(createRoute({
  method: 'get', path: '/zano/fs',
  tags: ['Zano / Filesystem'],
  responses: {
    200: { description: 'Glob all files (system actor)', content: { 'application/json': { schema: z.array(z.string()) } } },
  },
}), async (c) => {
  const backend = createWorkspaceStateBackend(getWorkspace(c.env.AUTH_DB, 'User:system', c.env.FILES));
  return c.json(await backend.glob('**/*'));
});

// ── Filesystem API — wildcard routes (plain Hono, not OpenAPI) ─────────────────
// These use wildcard paths which OpenAPI doesn't enumerate well.

zano.get('/zano/files/*', async (c) => {
  const actor = getActorFromContext(c);
  const p = stripPrefix('files', c.req.path);
  const content = await getPermissionedBackend(c.env.AUTH_DB, actor, c.env.FILES).readFile(p).catch(forbid);
  return c.text(content);
});

zano.put('/zano/files/*', async (c) => {
  const actor = getActorFromContext(c);
  const p = stripPrefix('files', c.req.path);
  const content = await c.req.text();
  await getPermissionedBackend(c.env.AUTH_DB, actor, c.env.FILES).writeFile(p, content).catch(forbid);
  return c.json({ written: p, bytes: content.length });
});

zano.delete('/zano/files/*', async (c) => {
  const actor = getActorFromContext(c);
  const p = stripPrefix('files', c.req.path);
  await getPermissionedBackend(c.env.AUTH_DB, actor, c.env.FILES).rm(p).catch(forbid);
  return c.json({ deleted: p });
});

zano.post('/zano/append/*', async (c) => {
  const actor = getActorFromContext(c);
  const p = stripPrefix('append', c.req.path);
  const content = await c.req.text();
  await getPermissionedBackend(c.env.AUTH_DB, actor, c.env.FILES).appendFile(p, content).catch(forbid);
  return c.json({ appended: p, bytes: content.length });
});

zano.get('/zano/exists/*', async (c) => {
  const actor = getActorFromContext(c);
  const p = stripPrefix('exists', c.req.path);
  const exists = await getPermissionedBackend(c.env.AUTH_DB, actor, c.env.FILES).exists(p).catch(forbid);
  return c.json({ path: p, exists });
});

zano.get('/zano/stat/*', async (c) => {
  const actor = getActorFromContext(c);
  const p = stripPrefix('stat', c.req.path);
  const s = await getPermissionedBackend(c.env.AUTH_DB, actor, c.env.FILES).stat(p).catch(forbid);
  if (!s) return c.json({ error: 'Not found' }, 404);
  return c.json({ path: p, stat: { type: s.type, size: s.size, mtime: s.mtime } });
});

zano.get('/zano/ls/*', async (c) => {
  const actor = getActorFromContext(c);
  const p = stripPrefix('ls', c.req.path);
  const entries = await getPermissionedBackend(c.env.AUTH_DB, actor, c.env.FILES).readdir(p).catch(forbid);
  return c.json({ path: p, entries });
});

zano.post('/zano/mkdir/*', async (c) => {
  const actor = getActorFromContext(c);
  const p = stripPrefix('mkdir', c.req.path);
  await getPermissionedBackend(c.env.AUTH_DB, actor, c.env.FILES).mkdir(p, { recursive: true }).catch(forbid);
  return c.json({ created: p });
});

zano.delete('/zano/rmdir/*', async (c) => {
  const actor = getActorFromContext(c);
  const p = stripPrefix('rmdir', c.req.path);
  await getPermissionedBackend(c.env.AUTH_DB, actor, c.env.FILES).rm(p, { recursive: true }).catch(forbid);
  return c.json({ deleted: p, recursive: true });
});

zano.get('/zano/glob', async (c) => {
  const actor = getActorFromContext(c);
  const pattern = c.req.query('pattern') ?? '**/*';
  const matches = await getPermissionedBackend(c.env.AUTH_DB, actor, c.env.FILES).glob(pattern).catch(forbid);
  return c.json({ pattern, matches });
});

zano.post('/zano/cp', async (c) => {
  const actor = getActorFromContext(c);
  const { from, to } = await c.req.json<{ from: string; to: string }>();
  await getPermissionedBackend(c.env.AUTH_DB, actor, c.env.FILES).cp(from, to).catch(forbid);
  return c.json({ copied: { from, to } });
});

zano.post('/zano/mv', async (c) => {
  const actor = getActorFromContext(c);
  const { from, to } = await c.req.json<{ from: string; to: string }>();
  await getPermissionedBackend(c.env.AUTH_DB, actor, c.env.FILES).mv(from, to).catch(forbid);
  return c.json({ moved: { from, to } });
});

zano.post('/zano/cpdir', async (c) => {
  const actor = getActorFromContext(c);
  const { from, to } = await c.req.json<{ from: string; to: string }>();
  await getPermissionedBackend(c.env.AUTH_DB, actor, c.env.FILES).copyTree(from, to).catch(forbid);
  return c.json({ copied: { from, to } });
});

zano.post('/zano/mvdir', async (c) => {
  const actor = getActorFromContext(c);
  const { from, to } = await c.req.json<{ from: string; to: string }>();
  await getPermissionedBackend(c.env.AUTH_DB, actor, c.env.FILES).moveTree(from, to).catch(forbid);
  return c.json({ moved: { from, to } });
});

export default zano;
