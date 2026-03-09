// sketch.test.ts — Sketch feature tests at the HTTP/MCP boundary.
//
// Sketch has two layers of tests:
//   Rust:   systems/truck/crate/src/sketch.rs        — math: extrude, constraints, serialization
//           systems/truck/crate/tests/sketch.rs — headless API: begin/add_point/add_edge/extrude/cancel
//   HTTP:   THIS FILE                                 — MCP data-plane: quick_rect_extrude, sketch_extrude
//
// Most sketch commands are ephemeral (browser-only): begin_sketch, sketch_add_point,
// sketch_add_edge, sketch_cancel, sketch_export, sketch_solve.
// Only sketch_extrude and quick_rect_extrude are data-plane (server-direct MCP).

import { describe, it, expect } from 'vitest';
import { req, mcpCall, INIT_MSG, makeOp } from './test-helpers';

describe('Sketch MCP Data-Plane', () => {
  it('cad_quick_rect_extrude creates op and returns done', async () => {
    const modelId = `sketch-qre-${crypto.randomUUID().slice(0, 8)}`;
    await mcpCall(INIT_MSG);
    const { body } = await mcpCall({
      jsonrpc: '2.0', id: 50, method: 'tools/call',
      params: {
        name: 'cad_quick_rect_extrude',
        arguments: { width: 2, height: 3, depth: 1, modelId },
      },
    });
    const result = JSON.parse(body.result.content[0].text);
    expect(result.status).toBe('done');
    expect(result.id).toBeDefined();
    // Verify the op was recorded in CRDT
    const opsRes = await req(`/api/models/${modelId}/ops?since=-1`);
    const ops = await opsRes.json() as any[];
    expect(ops.length).toBe(1);
    expect(ops[0].type).toBe('quick_rect_extrude');
    expect(ops[0].params.width).toBe(2);
  }, 15_000);

  it('cad_quick_rect_extrude headless result has objectId', async () => {
    const modelId = `sketch-qre2-${crypto.randomUUID().slice(0, 8)}`;
    await mcpCall(INIT_MSG);
    const { body } = await mcpCall({
      jsonrpc: '2.0', id: 51, method: 'tools/call',
      params: {
        name: 'cad_quick_rect_extrude',
        arguments: { width: 4, height: 5, depth: 2, modelId },
      },
    });
    const result = JSON.parse(body.result.content[0].text);
    expect(result.status).toBe('done');
    // HeadlessController should return objectId from the extrude
    expect(result.result).toBeDefined();
    expect(result.result.objectId).toBeDefined();
  }, 15_000);

  it('cad_sketch_extrude with valid sketchJson creates a solid', async () => {
    // Use real UUIDs for sketch points (Rust parses them as Uuid)
    const p0 = crypto.randomUUID(), p1 = crypto.randomUUID();
    const p2 = crypto.randomUUID(), p3 = crypto.randomUUID();
    const sketchJson = JSON.stringify({
      id: crypto.randomUUID(),
      plane: 'xy',
      points: [
        { id: p0, x: 0, y: 0 },
        { id: p1, x: 1, y: 0 },
        { id: p2, x: 1, y: 1 },
        { id: p3, x: 0, y: 1 },
      ],
      edges: [
        { id: crypto.randomUUID(), p0_id: p0, p1_id: p1 },
        { id: crypto.randomUUID(), p0_id: p1, p1_id: p2 },
        { id: crypto.randomUUID(), p0_id: p2, p1_id: p3 },
        { id: crypto.randomUUID(), p0_id: p3, p1_id: p0 },
      ],
      constraints: [],
    });

    const modelId = `sketch-ext-${crypto.randomUUID().slice(0, 8)}`;
    await mcpCall(INIT_MSG);
    const { body } = await mcpCall({
      jsonrpc: '2.0', id: 52, method: 'tools/call',
      params: {
        name: 'cad_sketch_extrude',
        arguments: { sketchJson, height: 5, modelId },
      },
    });
    const result = JSON.parse(body.result.content[0].text);
    expect(result.status).toBe('done');
    expect(result.result).toBeDefined();
    expect(result.result.objectId).toBeDefined();
  }, 15_000);

  it('quick_rect_extrude op replays via GET /replay', async () => {
    const modelId = `sketch-replay-${crypto.randomUUID().slice(0, 8)}`;
    // Store op directly (same pattern as sync.test.ts)
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('quick_rect_extrude', { width: 2, height: 3, depth: 1 })),
    });

    const res = await req(`/api/models/${modelId}/replay`);
    expect(res.status).toBe(200);
    const scene = await res.json() as any[];
    expect(scene.length).toBe(1);
    expect(scene[0].name).toBe('QuickRect 1');
  }, 15_000);
});

describe('Sketch in tools/list', () => {
  it('sketch MCP tools appear with correct names', async () => {
    await mcpCall(INIT_MSG);
    const { body } = await mcpCall({ jsonrpc: '2.0', id: 60, method: 'tools/list', params: {} });
    const toolNames = body.result.tools.map((t: any) => t.name);
    // Non-ephemeral sketch tools should be MCP tools
    expect(toolNames).toContain('cad_sketch_extrude');
    expect(toolNames).toContain('cad_quick_rect_extrude');
    // Ephemeral sketch tools should NOT be MCP tools
    expect(toolNames).not.toContain('cad_begin_sketch');
    expect(toolNames).not.toContain('cad_sketch_add_point');
    expect(toolNames).not.toContain('cad_sketch_add_edge');
    expect(toolNames).not.toContain('cad_sketch_cancel');
    expect(toolNames).not.toContain('cad_sketch_export');
  });
});
