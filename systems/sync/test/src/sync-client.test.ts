/**
 * sync-client.test.ts — SyncClient tests with real WASM (ADR-0008 Phase 1).
 *
 * Uses the REAL sync WASM binary — same as production.
 * Only MemoryStorageAdapter and DirectNetworkAdapter are swapped.
 *
 * The SyncWasmAdapter interface is async (matches wasm-bindgen generated
 * bindings). We wrap the generated async functions directly.
 */

import { describe, it, expect } from 'vitest';
import {
  syncCreate, syncApplyOp, syncGetOps, syncGetOpCount, syncMergeDocs,
  syncGetReplayOps, syncSetOpEnabled,
} from './sync-wasm.generated';
import { SyncClient, type SyncWasmAdapter } from '../../ts/sync-client';
import { MemoryStorageAdapter, DirectNetworkAdapter } from '../../ts/adapters';
import type { CadOperation } from '../../ts/sync-types.generated';

// ── Real async WASM adapter ───────────────────────────────────────────────────
// Wraps the generated async functions directly — no sync stubs, no hacks.

const realWasm: SyncWasmAdapter = {
  create_doc:        ()           => syncCreate(),
  apply_op:          (doc, json)  => syncApplyOp(doc, json),
  merge_docs:        (a, b)       => syncMergeDocs(a, b),
  get_ops:           (doc)        => syncGetOps(doc),
  get_op_count:      (doc)        => syncGetOpCount(doc).then(n => n as number),
  get_replay_ops:    (doc)        => syncGetReplayOps(doc),
  set_op_enabled:    (doc, id, en) => syncSetOpEnabled(doc, id, en),
  set_group_enabled: (doc, _gid, _en) => Promise.resolve(doc), // not needed here
  rollback_to:       (doc, _a, _i)   => Promise.resolve(doc), // not needed here
  get_name:          (_doc)       => Promise.resolve(''),
  set_name:          (doc, _name) => Promise.resolve(doc),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeOp(type: string, params: object, actor = 'test-actor'): CadOperation {
  return {
    id: crypto.randomUUID(), type, params,
    enabled: true, timestamp: Date.now(), actorId: actor, groupId: null,
  };
}

/** Minimal in-memory server — simulates CF worker POST /sync endpoint. */
function makeServer() {
  const r2 = new Map<string, Uint8Array>();
  return {
    async sync(modelId: string, bytes: Uint8Array): Promise<Uint8Array> {
      const existing = r2.get(modelId);
      const merged = existing ? await syncMergeDocs(existing, bytes) : bytes;
      r2.set(modelId, new Uint8Array(merged));
      return merged;
    },
    opCount(modelId: string): Promise<number> {
      const doc = r2.get(modelId);
      return doc ? syncGetOpCount(doc).then(n => n as number) : Promise.resolve(0);
    },
  };
}

function makeClient(
  server: ReturnType<typeof makeServer>,
  actor = 'test-actor',
  storage = new MemoryStorageAdapter(),
) {
  const net = new DirectNetworkAdapter(
    async (modelId, bytes, actorId) => server.sync(modelId, bytes),
  );
  const client = new SyncClient(realWasm, storage, net, { actorId: actor, debounceMs: 99999 });
  return { client, net, storage };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SyncClient — protocol correctness with real WASM', () => {

  it('createDoc + addOp + saveToStorage + loadFromStorage round-trip', async () => {
    const server = makeServer();
    const { client } = makeClient(server, 'actor-a');
    const modelId = 'roundtrip';

    client.createDoc(modelId);
    await client.addOp(makeOp('add_cube', { size: 1 }, 'actor-a'));
    await client.saveToStorage();

    // New client, same storage
    const storage2 = (client as any).storage as MemoryStorageAdapter;
    const net2 = new DirectNetworkAdapter(async () => null);
    const client2 = new SyncClient(realWasm, storage2, net2, { actorId: 'actor-a' });

    const found = await client2.loadFromStorage(modelId);
    expect(found).toBe(true);

    const ops = await client2.getOps();
    expect(ops.length).toBe(1);
    expect(ops[0].type).toBe('add_cube');
    expect(ops[0].actorId).toBe('actor-a');
  });

  it('two actors converge via server', async () => {
    const server = makeServer();
    const modelId = 'converge';

    const { client: a } = makeClient(server, 'actor-a');
    const { client: b } = makeClient(server, 'actor-b');

    a.createDoc(modelId);
    await a.addOp(makeOp('add_cube', { size: 2 }, 'actor-a'));

    // A syncs first
    await a.syncWithServer();
    expect(await server.opCount(modelId)).toBe(1);

    // B starts fresh, adds different op
    b.createDoc(modelId);
    await b.addOp(makeOp('add_sphere', { radius: 1 }, 'actor-b'));

    // B syncs — server merges A+B
    await b.syncWithServer();
    expect(await b.getOpCount()).toBe(2, 'B must see A\'s op');

    // A re-syncs — gets B's op
    await a.syncWithServer();
    expect(await a.getOpCount()).toBe(2, 'A must see B\'s op');

    // Both converge to same op IDs
    const opsA = await a.getOps();
    const opsB = await b.getOps();
    const idsA = opsA.map(o => o.id).sort();
    const idsB = opsB.map(o => o.id).sort();
    expect(idsA).toEqual(idsB);
  });

  it('onRemoteOps fires after syncWithServer brings new ops', async () => {
    const server = makeServer();
    const modelId = 'remote-ops';

    const { client: a } = makeClient(server, 'actor-a');
    const { client: b, net: netB } = makeClient(server, 'actor-b');

    // A adds op + syncs
    a.createDoc(modelId);
    await a.addOp(makeOp('add_sphere', { radius: 1 }, 'actor-a'));
    await a.syncWithServer();

    // B starts empty
    b.createDoc(modelId);
    b.listen(modelId);

    let remoteOpsFired = false;
    b.onRemoteOps = () => { remoteOpsFired = true; };

    // Simulate SSE doc-changed arriving at B, then B syncs
    netB.triggerRemoteChange(modelId);
    await b.syncWithServer();

    expect(remoteOpsFired).toBe(true);
    expect(await b.getOpCount()).toBe(1);
  });

  it('undo (setOpEnabled false) survives server sync round-trip', async () => {
    const server = makeServer();
    const modelId = 'undo';

    const { client: a } = makeClient(server, 'actor-a');
    a.createDoc(modelId);

    const op1 = makeOp('add_cube',   { size: 1 }, 'actor-a');
    const op2 = makeOp('add_sphere', { radius: 1 }, 'actor-a');
    await a.addOp(op1);
    await a.addOp(op2);

    // Undo op2
    await a.setOpEnabled(op2.id, false);
    await a.syncWithServer();

    // Re-sync — undo must survive
    await a.syncWithServer();
    const replay = await a.getReplayOps();
    expect(replay.length).toBe(1, 'undo must survive server sync');
    expect(replay[0].type).toBe('add_cube');

    const all = await a.getOps();
    expect(all.length).toBe(2);
    expect(all[1].enabled).toBe(false, 'disabled op persisted');
  });

  it('offline queues sync, online flushes it', async () => {
    const server = makeServer();
    const modelId = 'offline';
    let syncCount = 0;

    const net = new DirectNetworkAdapter(async (mid, bytes) => {
      syncCount++;
      return server.sync(mid, bytes);
    });
    const client = new SyncClient(realWasm, new MemoryStorageAdapter(), net, {
      actorId: 'actor-a',
      debounceMs: 0, // immediate
    });

    client.createDoc(modelId);
    client.goOffline();

    await client.addOp(makeOp('add_cube', { size: 1 }, 'actor-a'));
    expect(syncCount).toBe(0, 'no sync while offline');

    client.goOnline();
    // goOnline triggers pending sync — give microtask a tick
    await new Promise(r => setTimeout(r, 10));
    expect(syncCount).toBe(1, 'sync fired on reconnect');
  });

  it('re-sync is idempotent — no ping-pong op inflation', async () => {
    const server = makeServer();
    const modelId = 'pingpong';
    const { client: a } = makeClient(server, 'actor-a');

    a.createDoc(modelId);
    await a.addOp(makeOp('add_cube', { size: 1 }, 'actor-a'));

    await a.syncWithServer();
    const count1 = await a.getOpCount();

    await a.syncWithServer();
    const count2 = await a.getOpCount();

    expect(count2).toBe(count1, 're-sync must not inflate op count');
  });

  it('structured log captures sync events', async () => {
    const server = makeServer();
    const { client: a } = makeClient(server, 'actor-a');
    const modelId = 'log-test';

    a.createDoc(modelId);
    await a.addOp(makeOp('add_cube', { size: 1 }, 'actor-a'));
    await a.syncWithServer();

    const events = a.syncLog.map(e => e.event);
    expect(events).toContain('add_op');
    expect(events).toContain('save_storage');
    expect(events).toContain('sync_start');
    expect(events).toContain('sync_complete');

    // All entries have required fields
    for (const entry of a.syncLog) {
      expect(typeof entry.ts).toBe('number');
      expect(entry.actorId).toBe('actor-a');
      expect(typeof entry.event).toBe('string');
    }
  });

  it('dual-write: server + client both apply same op — no duplicate', async () => {
    const server = makeServer();
    const modelId = 'dualwrite';
    const { client: a } = makeClient(server, 'actor-a');

    const sharedOp = makeOp('add_sphere', { radius: 2 }, 'mcp-server');

    // Server applies op directly (simulates MCP executeServerDirect)
    const base = await syncCreate();
    const serverDoc = await syncApplyOp(base, JSON.stringify(sharedOp));
    // Manually put into server store
    await server.sync(modelId, serverDoc);

    // Client also applies same op (simulates SSE applyServerOp)
    a.createDoc(modelId);
    await a.addOp(sharedOp);

    // Sync — CRDT dedup must prevent duplicate
    await a.syncWithServer();

    const ops = await a.getOps();
    expect(ops.length).toBe(1, 'dual-write must not duplicate op');
    expect(ops[0].id).toBe(sharedOp.id);
  });
});
