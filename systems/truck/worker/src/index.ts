import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import cadSchema from '../../cad-schema.json';
import syncSchema from '../../../sync/sync-schema.json';
import cfDeploy from '../../../../cf-deploy.json';
import { initHeadlessWasm } from './truck-wasm.generated';
import { ModelStore, analyzeScene, buildManifest } from './model-store';
import { appendOp, getOpsSince, countOps } from './op-log';
import { syncApplyOp, syncGetReplayOps } from './sync-wasm.generated';

type Bindings = {
  ASSETS: Fetcher;
  MODELS: R2Bucket;
  OP_LOG_DB: D1Database;
};

// app and api are created later via chained .openapi() calls for type export

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

// ── State/result route schemas ──────────────────────────
const SceneStateBody = z.object({
  broadcast: z.boolean().optional(),
}).passthrough().openapi('SceneStateBody');

const CommandResultBody = z.object({
  result: z.any().optional(),
  error: z.string().optional(),
}).openapi('CommandResultBody');

const CommandResultIdParam = z.object({
  modelId: z.string().openapi({ param: { name: 'modelId', in: 'path' } }),
  id: z.string().openapi({ param: { name: 'id', in: 'path' } }),
});

const StatusOk = z.object({ status: z.literal('ok') }).openapi('StatusOk');

// ── Model persistence schemas ───────────────────────────
const ModelIdPathParam = z.object({
  id: z.string().openapi({ param: { name: 'id', in: 'path' }, example: 'default-cube' }),
});

const ModelManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  objectCount: z.number(),
  version: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  hasThumbnail: z.boolean(),
}).openapi('ModelManifest');

const ModelSaveBody = z.object({
  name: z.string(),
  description: z.string().optional(),
  scene: z.string(),
}).openapi('ModelSaveBody');

const ModelDeleteResponse = z.object({ status: z.literal('deleted') }).openapi('ModelDeleteResponse');
const ErrorResponse = z.object({ error: z.string() }).openapi('ErrorResponse');

// =========================================================================
// Schema-driven helpers
// =========================================================================

function zodFromJsonSchema(props: Record<string, any>, required: string[] = []) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [name, prop] of Object.entries(props)) {
    let field: z.ZodTypeAny;
    if (prop.type === 'string') field = z.string();
    else if (prop.type === 'number') {
      let numField = z.number();
      if (prop.minimum !== undefined) numField = numField.min(prop.minimum);
      if (prop.maximum !== undefined) numField = numField.max(prop.maximum);
      if (prop.exclusiveMinimum !== undefined) numField = numField.gt(prop.exclusiveMinimum);
      if (prop.exclusiveMaximum !== undefined) numField = numField.lt(prop.exclusiveMaximum);
      field = numField;
    }
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

function mountModule(hono: OpenAPIHono<{ Bindings: Bindings }>, prefix: string, schema: ModuleSchema) {
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
    request: { params: ModelIdParam }, responses: { 200: { description: 'State', content: { 'application/json': { schema: z.any() } } }, 503: { description: 'No browser connected', content: { 'application/json': { schema: ErrorResponse } } } }
  }), (c) => {
    const m = getModel(c.req.param('modelId'));
    return m.sceneStateAt ? c.json({ state: m.sceneState, updatedAt: m.sceneStateAt, sseClients: m.sseClientCount }, 200) : c.json({ error: 'No browser' }, 503);
  });

  hono.openapi(createRoute({
    method: 'post', path: `/${prefix}/{modelId}/state`, tags: [prefix], summary: 'Update scene state',
    request: { params: ModelIdParam, body: { content: { 'application/json': { schema: SceneStateBody } } } },
    responses: { 200: { description: 'OK', content: { 'application/json': { schema: StatusOk } } } }
  }), async (c) => {
    const mid = c.req.valid('param').modelId;
    const m = getModel(mid);
    const body = c.req.valid('json') as Record<string, unknown>;
    const broadcastFlag = !!body.broadcast;
    delete body.broadcast;
    m.sceneState = body; m.sceneStateAt = Date.now();
    if (broadcastFlag) broadcast(mid, { type: 'datastar-patch-signals', data: body });
    return c.json({ status: 'ok' as const });
  });

  hono.openapi(createRoute({
    method: 'post', path: `/${prefix}/{modelId}/result/{id}`, tags: [prefix], summary: 'Report command result',
    request: { params: CommandResultIdParam, body: { content: { 'application/json': { schema: CommandResultBody } } } },
    responses: {
      200: { description: 'OK', content: { 'application/json': { schema: StatusOk } } },
      404: { description: 'Not found', content: { 'application/json': { schema: ErrorResponse } } },
    }
  }), async (c) => {
    const { modelId: mid, id } = c.req.valid('param');
    const m = getModel(mid);
    const cmd = m.commandQueue.get(id);
    if (!cmd) return c.json({ error: 'Not found' } as const, 404);
    const body = c.req.valid('json');
    cmd.status = body.error ? 'error' : 'done';
    cmd.result = body.result;
    cmd.error = body.error;
    cmd.completedAt = Date.now();

    // Sync state from result if available (ensures Worker cache is fresh)
    if (body.result && typeof body.result === 'object' && 'objectCount' in body.result) {
      const { ready, objectCount, objectIds, selectedId, boolSelA, boolSelB, canUndo, canRedo } = body.result;
      m.sceneState = { ready, objectCount, objectIds, selectedId, boolSelA, boolSelB, canUndo, canRedo };
      m.sceneStateAt = Date.now();
      broadcast(mid, { type: 'datastar-patch-signals', data: m.sceneState });
    }

    return c.json({ status: 'ok' as const }, 200);
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

}

// =========================================================================
// Headless truck-webgpu-gui WASM test (ADR-0018)
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

// =========================================================================
// Model Persistence — REST API backed by R2 (chained for type export)
// =========================================================================

const listModelsRoute = createRoute({ method: 'get', path: '/models', tags: ['models'], summary: 'List all saved models', responses: { 200: { description: 'Model list', content: { 'application/json': { schema: z.array(ModelManifestSchema) } } } } });
const getModelRoute = createRoute({ method: 'get', path: '/models/{id}', tags: ['models'], summary: 'Get model manifest', request: { params: ModelIdPathParam }, responses: { 200: { description: 'Manifest', content: { 'application/json': { schema: ModelManifestSchema } } }, 404: { description: 'Not found', content: { 'application/json': { schema: ErrorResponse } } } } });
const getModelSceneRoute = createRoute({ method: 'get', path: '/models/{id}/scene', tags: ['models'], summary: 'Get model scene JSON', request: { params: ModelIdPathParam }, responses: { 200: { description: 'Scene JSON' }, 404: { description: 'Not found', content: { 'application/json': { schema: ErrorResponse } } } } });
const saveModelRoute = createRoute({ method: 'put', path: '/models/{id}', tags: ['models'], summary: 'Save model', request: { params: ModelIdPathParam, body: { content: { 'application/json': { schema: ModelSaveBody } } } }, responses: { 200: { description: 'Saved', content: { 'application/json': { schema: ModelManifestSchema } } }, 400: { description: 'Invalid', content: { 'application/json': { schema: ErrorResponse } } } } });
const deleteModelRoute = createRoute({ method: 'delete', path: '/models/{id}', tags: ['models'], summary: 'Delete model', request: { params: ModelIdPathParam }, responses: { 200: { description: 'Deleted', content: { 'application/json': { schema: ModelDeleteResponse } } }, 404: { description: 'Not found', content: { 'application/json': { schema: ErrorResponse } } } } });
const putThumbnailRoute = createRoute({ method: 'put', path: '/models/{id}/thumbnail', tags: ['models'], summary: 'Upload thumbnail', request: { params: ModelIdPathParam }, responses: { 200: { description: 'OK', content: { 'application/json': { schema: StatusOk } } }, 404: { description: 'Model not found', content: { 'application/json': { schema: ErrorResponse } } } } });
const getThumbnailRoute = createRoute({ method: 'get', path: '/models/{id}/thumbnail', tags: ['models'], summary: 'Get thumbnail', request: { params: ModelIdPathParam }, responses: { 200: { description: 'PNG image' }, 404: { description: 'No thumbnail', content: { 'application/json': { schema: ErrorResponse } } } } });

const modelRoutes = new OpenAPIHono<{ Bindings: Bindings }>()
  .openapi(listModelsRoute, async (c) => {
    const store = new ModelStore(c.env.MODELS);
    return c.json(await store.list());
  })
  .openapi(getModelRoute, async (c) => {
    const store = new ModelStore(c.env.MODELS);
    const manifest = await store.getManifest(c.req.valid('param').id);
    return manifest ? c.json(manifest, 200) : c.json({ error: 'Not found' }, 404);
  })
  .openapi(getModelSceneRoute, async (c) => {
    const store = new ModelStore(c.env.MODELS);
    const data = await store.load(c.req.valid('param').id);
    if (!data) return c.json({ error: 'Not found' }, 404);
    return new Response(data.scene, { headers: { 'content-type': 'application/json' } }) as any;
  })
  .openapi(saveModelRoute, async (c) => {
    const store = new ModelStore(c.env.MODELS);
    const id = c.req.valid('param').id;
    const body = c.req.valid('json');

    const { objectCount } = analyzeScene(body.scene);
    const existing = await store.getManifest(id);
    const now = new Date().toISOString();
    const manifest = buildManifest(id, body.name, body.description, objectCount, (cadSchema as ModuleSchema).version || '1.0.0', existing, now);
    await store.save(id, manifest, body.scene);
    return c.json(manifest, 200);
  })
  .openapi(deleteModelRoute, async (c) => {
    const store = new ModelStore(c.env.MODELS);
    const id = c.req.valid('param').id;
    const existing = await store.getManifest(id);
    if (!existing) return c.json({ error: 'Not found' }, 404);
    await store.delete(id);
    return c.json({ status: 'deleted' as const }, 200);
  })
  .openapi(putThumbnailRoute, async (c) => {
    const store = new ModelStore(c.env.MODELS);
    const id = c.req.valid('param').id;
    const existing = await store.getManifest(id);
    if (!existing) return c.json({ error: 'Model not found' }, 404);
    const png = await c.req.arrayBuffer();
    await store.saveThumbnail(id, png);
    return c.json({ status: 'ok' as const }, 200);
  })
  .openapi(getThumbnailRoute, async (c) => {
    const store = new ModelStore(c.env.MODELS);
    const png = await store.getThumbnail(c.req.valid('param').id);
    if (!png) return c.json({ error: 'No thumbnail' }, 404);
    return new Response(png, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600' } }) as any;
  });

// =========================================================================
// Op Log — D1-backed incremental sync (ADR-0036 Step 8)
// =========================================================================

const OpLogModelParam = z.object({
  modelId: z.string().openapi({ param: { name: 'modelId', in: 'path' }, example: 'default' }),
});
const OpLogSinceQuery = z.object({
  since: z.string().optional().openapi({ param: { name: 'since', in: 'query' }, example: '0', description: 'Return ops with op_index > since' }),
});
const OpLogAppendBody = z.object({
  op_index: z.number().int(),
  op_json: z.string(),
  actor_id: z.string(),
  ts: z.number().int(),
}).openapi('OpLogAppendBody');
const OpLogRow = z.object({
  model_id: z.string(),
  op_index: z.number(),
  op_json: z.string(),
  actor_id: z.string(),
  ts: z.number(),
}).openapi('OpLogRow');

const getOpsRoute = createRoute({ method: 'get', path: '/models/{modelId}/ops', tags: ['sync'], summary: 'Get ops since index', request: { params: OpLogModelParam, query: OpLogSinceQuery }, responses: { 200: { description: 'Op rows', content: { 'application/json': { schema: z.array(OpLogRow) } } } } });
const appendOpRoute = createRoute({ method: 'post', path: '/models/{modelId}/ops', tags: ['sync'], summary: 'Append op to log', request: { params: OpLogModelParam, body: { content: { 'application/json': { schema: OpLogAppendBody } } } }, responses: { 200: { description: 'OK', content: { 'application/json': { schema: StatusOk } } } } });
const replayRoute = createRoute({ method: 'get', path: '/models/{modelId}/replay', tags: ['sync'], summary: 'Headless op replay → scene JSON', request: { params: OpLogModelParam }, responses: { 200: { description: 'Scene JSON (same shape as export_scene)' }, 404: { description: 'No ops', content: { 'application/json': { schema: ErrorResponse } } }, 500: { description: 'Replay error', content: { 'application/json': { schema: ErrorResponse } } } } });

const opLogRoutes = new OpenAPIHono<{ Bindings: Bindings }>()
  .openapi(getOpsRoute, async (c) => {
    const { modelId } = c.req.valid('param');
    const { since } = c.req.valid('query');
    const sinceIndex = since ? parseInt(since, 10) : 0;
    const rows = await getOpsSince(c.env.OP_LOG_DB, modelId, sinceIndex);
    return c.json(rows);
  })
  .openapi(appendOpRoute, async (c) => {
    const { modelId } = c.req.valid('param');
    const body = c.req.valid('json');
    await appendOp(c.env.OP_LOG_DB, { model_id: modelId, ...body });
    return c.json({ status: 'ok' as const });
  })
  .openapi(replayRoute, async (c) => {
    const { modelId } = c.req.valid('param');

    // Step 1 — load all ops from D1 in index order, build Automerge doc
    const rows = await getOpsSince(c.env.OP_LOG_DB, modelId, -1);
    if (rows.length === 0) return c.json({ error: 'No ops for model' }, 404);

    let docBytes: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(0));
    for (const row of rows) {
      docBytes = await syncApplyOp(docBytes, row.op_json);
    }

    // Step 2 — sync WASM: get ordered, enabled-only ops
    const replayOpsJson = await syncGetReplayOps(docBytes);
    const replayOps: Array<{ type: string; params: Record<string, unknown> }> = JSON.parse(replayOpsJson);

    // Step 3 — geometry WASM: replay ops → export scene
    try {
      const wasm = await initHeadlessWasm();
      const ctrl = new wasm.HeadlessController();
      for (const op of replayOps) {
        ctrl.execute(op.type, JSON.stringify(op.params));
      }
      const sceneJson = JSON.parse(ctrl.execute('export_scene', '{}')).scene as string;
      return new Response(sceneJson, { headers: { 'content-type': 'application/json' } }) as any;
    } catch (err: any) {
      return c.json({ error: `Replay failed: ${err.message}` }, 500);
    }
  });

// Health + WASM test (chained for type export)
const healthRoute = createRoute({ method: 'get', path: '/health', tags: ['system'], summary: 'Health', responses: { 200: { description: 'OK' } } });
const testWasmRoute = createRoute({ method: 'get', path: '/test-wasm', tags: ['system'], summary: 'Test headless WASM', responses: { 200: { description: 'Result' } } });

const platformRoutes = new OpenAPIHono<{ Bindings: Bindings }>()
  .openapi(healthRoute, (c) => c.json({ status: 'ok', service: cfDeploy.workers.truck.name, version: (cadSchema as ModuleSchema).version }))
  .openapi(testWasmRoute, async (c) => {
    try { return c.json(await runWasmHealthCheck()); }
    catch (err: any) { return c.json({ ok: false, error: err.message, stack: err.stack }, 500); }
  });

// Sync schema endpoint (ADR-0001 Part E — runtime discovery of Op format)
const syncSchemaRoute = createRoute({ method: 'get', path: '/sync/schema', tags: ['sync'], summary: 'Get sync Op schema', responses: { 200: { description: 'Schema' } } });
const syncRoutes = new OpenAPIHono<{ Bindings: Bindings }>()
  .openapi(syncSchemaRoute, (c) => c.json(syncSchema));

// Dynamic schema-driven routes (type-opaque — consumed via cadCommand/MCP, not hc)
const cadRoutes = new OpenAPIHono<{ Bindings: Bindings }>();
mountModule(cadRoutes, 'cad', cadSchema as ModuleSchema);

// Assemble API — typed sub-routers (no .use() here to preserve hc type inference)
const api = new OpenAPIHono<{ Bindings: Bindings }>()
  .route('/', platformRoutes)
  .route('/', modelRoutes)
  .route('/', opLogRoutes)
  .route('/', syncRoutes)
  .route('/', cadRoutes);

// Middleware applied at app level so .use() doesn't break the hc<AppType> chain
const app = new OpenAPIHono<{ Bindings: Bindings }>()
  .use('/api/*', cors())
  .use('/api/*', async (_c, next) => { gcModels(); return next(); })
  .route('/api', api);

// OpenAPI spec + Scalar docs UI (cast needed: .use() returns Hono, not OpenAPIHono)
(app as unknown as OpenAPIHono<{ Bindings: Bindings }>).doc('/api/openapi.json', {
  openapi: '3.1.0',
  info: { title: 'Truck CAD API', version: cadSchema.version || '1.0.0', description: 'Professional 3D CAD control via SSE + WASM.' },
  tags: [{ name: 'cad-commands', description: 'Modeling operations' }, { name: 'cad', description: 'Core service' }, { name: 'models', description: 'Model persistence' }]
});
app.get('/api-docs', (c) => c.html(`<!DOCTYPE html><html><head><title>Truck CAD API</title></head><body><script id="api-reference" data-url="/api/openapi.json"></script><script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script></body></html>`));

// Export type for hc<AppType> typed client
export type AppType = typeof app;

// =========================================================================
// MCP — Schema tools (Rust-generated) + Platform tools (health, docs, WASM)
// =========================================================================

const DOCS_URL = cfDeploy.workers.router.production + cfDeploy.endpoints.docs;

/** Register CAD tools from Rust-generated cad-schema.json (commands + control plane) */
function registerSchemaTools(server: McpServer, schema: ModuleSchema) {
  for (const [name, def] of Object.entries(schema.commands)) {
    if (def.ephemeral || def.readonly) continue;
    const shape: Record<string, z.ZodTypeAny> = zodFromJsonSchema(def.params?.properties || {}, def.params?.required || []);
    shape.modelId = z.string().optional().describe("Target model ID (defaults to 'default')");
    server.registerTool(`cad_${name}`, { description: def.description, inputSchema: shape }, async (args: Record<string, any>) => {
      const { modelId, ...params } = args;
      const result = await waitForCommand(modelId || lastActiveModelId || 'default', name, params);
      const isError = result.status === 'error' || result.status === 'timeout' || !!(result.result as any)?.error;
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError };
    });
  }

  if (schema.controlPlane) {
    for (const [name, def] of Object.entries(schema.controlPlane)) {
      const shape: Record<string, z.ZodTypeAny> = zodFromJsonSchema(def.params?.properties || {}, def.params?.required || []);
      shape.modelId = z.string().optional().describe("Target model ID (defaults to 'default')");
      server.registerTool(`cad_${name}`, { description: `[Control Plane] ${def.description}`, inputSchema: shape }, async (args: Record<string, any>) => {
        const { modelId, ...params } = args;
        const result = await waitForCommand(modelId || lastActiveModelId || 'default', name, params);
        const isError = result.status === 'error' || result.status === 'timeout' || !!(result.result as any)?.error;
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError };
      });
    }
  }
}

/** Register platform tools — health, schema, WASM diagnostics, docs */
function registerPlatformTools(server: McpServer) {
  server.registerTool('cad_health', { description: 'Check CAD server and browser connectivity' }, async () => {
    const mid = lastActiveModelId || 'default';
    const m = models.get(mid);
    return { content: [{ type: 'text', text: JSON.stringify({
      status: 'ok', service: cfDeploy.workers.truck.name, version: (cadSchema as ModuleSchema).version,
      activeModel: mid, sseClients: m?.sseClientCount ?? 0, browserConnected: (m?.sseClientCount ?? 0) > 0,
    }) }] };
  });

  server.registerTool('cad_schema', { description: 'Get full CAD command schema (version, commands, params)' }, async () => {
    return { content: [{ type: 'text', text: JSON.stringify(cadSchema, null, 2) }] };
  });

  server.registerTool('cad_wasm_health', { description: 'Test headless WASM geometry kernel (ADR-0018)' }, async () => {
    try {
      return { content: [{ type: 'text', text: JSON.stringify(await runWasmHealthCheck()) }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: JSON.stringify({ ok: false, error: err.message }) }], isError: true };
    }
  });

  server.registerTool('cad_docs_index', { description: 'List available documentation sections and pages' }, async () => {
    try {
      const txt = await fetch(`${DOCS_URL}llms.txt`).then(r => r.text());
      return { content: [{ type: 'text', text: txt }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Failed: ${err.message}` }], isError: true };
    }
  });

  server.registerTool('cad_docs_search', {
    description: 'Search documentation by keyword',
    inputSchema: { query: z.string().describe('Search keyword or phrase') },
  }, async ({ query }: { query: string }) => {
    try {
      const full = await fetch(`${DOCS_URL}llms-full.txt`).then(r => r.text());
      const sections = full.split(/(?=^#{1,2}\s)/m);
      const matches = sections.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
      return { content: [{ type: 'text', text: matches.length ? matches.join('\n---\n') : `No docs matching "${query}".` }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Failed: ${err.message}` }], isError: true };
    }
  });

  server.registerTool('cad_docs_read', {
    description: 'Read a documentation page by section path',
    inputSchema: { section: z.string().describe('Section path (e.g. "user/getting-started")') },
  }, async ({ section }: { section: string }) => {
    try {
      const full = await fetch(`${DOCS_URL}llms-full.txt`).then(r => r.text());
      const secs = full.split(/(?=^# )/m);
      const match = secs.find(s => s.split('\n')[0].toLowerCase().includes(section.toLowerCase().split('/').pop() || ''));
      return { content: [{ type: 'text', text: match || `Section "${section}" not found. Use cad_docs_index.` }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Failed: ${err.message}` }], isError: true };
    }
  });

  server.registerTool('cad_docs_reference', {
    description: 'Get third-party library reference docs',
    inputSchema: { library: z.enum(['automerge', 'kkrpc']).describe('Library name') },
  }, async ({ library }: { library: string }) => {
    try {
      const files: Record<string, string> = { automerge: 'automerge-llms-full.txt', kkrpc: 'kkrpc-llms-full.txt' };
      const txt = await fetch(`${DOCS_URL}llms/${files[library]}`).then(r => r.text());
      return { content: [{ type: 'text', text: txt }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Failed: ${err.message}` }], isError: true };
    }
  });
}

/** Register model persistence tools — save, load, list, delete (R2-backed) */
function registerModelTools(server: McpServer, env: Bindings) {
  const store = new ModelStore(env.MODELS);

  server.registerTool('cad_model_save', {
    description: 'Save the current model to cloud storage. Exports the scene from the browser and persists it.',
    inputSchema: {
      name: z.string().describe('Display name for the model'),
      description: z.string().optional().describe('Optional description'),
      modelId: z.string().optional().describe("Source model ID (defaults to active model)"),
    },
  }, async (args: Record<string, any>) => {
    const mid = args.modelId || lastActiveModelId || 'default';
    const exportResult = await waitForCommand(mid, 'export_scene', {});
    if (exportResult.status !== 'done' || !exportResult.result) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to export scene', details: exportResult }) }], isError: true };
    }
    const scene = typeof exportResult.result === 'string' ? exportResult.result : JSON.stringify(exportResult.result);
    const { objectCount } = analyzeScene(scene);
    const id = mid === 'default' ? crypto.randomUUID().slice(0, 8) : mid;
    const now = new Date().toISOString();
    const existing = await store.getManifest(id);
    const manifest = buildManifest(id, args.name, args.description, objectCount, (cadSchema as ModuleSchema).version || '1.0.0', existing, now);
    await store.save(id, manifest, scene);
    return { content: [{ type: 'text', text: JSON.stringify({ ...manifest, url: `/model/${id}` }, null, 2) }] };
  });

  server.registerTool('cad_model_load', {
    description: 'Load a saved model from cloud storage into the browser.',
    inputSchema: {
      id: z.string().describe('Model ID to load'),
      modelId: z.string().optional().describe("Target model session (defaults to active model)"),
    },
  }, async (args: Record<string, any>) => {
    const data = await store.load(args.id);
    if (!data) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Model not found', id: args.id }) }], isError: true };
    const mid = args.modelId || lastActiveModelId || 'default';
    const result = await waitForCommand(mid, 'import_scene', { json: data.scene });
    return { content: [{ type: 'text', text: JSON.stringify({ loaded: data.manifest, importResult: result }, null, 2) }] };
  });

  server.registerTool('cad_model_list', {
    description: 'List all saved models in cloud storage.',
  }, async () => {
    const models = await store.list();
    return { content: [{ type: 'text', text: JSON.stringify({ count: models.length, models }, null, 2) }] };
  });

  server.registerTool('cad_model_delete', {
    description: 'Delete a saved model from cloud storage.',
    inputSchema: { id: z.string().describe('Model ID to delete') },
  }, async (args: Record<string, any>) => {
    await store.delete(args.id);
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: args.id }) }] };
  });
}

/** Create a fresh McpServer per request (stateless — schema + platform + model tools) */
function createMcpServer(env: Bindings) {
  const s = cadSchema as ModuleSchema;
  const server = new McpServer({ name: cfDeploy.workers.truck.name, version: s.version || '1.0.0' });
  registerSchemaTools(server, s);
  registerPlatformTools(server);
  registerModelTools(server, env);
  return server;
}

// JSON Schema tool list for docs endpoints (llms-full.txt, server-card) — mirrors createMcpServer
function getMcpToolList(schema: ModuleSchema) {
  const tools: { name: string; description: string; inputSchema: any }[] = [];
  for (const [name, def] of Object.entries(schema.commands)) {
    if (def.ephemeral || def.readonly) continue;
    tools.push({ name: `cad_${name}`, description: def.description, inputSchema: {
      type: 'object', properties: { ...(def.params?.properties || {}), modelId: { type: 'string', description: "Target model ID" } },
      required: def.params?.required || [],
    }});
  }
  if (schema.controlPlane) {
    for (const [name, def] of Object.entries(schema.controlPlane)) {
      tools.push({ name: `cad_${name}`, description: `[Control Plane] ${def.description}`, inputSchema: {
        type: 'object', properties: { ...(def.params?.properties || {}), modelId: { type: 'string', description: "Target model ID" } },
        required: def.params?.required || [],
      }});
    }
  }
  tools.push(
    { name: 'cad_health', description: 'Check CAD server and browser connectivity', inputSchema: { type: 'object', properties: {} } },
    { name: 'cad_schema', description: 'Get full CAD command schema', inputSchema: { type: 'object', properties: {} } },
    { name: 'cad_wasm_health', description: 'Test headless WASM geometry kernel', inputSchema: { type: 'object', properties: {} } },
    { name: 'cad_docs_index', description: 'List available documentation sections', inputSchema: { type: 'object', properties: {} } },
    { name: 'cad_docs_search', description: 'Search documentation by keyword', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
    { name: 'cad_docs_read', description: 'Read a documentation page', inputSchema: { type: 'object', properties: { section: { type: 'string' } }, required: ['section'] } },
    { name: 'cad_docs_reference', description: 'Get third-party library reference docs', inputSchema: { type: 'object', properties: { library: { type: 'string', enum: ['automerge', 'kkrpc'] } }, required: ['library'] } },
    { name: 'cad_model_save', description: 'Save current model to cloud storage', inputSchema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, modelId: { type: 'string' } }, required: ['name'] } },
    { name: 'cad_model_load', description: 'Load a saved model from cloud storage', inputSchema: { type: 'object', properties: { id: { type: 'string' }, modelId: { type: 'string' } }, required: ['id'] } },
    { name: 'cad_model_list', description: 'List all saved models', inputSchema: { type: 'object', properties: {} } },
    { name: 'cad_model_delete', description: 'Delete a saved model', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  );
  return tools;
}

// Mount MCP endpoint (stateless — fresh server per request, JSON responses)
app.all('/mcp', async (c) => {
  const server = createMcpServer(c.env);
  const transport = new StreamableHTTPTransport({ enableJsonResponse: true });
  await server.connect(transport);
  const response = await transport.handleRequest(c);
  await server.close();
  return response;
});

// Serve llms.txt — external-facing project summary for AI discovery (ADR-0012)
app.get('/llms.txt', async (c) => {
  try {
    const asset = await c.env.ASSETS.fetch(new Request(new URL('/llms.txt', c.req.url)));
    if (asset.ok) return new Response(asset.body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
  } catch {}
  return c.redirect(`https://raw.githubusercontent.com/${cfDeploy.github}/main/systems/truck/llms.txt`);
});

// llms-full.txt — full context for LLMs: llms.txt + complete tool catalog from schema
app.get('/llms-full.txt', async (c) => {
  const s = cadSchema as ModuleSchema;
  const tools = getMcpToolList(s);

  // Start with llms.txt content
  let content = '';
  try {
    const asset = await c.env.ASSETS.fetch(new Request(new URL('/llms.txt', c.req.url)));
    if (asset.ok) content = await asset.text();
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
Canonical: ${cfDeploy.workers.truck.production}/.well-known/security.txt
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
  const tools = getMcpToolList(s);
  const baseUrl = new URL(c.req.url).origin;
  return c.json({
    version: '1.0',
    protocolVersion: '2025-03-26',
    serverInfo: { name: cfDeploy.workers.truck.name, title: 'Truck CAD — Browser 3D B-Rep Modeling', version: s.version },
    description: `Professional 3D CAD system. B-Rep kernel (truck), WebGPU rendering, Automerge collaboration. ${tools.length} MCP tools for modeling, transforms, booleans, sketch, import/export, and control plane.`,
    iconUrl: `${baseUrl}/favicon.svg`,
    documentationUrl: `${baseUrl}/llms.txt`,
    transport: { type: 'http', endpoint: '/mcp' },
    capabilities: { tools: true },
    authentication: { schemes: [] },
    tools: tools.map((t: { name: string }) => t.name),
    instructions: `Connect with: claude mcp add --transport http ${cfDeploy.workers.truck.name} ${baseUrl}/mcp`
  }, 200, { 'cache-control': 'public, max-age=3600' });
});

// Docs redirect: when accessed directly on truck worker, redirect to router docs
const ROUTER_DOCS = cfDeploy.workers.router.production + cfDeploy.endpoints.docs;
app.get('/docs', (c) => c.redirect(ROUTER_DOCS, 301));
app.get('/docs/*', (c) => {
  const sub = c.req.path.replace(/^\/docs\/?/, '');
  return c.redirect(ROUTER_DOCS + sub, 301);
});

// SPA: /model/:id serves the app shell — URL stays clean for bookmarking/sharing
app.get('/model/*', async (c) => {
  const html = await c.env.ASSETS.fetch(new Request(new URL('/', c.req.url)));
  return new Response(html.body, { headers: { 'content-type': 'text/html; charset=utf-8' } });
});

export default app;
