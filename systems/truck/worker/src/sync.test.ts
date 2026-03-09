// sync.test.ts — Truck's USE of the sync system via HTTP endpoints.
//
// Tests the sync integration: POST /ops, POST /sync, GET /doc, GET /replay.
// These test how the truck worker wires sync WASM to HTTP — NOT the CRDT math
// itself (that's tested in systems/sync/crate/src/lib.rs).
//
// Another system would have its own {system}-sync.test.ts testing its own
// sync endpoints with the same sync WASM.

import { describe, it, expect } from 'vitest';
import { syncCreate, syncSetName, syncApplyOp, syncGetOps, syncMergeDocs } from './sync-wasm.generated';
import { req, makeOp } from './test-helpers';

describe('Sync Endpoints', () => {
  it('POST /api/models/:id/ops applies op, GET ops returns it', async () => {
    const modelId = 'ops-roundtrip';
    const op = makeOp('add_cube', { size: 2 });
    const postRes = await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(op),
    });
    expect(postRes.status).toBe(200);

    const getRes = await req(`/api/models/${modelId}/ops?since=-1`);
    expect(getRes.status).toBe(200);
    const ops = await getRes.json() as any[];
    expect(ops.length).toBe(1);
    expect(ops[0].type).toBe('add_cube');
    expect(ops[0].actorId).toBe('test-actor');
  });

  it('POST /sync: name from CRDT doc propagates to manifest', async () => {
    const modelId = 'name-sync-test';
    await req(`/api/models/${modelId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Old Name', scene: '[]' }),
    });

    let doc = await syncCreate();
    doc = await syncSetName(doc, 'CRDT Name');

    const syncRes = await req(`/api/models/${modelId}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: doc,
    });
    expect(syncRes.status).toBe(200);

    const manifestRes = await req(`/api/models/${modelId}`);
    const manifest = await manifestRes.json() as any;
    expect(manifest.name).toBe('CRDT Name');
  });

  it('POST /sync: merge preserves ops from both sides', async () => {
    const modelId = `merge-test-${crypto.randomUUID().slice(0, 8)}`;
    // Browser creates doc and applies first op (browser is doc origin)
    let browserDoc = await syncCreate();
    const browserOp = makeOp('add_cube', { size: 3 }, 'browser');
    browserDoc = await syncApplyOp(browserDoc, JSON.stringify(browserOp));

    // First sync: browser sends doc to server (server has no doc yet, adopts browser's)
    const firstSync = await req(`/api/models/${modelId}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: browserDoc,
    });
    expect(firstSync.status).toBe(200);

    // Server side: apply a second op via POST /ops (appends to the same CRDT doc)
    const serverOp = makeOp('add_sphere', { radius: 1 }, 'server');
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(serverOp),
    });

    // Second sync: browser sends its (stale) doc, server merges both
    const syncRes = await req(`/api/models/${modelId}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: browserDoc,
    });
    expect(syncRes.status).toBe(200);

    // Verify merged doc has both ops
    const opsRes = await req(`/api/models/${modelId}/ops?since=-1`);
    const ops = await opsRes.json() as any[];
    expect(ops.length).toBe(2);
    const types = ops.map((o: any) => o.type).sort();
    expect(types).toEqual(['add_cube', 'add_sphere']);
  });

  it('GET /api/models/:id/doc returns raw CRDT bytes or 404', async () => {
    const res404 = await req('/api/models/no-such-doc/doc');
    expect(res404.status).toBe(404);

    const modelId = `doc-get-${crypto.randomUUID().slice(0, 8)}`;
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_cube', { size: 1 })),
    });
    const res = await req(`/api/models/${modelId}/doc`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/octet-stream');
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(10);
  });

  it('POST /sync with no server doc adopts browser doc (lineage proof)', async () => {
    const modelId = `adopt-${crypto.randomUUID().slice(0, 8)}`;
    let browserDoc = await syncCreate();
    browserDoc = await syncApplyOp(browserDoc, JSON.stringify(
      makeOp('add_cube', { size: 5 }, 'browser')
    ));

    // Sync to server (no server doc exists) — server should adopt
    const syncRes = await req(`/api/models/${modelId}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: browserDoc,
    });
    expect(syncRes.status).toBe(200);

    // Server adds an op via POST /ops (appends to adopted doc — same lineage)
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_sphere', { radius: 1 }, 'mcp-server')),
    });

    // Verify both ops
    const opsRes = await req(`/api/models/${modelId}/ops?since=-1`);
    const ops = await opsRes.json() as any[];
    expect(ops.length).toBe(2);
    const types = ops.map((o: any) => o.type).sort();
    expect(types).toEqual(['add_cube', 'add_sphere']);

    // Prove shared lineage: merge must not duplicate
    const docRes = await req(`/api/models/${modelId}/doc`);
    const serverDoc = new Uint8Array(await docRes.arrayBuffer());
    const merged = await syncMergeDocs(browserDoc, serverDoc);
    const mergedOps = JSON.parse(await syncGetOps(merged)) as any[];
    expect(mergedOps.length).toBe(2);
  });

  it('dual-write via sync endpoint: server records op, browser syncs same op', async () => {
    const modelId = `dualwrite-${crypto.randomUUID().slice(0, 8)}`;
    const opId = crypto.randomUUID();
    const op = {
      id: opId, type: 'add_sphere', params: { radius: 2 },
      enabled: true, timestamp: Date.now(), actorId: 'mcp-server', groupId: null,
    };

    // 1. Server records op via POST /ops
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(op),
    });

    // 2. Browser also applied the same op (simulating SSE applyServerOp)
    let browserDoc = await syncCreate();
    browserDoc = await syncApplyOp(browserDoc, JSON.stringify(op));

    // 3. Browser syncs — merge must not duplicate
    const syncRes = await req(`/api/models/${modelId}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: browserDoc,
    });
    expect(syncRes.status).toBe(200);

    // 4. Verify: server doc has exactly 1 op after merge
    const opsRes = await req(`/api/models/${modelId}/ops?since=-1`);
    const ops = await opsRes.json() as any[];
    expect(ops.length).toBe(1);
    expect(ops[0].id).toBe(opId);
  });

  it('multiple interleaved server/browser ops then sync', async () => {
    const modelId = `interleave-${crypto.randomUUID().slice(0, 8)}`;

    // Browser creates doc with 2 ops
    let browserDoc = await syncCreate();
    browserDoc = await syncApplyOp(browserDoc, JSON.stringify(makeOp('add_cube', { size: 1 }, 'browser')));
    browserDoc = await syncApplyOp(browserDoc, JSON.stringify(makeOp('add_sphere', { radius: 0.5 }, 'browser')));

    // First sync: browser sends doc to server
    await req(`/api/models/${modelId}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: browserDoc,
    });

    // Server adds 2 ops via POST /ops (interleaved with browser)
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_cylinder', { radius: 0.3, height: 2 }, 'mcp-server')),
    });
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_torus', { majorRadius: 1, minorRadius: 0.2 }, 'mcp-server')),
    });

    // Browser adds another op locally (without syncing)
    browserDoc = await syncApplyOp(browserDoc, JSON.stringify(makeOp('add_cube', { size: 3 }, 'browser')));

    // Second sync: browser sends stale doc, server merges
    const syncRes = await req(`/api/models/${modelId}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: browserDoc,
    });
    expect(syncRes.status).toBe(200);

    // Verify: all 5 ops present, none lost
    const opsRes = await req(`/api/models/${modelId}/ops?since=-1`);
    const ops = await opsRes.json() as any[];
    expect(ops.length).toBe(5);
    const types = ops.map((o: any) => o.type).sort();
    expect(types).toEqual(['add_cube', 'add_cube', 'add_cylinder', 'add_sphere', 'add_torus']);
  });

  it('ops returned in timestamp order after merge', async () => {
    const modelId = `order-${crypto.randomUUID().slice(0, 8)}`;
    const now = Date.now();

    // Create ops with explicit timestamps out of order
    const op1 = { id: crypto.randomUUID(), type: 'add_cube', params: { size: 1 },
      enabled: true, timestamp: now, actorId: 'first', groupId: null };
    const op2 = { id: crypto.randomUUID(), type: 'add_sphere', params: { radius: 1 },
      enabled: true, timestamp: now + 100, actorId: 'second', groupId: null };
    const op3 = { id: crypto.randomUUID(), type: 'add_cylinder', params: { radius: 0.5, height: 2 },
      enabled: true, timestamp: now + 200, actorId: 'third', groupId: null };

    // Apply op3 first, then op1, then op2 to the server
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(op3),
    });
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(op1),
    });
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(op2),
    });

    // GET ops should return in insertion order (Automerge list order)
    const opsRes = await req(`/api/models/${modelId}/ops?since=-1`);
    const ops = await opsRes.json() as any[];
    expect(ops.length).toBe(3);
    // Ops come back in the order they were applied (list append order)
    expect(ops[0].actorId).toBe('third');
    expect(ops[1].actorId).toBe('first');
    expect(ops[2].actorId).toBe('second');
  });

  it('DELETE cascade: removes automerge.bin along with manifest', async () => {
    const modelId = `cascade-${crypto.randomUUID().slice(0, 8)}`;

    // Create model with manifest + CRDT doc
    await req(`/api/models/${modelId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Cascade Test', scene: '[]' }),
    });
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_cube', { size: 1 })),
    });

    // Verify both exist
    expect((await req(`/api/models/${modelId}`)).status).toBe(200);
    expect((await req(`/api/models/${modelId}/doc`)).status).toBe(200);

    // Delete
    const delRes = await req(`/api/models/${modelId}`, { method: 'DELETE' });
    expect(delRes.status).toBe(200);

    // Both must be gone
    expect((await req(`/api/models/${modelId}`)).status).toBe(404);
    expect((await req(`/api/models/${modelId}/doc`)).status).toBe(404);
  });

  it('sequential POST /ops to same model accumulate correctly', async () => {
    // In production, a single Worker isolate serializes requests.
    // True concurrent writes from different isolates need Durable Objects.
    const modelId = `sequential-${crypto.randomUUID().slice(0, 8)}`;

    const res1 = await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_cube', { size: 1 }, 'actor-a')),
    });
    expect(res1.status).toBe(200);

    const res2 = await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_sphere', { radius: 1 }, 'actor-b')),
    });
    expect(res2.status).toBe(200);

    const opsRes = await req(`/api/models/${modelId}/ops?since=-1`);
    const ops = await opsRes.json() as any[];
    expect(ops.length).toBe(2);
    const types = ops.map((o: any) => o.type).sort();
    expect(types).toEqual(['add_cube', 'add_sphere']);
  });

  it('POST /ops with existing doc uses etag retry on conflict', async () => {
    const modelId = `etag-${crypto.randomUUID().slice(0, 8)}`;
    // Create initial doc
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_cube', { size: 1 }, 'setup')),
    });

    // Two sequential writes to existing doc — etag path exercised
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_sphere', { radius: 1 }, 'actor-a')),
    });
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_cylinder', { radius: 0.5, height: 2 }, 'actor-b')),
    });

    const opsRes = await req(`/api/models/${modelId}/ops?since=-1`);
    const ops = await opsRes.json() as any[];
    expect(ops.length).toBe(3);
  });
});

describe('Replay', () => {
  it('GET /api/models/:id/replay returns headless WASM scene', async () => {
    const modelId = 'replay-test';
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_cube', { size: 2 })),
    });

    const res = await req(`/api/models/${modelId}/replay`);
    expect(res.status).toBe(200);
    const scene = await res.json() as any;
    expect(Array.isArray(scene)).toBe(true);
    expect(scene.length).toBeGreaterThanOrEqual(1);
  }, 15_000);

  it('replay with multiple ops produces correct object count', async () => {
    const modelId = `replay-multi-${crypto.randomUUID().slice(0, 8)}`;
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_cube', { size: 1 })),
    });
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_sphere', { radius: 0.5 })),
    });
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_cylinder', { radius: 0.3, height: 2 })),
    });

    const res = await req(`/api/models/${modelId}/replay`);
    expect(res.status).toBe(200);
    const scene = await res.json() as any[];
    expect(scene.length).toBe(3);
    const names = scene.map((o: any) => o.name).sort();
    expect(names).toEqual(['Box 1', 'Cylinder 1', 'Sphere 1']);
  }, 15_000);

  it('replay of nonexistent model returns 404', async () => {
    const res = await req('/api/models/no-such-replay/replay');
    expect(res.status).toBe(404);
  });

  it('replay excludes disabled ops', async () => {
    const modelId = `replay-disabled-${crypto.randomUUID().slice(0, 8)}`;
    // Enabled op
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_cube', { size: 1 })),
    });
    // Disabled op — should NOT appear in replay
    const disabledOp = { ...makeOp('add_sphere', { radius: 2 }), enabled: false };
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(disabledOp),
    });

    // Verify both ops stored
    const opsRes = await req(`/api/models/${modelId}/ops?since=-1`);
    const ops = await opsRes.json() as any[];
    expect(ops.length).toBe(2);

    // Replay should only produce 1 object (the cube)
    const res = await req(`/api/models/${modelId}/replay`);
    expect(res.status).toBe(200);
    const scene = await res.json() as any[];
    expect(scene.length).toBe(1);
    expect(scene[0].name).toBe('Box 1');
  }, 15_000);
});

describe('Sync Merge', () => {
  it('POST /sync self-merge is idempotent', async () => {
    const modelId = `selfmerge-${crypto.randomUUID().slice(0, 8)}`;

    // Create doc with 2 ops
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_cube', { size: 1 })),
    });
    await req(`/api/models/${modelId}/ops`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeOp('add_sphere', { radius: 0.5 })),
    });

    // Get the doc
    const docRes = await req(`/api/models/${modelId}/doc`);
    const docBytes = new Uint8Array(await docRes.arrayBuffer());

    // Sync the doc back to the server (merge with itself)
    const syncRes = await req(`/api/models/${modelId}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: docBytes,
    });
    expect(syncRes.status).toBe(200);

    // Ops should still be exactly 2
    const opsRes = await req(`/api/models/${modelId}/ops?since=-1`);
    const ops = await opsRes.json() as any[];
    expect(ops.length).toBe(2);
  });

  it('POST /sync with multi-actor docs merges all ops', async () => {
    const modelId = `multi-actor-${crypto.randomUUID().slice(0, 8)}`;

    // Actor A creates doc with an op
    let docA = await syncCreate();
    docA = await syncApplyOp(docA, JSON.stringify(makeOp('add_cube', { size: 1 }, 'actor-alice')));

    // Upload A's doc
    await req(`/api/models/${modelId}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: docA,
    });

    // Actor B creates independent doc with a different op
    let docB = await syncCreate();
    docB = await syncApplyOp(docB, JSON.stringify(makeOp('add_sphere', { radius: 2 }, 'actor-bob')));

    // B syncs — server should merge A's and B's ops
    const syncRes = await req(`/api/models/${modelId}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: docB,
    });
    expect(syncRes.status).toBe(200);

    // Verify merged result has both ops from different actors
    const opsRes = await req(`/api/models/${modelId}/ops?since=-1`);
    const ops = await opsRes.json() as any[];
    expect(ops.length).toBe(2);
    const actors = ops.map((o: any) => o.actorId).sort();
    expect(actors).toEqual(['actor-alice', 'actor-bob']);
  });
});
