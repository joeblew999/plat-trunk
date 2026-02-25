import { describe, it, expect } from 'vitest';
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

function mcpPost(body: unknown) {
  return json('/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Schema Contract (guards MCP tool leakage) ─────────────────

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
    const { body: schema } = await json('/api/cad/schema');
    const cmdCount = Object.keys(schema.commands).length;
    const expected = Object.keys(cadSchema.commands).length;
    expect(cmdCount).toBe(expected);
  });

  it('ephemeral commands are marked correctly in schema', async () => {
    const { body: schema } = await json('/api/cad/schema');
    expect(schema.commands.select.ephemeral).toBe(true);
    expect(schema.commands.deselect.ephemeral).toBe(true);
    expect(schema.commands.pick_at.ephemeral).toBe(true);
    expect(schema.commands.get_state.ephemeral).toBe(true);
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

// ─── OpenAPI Spec ───────────────────────────────────────────────

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

// ─── MCP Protocol (JSON-RPC 2.0 compliance) ────────────────────

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
