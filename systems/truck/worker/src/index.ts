import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';

type Bindings = {
  MY_VAR: string;
  DOCS_BUCKET: R2Bucket;
  CAD_DOCS_BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();
const api = new Hono<{ Bindings: Bindings }>();
api.use('*', cors());

api.get('/health', (c) => c.json({ status: 'ok', service: 'truck-cad' }));

// =========================================================================
// CAD Remote Control API — SSE push + command queue
// =========================================================================
// Flow:
//   1. Browser connects to GET /api/cad/events (persistent SSE)
//   2. External caller POSTs /api/cad/exec → command queued + pushed via SSE
//   3. Browser executes on SceneController → POSTs /api/cad/result/:id
//   4. External caller GETs /api/cad/result/:id

const CadCommandType = z.enum([
  'add_cube', 'add_sphere', 'add_cylinder', 'add_torus',
  'translate', 'rotate',
  'boolean_union', 'boolean_subtract', 'boolean_intersect',
  'delete', 'clear', 'export_scene', 'import_scene',
  'select_at', 'deselect',
  'get_object_style', 'set_style', 'set_color',
  'get_state', 'pick_mesh_stats',
]);

const CadExecRequest = z.object({
  type: CadCommandType,
  params: z.record(z.string(), z.any()).optional(),
});

type CadExecInput = z.infer<typeof CadExecRequest>;

interface QueuedCommand {
  id: string;
  command: CadExecInput;
  status: 'pending' | 'running' | 'done' | 'error';
  result?: unknown;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

const commandQueue = new Map<string, QueuedCommand>();
let sceneState: Record<string, unknown> = {};
let sceneStateAt = 0;
// Version-based signal broadcast: each SSE connection tracks the last version
// it sent, so ALL connections see every update (not just the first to poll).
let latestSignals: Record<string, unknown> | null = null;
let signalVersion = 0;

let sseClientCount = 0;

function gcQueue() {
  const cutoff = Date.now() - 60_000;
  for (const [id, cmd] of commandQueue) {
    if (cmd.createdAt < cutoff) commandQueue.delete(id);
  }
}

// SSE endpoint — browser connects here for command push.
// Uses polling-within-SSE pattern (CF Workers can't broadcast across requests).
api.get('/cad/events', (c) => {
  return streamSSE(c, async (stream) => {
    let isOpen = true;
    stream.onAbort(() => { isOpen = false; });
    sseClientCount++;

    // Per-connection tracking
    const sentCommands = new Set<string>();
    let lastSentSignalVersion = signalVersion;

    // Initial Datastar signals
    await stream.writeSSE({
      event: 'datastar-patch-signals',
      data: `signals ${JSON.stringify({ cadConnected: true, cadObjects: 0 })}`,
    });

    // Poll command queue every 100ms for new pending/running commands
    let heartbeatCounter = 0;
    while (isOpen) {
      await stream.sleep(100);
      if (!isOpen) break;

      // Check for new commands to deliver
      for (const [id, cmd] of commandQueue) {
        if (sentCommands.has(id)) continue;
        if (cmd.status === 'pending' || cmd.status === 'running') {
          sentCommands.add(id);
          cmd.status = 'running';
          try {
            await stream.writeSSE({
              event: 'cad-command',
              data: JSON.stringify({ id: cmd.id, command: cmd.command }),
            });
          } catch { isOpen = false; break; }
        }
      }

      // Broadcast Datastar signals when version advances.
      // Each connection tracks its own lastSentSignalVersion so ALL clients
      // see every update (not just the first to poll).
      if (latestSignals && lastSentSignalVersion < signalVersion) {
        lastSentSignalVersion = signalVersion;
        try {
          await stream.writeSSE({
            event: 'datastar-patch-signals',
            data: `signals ${JSON.stringify(latestSignals)}`,
          });
        } catch { isOpen = false; break; }
      }

      // Heartbeat every ~25s (250 * 100ms)
      heartbeatCounter++;
      if (heartbeatCounter >= 250) {
        heartbeatCounter = 0;
        try { await stream.write(': keepalive\n\n'); } catch { break; }
      }
    }
    sseClientCount--;
  }) as any;
});

// Queue command — SSE clients will pick it up on next poll cycle (~100ms)
api.post('/cad/exec', async (c) => {
  try {
    const json = await c.req.json();
    const command = CadExecRequest.parse(json);
    gcQueue();
    const id = crypto.randomUUID();
    const cmd: QueuedCommand = { id, command, status: 'pending', createdAt: Date.now() };
    commandQueue.set(id, cmd);
    return c.json({ id, status: sseClientCount > 0 ? 'queued' : 'no_clients', sseClients: sseClientCount });
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: 'Invalid command', details: error.issues }, 400);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Exec + wait — queue command, poll for result (convenience for scripts/CLI)
api.post('/cad/exec-wait', async (c) => {
  try {
    const json = await c.req.json();
    const command = CadExecRequest.parse(json);
    gcQueue();
    const id = crypto.randomUUID();
    const cmd: QueuedCommand = { id, command, status: 'pending', createdAt: Date.now() };
    commandQueue.set(id, cmd);

    // Poll for result — max 10s
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 100));
      if (cmd.status === 'done' || cmd.status === 'error') {
        return c.json({ id, status: cmd.status, result: cmd.result, error: cmd.error });
      }
    }
    return c.json({ id, status: 'timeout', error: 'Browser did not respond within 10s' }, 504);
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: 'Invalid command', details: error.issues }, 400);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Fallback polling
api.get('/cad/pending', (c) => {
  const pending: QueuedCommand[] = [];
  for (const cmd of commandQueue.values()) {
    if (cmd.status === 'pending') { cmd.status = 'running'; pending.push(cmd); }
  }
  return c.json({ commands: pending });
});

// Post result
api.post('/cad/result/:id', async (c) => {
  const cmd = commandQueue.get(c.req.param('id'));
  if (!cmd) return c.json({ error: 'Not found' }, 404);
  try {
    const body = await c.req.json();
    cmd.status = body.error ? 'error' : 'done';
    cmd.result = body.result;
    cmd.error = body.error;
    cmd.completedAt = Date.now();
    return c.json({ status: 'ok' });
  } catch { return c.json({ error: 'Invalid body' }, 400); }
});

// Get result
api.get('/cad/result/:id', (c) => {
  const cmd = commandQueue.get(c.req.param('id'));
  if (!cmd) return c.json({ error: 'Not found' }, 404);
  return c.json({ id: cmd.id, status: cmd.status, result: cmd.result, error: cmd.error });
});

// State
api.post('/cad/state', async (c) => {
  try {
    const body = await c.req.json() as Record<string, unknown>;
    const shouldBroadcast = !!body.broadcast;
    delete body.broadcast;
    sceneState = body;
    sceneStateAt = Date.now();
    // Only broadcast via SSE when explicitly requested (cadCommand actions).
    // Periodic reportState() from api-bridge omits the flag to avoid
    // overwriting signals from the tab that actually changed the scene.
    if (shouldBroadcast) {
      latestSignals = {
        cadConnected: true,
        cadObjects: body.objectCount ?? 0,
        ...body,
      };
      signalVersion++;
    }
    return c.json({ status: 'ok' });
  } catch { return c.json({ error: 'Invalid' }, 400); }
});
api.get('/cad/state', (c) => {
  if (!sceneStateAt) return c.json({ error: 'No browser connected' }, 503);
  return c.json({ state: sceneState, updatedAt: sceneStateAt, sseClients: sseClientCount });
});

// Debug
api.get('/cad/queue', (c) => {
  const cmds: QueuedCommand[] = [];
  for (const cmd of commandQueue.values()) cmds.push(cmd);
  return c.json({ commands: cmds.sort((a, b) => b.createdAt - a.createdAt), sseClients: sseClientCount });
});

// Schema
api.get('/cad/schema', (c) => c.json({
  commands: CadCommandType.options,
  params: {
    add_cube: { size: 'number (default 1.0)' }, add_sphere: { radius: 'number (default 1.0)' },
    add_cylinder: { radius: 'number (default 0.5)', height: 'number (default 1.0)' },
    add_torus: { majorRadius: 'number (default 1.0)', minorRadius: 'number (default 0.3)' },
    translate: { objectId: 'UUID', dx: 'number', dy: 'number', dz: 'number' },
    rotate: { objectId: 'UUID', axisX: 'number', axisY: 'number', axisZ: 'number', angleDeg: 'number' },
    boolean_union: { idA: 'UUID', idB: 'UUID' }, boolean_subtract: { idA: 'UUID', idB: 'UUID' },
    boolean_intersect: { idA: 'UUID', idB: 'UUID' }, delete: { objectId: 'UUID' }, clear: {},
    select_at: { ndcX: '[-1,1]', ndcY: '[-1,1]' }, deselect: {},
    get_object_style: { objectId: 'UUID' }, set_style: { objectId: 'UUID', style: 'ObjectStyle' },
    set_color: { objectId: 'UUID', r: '[0,1]', g: '[0,1]', b: '[0,1]', a: '[0,1]' },
    export_scene: {}, import_scene: { json: 'string' }, get_state: {}, pick_mesh_stats: {},
  },
}));

// OpenAPI + Scalar
api.get('/openapi.json', (c) => {
  const base = new URL(c.req.url).origin;
  return c.json({
    openapi: '3.1.0',
    info: { title: 'Truck CAD API', version: '1.0.0', description: '3D CAD control via SSE + WASM.\n\n1. Open app in browser\n2. POST /api/cad/exec\n3. GET /api/cad/result/:id\n4. GET /api/cad/state' },
    servers: [{ url: base }],
    tags: [{ name: 'Commands' }, { name: 'State' }, { name: 'SSE' }],
    paths: {
      '/api/cad/exec': { post: { tags: ['Commands'], summary: 'Queue CAD command (async)', description: 'Queues command for SSE delivery to browser. Returns immediately with command ID. Poll /api/cad/result/{id} for result.', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CadCommand' }, examples: {
        addCube: { value: { type: 'add_cube', params: { size: 2 } } }, translate: { value: { type: 'translate', params: { objectId: '...', dx: 1, dy: 0, dz: 0 } } },
        setColor: { value: { type: 'set_color', params: { objectId: '...', r: 1, g: 0.2, b: 0.1, a: 1 } } }, getState: { value: { type: 'get_state' } },
      } } } }, responses: { '200': { description: 'Queued' } } } },
      '/api/cad/exec-wait': { post: { tags: ['Commands'], summary: 'Execute CAD command (sync)', description: 'Queues command and waits up to 10s for browser to execute it. Returns the result directly. Requires a browser with the app open.', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CadCommand' } } } }, responses: { '200': { description: 'Result' }, '504': { description: 'Timeout (no browser connected)' } } } },
      '/api/cad/result/{id}': { get: { tags: ['State'], summary: 'Command result', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Result' } } } },
      '/api/cad/state': { get: { tags: ['State'], summary: 'Scene state', responses: { '200': { description: 'State' }, '503': { description: 'No browser' } } } },
      '/api/cad/events': { get: { tags: ['SSE'], summary: 'SSE stream', responses: { '200': { description: 'Stream' } } } },
      '/api/health': { get: { tags: ['State'], summary: 'Health', responses: { '200': { description: 'OK' } } } },
    },
    components: { schemas: { CadCommand: { type: 'object', required: ['type'], properties: { type: { type: 'string', enum: CadCommandType.options }, params: { type: 'object', additionalProperties: true } } } } },
  });
});

app.get('/api-docs', (c) => c.html(`<!DOCTYPE html>
<html><head><title>Truck CAD API</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body><script id="api-reference" data-url="/api/openapi.json" data-configuration='{"theme":"purple"}'></script>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script></body></html>`));

// =========================================================================
// Legacy + Automerge
// =========================================================================
api.post('/docs', async (c) => { try { const b = await c.req.json(); const id = b.docId || crypto.randomUUID(); await c.env.CAD_DOCS_BUCKET.put(`docs/${id}`, b.data ? Uint8Array.from(atob(b.data), ch => ch.charCodeAt(0)) : new Uint8Array(0), { customMetadata: { name: b.name || 'Untitled', createdAt: new Date().toISOString(), version: '1' } }); return c.json({ status: 'ok', docId: id }); } catch { return c.json({ error: 'Failed' }, 500); } });
api.get('/docs/:docId', async (c) => { const o = await c.env.CAD_DOCS_BUCKET.get(`docs/${c.req.param('docId')}`); if (!o) return c.json({ error: 'Not found' }, 404); return c.json({ docId: c.req.param('docId'), data: btoa(String.fromCharCode(...new Uint8Array(await o.arrayBuffer()))), metadata: o.customMetadata }); });
api.post('/docs/:docId/sync', async (c) => { try { const b = await c.req.json(); if (!b.data) return c.json({ error: 'Missing data' }, 400); const e = await c.env.CAD_DOCS_BUCKET.get(`docs/${c.req.param('docId')}`); let eb = new Uint8Array(0), m: Record<string,string> = {}; if (e) { eb = new Uint8Array(await e.arrayBuffer()); m = e.customMetadata || {}; } const ib = Uint8Array.from(atob(b.data), ch => ch.charCodeAt(0)); const v = parseInt(m.version||'0')+1; if (ib.length >= eb.length) await c.env.CAD_DOCS_BUCKET.put(`docs/${c.req.param('docId')}`, ib, { customMetadata: { ...m, version: String(v), lastSync: new Date().toISOString() } }); return c.json({ status: 'ok', data: btoa(String.fromCharCode(...(ib.length >= eb.length ? ib : eb))), version: v }); } catch { return c.json({ error: 'Failed' }, 500); } });
api.get('/docs/:docId/events', async (c) => { const o = await c.env.CAD_DOCS_BUCKET.head(`docs/${c.req.param('docId')}`); return new Response(new TextEncoder().encode(`data: ${JSON.stringify({ docId: c.req.param('docId'), version: o?.customMetadata?.version||'0' })}\n\n`), { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } }); });
api.get('/docs', async (c) => { const l = await c.env.CAD_DOCS_BUCKET.list({ prefix: 'docs/' }); return c.json({ docs: l.objects.map(o => ({ docId: o.key.replace('docs/',''), size: o.size, uploaded: o.uploaded.toISOString(), metadata: o.customMetadata })) }); });
api.delete('/docs/:docId', async (c) => { await c.env.CAD_DOCS_BUCKET.delete(`docs/${c.req.param('docId')}`); return c.json({ status: 'ok' }); });

app.route('/api', api);

const MIME: Record<string,string> = { '.webm': 'video/webm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4' };
app.get('/docs/*', async (c, next) => { const k = c.req.path.slice(1); const e = k.slice(k.lastIndexOf('.')); if (!MIME[e]) return next(); const o = await c.env.DOCS_BUCKET.get(k); if (!o) return c.notFound(); return new Response(o.body, { headers: { 'content-type': MIME[e], 'cache-control': 'public, max-age=86400' } }); });

export default app;
