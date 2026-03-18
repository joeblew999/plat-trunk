// wasm.test.ts — Sync system WASM contract tests.
//
// Tests the sync WASM boundary: create, apply, merge, dedup, names.
// The Rust-native equivalents live in systems/sync/crate/src/lib.rs (16 tests).
// This file tests the WASM interface specifically — ensuring the JS↔Rust
// boundary (serialization, byte arrays, error handling) works correctly.

import { describe, it, expect } from 'vitest';
import { syncCreate, syncApplyOp, syncGetOps, syncMergeDocs, syncSetName, syncGetName } from './sync-wasm.generated';
import type { CadOperation } from '../../ts/sync-types.generated';

function makeOp(type: string, params: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: crypto.randomUUID(), type, params,
    enabled: true, timestamp: Date.now(), actorId: 'test', groupId: null,
    ...overrides,
  });
}

describe('Sync WASM: create + apply + get', () => {
  it('create_doc returns valid bytes', async () => {
    const doc = await syncCreate();
    expect(doc).toBeInstanceOf(Uint8Array);
    expect(doc.length).toBeGreaterThan(0);
  });

  it('apply_op adds op, get_ops returns it', async () => {
    const doc = await syncCreate();
    const updated = await syncApplyOp(doc, makeOp('add_cube', { size: 2 }));
    const ops = JSON.parse(await syncGetOps(updated)) as CadOperation[];
    expect(ops.length).toBe(1);
    expect(ops[0].type).toBe('add_cube');
    expect(ops[0].params.size).toBe(2);
  });

  it('multiple ops accumulate in order', async () => {
    let doc = await syncCreate();
    doc = await syncApplyOp(doc, makeOp('add_cube', { size: 1 }));
    doc = await syncApplyOp(doc, makeOp('add_sphere', { radius: 2 }));
    doc = await syncApplyOp(doc, makeOp('add_cylinder', { radius: 0.5, height: 3 }));
    const ops = JSON.parse(await syncGetOps(doc)) as CadOperation[];
    expect(ops.length).toBe(3);
    expect(ops.map((o: CadOperation) => o.type)).toEqual(['add_cube', 'add_sphere', 'add_cylinder']);
  });
});

describe('Sync WASM: names', () => {
  it('set_name + get_name round-trips', async () => {
    let doc = await syncCreate();
    doc = await syncSetName(doc, 'My Model');
    const name = await syncGetName(doc);
    expect(name).toBe('My Model');
  });

  it('name survives merge', async () => {
    let docA = await syncCreate();
    docA = await syncSetName(docA, 'Named by A');
    let docB = await syncCreate();
    docB = await syncApplyOp(docB, makeOp('add_cube', { size: 1 }));
    const merged = await syncMergeDocs(docA, docB);
    // Name from A should survive (B never set a name)
    const name = await syncGetName(merged);
    expect(name).toBe('Named by A');
  });
});

describe('Sync WASM: merge deduplication', () => {
  it('independent docs merge preserves all ops', async () => {
    const docA = await syncCreate();
    const docB = await syncCreate();
    const withOpA = await syncApplyOp(docA, makeOp('add_cube', { size: 1 }, { actorId: 'peer-a' }));
    const withOpB = await syncApplyOp(docB, makeOp('add_sphere', { radius: 1 }, { actorId: 'peer-b' }));

    const merged = await syncMergeDocs(withOpA, withOpB);
    const ops = JSON.parse(await syncGetOps(merged)) as CadOperation[];
    expect(ops.length).toBe(2);
    const types = ops.map((o: CadOperation) => o.type).sort();
    expect(types).toEqual(['add_cube', 'add_sphere']);
  });

  it('apply_op deduplicates by op ID', async () => {
    const doc = await syncCreate();
    const opJson = makeOp('add_cube', { size: 2 });
    const once = await syncApplyOp(doc, opJson);
    const twice = await syncApplyOp(once, opJson);
    const ops = JSON.parse(await syncGetOps(twice)) as CadOperation[];
    expect(ops.length).toBe(1);
  });

  it('dual-write: same op on two forks, merge produces 1 op', async () => {
    const base = await syncCreate();
    const opId = crypto.randomUUID();
    const op = JSON.stringify({
      id: opId, type: 'add_cube', params: { size: 3 },
      enabled: true, timestamp: Date.now(), actorId: 'mcp-server', groupId: null,
    });

    const serverDoc = await syncApplyOp(base, op);
    const browserDoc = await syncApplyOp(base, op);

    expect(JSON.parse(await syncGetOps(serverDoc)).length).toBe(1);
    expect(JSON.parse(await syncGetOps(browserDoc)).length).toBe(1);

    const merged = await syncMergeDocs(serverDoc, browserDoc);
    const ops = JSON.parse(await syncGetOps(merged)) as CadOperation[];
    expect(ops.length).toBe(1);
    expect(ops[0].id).toBe(opId);
  });

  it('independent docs with same op ID deduplicates', async () => {
    const opId = crypto.randomUUID();
    const op = JSON.stringify({
      id: opId, type: 'add_cube', params: { size: 1 },
      enabled: true, timestamp: Date.now(), actorId: 'test', groupId: null,
    });
    const docA = await syncApplyOp(await syncCreate(), op);
    const docB = await syncApplyOp(await syncCreate(), op);
    const merged = await syncMergeDocs(docA, docB);
    const ops = JSON.parse(await syncGetOps(merged)) as CadOperation[];
    expect(ops.length).toBe(1);
    expect(ops[0].id).toBe(opId);
  });
});
