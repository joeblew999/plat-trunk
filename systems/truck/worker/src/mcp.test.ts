// mcp.test.ts — MCP protocol tests for the truck CAD system.
//
// Tests the MCP JSON-RPC endpoint: initialize, tools/list, tools/call,
// error handling. These are TRUCK-specific — another system would register
// different tools with different prefixes and schemas.

import { describe, it, expect } from 'vitest';
import { json, req, mcpCall, INIT_MSG } from './test-helpers';

describe('MCP Initialize', () => {
  it('POST /mcp initialize returns server info and capabilities', async () => {
    const { status, body } = await mcpCall(INIT_MSG);
    expect(status).toBe(200);
    expect(body.jsonrpc).toBe('2.0');
    expect(body.result.protocolVersion).toBeDefined();
    expect(body.result.serverInfo.name).toBe('truck-cad');
    expect(body.result.capabilities.tools).toBeDefined();
  });
});

describe('MCP Tools List', () => {
  it('POST /mcp tools/list returns CAD tools', async () => {
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
  it('POST /mcp tools/call queues command and returns result', async () => {
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
    expect(result.status).toBe('done');
  }, 15_000);

  it('MCP cad_model_list returns tool result', async () => {
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

describe('MCP Data-Plane (server-direct)', () => {
  it('cad_add_cube creates CRDT op in R2 doc', async () => {
    const modelId = `mcp-dp-${crypto.randomUUID().slice(0, 8)}`;
    await mcpCall(INIT_MSG);
    await mcpCall({
      jsonrpc: '2.0', id: 20, method: 'tools/call',
      params: { name: 'cad_add_cube', arguments: { size: 3, modelId } },
    });

    // Verify op was written to CRDT doc
    const opsRes = await req(`/api/models/${modelId}/ops?since=-1`);
    expect(opsRes.status).toBe(200);
    const ops = await opsRes.json() as any[];
    expect(ops.length).toBe(1);
    expect(ops[0].type).toBe('add_cube');
    expect(ops[0].params.size).toBe(3);
    expect(ops[0].actorId).toBe('mcp-server');
  }, 15_000);

  it('cad_add_sphere returns correct headless result', async () => {
    const modelId = `mcp-dp2-${crypto.randomUUID().slice(0, 8)}`;
    await mcpCall(INIT_MSG);
    const { body } = await mcpCall({
      jsonrpc: '2.0', id: 21, method: 'tools/call',
      params: { name: 'cad_add_sphere', arguments: { radius: 1.5, modelId } },
    });
    const result = JSON.parse(body.result.content[0].text);
    expect(result.status).toBe('done');
    // HeadlessController returns objectId in the result
    expect(result.result).toBeDefined();
    expect(result.id).toBeDefined();
  }, 15_000);

  it('multiple MCP ops accumulate in same model', async () => {
    const modelId = `mcp-dp3-${crypto.randomUUID().slice(0, 8)}`;
    await mcpCall(INIT_MSG);
    await mcpCall({ jsonrpc: '2.0', id: 30, method: 'tools/call',
      params: { name: 'cad_add_cube', arguments: { size: 1, modelId } } });
    await mcpCall({ jsonrpc: '2.0', id: 31, method: 'tools/call',
      params: { name: 'cad_add_sphere', arguments: { radius: 0.5, modelId } } });
    await mcpCall({ jsonrpc: '2.0', id: 32, method: 'tools/call',
      params: { name: 'cad_add_cylinder', arguments: { radius: 0.3, height: 2, modelId } } });

    const opsRes = await req(`/api/models/${modelId}/ops?since=-1`);
    const ops = await opsRes.json() as any[];
    expect(ops.length).toBe(3);
    const types = ops.map((o: any) => o.type).sort();
    expect(types).toEqual(['add_cube', 'add_cylinder', 'add_sphere']);
  }, 30_000);
});

describe('MCP Control-Plane (browser-delegated)', () => {
  it('control-plane tool without browser returns timeout', async () => {
    await mcpCall(INIT_MSG);
    const { body } = await mcpCall({
      jsonrpc: '2.0', id: 40, method: 'tools/call',
      params: { name: 'cad_create_model', arguments: { modelId: 'cp-timeout-test' } },
    });
    const result = JSON.parse(body.result.content[0].text);
    expect(result.status).toBe('timeout');
    expect(result.error).toContain('Browser did not respond');
    expect(body.result.isError).toBe(true);
  }, 15_000);

  it('control-plane tools are listed with [Control Plane] prefix', async () => {
    await mcpCall(INIT_MSG);
    const { body } = await mcpCall({ jsonrpc: '2.0', id: 41, method: 'tools/list', params: {} });
    const cpTools = body.result.tools.filter((t: any) => t.description.startsWith('[Control Plane]'));
    expect(cpTools.length).toBeGreaterThan(0);
    // create_model is a control-plane tool
    const createModel = cpTools.find((t: any) => t.name === 'cad_create_model');
    expect(createModel).toBeDefined();
  });
});

describe('MCP + SSE Integration', () => {
  it('SSE endpoint accepts connection at /api/cad/{modelId}/events', async () => {
    const modelId = `sse-test-${crypto.randomUUID().slice(0, 8)}`;

    // SSE endpoint is at /api/cad/{modelId}/events (prefix = 'cad')
    const sseRes = await req(`/api/cad/${modelId}/events?actorId=test-sse&name=TestBot`);
    expect(sseRes.status).toBe(200);
    expect(sseRes.headers.get('content-type')).toContain('text/event-stream');
  }, 15_000);
});

describe('MCP Protocol Edge Cases', () => {
  it('unknown method returns error response', async () => {
    await mcpCall(INIT_MSG);
    const { status, body } = await mcpCall({ jsonrpc: '2.0', id: 99, method: 'nonexistent/method', params: {} });
    expect(status).toBe(200);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBeDefined();
  });

  it('tools/call with unknown tool returns error in result', async () => {
    await mcpCall(INIT_MSG);
    const { body } = await mcpCall({
      jsonrpc: '2.0', id: 100, method: 'tools/call',
      params: { name: 'cad_nonexistent_tool', arguments: {} },
    });
    // MCP SDK returns error either as JSON-RPC error or as isError in result
    const hasError = body.error !== undefined ||
      (body.result?.isError === true) ||
      (body.result?.content?.[0]?.text?.includes('error'));
    expect(hasError).toBe(true);
  });
});
