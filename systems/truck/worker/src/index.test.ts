import { describe, it, expect, beforeEach } from 'vitest';
import app from './index';
import cadSchema from '../../../../web/cad-schema.json';

// Helper: make a request to the Hono app
async function req(path: string, init?: RequestInit) {
  const url = `http://localhost${path}`;
  return app.request(url, init, {
    // Stub R2 bindings (not used by CAD API routes)
    MY_VAR: 'test',
    DOCS_BUCKET: {} as any,
    CAD_DOCS_BUCKET: {} as any,
  });
}

async function json(path: string, init?: RequestInit) {
  const res = await req(path, init);
  return { status: res.status, body: await res.json() };
}

function post(path: string, body: unknown) {
  return json(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Health', () => {
  it('GET /api/health → 200', async () => {
    const { status, body } = await json('/api/health');
    expect(status).toBe(200);
    expect(body).toEqual({ status: 'ok', service: 'truck-cad' });
  });
});

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
    // Each command has proper metadata
    expect(body.commands.add_cube.description).toBeDefined();
    expect(body.commands.add_cube.params).toBeDefined();
    expect(typeof body.commands.add_cube.ephemeral).toBe('boolean');
    expect(typeof body.commands.add_cube.readonly).toBe('boolean');
  });
});

describe('Schema Contract', () => {
  it('every schema command type is accepted by /exec route', async () => {
    const { body: schema } = await json('/api/cad/schema');
    for (const cmdType of Object.keys(schema.commands)) {
      const { status } = await post('/api/cad/default/exec', { type: cmdType, params: {} });
      expect(status, `command '${cmdType}' should be accepted`).toBe(200);
    }
  });

  it('schema command count matches imported cad-schema.json', async () => {
    const { body: schema } = await json('/api/cad/schema');
    const cmdCount = Object.keys(schema.commands).length;
    // Dynamic: compare against the schema file the Worker imports at build time
    const expected = Object.keys(cadSchema.commands).length;
    expect(cmdCount).toBe(expected);
  });

  it('ephemeral commands are marked correctly in schema', async () => {
    const { body: schema } = await json('/api/cad/schema');
    // These should be ephemeral (not recorded to Automerge, not MCP tools)
    expect(schema.commands.select.ephemeral).toBe(true);
    expect(schema.commands.deselect.ephemeral).toBe(true);
    expect(schema.commands.pick_at.ephemeral).toBe(true);
    expect(schema.commands.get_state.ephemeral).toBe(true);
    // These should NOT be ephemeral (they mutate state)
    expect(schema.commands.add_cube.ephemeral).toBe(false);
    expect(schema.commands.translate.ephemeral).toBe(false);
    expect(schema.commands.boolean_subtract.ephemeral).toBe(false);
  });

  it('readonly commands are marked correctly in schema', async () => {
    const { body: schema } = await json('/api/cad/schema');
    expect(schema.commands.pick_at.readonly).toBe(true);
    expect(schema.commands.export_scene.readonly).toBe(true);
    expect(schema.commands.get_state.readonly).toBe(true);
    expect(schema.commands.add_cube.readonly).toBe(false);
  });
});

describe('CAD Command Execution', () => {
  it('POST /api/cad/:modelId/exec → queues command, returns id', async () => {
    const { status, body } = await post('/api/cad/test-model/exec', {
      type: 'add_cube',
      params: { size: 2 },
    });
    expect(status).toBe(200);
    expect(body.id).toBeDefined();
    expect(typeof body.id).toBe('string');
    expect(body.id.length).toBeGreaterThan(0);
  });

  it('POST /api/cad/:modelId/exec with invalid type → 400', async () => {
    const { status, body } = await post('/api/cad/test-model/exec', {
      type: 'invalid_command',
      params: {},
    });
    expect(status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('POST /api/cad/:modelId/exec with missing type → 400', async () => {
    const { status, body } = await post('/api/cad/test-model/exec', { params: {} });
    expect(status).toBe(400);
    expect(body.error).toBeDefined();
  });
});

describe('CAD Result Round-Trip', () => {
  it('POST + GET result → stores and retrieves result', async () => {
    const exec = await post('/api/cad/rt-test/exec', { type: 'add_cube', params: { size: 1 } });
    const id = exec.body.id;

    const postResult = await post(`/api/cad/rt-test/result/${id}`, {
      result: { objectId: 'test-uuid-1234' },
    });
    expect(postResult.status).toBe(200);

    const getResult = await json(`/api/cad/rt-test/result/${id}`);
    expect(getResult.status).toBe(200);
    expect(getResult.body.id).toBe(id);
    expect(getResult.body.status).toBe('done');
    expect(getResult.body.result).toEqual({ objectId: 'test-uuid-1234' });
  });

  it('POST error result → stores error status', async () => {
    const exec = await post('/api/cad/rt-err/exec', { type: 'clear' });
    const id = exec.body.id;

    await post(`/api/cad/rt-err/result/${id}`, { error: 'Something went wrong' });

    const getResult = await json(`/api/cad/rt-err/result/${id}`);
    expect(getResult.body.status).toBe('error');
    expect(getResult.body.error).toBe('Something went wrong');
  });

  it('GET /api/cad/:modelId/result/:unknown → 404', async () => {
    const { status, body } = await json('/api/cad/rt-404/result/nonexistent-id');
    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
  });
});

describe('CAD State', () => {
  it('GET state with no browser → 503', async () => {
    const res = await req('/api/cad/fresh-model/state');
    expect(res.status).toBe(503);
  });

  it('POST + GET state → state persists', async () => {
    const state = { ready: true, objectCount: 3, objectIds: ['a', 'b', 'c'] };
    const postRes = await post('/api/cad/state-test/state', state);
    expect(postRes.status).toBe(200);

    const getRes = await json('/api/cad/state-test/state');
    expect(getRes.status).toBe(200);
    expect(getRes.body.state).toMatchObject(state);
    expect(getRes.body.updatedAt).toBeDefined();
  });
});

describe('CAD Queue', () => {
  it('GET /api/cad/:modelId/queue → lists queued commands', async () => {
    const { status, body } = await json('/api/cad/queue-test/queue');
    expect(status).toBe(200);
    expect(Array.isArray(body.commands)).toBe(true);
    expect(typeof body.sseClients).toBe('number');
  });
});

describe('CAD Pending', () => {
  it('GET /api/cad/:modelId/pending → returns pending commands array', async () => {
    const { status, body } = await json('/api/cad/pending-test/pending');
    expect(status).toBe(200);
    expect(Array.isArray(body.commands)).toBe(true);
  });
});

describe('OpenAPI Spec', () => {
  it('GET /api/openapi.json → valid OpenAPI 3.1 spec', async () => {
    const { status, body } = await json('/api/openapi.json');
    expect(status).toBe(200);
    expect(body.openapi).toBe('3.1.0');
    expect(body.info.title).toBe('Truck CAD API');
    expect(body.paths).toBeDefined();
    expect(body.paths['/api/cad/{modelId}/exec']).toBeDefined();
    expect(body.paths['/api/cad/{modelId}/exec-wait']).toBeDefined();
    expect(body.paths['/api/cad/{modelId}/events']).toBeDefined();
    expect(body.paths['/api/cad/{modelId}/state']).toBeDefined();
    expect(body.paths['/api/health']).toBeDefined();
    expect(body.components?.schemas?.CadCommand).toBeDefined();
  });
});

describe('API Docs Page', () => {
  it('GET /api-docs → returns HTML with Scalar reference', async () => {
    const res = await req('/api-docs');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Truck CAD API');
    expect(html).toContain('api-reference');
    expect(html).toContain('openapi.json');
  });
});

// =========================================================================
// Model isolation tests
// =========================================================================

// =========================================================================
// MCP StreamableHTTP endpoint tests
// =========================================================================

function mcpPost(body: unknown) {
  return json('/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('MCP Initialize', () => {
  it('POST /mcp initialize → returns server info and capabilities', async () => {
    const { status, body } = await mcpPost({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } }
    });
    expect(status).toBe(200);
    expect(body.jsonrpc).toBe('2.0');
    expect(body.id).toBe(1);
    expect(body.result.protocolVersion).toBe('2025-03-26');
    expect(body.result.serverInfo.name).toBe('truck-cad');
    expect(body.result.capabilities.tools).toBeDefined();
  });
});

describe('MCP Tools List', () => {
  it('POST /mcp tools/list → returns CAD tools', async () => {
    const { status, body } = await mcpPost({
      jsonrpc: '2.0', id: 2, method: 'tools/list', params: {}
    });
    expect(status).toBe(200);
    expect(body.result.tools).toBeDefined();
    expect(Array.isArray(body.result.tools)).toBe(true);
    const toolNames = body.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('cad_add_cube');
    expect(toolNames).toContain('cad_translate');
    expect(toolNames).toContain('cad_boolean_subtract');
    // Ephemeral/readonly commands should NOT be MCP tools
    expect(toolNames).not.toContain('cad_select');
    expect(toolNames).not.toContain('cad_get_state');
    expect(toolNames).not.toContain('cad_pick_at');
  });

  it('each MCP tool has proper inputSchema', async () => {
    const { body } = await mcpPost({
      jsonrpc: '2.0', id: 3, method: 'tools/list', params: {}
    });
    for (const tool of body.result.tools) {
      expect(tool.name).toMatch(/^cad_/);
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
      // CAD command tools have modelId; meta-tools (health, schema) don't
      if (tool.name !== 'cad_health' && tool.name !== 'cad_schema') {
        expect(tool.inputSchema.properties.modelId).toBeDefined();
      }
    }
  });

  it('MCP tool count = non-ephemeral non-readonly commands + 2 meta-tools', async () => {
    const { body: schema } = await json('/api/cad/schema');
    const cmdCount = Object.entries(schema.commands)
      .filter(([_, def]: any) => !def.ephemeral && !def.readonly).length;
    const { body } = await mcpPost({
      jsonrpc: '2.0', id: 4, method: 'tools/list', params: {}
    });
    // +2 for cad_health and cad_schema meta-tools
    expect(body.result.tools.length).toBe(cmdCount + 2);
  });
});

describe('MCP Tool Call', () => {
  it('POST /mcp tools/call → queues command and returns result', async () => {
    const { status, body } = await mcpPost({
      jsonrpc: '2.0', id: 5, method: 'tools/call',
      params: { name: 'cad_add_cube', arguments: { size: 2, modelId: 'mcp-test' } }
    });
    expect(status).toBe(200);
    expect(body.result.content).toBeDefined();
    expect(body.result.content[0].type).toBe('text');
    const result = JSON.parse(body.result.content[0].text);
    expect(result.id).toBeDefined();
    // Will be timeout since no browser connected, but the command was dispatched
    expect(['timeout', 'done', 'error']).toContain(result.status);
  }, 15_000);
});

describe('MCP Protocol Edge Cases', () => {
  it('notifications (no id) → 202 with no body', async () => {
    const res = await req('/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });
    expect(res.status).toBe(202);
  });

  it('unknown method → error response', async () => {
    const { status, body } = await mcpPost({
      jsonrpc: '2.0', id: 99, method: 'nonexistent/method', params: {}
    });
    expect(status).toBe(200);
    expect(body.error.code).toBe(-32601);
    expect(body.error.message).toContain('Method not found');
  });

  it('batch request → batch response', async () => {
    const res = await req('/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([
        { jsonrpc: '2.0', id: 10, method: 'initialize', params: {} },
        { jsonrpc: '2.0', id: 11, method: 'tools/list', params: {} },
      ]),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(2);
    expect(body[0].id).toBe(10);
    expect(body[1].id).toBe(11);
  });

  it('GET /mcp → 405', async () => {
    const res = await req('/mcp');
    expect(res.status).toBe(405);
  });

  it('DELETE /mcp → 405', async () => {
    const res = await req('/mcp', { method: 'DELETE' });
    expect(res.status).toBe(405);
  });
});

// =========================================================================
// Model isolation tests
// =========================================================================

describe('Model Isolation', () => {
  it('different models have separate command queues', async () => {
    await post('/api/cad/model-a/exec', { type: 'add_cube', params: { size: 1 } });
    await post('/api/cad/model-b/exec', { type: 'add_sphere', params: { radius: 1 } });

    const queueA = await json('/api/cad/model-a/pending');
    const queueB = await json('/api/cad/model-b/pending');

    expect(queueA.status).toBe(200);
    expect(queueB.status).toBe(200);

    const typesA = queueA.body.commands.map((c: any) => c.command.type);
    const typesB = queueB.body.commands.map((c: any) => c.command.type);

    expect(typesA).toContain('add_cube');
    expect(typesB).toContain('add_sphere');
    expect(typesA).not.toContain('add_sphere');
    expect(typesB).not.toContain('add_cube');
  });

  it('model-scoped state is isolated', async () => {
    const stateA = { ready: true, objectCount: 2, objectIds: ['x', 'y'] };
    const stateB = { ready: true, objectCount: 5, objectIds: ['a', 'b', 'c', 'd', 'e'] };

    await post('/api/cad/iso-a/state', stateA);
    await post('/api/cad/iso-b/state', stateB);

    const getA = await json('/api/cad/iso-a/state');
    const getB = await json('/api/cad/iso-b/state');

    expect(getA.body.state.objectCount).toBe(2);
    expect(getB.body.state.objectCount).toBe(5);
  });

  it('model-scoped result round-trip', async () => {
    const exec = await post('/api/cad/rt-model/exec', { type: 'add_cube', params: { size: 1 } });
    const id = exec.body.id;

    await post(`/api/cad/rt-model/result/${id}`, { result: { objectId: 'rt-test-uuid' } });

    const getResult = await json(`/api/cad/rt-model/result/${id}`);
    expect(getResult.status).toBe(200);
    expect(getResult.body.status).toBe('done');
    expect(getResult.body.result).toEqual({ objectId: 'rt-test-uuid' });
  });

  it('OpenAPI spec has model-scoped paths only', async () => {
    const { body } = await json('/api/openapi.json');
    // Model-scoped paths exist
    expect(body.paths['/api/cad/{modelId}/exec']).toBeDefined();
    expect(body.paths['/api/cad/{modelId}/events']).toBeDefined();
    expect(body.paths['/api/cad/{modelId}/state']).toBeDefined();
    // No legacy paths
    expect(body.paths['/api/cad/exec']).toBeUndefined();
    expect(body.paths['/api/cad/exec-wait']).toBeUndefined();
    expect(body.paths['/api/cad/events']).toBeUndefined();
    expect(body.paths['/api/cad/state']).toBeUndefined();
  });
});
