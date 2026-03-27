/**
 * Tests @plat/sync/client + @plat/sync/adapters — SyncClient protocol.
 * Real WASM, MemoryStorageAdapter, DirectNetworkAdapter.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { SyncClient } from '@plat/sync/client';
import { MemoryStorageAdapter, DirectNetworkAdapter } from '@plat/sync/adapters';
import type { Operation } from '@plat/sync/types';
import type { SyncWasmAdapter } from '@plat/sync/wasm-adapter';
import { createTestWasm, rawCreate, rawApplyOp, rawMergeDocs, rawGetOpCount } from './wasm';

let wasm: SyncWasmAdapter;
beforeAll(async () => { wasm = await createTestWasm(); });

function makeOp(type: string, params: object = {}, actor = 'test-actor'): Operation {
  return {
    id: crypto.randomUUID(), type, params,
    enabled: true, timestamp: Date.now(), actorId: actor, groupId: null,
  };
}

function makeServer() {
  const r2 = new Map<string, Uint8Array>();
  return {
    async sync(modelId: string, bytes: Uint8Array): Promise<Uint8Array> {
      const existing = r2.get(modelId);
      const merged = existing ? await rawMergeDocs(existing, bytes) : bytes;
      r2.set(modelId, new Uint8Array(merged));
      return merged;
    },
  };
}

function makeClient(server: ReturnType<typeof makeServer>, actor = 'test-actor') {
  const net = new DirectNetworkAdapter(async (mid, bytes) => server.sync(mid, bytes));
  return new SyncClient(wasm, new MemoryStorageAdapter(), net, { actorId: actor, debounceMs: 99999 });
}

describe('@plat/sync/client — protocol', () => {
  it('createDoc + addOp + getOps round-trip', async () => {
    const client = makeClient(makeServer());
    await client.createDoc('test');
    await client.addOp(makeOp('op1'));
    const ops = await client.getOps();
    expect(ops.length).toBe(1);
    expect(ops[0].type).toBe('op1');
  });

  it('two actors converge via server', async () => {
    const server = makeServer();
    const a = makeClient(server, 'actor-a');
    const b = makeClient(server, 'actor-b');

    await a.createDoc('converge');
    await a.addOp(makeOp('op_a', {}, 'actor-a'));
    await a.syncWithServer();

    await b.createDoc('converge');
    await b.addOp(makeOp('op_b', {}, 'actor-b'));
    await b.syncWithServer();
    expect(await b.getOpCount()).toBe(2);

    await a.syncWithServer();
    expect(await a.getOpCount()).toBe(2);
  });

  it('undo survives sync round-trip', async () => {
    const client = makeClient(makeServer());
    await client.createDoc('undo');
    const op1 = makeOp('op1');
    const op2 = makeOp('op2');
    await client.addOp(op1);
    await client.addOp(op2);
    await client.setOpEnabled(op2.id, false);
    await client.syncWithServer();
    await client.syncWithServer();

    const replay = await client.getReplayOps();
    expect(replay.length).toBe(1);
    expect(replay[0].type).toBe('op1');
  });

  it('offline queues, online flushes', async () => {
    const server = makeServer();
    let syncCount = 0;
    const net = new DirectNetworkAdapter(async (mid, bytes) => { syncCount++; return server.sync(mid, bytes); });
    const client = new SyncClient(wasm, new MemoryStorageAdapter(), net, { actorId: 'a', debounceMs: 0 });

    await client.createDoc('offline');
    client.goOffline();
    await client.addOp(makeOp('op1', {}, 'a'));
    expect(syncCount).toBe(0);

    client.goOnline();
    await new Promise(r => setTimeout(r, 50));
    expect(syncCount).toBe(1);
  });

  it('re-sync is idempotent', async () => {
    const client = makeClient(makeServer());
    await client.createDoc('idem');
    await client.addOp(makeOp('op1'));
    await client.syncWithServer();
    const c1 = await client.getOpCount();
    await client.syncWithServer();
    expect(await client.getOpCount()).toBe(c1);
  });

  it('dual-write deduplicates', async () => {
    const server = makeServer();
    const client = makeClient(server);
    const sharedOp = makeOp('shared', {}, 'mcp');

    const base = await rawCreate();
    const serverDoc = await rawApplyOp(base, JSON.stringify(sharedOp));
    await server.sync('dedup', serverDoc);

    await client.createDoc('dedup');
    await client.addOp(sharedOp);
    await client.syncWithServer();

    expect((await client.getOps()).length).toBe(1);
  });

  it('structured log captures events', async () => {
    const client = makeClient(makeServer());
    await client.createDoc('log');
    await client.addOp(makeOp('op1'));
    await client.syncWithServer();

    const events = client.syncLog.map(e => e.event);
    expect(events).toContain('add_op');
    expect(events).toContain('sync_start');
    expect(events).toContain('sync_complete');
  });
});

describe('@plat/sync/client — retry', () => {
  it('retries on null response', async () => {
    let calls = 0;
    const server = makeServer();
    const net = new DirectNetworkAdapter(async (mid, bytes) => {
      calls++;
      return calls === 1 ? null : server.sync(mid, bytes);
    });
    const client = new SyncClient(wasm, new MemoryStorageAdapter(), net, {
      actorId: 'a', debounceMs: 99999, maxRetries: 3, retryBaseMs: 10,
    });
    await client.createDoc('retry');
    await client.addOp(makeOp('op1', {}, 'a'));
    await client.syncWithServer();

    expect(calls).toBe(2);
    expect(client.syncLog.some(e => e.event === 'sync_retry')).toBe(true);
  });

  it('gives up after maxRetries', async () => {
    let calls = 0;
    const net = new DirectNetworkAdapter(async () => { calls++; return null; });
    const client = new SyncClient(wasm, new MemoryStorageAdapter(), net, {
      actorId: 'a', debounceMs: 99999, maxRetries: 2, retryBaseMs: 10,
    });
    await client.createDoc('exhaust');
    await client.addOp(makeOp('op1', {}, 'a'));
    await client.syncWithServer();

    expect(calls).toBe(3); // 1 + 2 retries
  });
});

describe('@plat/sync/client — presence', () => {
  it('setPresence + getPresence', async () => {
    const client = makeClient(makeServer());
    await client.createDoc('pres');
    let received: any[] = [];
    client.onPresence = (a) => { received = a; };
    client.setPresence({ name: 'Alice' });
    expect(received.length).toBe(1);
    expect(received[0].name).toBe('Alice');
  });

  it('updateRemotePresence + removePresence', async () => {
    const client = makeClient(makeServer());
    await client.createDoc('pres2');
    client.updateRemotePresence({ actorId: 'b', name: 'Bob' });
    expect(client.getPresence().length).toBe(1);
    client.removePresence('b');
    expect(client.getPresence().length).toBe(0);
  });
});

describe('@plat/sync/client — loadAndSync', () => {
  it('loads from storage and syncs', async () => {
    const server = makeServer();
    const storage = new MemoryStorageAdapter();
    let synced = false;

    const net1 = new DirectNetworkAdapter(async (mid, bytes) => server.sync(mid, bytes));
    const c1 = new SyncClient(wasm, storage, net1, { actorId: 'a', debounceMs: 99999 });
    await c1.createDoc('ls');
    await c1.addOp(makeOp('op1', {}, 'a'));
    await c1.saveToStorage();

    const net2 = new DirectNetworkAdapter(async (mid, bytes) => { synced = true; return server.sync(mid, bytes); });
    const c2 = new SyncClient(wasm, storage, net2, { actorId: 'a', debounceMs: 99999 });
    const found = await c2.loadAndSync('ls');

    expect(found).toBe(true);
    await new Promise(r => setTimeout(r, 50));
    expect(synced).toBe(true);
  });
});

describe('@plat/sync/client — compaction', () => {
  it('compacts when doc exceeds budget', async () => {
    const net = new DirectNetworkAdapter(async (mid, bytes) => bytes);
    const client = new SyncClient(wasm, new MemoryStorageAdapter(), net, {
      actorId: 'a', debounceMs: 99999, maxDocBytes: 1,
    });
    await client.createDoc('compact');
    await client.addOp(makeOp('op1', {}, 'a'));

    expect(client.docSize).toBeGreaterThan(1);
    await client.compactIfNeeded();
    expect(client.syncLog.some(e => e.event === 'compact')).toBe(true);
    expect((await client.getOps()).length).toBe(1); // ops survive
  });
});

describe('@plat/sync/client — getOpsSince', () => {
  it('returns ops after index', async () => {
    const client = makeClient(makeServer());
    await client.createDoc('delta');
    await client.addOp(makeOp('op0'));
    await client.addOp(makeOp('op1'));
    await client.addOp(makeOp('op2'));

    expect((await client.getOpsSince(0)).length).toBe(3);
    expect((await client.getOpsSince(1)).length).toBe(2);
    expect((await client.getOpsSince(3)).length).toBe(0);
  });
});

describe('@plat/sync/client — debounce', () => {
  it('coalesces rapid ops into one sync', async () => {
    const server = makeServer();
    let syncCount = 0;
    const net = new DirectNetworkAdapter(async (mid, bytes) => { syncCount++; return server.sync(mid, bytes); });
    const client = new SyncClient(wasm, new MemoryStorageAdapter(), net, { actorId: 'a', debounceMs: 50 });

    await client.createDoc('coalesce');
    await client.addOp(makeOp('op1', {}, 'a'));
    await client.addOp(makeOp('op2', {}, 'a'));
    await client.addOp(makeOp('op3', {}, 'a'));

    await new Promise(r => setTimeout(r, 100));
    expect(syncCount).toBe(1);
  });
});

describe('@plat/sync/client — tabId', () => {
  it('auto-generates unique tabId', () => {
    const a = makeClient(makeServer(), 'a');
    const b = makeClient(makeServer(), 'b');
    expect(a.tabId).not.toBe(b.tabId);
  });
});
