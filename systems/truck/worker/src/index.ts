import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import cadSchema from '../../../../web/cad-schema.json';

type Bindings = {
  MY_VAR: string;
  DOCS_BUCKET: R2Bucket;
  CAD_DOCS_BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();
const api = new Hono<{ Bindings: Bindings }>();
api.use('*', cors());
api.use('*', async (_c, next) => { gcModels(); return next(); });

api.get('/health', (c) => c.json({ status: 'ok', service: 'truck-cad' }));

// =========================================================================
// Schema-driven helpers — derive Zod + MCP from cad-schema.json
// =========================================================================

const CadCommandType = z.enum(
  Object.keys(cadSchema.commands) as [string, ...string[]]
);

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

// =========================================================================
// Per-model state — each model gets isolated command queue + scene state
// =========================================================================

interface ModelSession {
  commandQueue: Map<string, QueuedCommand>;
  sceneState: Record<string, unknown>;
  sceneStateAt: number;
  latestSignals: Record<string, unknown> | null;
  signalVersion: number;
  sseClientCount: number;
  lastActivity: number;
}

const models = new Map<string, ModelSession>();
let lastActiveModelId = 'default';

function getModel(modelId: string): ModelSession {
  if (!models.has(modelId)) {
    models.set(modelId, {
      commandQueue: new Map(),
      sceneState: {},
      sceneStateAt: 0,
      latestSignals: null,
      signalVersion: 0,
      sseClientCount: 0,
      lastActivity: Date.now(),
    });
  }
  const m = models.get(modelId)!;
  m.lastActivity = Date.now();
  lastActiveModelId = modelId;
  return m;
}

function gcQueue(model: ModelSession) {
  const cutoff = Date.now() - 60_000;
  for (const [id, cmd] of model.commandQueue) {
    if (cmd.createdAt < cutoff) model.commandQueue.delete(id);
  }
}

// GC: evict inactive models with no SSE clients (runs lazily on each request)
let lastGC = 0;
function gcModels() {
  const now = Date.now();
  if (now - lastGC < 60_000) return; // at most once per minute
  lastGC = now;
  const cutoff = now - 5 * 60_000;
  for (const [id, m] of models) {
    if (m.sseClientCount === 0 && m.lastActivity < cutoff) models.delete(id);
  }
}

// =========================================================================
// Route handlers
// =========================================================================

function sseHandler(modelId: string) {
  const model = getModel(modelId);
  return (c: any) => {
    return streamSSE(c, async (stream: any) => {
      let isOpen = true;
      stream.onAbort(() => { isOpen = false; });
      model.sseClientCount++;

      const sentCommands = new Set<string>();
      let lastSentSignalVersion = model.signalVersion;

      await stream.writeSSE({
        event: 'datastar-patch-signals',
        data: `signals ${JSON.stringify({ cadConnected: true, cadObjects: 0 })}`,
      });

      let heartbeatCounter = 0;
      while (isOpen) {
        await stream.sleep(100);
        if (!isOpen) break;

        for (const [id, cmd] of model.commandQueue) {
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

        if (model.latestSignals && lastSentSignalVersion < model.signalVersion) {
          lastSentSignalVersion = model.signalVersion;
          try {
            await stream.writeSSE({
              event: 'datastar-patch-signals',
              data: `signals ${JSON.stringify(model.latestSignals)}`,
            });
          } catch { isOpen = false; break; }
        }

        heartbeatCounter++;
        if (heartbeatCounter >= 250) {
          heartbeatCounter = 0;
          try { await stream.write(': keepalive\n\n'); } catch { break; }
        }
      }
      model.sseClientCount--;
    }) as any;
  };
}

function execHandler(modelId: string) {
  const model = getModel(modelId);
  return async (c: any) => {
    try {
      const json = await c.req.json();
      const command = CadExecRequest.parse(json);
      gcQueue(model);
      const id = crypto.randomUUID();
      const cmd: QueuedCommand = { id, command, status: 'pending', createdAt: Date.now() };
      model.commandQueue.set(id, cmd);
      return c.json({ id, status: model.sseClientCount > 0 ? 'queued' : 'no_clients', sseClients: model.sseClientCount });
    } catch (error: any) {
      if (error instanceof z.ZodError) return c.json({ error: 'Invalid command', details: error.issues }, 400);
      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}

function execWaitHandler(modelId: string) {
  const model = getModel(modelId);
  return async (c: any) => {
    try {
      const json = await c.req.json();
      const command = CadExecRequest.parse(json);
      gcQueue(model);
      const id = crypto.randomUUID();
      const cmd: QueuedCommand = { id, command, status: 'pending', createdAt: Date.now() };
      model.commandQueue.set(id, cmd);

      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 100));
        if (cmd.status === 'done' || cmd.status === 'error') {
          return c.json({ id, status: cmd.status, result: cmd.result, error: cmd.error });
        }
      }
      return c.json({ id, status: 'timeout', error: 'Browser did not respond within 10s' }, 504);
    } catch (error: any) {
      if (error instanceof z.ZodError) return c.json({ error: 'Invalid command', details: error.issues }, 400);
      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}

function pendingHandler(modelId: string) {
  const model = getModel(modelId);
  return (c: any) => {
    const pending: QueuedCommand[] = [];
    for (const cmd of model.commandQueue.values()) {
      if (cmd.status === 'pending') { cmd.status = 'running'; pending.push(cmd); }
    }
    return c.json({ commands: pending });
  };
}

function postResultHandler(modelId: string) {
  const model = getModel(modelId);
  return async (c: any) => {
    const cmd = model.commandQueue.get(c.req.param('id'));
    if (!cmd) return c.json({ error: 'Not found' }, 404);
    try {
      const body = await c.req.json();
      cmd.status = body.error ? 'error' : 'done';
      cmd.result = body.result;
      cmd.error = body.error;
      cmd.completedAt = Date.now();
      return c.json({ status: 'ok' });
    } catch { return c.json({ error: 'Invalid body' }, 400); }
  };
}

function getResultHandler(modelId: string) {
  const model = getModel(modelId);
  return (c: any) => {
    const cmd = model.commandQueue.get(c.req.param('id'));
    if (!cmd) return c.json({ error: 'Not found' }, 404);
    return c.json({ id: cmd.id, status: cmd.status, result: cmd.result, error: cmd.error });
  };
}

function postStateHandler(modelId: string) {
  const model = getModel(modelId);
  return async (c: any) => {
    try {
      const body = await c.req.json() as Record<string, unknown>;
      const shouldBroadcast = !!body.broadcast;
      delete body.broadcast;
      model.sceneState = body;
      model.sceneStateAt = Date.now();
      if (shouldBroadcast) {
        model.latestSignals = {
          cadConnected: true,
          cadObjects: body.objectCount ?? 0,
          ...body,
        };
        model.signalVersion++;
      }
      return c.json({ status: 'ok' });
    } catch { return c.json({ error: 'Invalid' }, 400); }
  };
}

function getStateHandler(modelId: string) {
  const model = getModel(modelId);
  return (c: any) => {
    if (!model.sceneStateAt) return c.json({ error: 'No browser connected' }, 503);
    return c.json({ state: model.sceneState, updatedAt: model.sceneStateAt, sseClients: model.sseClientCount });
  };
}

function queueHandler(modelId: string) {
  const model = getModel(modelId);
  return (c: any) => {
    const cmds: QueuedCommand[] = [];
    for (const cmd of model.commandQueue.values()) cmds.push(cmd);
    return c.json({ commands: cmds.sort((a, b) => b.createdAt - a.createdAt), sseClients: model.sseClientCount });
  };
}

// =========================================================================
// All routes are model-scoped — /cad/:modelId/...
// Schema is model-independent.
// =========================================================================

api.get('/cad/schema', (c) => c.json(cadSchema));

api.get('/cad/:modelId/events', (c) => sseHandler(c.req.param('modelId'))(c));
api.post('/cad/:modelId/exec', (c) => execHandler(c.req.param('modelId'))(c));
api.post('/cad/:modelId/exec-wait', (c) => execWaitHandler(c.req.param('modelId'))(c));
api.get('/cad/:modelId/pending', (c) => pendingHandler(c.req.param('modelId'))(c));
api.post('/cad/:modelId/state', (c) => postStateHandler(c.req.param('modelId'))(c));
api.get('/cad/:modelId/state', (c) => getStateHandler(c.req.param('modelId'))(c));
api.get('/cad/:modelId/queue', (c) => queueHandler(c.req.param('modelId'))(c));
api.post('/cad/:modelId/result/:id', (c) => postResultHandler(c.req.param('modelId'))(c));
api.get('/cad/:modelId/result/:id', (c) => getResultHandler(c.req.param('modelId'))(c));

// =========================================================================
// OpenAPI + Scalar
// =========================================================================

api.get('/openapi.json', (c) => {
  const base = new URL(c.req.url).origin;
  return c.json({
    openapi: '3.1.0',
    info: { title: 'Truck CAD API', version: '1.0.0', description: '3D CAD control via SSE + WASM.\n\nAll routes are model-scoped:\n1. POST /api/cad/:modelId/exec\n2. GET /api/cad/:modelId/result/:id\n3. GET /api/cad/:modelId/state\n4. GET /api/cad/:modelId/events (SSE)' },
    servers: [{ url: base }],
    tags: [{ name: 'Commands' }, { name: 'State' }, { name: 'SSE' }],
    paths: {
      '/api/cad/{modelId}/exec': { post: { tags: ['Commands'], summary: 'Queue CAD command (async)', parameters: [{ name: 'modelId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CadCommand' } } } }, responses: { '200': { description: 'Queued' } } } },
      '/api/cad/{modelId}/exec-wait': { post: { tags: ['Commands'], summary: 'Execute CAD command (sync, waits for result)', parameters: [{ name: 'modelId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CadCommand' } } } }, responses: { '200': { description: 'Result' }, '504': { description: 'Timeout' } } } },
      '/api/cad/{modelId}/result/{id}': { get: { tags: ['State'], summary: 'Command result', parameters: [{ name: 'modelId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Result' } } } },
      '/api/cad/{modelId}/state': { get: { tags: ['State'], summary: 'Scene state', parameters: [{ name: 'modelId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'State' }, '503': { description: 'No browser' } } } },
      '/api/cad/schema': { get: { tags: ['State'], summary: 'Command schema (generated from Rust)', responses: { '200': { description: 'cad-schema.json' } } } },
      '/api/cad/{modelId}/events': { get: { tags: ['SSE'], summary: 'SSE stream', parameters: [{ name: 'modelId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Stream' } } } },
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
// Legacy + Automerge (R2 docs)
// =========================================================================
api.post('/docs', async (c) => { try { const b = await c.req.json(); const id = b.docId || crypto.randomUUID(); await c.env.CAD_DOCS_BUCKET.put(`docs/${id}`, b.data ? Uint8Array.from(atob(b.data), ch => ch.charCodeAt(0)) : new Uint8Array(0), { customMetadata: { name: b.name || 'Untitled', createdAt: new Date().toISOString(), version: '1' } }); return c.json({ status: 'ok', docId: id }); } catch { return c.json({ error: 'Failed' }, 500); } });
api.get('/docs/:docId', async (c) => { const o = await c.env.CAD_DOCS_BUCKET.get(`docs/${c.req.param('docId')}`); if (!o) return c.json({ error: 'Not found' }, 404); return c.json({ docId: c.req.param('docId'), data: btoa(String.fromCharCode(...new Uint8Array(await o.arrayBuffer()))), metadata: o.customMetadata }); });
api.post('/docs/:docId/sync', async (c) => { try { const b = await c.req.json(); if (!b.data) return c.json({ error: 'Missing data' }, 400); const e = await c.env.CAD_DOCS_BUCKET.get(`docs/${c.req.param('docId')}`); let eb = new Uint8Array(0), m: Record<string,string> = {}; if (e) { eb = new Uint8Array(await e.arrayBuffer()); m = e.customMetadata || {}; } const ib = Uint8Array.from(atob(b.data), ch => ch.charCodeAt(0)); const v = parseInt(m.version||'0')+1; if (ib.length >= eb.length) await c.env.CAD_DOCS_BUCKET.put(`docs/${c.req.param('docId')}`, ib, { customMetadata: { ...m, version: String(v), lastSync: new Date().toISOString() } }); return c.json({ status: 'ok', data: btoa(String.fromCharCode(...(ib.length >= eb.length ? ib : eb))), version: v }); } catch { return c.json({ error: 'Failed' }, 500); } });
api.get('/docs/:docId/events', async (c) => { const o = await c.env.CAD_DOCS_BUCKET.head(`docs/${c.req.param('docId')}`); return new Response(new TextEncoder().encode(`data: ${JSON.stringify({ docId: c.req.param('docId'), version: o?.customMetadata?.version||'0' })}\n\n`), { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } }); });
api.get('/docs', async (c) => { const l = await c.env.CAD_DOCS_BUCKET.list({ prefix: 'docs/' }); return c.json({ docs: l.objects.map(o => ({ docId: o.key.replace('docs/',''), size: o.size, uploaded: o.uploaded.toISOString(), metadata: o.customMetadata })) }); });
api.delete('/docs/:docId', async (c) => { await c.env.CAD_DOCS_BUCKET.delete(`docs/${c.req.param('docId')}`); return c.json({ status: 'ok' }); });

app.route('/api', api);

// =========================================================================
// MCP Server — auto-generated from cad-schema.json
// =========================================================================

async function execWait(modelId: string, type: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const model = getModel(modelId);
  gcQueue(model);
  const id = crypto.randomUUID();
  const command = { type: type as CadExecInput['type'], params };
  const cmd: QueuedCommand = { id, command, status: 'pending', createdAt: Date.now() };
  model.commandQueue.set(id, cmd);

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 100));
    if (cmd.status === 'done' || cmd.status === 'error') {
      return { id, status: cmd.status, ...(cmd.result as Record<string, unknown> || {}), error: cmd.error };
    }
  }
  return { id, status: 'timeout', error: 'Browser did not respond within 10s. Is the CAD app open?' };
}

function mcpResult(data: Record<string, unknown>) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

/** Convert JSON Schema properties to Zod shape for MCP tool input */
function zodFromJsonSchema(props: Record<string, any>, required: string[] = []) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [name, prop] of Object.entries(props)) {
    let field: z.ZodTypeAny;
    if (prop.type === 'string') field = z.string();
    else if (prop.type === 'number') field = z.number();
    else field = z.any();

    if (prop.default !== undefined) field = (field as any).default(prop.default);
    if (!required.includes(name)) field = field.optional();
    shape[name] = field;
  }
  return shape;
}

const mcpServer = new McpServer({
  name: 'truck-cad',
  version: '1.0.0',
});

// Auto-register MCP tools from schema
const commands = cadSchema.commands as Record<string, {
  description: string;
  params: { properties?: Record<string, any>; required?: string[] };
  returns: string;
  ephemeral: boolean;
  readonly: boolean;
}>;

for (const [name, def] of Object.entries(commands)) {
  if (def.ephemeral || def.readonly) continue;

  const props = def.params?.properties || {};
  const required = def.params?.required || [];
  const inputSchema = zodFromJsonSchema(props, required);
  // Add optional modelId to every tool
  inputSchema.modelId = z.string().optional();

  mcpServer.registerTool(`cad_${name}`, {
    description: `[cad] ${def.description}`,
    inputSchema,
  }, async (params) => {
    const { modelId, ...rest } = params as Record<string, unknown>;
    const mid = (modelId as string) || lastActiveModelId || 'default';
    return mcpResult(await execWait(mid, name, rest));
  });
}

// Special: get_scene_state reads from cached state
mcpServer.registerTool('cad_get_scene_state', {
  description: '[cad] Get the current scene state: object count, object UUIDs, selected object.',
  inputSchema: { modelId: z.string().optional() },
}, async (params) => {
  const mid = (params as any).modelId || lastActiveModelId || 'default';
  const model = getModel(mid);
  if (!model.sceneStateAt) return mcpResult({ error: 'No browser connected. Open the CAD app first.' });
  return mcpResult(model.sceneState);
});

// Mount MCP endpoint
let mcpTransport: StreamableHTTPTransport | null = null;

app.all('/mcp', async (c) => {
  if (!mcpTransport || !mcpServer.isConnected()) {
    mcpTransport = new StreamableHTTPTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      enableJsonResponse: true,
    });
    await mcpServer.connect(mcpTransport);
  }
  return mcpTransport.handleRequest(c);
});

// =========================================================================
// SPA catch-all: serve index.html for /model/* paths
// =========================================================================

const MIME: Record<string,string> = { '.webm': 'video/webm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4' };
app.get('/docs/*', async (c, next) => { const k = c.req.path.slice(1); const e = k.slice(k.lastIndexOf('.')); if (!MIME[e]) return next(); const o = await c.env.DOCS_BUCKET.get(k); if (!o) return c.notFound(); return new Response(o.body, { headers: { 'content-type': MIME[e], 'cache-control': 'public, max-age=86400' } }); });

// SPA routing for /model/* is handled by wrangler.toml: not_found_handling = "single-page-application"
// This serves index.html for any path that doesn't match a static file.

export default app;
