import { describe, it, expect } from 'vitest';
import { hc } from 'hono/client';
import app from './index';
import type { AppType } from './index';
import cadSchema from '../../cad-schema.json';

// Mock R2 bucket (in-memory Map)
function createMockR2(): R2Bucket {
  const store = new Map<string, { body: ArrayBuffer | string; httpMetadata?: any }>();
  return {
    async put(key: string, value: any, opts?: any) {
      const body = typeof value === 'string' ? value : value;
      store.set(key, { body, httpMetadata: opts?.httpMetadata });
      return {} as any;
    },
    async get(key: string) {
      const item = store.get(key);
      if (!item) return null;
      return {
        text: async () => typeof item.body === 'string' ? item.body : new TextDecoder().decode(item.body as ArrayBuffer),
        json: async () => JSON.parse(typeof item.body === 'string' ? item.body : new TextDecoder().decode(item.body as ArrayBuffer)),
        arrayBuffer: async () => typeof item.body === 'string' ? new TextEncoder().encode(item.body).buffer : item.body,
        body: item.body,
        httpMetadata: item.httpMetadata || {},
        key,
      } as any;
    },
    async delete(key: string) { store.delete(key); },
    async list(opts?: { prefix?: string; delimiter?: string }) {
      const prefix = opts?.prefix || '';
      const delimiter = opts?.delimiter;
      const objects: any[] = [];
      const prefixes = new Set<string>();
      for (const key of store.keys()) {
        if (!key.startsWith(prefix)) continue;
        if (delimiter) {
          const rest = key.slice(prefix.length);
          const idx = rest.indexOf(delimiter);
          if (idx >= 0) {
            prefixes.add(prefix + rest.slice(0, idx + 1));
            continue;
          }
        }
        objects.push({ key });
      }
      return { objects, delimitedPrefixes: Array.from(prefixes), truncated: false } as any;
    },
    async head() { return null as any; },
    async createMultipartUpload() { return {} as any; },
    async resumeMultipartUpload() { return {} as any; },
  } as any;
}

const mockEnv = {
  ASSETS: { fetch: () => new Response('') } as any,
  MODELS: createMockR2(),
};

// Typed test client — routes validated at compile time
const tc = hc<AppType>('http://localhost', {
  fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    app.request(input instanceof Request ? input : input.toString(), init, mockEnv),
});

// Helper: make a request to the Hono app (untyped, for MCP/raw tests)
async function req(path: string, init?: RequestInit) {
  return app.request(`http://localhost${path}`, init, mockEnv);
}

async function json(path: string, init?: RequestInit) {
  const res = await req(path, init);
  return { status: res.status, body: await res.json() as any };
}

async function mcpCall(body: unknown): Promise<{ status: number; body: any }> {
  const res = await req('/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept': 'application/json, text/event-stream' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() as any };
}

const INIT_MSG = {
  jsonrpc: '2.0', id: 0, method: 'initialize',
  params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } },
};

// ─── Schema Contract ────────────────────────────────────────────

describe('CAD Schema', () => {
  it('GET /api/cad/schema → returns cad-schema.json with all commands', async () => {
    const { status, body } = await json('/api/cad/schema');
    expect(status).toBe(200);
    expect(body.module).toBe('cad');
    expect(body.version).toBeDefined();
    const cmdNames = Object.keys(body.commands);
    expect(cmdNames.length).toBeGreaterThanOrEqual(20);
    expect(cmdNames).toContain('add_cube');
    expect(cmdNames).toContain('boolean_union');
    expect(cmdNames).toContain('translate');
    expect(cmdNames).toContain('select');
    expect(cmdNames).toContain('pick_at');
    expect(body.commands.add_cube.description).toBeDefined();
    expect(body.commands.add_cube.params).toBeDefined();
    expect(typeof body.commands.add_cube.ephemeral).toBe('boolean');
    expect(typeof body.commands.add_cube.readonly).toBe('boolean');
  });

  it('schema command count matches imported cad-schema.json', async () => {
    const { body } = await json('/api/cad/schema');
    expect(Object.keys(body.commands).length).toBe(Object.keys(cadSchema.commands).length);
  });

  it('ephemeral commands are marked correctly', async () => {
    const { body } = await json('/api/cad/schema');
    expect(body.commands.select.ephemeral).toBe(true);
    expect(body.commands.deselect.ephemeral).toBe(true);
    expect(body.commands.pick_at.ephemeral).toBe(true);
    expect(body.commands.get_state.ephemeral).toBe(true);
    expect(body.commands.add_cube.ephemeral).toBe(false);
    expect(body.commands.translate.ephemeral).toBe(false);
    expect(body.commands.boolean_subtract.ephemeral).toBe(false);
  });

  it('readonly commands are marked correctly', async () => {
    const { body } = await json('/api/cad/schema');
    expect(body.commands.pick_at.readonly).toBe(true);
    expect(body.commands.export_scene.readonly).toBe(true);
    expect(body.commands.get_state.readonly).toBe(true);
    expect(body.commands.add_cube.readonly).toBe(false);
  });
});

// ─── OpenAPI Spec ───────────────────────────────────────────────

describe('OpenAPI Spec', () => {
  it('GET /api/openapi.json → valid OpenAPI 3.1 spec', async () => {
    const { status, body } = await json('/api/openapi.json');
    expect(status).toBe(200);
    expect(body.openapi).toBe('3.1.0');
    expect(body.info.title).toBe('Truck CAD API');
    expect(body.paths).toBeDefined();
    expect(body.paths['/api/cad/{modelId}/async/add_cube']).toBeDefined();
    expect(body.paths['/api/cad/{modelId}/sync/add_cube']).toBeDefined();
    expect(body.paths['/api/cad/{modelId}/events']).toBeDefined();
    expect(body.paths['/api/cad/{modelId}/state']).toBeDefined();
    expect(body.paths['/api/health']).toBeDefined();
  });
});

// ─── MCP Protocol (McpServer + StreamableHTTPTransport) ─────────

describe('MCP Initialize', () => {
  it('POST /mcp initialize → returns server info and capabilities', async () => {
    const { status, body } = await mcpCall(INIT_MSG);
    expect(status).toBe(200);
    expect(body.jsonrpc).toBe('2.0');
    expect(body.result.protocolVersion).toBeDefined();
    expect(body.result.serverInfo.name).toBe('truck-cad');
    expect(body.result.capabilities.tools).toBeDefined();
  });
});

describe('MCP Tools List', () => {
  it('POST /mcp tools/list → returns CAD tools', async () => {
    await mcpCall(INIT_MSG);
    const { status, body } = await mcpCall({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    expect(status).toBe(200);
    expect(Array.isArray(body.result.tools)).toBe(true);
    const toolNames = body.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('cad_add_cube');
    expect(toolNames).toContain('cad_translate');
    expect(toolNames).toContain('cad_boolean_subtract');
    // Ephemeral/readonly commands should NOT be MCP tools
    expect(toolNames).not.toContain('cad_select');
    expect(toolNames).not.toContain('cad_get_state');
    expect(toolNames).not.toContain('cad_pick_at');
    // Model persistence tools
    expect(toolNames).toContain('cad_model_save');
    expect(toolNames).toContain('cad_model_load');
    expect(toolNames).toContain('cad_model_list');
    expect(toolNames).toContain('cad_model_delete');
  });

  it('each MCP tool has proper inputSchema', async () => {
    await mcpCall(INIT_MSG);
    const { body } = await mcpCall({ jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} });
    for (const tool of body.result.tools) {
      expect(tool.name).toMatch(/^cad_/);
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('MCP tool count = schema commands + controlPlane + meta + model tools', async () => {
    const { body: schema } = await json('/api/cad/schema');
    const cmdCount = Object.entries(schema.commands)
      .filter(([_, def]: any) => !def.ephemeral && !def.readonly).length;
    const cpCount = schema.controlPlane ? Object.keys(schema.controlPlane).length : 0;
    const META_TOOL_COUNT = 7;  // health, schema, wasm_health + 4 docs tools
    const MODEL_TOOL_COUNT = 4; // model_save, model_load, model_list, model_delete
    await mcpCall(INIT_MSG);
    const { body } = await mcpCall({ jsonrpc: '2.0', id: 4, method: 'tools/list', params: {} });
    expect(body.result.tools.length).toBe(cmdCount + cpCount + META_TOOL_COUNT + MODEL_TOOL_COUNT);
  });
});

describe('MCP Tool Call', () => {
  it('POST /mcp tools/call → queues command and returns result', async () => {
    await mcpCall(INIT_MSG);
    const { status, body } = await mcpCall({
      jsonrpc: '2.0', id: 5, method: 'tools/call',
      params: { name: 'cad_add_cube', arguments: { size: 2, modelId: 'mcp-test' } },
    });
    expect(status).toBe(200);
    expect(body.result.content).toBeDefined();
    expect(body.result.content[0].type).toBe('text');
    const result = JSON.parse(body.result.content[0].text);
    expect(result.id).toBeDefined();
    expect(['timeout', 'done', 'error']).toContain(result.status);
  }, 15_000);
});

describe('MCP Protocol Edge Cases', () => {
  it('unknown method → error response', async () => {
    await mcpCall(INIT_MSG);
    const { status, body } = await mcpCall({ jsonrpc: '2.0', id: 99, method: 'nonexistent/method', params: {} });
    expect(status).toBe(200);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBeDefined();
  });
});

// ─── Model Persistence (REST API + R2) ──────────────────────────

describe('Model Persistence', () => {
  it('GET /api/models → empty list initially', async () => {
    const res = await tc.api.models.$get();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('PUT /api/models/:id → save model, then GET returns it', async () => {
    // Scene format matches real export_scene output: top-level JSON array
    const scene = JSON.stringify([{ id: 'obj1', name: 'Cube 1' }, { id: 'obj2', name: 'Cube 2' }]);
    const res = await tc.api.models[':id'].$put({
      param: { id: 'test-model' },
      json: { name: 'Test Model', description: 'A test', scene },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.id).toBe('test-model');
    expect(body.name).toBe('Test Model');
    expect(body.objectCount).toBe(2);
    expect(body.createdAt).toBeDefined();

    // Verify it appears in list
    const listRes = await tc.api.models.$get();
    const list = await listRes.json() as any[];
    expect(list.some((m: any) => m.id === 'test-model')).toBe(true);
  });

  it('GET /api/models/:id → returns manifest', async () => {
    const res = await tc.api.models[':id'].$get({ param: { id: 'test-model' } });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.name).toBe('Test Model');
    expect(body.objectCount).toBe(2);
  });

  it('GET /api/models/:id/scene → returns scene JSON', async () => {
    const res = await tc.api.models[':id'].scene.$get({ param: { id: 'test-model' } });
    expect(res.status).toBe(200);
    const scene = await res.json() as any;
    expect(Array.isArray(scene)).toBe(true);
    expect(scene).toHaveLength(2);
  });

  it('GET /api/models/nonexistent → 404', async () => {
    const res = await tc.api.models[':id'].$get({ param: { id: 'nonexistent' } });
    expect(res.status).toBe(404);
  });

  it('PUT /api/models/:id without name → 400', async () => {
    const res = await tc.api.models[':id'].$put({
      param: { id: 'bad' },
      json: { scene: '{}' } as any,
    });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/models/:id → removes model', async () => {
    // Save a model to delete
    await tc.api.models[':id'].$put({
      param: { id: 'to-delete' },
      json: { name: 'Delete Me', scene: '[]' },
    });

    const res = await tc.api.models[':id'].$delete({ param: { id: 'to-delete' } });
    expect(res.status).toBe(200);

    // Verify it's gone
    const getRes = await tc.api.models[':id'].$get({ param: { id: 'to-delete' } });
    expect(getRes.status).toBe(404);
  });

  it('PUT + GET thumbnail → round-trips PNG', async () => {
    // Save a model first
    await tc.api.models[':id'].$put({
      param: { id: 'thumb-test' },
      json: { name: 'Thumb Test', scene: '[]' },
    });

    // Upload a fake PNG (just bytes for test) — thumbnail is binary, use raw req
    const fakePng = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    await req('/api/models/thumb-test/thumbnail', {
      method: 'PUT',
      body: fakePng,
    });

    // Verify thumbnail is served
    const res = await req('/api/models/thumb-test/thumbnail');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');

    // Verify manifest updated
    const manifestRes = await tc.api.models[':id'].$get({ param: { id: 'thumb-test' } });
    const body = await manifestRes.json() as any;
    expect(body.hasThumbnail).toBe(true);
  });

  it('MCP cad_model_list → returns tool result', async () => {
    await mcpCall(INIT_MSG);
    const { status, body } = await mcpCall({
      jsonrpc: '2.0', id: 10, method: 'tools/call',
      params: { name: 'cad_model_list', arguments: {} },
    });
    expect(status).toBe(200);
    expect(body.result.content).toBeDefined();
    const result = JSON.parse(body.result.content[0].text);
    expect(result.count).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.models)).toBe(true);
  });
});
