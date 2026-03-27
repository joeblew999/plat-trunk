/**
 * Tests @plat/sync/wasm-adapter — WASM boundary layer.
 * Verifies JS↔Rust serialization: create, apply, merge, dedup, names, hash.
 */
import { describe, it, expect } from 'vitest';
import { rawCreate, rawApplyOp, rawGetOps, rawMergeDocs, rawSetName, rawGetName, rawDocHash } from './wasm';
import type { Operation } from '@plat/sync/types';

function makeOp(type: string, params: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: crypto.randomUUID(), type, params,
    enabled: true, timestamp: Date.now(), actorId: 'test', groupId: null,
    ...overrides,
  });
}

describe('@plat/sync/wasm-adapter', () => {
  it('create_doc returns valid bytes', async () => {
    const doc = await rawCreate();
    expect(doc).toBeInstanceOf(Uint8Array);
    expect(doc.length).toBeGreaterThan(0);
  });

  it('apply_op + get_ops round-trip', async () => {
    const doc = await rawCreate();
    const updated = await rawApplyOp(doc, makeOp('add_item', { size: 2 }));
    const ops = JSON.parse(await rawGetOps(updated)) as Operation[];
    expect(ops.length).toBe(1);
    expect(ops[0].type).toBe('add_item');
  });

  it('merge deduplicates by op ID', async () => {
    const opId = crypto.randomUUID();
    const op = JSON.stringify({
      id: opId, type: 'op1', params: {},
      enabled: true, timestamp: Date.now(), actorId: 'test', groupId: null,
    });
    const docA = await rawApplyOp(await rawCreate(), op);
    const docB = await rawApplyOp(await rawCreate(), op);
    const merged = await rawMergeDocs(docA, docB);
    const ops = JSON.parse(await rawGetOps(merged)) as Operation[];
    expect(ops.length).toBe(1);
    expect(ops[0].id).toBe(opId);
  });

  it('independent docs merge preserves all ops', async () => {
    const docA = await rawApplyOp(await rawCreate(), makeOp('op_a', {}, { actorId: 'a' }));
    const docB = await rawApplyOp(await rawCreate(), makeOp('op_b', {}, { actorId: 'b' }));
    const merged = await rawMergeDocs(docA, docB);
    const ops = JSON.parse(await rawGetOps(merged)) as Operation[];
    expect(ops.length).toBe(2);
  });

  it('set_name + get_name round-trips', async () => {
    let doc = await rawCreate();
    doc = await rawSetName(doc, 'My Model');
    expect(await rawGetName(doc)).toBe('My Model');
  });

  it('doc_hash returns hex string', async () => {
    const doc = await rawCreate();
    const hash = await rawDocHash(doc);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('doc_hash changes after apply_op', async () => {
    const doc = await rawCreate();
    const hash1 = await rawDocHash(doc);
    const updated = await rawApplyOp(doc, makeOp('op1', {}));
    const hash2 = await rawDocHash(updated);
    expect(hash1).not.toBe(hash2);
  });
});
