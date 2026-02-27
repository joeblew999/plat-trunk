import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import cadSchema from '../../cad-schema.json';
import cfDeploy from '../../../../cf-deploy.json';
import { initHeadlessWasm } from './truck-wasm';

type Bindings = {
  MY_VAR: string;
  CAD_DOCS_BUCKET: R2Bucket;
  DOCS: Fetcher;
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
  controlPlane?: Record<string, {
    description: string;
    layer: string;
    params: { properties?: Record<string, any>; required?: string[]; type?: string };
    returns: string;
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

// =========================================================================
// mountModule()
// =========================================================================

function mountModule(hono: typeof api, prefix: string, schema: ModuleSchema) {
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
    const mid = c.req.param('modelId');
    const m = getModel(mid);
    const cmd = m.commandQueue.get(c.req.param('id'));
    if (!cmd) return c.json({ error: 'Not found' }, 404);
    const body = await c.req.json() as any;
    cmd.status = body.error ? 'error' : 'done'; 
    cmd.result = body.result; 
    cmd.error = body.error; 
    cmd.completedAt = Date.now();

    // Sync state from result if available (ensures Worker cache is fresh)
    if (body.result && typeof body.result === 'object' && 'objectCount' in body.result) {
      const { ready, objectCount, objectIds, selectedId, boolSelA, boolSelB, canUndo, canRedo } = body.result;
      m.sceneState = { ready, objectCount, objectIds, selectedId, boolSelA, boolSelB, canUndo, canRedo };
      m.sceneStateAt = Date.now();
      // Broadcast update to other tabs (but not back to the one that sent it)
      broadcast(mid, { type: 'datastar-patch-signals', data: m.sceneState });
    }

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

mountModule(api, 'cad', cadSchema as ModuleSchema);

app.doc('/api/openapi.json', {
  openapi: '3.1.0',
  info: { title: 'Truck CAD API', version: cadSchema.version || '1.0.0', description: 'Professional 3D CAD control via SSE + WASM.' },
  tags: [{ name: 'cad-commands', description: 'Modeling operations' }, { name: 'cad', description: 'Core service' }]
});

api.openapi(createRoute({
  method: 'get', path: '/health', tags: ['system'], summary: 'Health', responses: { 200: { description: 'OK' } }
}), (c) => c.json({ status: 'ok', service: cfDeploy.workers.worker.name, version: (cadSchema as ModuleSchema).version }));

// =========================================================================
// Phase 0.5: Headless truck-webgpu-gui WASM test (ADR-0018)
// =========================================================================

async function runWasmHealthCheck() {
  const start = Date.now();
  const wasm = await initHeadlessWasm();
  const initMs = Date.now() - start;

  const geoStart = Date.now();
  const ctrl = new wasm.HeadlessController();
  const cubeResult = JSON.parse(ctrl.execute('add_cube', '{"size": 1.0}'));
  const stateResult = JSON.parse(ctrl.execute('get_state', '{}'));
  const geoMs = Date.now() - geoStart;

  return {
    ok: true as const,
    headless: true,
    engine: 'truck-webgpu-gui headless 0.1.0',
    objectId: cubeResult.objectId,
    objectCount: stateResult.objectCount,
    initMs,
    geoMs,
    totalMs: Date.now() - start,
  };
}

api.openapi(createRoute({
  method: 'get', path: '/test-wasm', tags: ['system'], summary: 'Test headless WASM geometry in Worker',
  responses: { 200: { description: 'WASM test result' } }
}), async (c) => {
  try {
    return c.json(await runWasmHealthCheck());
  } catch (err: any) {
    return c.json({ ok: false, error: err.message, stack: err.stack }, 500);
  }
});

app.get('/api-docs', (c) => c.html(`<!DOCTYPE html><html><head><title>Truck CAD API</title></head><body><script id="api-reference" data-url="/api/openapi.json"></script><script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script></body></html>`));

// Legacy docs routes
api.post('/docs', async (c) => { try { const b = await c.req.json() as any; const id = b.docId || crypto.randomUUID(); await c.env.CAD_DOCS_BUCKET.put(`docs/${id}`, b.data ? Uint8Array.from(atob(b.data), ch => ch.charCodeAt(0)) : new Uint8Array(0), { customMetadata: { name: b.name || 'Untitled', createdAt: new Date().toISOString(), version: '1' } }); return c.json({ status: 'ok', docId: id }); } catch { return c.json({ error: 'Failed' }, 500); } });
api.get('/docs/:docId', async (c) => { const o = await c.env.CAD_DOCS_BUCKET.get(`docs/${c.req.param('docId')}`); if (!o) return c.json({ error: 'Not found' }, 404); return c.json({ docId: c.req.param('docId'), data: btoa(String.fromCharCode(...new Uint8Array(await o.arrayBuffer()))), metadata: o.customMetadata }); });
api.post('/docs/:docId/sync', async (c) => { try { const b = await c.req.json() as any; if (!b.data) return c.json({ error: 'Missing data' }, 400); const e = await c.env.CAD_DOCS_BUCKET.get(`docs/${c.req.param('docId')}`); let eb = new Uint8Array(0), m: Record<string,string> = {}; if (e) { eb = new Uint8Array(await e.arrayBuffer()); m = e.customMetadata || {}; } const ib = Uint8Array.from(atob(b.data), ch => ch.charCodeAt(0)); const v = parseInt(m.version||'0')+1; if (ib.length >= eb.length) await c.env.CAD_DOCS_BUCKET.put(`docs/${c.req.param('docId')}`, ib, { customMetadata: { ...m, version: String(v), lastSync: new Date().toISOString() } }); return c.json({ status: 'ok', data: btoa(String.fromCharCode(...(ib.length >= eb.length ? ib : eb))), version: v }); } catch { return c.json({ error: 'Failed' }, 500); } });
api.get('/docs/:docId/events', async (c) => { const o = await c.env.CAD_DOCS_BUCKET.head(`docs/${c.req.param('docId')}`); return new Response(new TextEncoder().encode(`data: ${JSON.stringify({ docId: c.req.param('docId'), version: o?.customMetadata?.version||'0' })}\n\n`), { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } }); });
api.get('/docs', async (c) => { const l = await c.env.CAD_DOCS_BUCKET.list({ prefix: 'docs/' }); return c.json({ docs: l.objects.map(o => ({ docId: o.key.replace('docs/',''), size: o.size, uploaded: o.uploaded.toISOString(), metadata: o.customMetadata })) }); });
api.delete('/docs/:docId', async (c) => { await c.env.CAD_DOCS_BUCKET.delete(`docs/${c.req.param('docId')}`); return c.json({ status: 'ok' }); });

app.route('/api', api);

// =========================================================================
// MCP StreamableHTTP endpoint (stateless JSON-RPC, no SDK needed at runtime)
// =========================================================================

function buildMcpTools(schema: ModuleSchema) {
  const tools = [];
  for (const [name, def] of Object.entries(schema.commands)) {
    if (def.ephemeral || def.readonly) continue;
    tools.push({
      name: `cad_${name}`,
      description: def.description,
      inputSchema: {
        type: 'object',
        properties: {
          ...(def.params?.properties || {}),
          modelId: { type: 'string', description: "Target model ID (defaults to 'default')" }
        },
        required: def.params?.required || []
      }
    });
  }
  // Control plane commands (JS-layer, dispatched to browser via SSE)
  if (schema.controlPlane) {
    for (const [name, def] of Object.entries(schema.controlPlane)) {
      tools.push({
        name: `cad_${name}`,
        description: `[Control Plane] ${def.description}`,
        inputSchema: {
          type: 'object',
          properties: {
            ...(def.params?.properties || {}),
            modelId: { type: 'string', description: "Target model ID (defaults to 'default')" }
          },
          required: def.params?.required || []
        }
      });
    }
  }
  // Meta-tools
  tools.push(
    { name: 'cad_health', description: 'Check if the CAD server and browser are connected', inputSchema: { type: 'object', properties: {} } },
    { name: 'cad_schema', description: 'Get the full CAD command schema (version, commands, params)', inputSchema: { type: 'object', properties: {} } },
    { name: 'cad_wasm_health', description: 'Test headless truck-webgpu-gui WASM geometry kernel in Worker (ADR-0018 Phase 0.5)', inputSchema: { type: 'object', properties: {} } }
  );
  // Documentation tools (ADR-0027 Phase 6)
  tools.push(
    { name: 'cad_docs_index', description: 'List available documentation sections and pages', inputSchema: { type: 'object', properties: {} } },
    { name: 'cad_docs_search', description: 'Search documentation by keyword — returns matching sections', inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Search keyword or phrase' } }, required: ['query'] } },
    { name: 'cad_docs_read', description: 'Read a specific documentation page by section path (e.g. "user/getting-started")', inputSchema: { type: 'object', properties: { section: { type: 'string', description: 'Section path (e.g. "user/getting-started", "technical/architecture")' } }, required: ['section'] } },
    { name: 'cad_docs_reference', description: 'Get third-party library reference docs (automerge or kkrpc)', inputSchema: { type: 'object', properties: { library: { type: 'string', enum: ['automerge', 'kkrpc'], description: 'Library name' } }, required: ['library'] } }
  );
  return tools;
}

app.post('/mcp', async (c) => {
  const body = await c.req.json();
  const messages = Array.isArray(body) ? body : [body];
  const responses: any[] = [];

  for (const msg of messages) {
    // Notifications (no id) — acknowledge silently
    if (!('id' in msg)) continue;

    switch (msg.method) {
      case 'initialize':
        responses.push({
          jsonrpc: '2.0', id: msg.id,
          result: {
            protocolVersion: '2025-03-26',
            capabilities: { tools: {} },
            serverInfo: { name: cfDeploy.workers.worker.name, version: (cadSchema as ModuleSchema).version || '1.0.0' }
          }
        });
        break;

      case 'tools/list':
        responses.push({
          jsonrpc: '2.0', id: msg.id,
          result: { tools: buildMcpTools(cadSchema as ModuleSchema) }
        });
        break;

      case 'tools/call': {
        const { name, arguments: toolArgs } = msg.params;

        // Meta-tools
        if (name === 'cad_health') {
          const mid = lastActiveModelId || 'default';
          const m = models.get(mid);
          responses.push({
            jsonrpc: '2.0', id: msg.id,
            result: { content: [{ type: 'text', text: JSON.stringify({
              status: 'ok', service: cfDeploy.workers.worker.name,
              version: (cadSchema as ModuleSchema).version,
              activeModel: mid, sseClients: m?.sseClientCount ?? 0,
              browserConnected: (m?.sseClientCount ?? 0) > 0
            }) }] }
          });
          break;
        }
        if (name === 'cad_wasm_health') {
          try {
            const result = await runWasmHealthCheck();
            responses.push({
              jsonrpc: '2.0', id: msg.id,
              result: { content: [{ type: 'text', text: JSON.stringify(result) }] }
            });
          } catch (err: any) {
            responses.push({
              jsonrpc: '2.0', id: msg.id,
              result: { content: [{ type: 'text', text: JSON.stringify({
                ok: false, headless: false, error: err.message
              }) }] }
            });
          }
          break;
        }
        if (name === 'cad_schema') {
          responses.push({
            jsonrpc: '2.0', id: msg.id,
            result: { content: [{ type: 'text', text: JSON.stringify(cadSchema, null, 2) }] }
          });
          break;
        }

        // Documentation tools (ADR-0027 Phase 6)
        const DOCS_URL = cfDeploy.workers.docs.production;
        if (name === 'cad_docs_index') {
          try {
            const txt = await fetch(`${DOCS_URL}/llms.txt`).then(r => r.text());
            responses.push({
              jsonrpc: '2.0', id: msg.id,
              result: { content: [{ type: 'text', text: txt }] }
            });
          } catch (err: any) {
            responses.push({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: `Failed to fetch docs index: ${err.message}` } });
          }
          break;
        }
        if (name === 'cad_docs_search') {
          try {
            const full = await fetch(`${DOCS_URL}/llms-full.txt`).then(r => r.text());
            const query = (toolArgs?.query || '').toLowerCase();
            // Split by markdown H1/H2 headers, find sections containing the query
            const sections = full.split(/(?=^#{1,2}\s)/m);
            const matches = sections.filter(s => s.toLowerCase().includes(query)).slice(0, 5);
            const result = matches.length > 0
              ? matches.join('\n---\n')
              : `No documentation sections found matching "${toolArgs?.query}".`;
            responses.push({
              jsonrpc: '2.0', id: msg.id,
              result: { content: [{ type: 'text', text: result }] }
            });
          } catch (err: any) {
            responses.push({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: `Failed to search docs: ${err.message}` } });
          }
          break;
        }
        if (name === 'cad_docs_read') {
          try {
            const full = await fetch(`${DOCS_URL}/llms-full.txt`).then(r => r.text());
            const section = (toolArgs?.section || '').toLowerCase().replace(/\.md$/, '');
            // Find the section by matching header text against the section path
            const sections = full.split(/(?=^# )/m);
            const match = sections.find(s => {
              const firstLine = s.split('\n')[0].toLowerCase();
              return firstLine.includes(section.split('/').pop() || '');
            });
            responses.push({
              jsonrpc: '2.0', id: msg.id,
              result: { content: [{ type: 'text', text: match || `Section "${toolArgs?.section}" not found. Use cad_docs_index to see available sections.` }] }
            });
          } catch (err: any) {
            responses.push({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: `Failed to read doc: ${err.message}` } });
          }
          break;
        }
        if (name === 'cad_docs_reference') {
          try {
            const lib = toolArgs?.library;
            const fileMap: Record<string, string> = {
              automerge: 'automerge-llms-full.txt',
              kkrpc: 'kkrpc-llms-full.txt'
            };
            const file = fileMap[lib];
            if (!file) {
              responses.push({
                jsonrpc: '2.0', id: msg.id,
                result: { content: [{ type: 'text', text: `Unknown library "${lib}". Available: automerge, kkrpc` }] }
              });
              break;
            }
            const txt = await fetch(`${DOCS_URL}/llms/${file}`).then(r => r.text());
            responses.push({
              jsonrpc: '2.0', id: msg.id,
              result: { content: [{ type: 'text', text: txt }] }
            });
          } catch (err: any) {
            responses.push({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: `Failed to fetch reference docs: ${err.message}` } });
          }
          break;
        }

        // CAD command dispatch
        const cmdName = name.startsWith('cad_') ? name.slice(4) : name;
        const { modelId, ...params } = toolArgs || {};
        const result = await waitForCommand(modelId || lastActiveModelId || 'default', cmdName, params);
        responses.push({
          jsonrpc: '2.0', id: msg.id,
          result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        });
        break;
      }

      default:
        responses.push({
          jsonrpc: '2.0', id: msg.id,
          error: { code: -32601, message: `Method not found: ${msg.method}` }
        });
    }
  }

  if (responses.length === 0) return c.body(null, 202);
  return c.json(Array.isArray(body) ? responses : responses[0]);
});

// Stateless server — no SSE or session teardown
app.get('/mcp', (c) => c.body(null, 405));
app.delete('/mcp', (c) => c.body(null, 405));

// Serve llms.txt — external-facing project summary for AI discovery (ADR-0012)
app.get('/llms.txt', async (c) => {
  try {
    const asset = await (c.env as any).ASSETS?.fetch(new Request(new URL('/llms.txt', c.req.url)));
    if (asset?.ok) return new Response(asset.body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
  } catch {}
  return c.redirect(`https://raw.githubusercontent.com/${cfDeploy.github}/main/systems/truck/llms.txt`);
});

// llms-full.txt — full context for LLMs: llms.txt + complete tool catalog from schema
app.get('/llms-full.txt', async (c) => {
  const s = cadSchema as ModuleSchema;
  const tools = buildMcpTools(s);

  // Start with llms.txt content
  let content = '';
  try {
    const asset = await (c.env as any).ASSETS?.fetch(new Request(new URL('/llms.txt', c.req.url)));
    if (asset?.ok) content = await asset.text();
  } catch {}
  if (!content) content = `# plat-trunk — Browser CAD on Cloudflare Workers\n\n> Browser-based B-Rep CAD on Cloudflare Workers. Rust/WASM kernel (truck), WebGPU rendering, Automerge CRDT collaboration. 29 MCP tools. No auth required.\n`;

  // Append full tool catalog
  content += `\n## Tool Catalog (${tools.length} tools)\n\n`;
  for (const tool of tools) {
    content += `### ${tool.name}\n\n${tool.description || 'No description.'}\n\n`;
    if (tool.inputSchema && typeof tool.inputSchema === 'object' && 'properties' in tool.inputSchema) {
      const props = tool.inputSchema.properties as Record<string, { type?: string; description?: string }>;
      const keys = Object.keys(props);
      if (keys.length > 0) {
        content += `Parameters:\n`;
        for (const key of keys) {
          const p = props[key];
          content += `- \`${key}\` (${p.type || 'any'}): ${p.description || ''}\n`;
        }
        content += '\n';
      }
    }
  }

  return new Response(content, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
});

// robots.txt — AI crawler directives (RFC 9309)
app.get('/robots.txt', (c) => {
  return new Response(
`# Allow all standard crawlers and AI search bots
User-agent: *
Allow: /

# AI training crawlers — block training, allow discovery
User-agent: GPTBot
Allow: /llms.txt
Allow: /llms-full.txt
Allow: /api/
Allow: /.well-known/
Disallow: /

User-agent: anthropic-ai
Allow: /llms.txt
Allow: /llms-full.txt
Allow: /api/
Allow: /.well-known/
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /

# AI search bots — allow (appear in AI search results)
User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ChatGPT-User
Allow: /
`, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
});

// security.txt — vulnerability disclosure (RFC 9116)
app.get('/.well-known/security.txt', (c) => {
  return new Response(
`Contact: https://github.com/${cfDeploy.github}/security/advisories
Expires: 2027-01-01T00:00:00.000Z
Preferred-Languages: en
Canonical: ${cfDeploy.workers.worker.production}/.well-known/security.txt
`, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
});

// A2A Agent Card — agent-to-agent discovery (Google A2A protocol)
app.get('/.well-known/agent.json', (c) => {
  const s = cadSchema as ModuleSchema;
  const baseUrl = new URL(c.req.url).origin;
  return c.json({
    name: 'Truck CAD',
    description: 'Browser-based B-Rep CAD system. Create and manipulate 3D solid geometry: primitives, booleans, fillet, shell, sketch-to-extrude, STEP/STL import/export. Powered by the truck kernel (Rust/WASM) on Cloudflare Workers.',
    url: `${baseUrl}/mcp`,
    provider: {
      organization: 'plat-trunk',
      url: `https://github.com/${cfDeploy.github}`
    },
    version: s.version,
    documentationUrl: `${baseUrl}/llms.txt`,
    iconUrl: `${baseUrl}/favicon.svg`,
    capabilities: {
      streaming: false,
      pushNotifications: false
    },
    authentication: {
      schemes: ['none']
    },
    defaultInputModes: ['application/json'],
    defaultOutputModes: ['application/json'],
    skills: [
      {
        id: 'cad_modeling',
        name: '3D Solid Modeling',
        description: 'Create primitives (cube, sphere, cylinder, cone, torus), apply transforms (translate, rotate, scale), boolean operations (union, subtract, intersect), and surface ops (fillet, shell).'
      },
      {
        id: 'cad_sketch',
        name: 'Sketch & Extrude',
        description: 'Draw 2D sketches (line, rect, triangle) on planes and extrude to 3D solids.'
      },
      {
        id: 'cad_io',
        name: 'Import/Export',
        description: 'Import and export STEP and STL files for interop with other CAD tools.'
      },
      {
        id: 'cad_control',
        name: 'Control Plane',
        description: 'Undo/redo, mode switching, document management, scene state queries.'
      }
    ]
  }, 200, { 'cache-control': 'public, max-age=3600' });
});

// MCP Server Card — machine-readable discovery (draft spec, .well-known/mcp)
app.get('/.well-known/mcp/server-card.json', (c) => {
  const s = cadSchema as ModuleSchema;
  const tools = buildMcpTools(s);
  const baseUrl = new URL(c.req.url).origin;
  return c.json({
    version: '1.0',
    protocolVersion: '2025-03-26',
    serverInfo: { name: cfDeploy.workers.worker.name, title: 'Truck CAD — Browser 3D B-Rep Modeling', version: s.version },
    description: 'Professional 3D CAD system. B-Rep kernel (truck), WebGPU rendering, Automerge collaboration. 29 MCP tools for modeling, transforms, booleans, sketch, import/export, and control plane.',
    iconUrl: `${baseUrl}/favicon.svg`,
    documentationUrl: `${baseUrl}/llms.txt`,
    transport: { type: 'http', endpoint: '/mcp' },
    capabilities: { tools: true },
    authentication: { schemes: [] },
    tools: tools.map(t => t.name),
    instructions: `Connect with: claude mcp add --transport http ${cfDeploy.workers.worker.name} ${baseUrl}/mcp`
  }, 200, { 'cache-control': 'public, max-age=3600' });
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

// Docs: forward /docs/* to docs-worker via service binding (ADR-0031)
// Strips /docs prefix so docs-worker sees root-relative paths.
app.all('/docs', (c) => c.redirect('/docs/', 301));
app.all('/docs/*', async (c) => {
  const url = new URL(c.req.url);
  url.pathname = url.pathname.replace(/^\/docs/, '') || '/';
  return c.env.DOCS.fetch(new Request(url.toString(), c.req.raw));
});

export default app;
