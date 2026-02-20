import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import cadSchema from '../../../../web/cad-schema.json';

type Bindings = {
  MY_VAR: string;
  DOCS_BUCKET: R2Bucket;
  CAD_DOCS_BUCKET: R2Bucket;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();
const api = new OpenAPIHono<{ Bindings: Bindings }>();

api.use('*', cors());
api.use('*', async (_c, next) => { gcModels(); return next(); });

// =========================================================================
// Schemas & Types
// =========================================================================

interface ModuleSchema {
  module: string;
  version: string;
  commands: Record<string, {
    description: string;
    params: { properties?: Record<string, any>; required?: string[]; type?: string };
    returns: string;
    ephemeral: boolean;
    readonly: boolean;
  }>;
}

const CommandQueued = z.object({
  id: z.string().uuid(),
  status: z.enum(['queued', 'no_clients']),
  sseClients: z.number()
}).openapi('CommandQueued');

const CommandResult = z.object({
  id: z.string().uuid(),
  status: z.enum(['done', 'error', 'timeout']),
  result: z.any().optional(),
  error: z.string().optional()
}).openapi('CommandResult');

const ModelIdParam = z.object({
  modelId: z.string().openapi({ param: { name: 'modelId', in: 'path' }, example: 'default' })
});

// =========================================================================
// Schema-driven helpers
// =========================================================================

function zodFromJsonSchema(props: Record<string, any>, required: string[] = []) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [name, prop] of Object.entries(props)) {
    let field: z.ZodTypeAny;
    if (prop.type === 'string') field = z.string();
    else if (prop.type === 'number') field = z.number();
    else if (prop.type === 'boolean') field = z.boolean();
    else if (prop.type === 'array') field = z.array(z.any());
    else if (prop.type === 'object') field = z.record(z.string(), z.any());
    else field = z.any();
    if (prop.description) field = field.describe(prop.description);
    if (prop.default !== undefined) field = (field as any).default(prop.default);
    if (!required.includes(name)) field = field.optional();
    shape[name] = field;
  }
  return shape;
}

// =========================================================================
// Per-model state & Event Bus
// =========================================================================

interface QueuedCommand {
  id: string;
  command: { type: string; params?: Record<string, any> };
  status: 'pending' | 'running' | 'done' | 'error';
  result?: unknown;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

type SSEEvent = 
  | { type: 'cad-command'; data: { id: string; command: any } }
  | { type: 'datastar-patch-signals'; data: any };

interface ModelSession {
  commandQueue: Map<string, QueuedCommand>;
  sceneState: Record<string, unknown>;
  sceneStateAt: number;
  sseClientCount: number;
  lastActivity: number;
  listeners: Set<(ev: SSEEvent) => void>;
}

const models = new Map<string, ModelSession>();
let lastActiveModelId = 'default';

function getModel(modelId: string): ModelSession {
  let m = models.get(modelId);
  if (!m) {
    m = { commandQueue: new Map(), sceneState: {}, sceneStateAt: 0, sseClientCount: 0, lastActivity: Date.now(), listeners: new Set() };
    models.set(modelId, m);
  }
  m.lastActivity = Date.now();
  lastActiveModelId = modelId;
  return m;
}

function broadcast(modelId: string, ev: SSEEvent) {
  try {
    const model = getModel(modelId);
    for (const listener of model.listeners) {
      try { listener(ev); } catch (e) { 
        console.error(`[Worker] Listener error in model ${modelId}:`, e);
        model.listeners.delete(listener); 
      }
    }
  } catch (e) {
    console.error(`[Worker] Broadcast error in model ${modelId}:`, e);
  }
}

function gcQueue(model: ModelSession) {
  const cutoff = Date.now() - 60_000;
  for (const [id, cmd] of model.commandQueue) if (cmd.createdAt < cutoff) model.commandQueue.delete(id);
}

function gcModels() {
  const now = Date.now();
  const cutoff = now - 5 * 60_000;
  for (const [id, m] of models) if (m.sseClientCount === 0 && m.lastActivity < cutoff) models.delete(id);
}

// =========================================================================
// SSE Logic
// =========================================================================

function enqueueCommand(modelId: string, type: string, params: any) {
  const model = getModel(modelId);
  gcQueue(model);
  const id = crypto.randomUUID();
  const cmd: QueuedCommand = { id, command: { type, params }, status: 'pending', createdAt: Date.now() };
  model.commandQueue.set(id, cmd);
  if (model.sseClientCount > 0) {
    broadcast(modelId, { type: 'cad-command', data: { id, command: { type, params } } });
    cmd.status = 'running';
  }
  return { id, status: cmd.status as any, sseClients: model.sseClientCount };
}

async function waitForCommand(modelId: string, type: string, params: any) {
  const { id } = enqueueCommand(modelId, type, params);
  const model = getModel(modelId);
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 100));
    const cmd = model.commandQueue.get(id);
    if (cmd && (cmd.status === 'done' || cmd.status === 'error')) {
      return { id, status: cmd.status, result: cmd.result, error: cmd.error };
    }
  }
  return { id, status: 'timeout' as const, error: 'Browser did not respond within 10s' };
}

const mcpServer = new McpServer({ name: 'truck-cad', version: '1.0.0' });

// =========================================================================
// mountModule()
// =========================================================================

function mountModule(hono: typeof api, prefix: string, schema: ModuleSchema, mcp: typeof mcpServer) {
  // --- CORE ROUTES ---
  
  hono.openapi(createRoute({
    method: 'get', path: `/${prefix}/{modelId}/events`, tags: [prefix], summary: 'SSE stream',
    request: { params: ModelIdParam }, responses: { 200: { description: 'Event stream' } }
  }), (c) => {
    const modelId = c.req.param('modelId');
    return streamSSE(c, async (stream) => {
      const model = getModel(modelId);
      model.sseClientCount++;
      await stream.writeSSE({ event: 'datastar-patch-signals', data: `signals ${JSON.stringify({ cadConnected: true, cadObjects: model.sceneState.objectCount ?? 0 })}` });
      const q: SSEEvent[] = [];
      const l = (ev: SSEEvent) => q.push(ev);
      model.listeners.add(l);
      stream.onAbort(() => { model.listeners.delete(l); model.sseClientCount--; });
      for (const cmd of model.commandQueue.values()) if (cmd.status === 'pending') { cmd.status = 'running'; await stream.writeSSE({ event: 'cad-command', data: JSON.stringify({ id: cmd.id, command: cmd.command }) }); }
      let hb = 0;
      while (true) {
        while (q.length > 0) {
          const ev = q.shift()!;
          await stream.writeSSE({ event: ev.type, data: ev.type === 'datastar-patch-signals' ? `signals ${JSON.stringify(ev.data)}` : JSON.stringify(ev.data) });
        }
        await stream.sleep(100);
        if ((hb += 100) >= 30000) { try { await stream.write(': keepalive\n\n'); } catch { break; } hb = 0; }
      }
    }) as any;
  });

  hono.openapi(createRoute({
    method: 'get', path: `/${prefix}/{modelId}/state`, tags: [prefix], summary: 'Get scene state',
    request: { params: ModelIdParam }, responses: { 200: { description: 'State', content: { 'application/json': { schema: z.any() } } } }
  }), (c) => {
    const m = getModel(c.req.param('modelId'));
    return m.sceneStateAt ? c.json({ state: m.sceneState, updatedAt: m.sceneStateAt, sseClients: m.sseClientCount }) : c.json({ error: 'No browser' }, 503);
  });

  hono.post(`/${prefix}/:modelId/state`, async (c) => {
    const mid = c.req.param('modelId');
    const m = getModel(mid);
    const body = await c.req.json() as any;
    const broadcastFlag = !!body.broadcast;
    delete body.broadcast;
    m.sceneState = body; m.sceneStateAt = Date.now();
    if (broadcastFlag) broadcast(mid, { type: 'datastar-patch-signals', data: body });
    return c.json({ status: 'ok' });
  });

  hono.post(`/${prefix}/:modelId/result/:id`, async (c) => {
    const m = getModel(c.req.param('modelId'));
    const cmd = m.commandQueue.get(c.req.param('id'));
    if (!cmd) return c.json({ error: 'Not found' }, 404);
    const body = await c.req.json() as any;
    cmd.status = body.error ? 'error' : 'done'; cmd.result = body.result; cmd.error = body.error; cmd.completedAt = Date.now();
    return c.json({ status: 'ok' });
  });

  hono.openapi(createRoute({
    method: 'get', path: `/${prefix}/{modelId}/pending`, tags: [prefix], summary: 'Get pending commands',
    request: { params: ModelIdParam }, responses: { 200: { description: 'Commands' } }
  }), (c) => {
    const model = getModel(c.req.param('modelId'));
    return c.json({ commands: Array.from(model.commandQueue.values()).filter(cmd => cmd.status === 'pending') });
  });

  hono.openapi(createRoute({
    method: 'get', path: `/${prefix}/{modelId}/queue`, tags: [prefix], summary: 'Get full queue',
    request: { params: ModelIdParam }, responses: { 200: { description: 'Queue' } }
  }), (c) => {
    const model = getModel(c.req.param('modelId'));
    const cmds = Array.from(model.commandQueue.values()).sort((a, b) => b.createdAt - a.createdAt);
    return c.json({ commands: cmds, sseClients: model.sseClientCount });
  });

  hono.openapi(createRoute({
    method: 'get', path: `/${prefix}/schema`, tags: [prefix], summary: 'Get schema',
    responses: { 200: { description: 'Schema' } }
  }), (c) => c.json(schema));

  // --- DISCRETE MODELING ROUTES ---

  for (const [name, def] of Object.entries(schema.commands)) {
    const props = def.params?.properties || {};
    const required = def.params?.required || [];
    const RequestSchema = z.object(zodFromJsonSchema(props, required)).openapi(`${name}Request`);

    hono.openapi(createRoute({
      method: 'post', path: `/${prefix}/{modelId}/async/${name}`, tags: [`${prefix}-commands`], summary: def.description,
      request: { params: ModelIdParam, body: { content: { 'application/json': { schema: RequestSchema } } } },
      responses: { 200: { description: 'Queued', content: { 'application/json': { schema: CommandQueued } } } }
    }), (c) => c.json(enqueueCommand(c.req.param('modelId'), name, c.req.valid('json'))));

    hono.openapi(createRoute({
      method: 'post', path: `/${prefix}/{modelId}/sync/${name}`, tags: [`${prefix}-commands`], summary: `${def.description} (waits for result)`,
      request: { params: ModelIdParam, body: { content: { 'application/json': { schema: RequestSchema } } } },
      responses: { 200: { description: 'Result', content: { 'application/json': { schema: CommandResult } } }, 504: { description: 'Timeout' } }
    }), async (c) => {
      const res = await waitForCommand(c.req.param('modelId'), name, c.req.valid('json'));
      return c.json(res, res.status === 'timeout' ? 504 : 200);
    });

    if (!def.ephemeral && !def.readonly) {
      const mcpInput = zodFromJsonSchema(props, required);
      (mcpInput as any).modelId = z.string().optional();
      mcp.registerTool(`${prefix}_${name}`, { description: `[${prefix}] ${def.description}`, inputSchema: z.object(mcpInput) }, async (p) => {
        const { modelId, ...rest } = p as any;
        const res = await waitForCommand(modelId || lastActiveModelId || 'default', name, rest);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      });
    }
  }

  // --- POLYMORPHIC QUEUE (LEGACY COMPAT) ---

  const CadCommandType = z.enum(Object.keys(schema.commands) as [string, ...string[]]);
  const ExecReqSchema = z.object({ type: CadCommandType, params: z.record(z.string(), z.any()).optional() }).openapi('CadCommand');

  hono.openapi(createRoute({
    method: 'post', path: `/${prefix}/{modelId}/exec`, tags: [prefix], summary: 'Polymorphic queue (legacy)',
    request: { params: ModelIdParam, body: { content: { 'application/json': { schema: ExecReqSchema } } } },
    responses: { 200: { description: 'Queued', content: { 'application/json': { schema: CommandQueued } } } }
  }), (c) => {
    const { type, params } = c.req.valid('json');
    return c.json(enqueueCommand(c.req.param('modelId'), type, params));
  });

  hono.openapi(createRoute({
    method: 'post', path: `/${prefix}/{modelId}/exec-wait`, tags: [prefix], summary: 'Polymorphic wait (legacy)',
    request: { params: ModelIdParam, body: { content: { 'application/json': { schema: ExecReqSchema } } } },
    responses: { 200: { description: 'Result', content: { 'application/json': { schema: CommandResult } } }, 504: { description: 'Timeout' } }
  }), async (c) => {
    const { type, params } = c.req.valid('json');
    const res = await waitForCommand(c.req.param('modelId'), type, params);
    return c.json(res, res.status === 'timeout' ? 504 : 200);
  });

  hono.openapi(createRoute({
    method: 'get', path: `/${prefix}/{modelId}/result/{id}`, tags: [prefix], summary: 'Get result',
    request: { params: z.object({ modelId: z.string(), id: z.string() }) },
    responses: { 200: { description: 'Result' } }
  }), (c) => {
    const m = getModel(c.req.param('modelId'));
    const cmd = m.commandQueue.get(c.req.param('id'));
    if (!cmd) return c.json({ error: 'Not found' }, 404);
    return c.json({ id: cmd.id, status: cmd.status, result: cmd.result, error: cmd.error });
  });
}

mountModule(api, 'cad', cadSchema as ModuleSchema, mcpServer);

app.doc('/api/openapi.json', {
  openapi: '3.1.0',
  info: { title: 'Truck CAD API', version: cadSchema.version || '1.0.0', description: 'Professional 3D CAD control via SSE + WASM.' },
  tags: [{ name: 'cad-commands', description: 'Modeling operations' }, { name: 'cad', description: 'Core service' }]
});

api.openapi(createRoute({
  method: 'get', path: '/health', tags: ['system'], summary: 'Health', responses: { 200: { description: 'OK' } }
}), (c) => c.json({ status: 'ok', service: 'truck-cad' }));

app.get('/api-docs', (c) => c.html(`<!DOCTYPE html><html><head><title>Truck CAD API</title></head><body><script id="api-reference" data-url="/api/openapi.json"></script><script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script></body></html>`));

// Legacy docs routes
api.post('/docs', async (c) => { try { const b = await c.req.json() as any; const id = b.docId || crypto.randomUUID(); await c.env.CAD_DOCS_BUCKET.put(`docs/${id}`, b.data ? Uint8Array.from(atob(b.data), ch => ch.charCodeAt(0)) : new Uint8Array(0), { customMetadata: { name: b.name || 'Untitled', createdAt: new Date().toISOString(), version: '1' } }); return c.json({ status: 'ok', docId: id }); } catch { return c.json({ error: 'Failed' }, 500); } });
api.get('/docs/:docId', async (c) => { const o = await c.env.CAD_DOCS_BUCKET.get(`docs/${c.req.param('docId')}`); if (!o) return c.json({ error: 'Not found' }, 404); return c.json({ docId: c.req.param('docId'), data: btoa(String.fromCharCode(...new Uint8Array(await o.arrayBuffer()))), metadata: o.customMetadata }); });
api.post('/docs/:docId/sync', async (c) => { try { const b = await c.req.json() as any; if (!b.data) return c.json({ error: 'Missing data' }, 400); const e = await c.env.CAD_DOCS_BUCKET.get(`docs/${c.req.param('docId')}`); let eb = new Uint8Array(0), m: Record<string,string> = {}; if (e) { eb = new Uint8Array(await e.arrayBuffer()); m = e.customMetadata || {}; } const ib = Uint8Array.from(atob(b.data), ch => ch.charCodeAt(0)); const v = parseInt(m.version||'0')+1; if (ib.length >= eb.length) await c.env.CAD_DOCS_BUCKET.put(`docs/${c.req.param('docId')}`, ib, { customMetadata: { ...m, version: String(v), lastSync: new Date().toISOString() } }); return c.json({ status: 'ok', data: btoa(String.fromCharCode(...(ib.length >= eb.length ? ib : eb))), version: v }); } catch { return c.json({ error: 'Failed' }, 500); } });
api.get('/docs/:docId/events', async (c) => { const o = await c.env.CAD_DOCS_BUCKET.head(`docs/${c.req.param('docId')}`); return new Response(new TextEncoder().encode(`data: ${JSON.stringify({ docId: c.req.param('docId'), version: o?.customMetadata?.version||'0' })}\n\n`), { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } }); });
api.get('/docs', async (c) => { const l = await c.env.CAD_DOCS_BUCKET.list({ prefix: 'docs/' }); return c.json({ docs: l.objects.map(o => ({ docId: o.key.replace('docs/',''), size: o.size, uploaded: o.uploaded.toISOString(), metadata: o.customMetadata })) }); });
api.delete('/docs/:docId', async (c) => { await c.env.CAD_DOCS_BUCKET.delete(`docs/${c.req.param('docId')}`); return c.json({ status: 'ok' }); });

app.route('/api', api);

let mcpTransport: StreamableHTTPTransport | null = null;
app.all('/mcp', async (c) => {
  if (!mcpTransport || !mcpServer.isConnected()) {
    mcpTransport = new StreamableHTTPTransport({ sessionIdGenerator: () => crypto.randomUUID(), enableJsonResponse: true });
    await mcpServer.connect(mcpTransport);
  }
  return mcpTransport.handleRequest(c);
});

// Serve CONTEXT.md as /llms.txt (single source of truth for AI discovery)
app.get('/llms.txt', async (c) => {
  try {
    const asset = await (c.env as any).ASSETS?.fetch(new Request(new URL('/CONTEXT.md', c.req.url)));
    if (asset?.ok) return new Response(asset.body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
  } catch {}
  return c.text('See https://github.com/joeblew999/plat-trunk/blob/main/CONTEXT.md', 302);
});

// SPA catch-all: serve index.html for /model/* paths
// Note: In local dev, we return 404 to let wrangler assets fallback handle it,
// but for robustness we explicitly handle /model/* here if possible.
app.get('/model/*', async (c) => {
  // If we are in a context where ASSETS is available (like a real worker), we use it.
  // Otherwise, we rely on the [assets] configuration in wrangler.toml.
  // To be super safe for tests, we'll just redirect to the root with a query param
  // if we can't serve the asset directly.
  const url = new URL(c.req.url);
  const modelId = url.pathname.split('/').pop();
  if (modelId) {
    return c.redirect(`/?model=${modelId}${url.search ? '&' + url.search.slice(1) : ''}`);
  }
  return c.redirect('/');
});

const MIME: Record<string,string> = { '.webm': 'video/webm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4' };
app.get('/docs/*', async (c, next) => { const k = c.req.path.slice(1); const e = k.slice(k.lastIndexOf('.')); if (!MIME[e]) return next(); const o = await c.env.DOCS_BUCKET.get(k); if (!o) return c.notFound(); return new Response(o.body, { headers: { 'content-type': MIME[e], 'cache-control': 'public, max-age=86400' } }); });

export default app;
