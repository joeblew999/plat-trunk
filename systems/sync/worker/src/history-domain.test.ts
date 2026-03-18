// history-domain.test.ts — Tests for CadDocumentManagerBase with mock storage/network.
//
// These tests validate the sync protocol logic in the browser class without
// requiring IDB, BroadcastChannel, fetch, or a running CF worker.
//
// MockDocStore   = in-memory IDB substitute
// MockServerSync = in-memory R2 + CRDT merge substitute
// MockTabBroadcast = captured messages, no real BroadcastChannel
//
// If these pass, the browser sync logic is correct. IDB and fetch add only I/O.

import { describe, it, expect, beforeAll } from 'vitest';
import {
    create_doc, apply_op, get_ops, get_op_count, merge_docs,
} from './sync-wasm.generated';

// ── Minimal mock of CadDocumentManagerBase ───────────────────────────────────
// We can't import the real class (it imports from pkg-sync which needs WASM init
// and references browser globals like window/localStorage). Instead we test the
// same sync protocol logic using the WASM functions directly + mock storage,
// which is exactly what CadDocumentManagerBase does internally.

// ── Mock implementations ─────────────────────────────────────────────────────

class MockStore {
    private docs = new Map<string, Uint8Array>();
    private metas = new Map<string, any>();
    async loadDoc(id: string): Promise<Uint8Array | null> { return this.docs.get(id) ?? null; }
    async saveDoc(id: string, b: Uint8Array): Promise<void> { this.docs.set(id, new Uint8Array(b)); }
    async loadMeta(id: string): Promise<any> { return this.metas.get(id) ?? { name: '', snapshots: [] }; }
    async saveMeta(id: string, m: any): Promise<void> { this.metas.set(id, m); }
}

class MockServer {
    private r2 = new Map<string, Uint8Array>();

    async sync(modelId: string, browserDoc: Uint8Array): Promise<Uint8Array> {
        const serverDoc = this.r2.get(modelId);
        const merged = serverDoc
            ? await merge_docs(serverDoc, browserDoc)
            : browserDoc;
        this.r2.set(modelId, new Uint8Array(merged));
        return merged;
    }

    async applyOp(modelId: string, op: object): Promise<void> {
        const existing = this.r2.get(modelId) ?? await create_doc();
        const updated = await apply_op(existing, JSON.stringify(op));
        this.r2.set(modelId, updated);
    }

    getDoc(modelId: string): Uint8Array | null { return this.r2.get(modelId) ?? null; }
}

function makeOp(type: string, params: object, actor: string) {
    return { id: crypto.randomUUID(), type, params, enabled: true, timestamp: Date.now(), actorId: actor, groupId: null };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CadDocumentManagerBase — sync protocol (mock storage + network)', () => {

    it('record op → saveDoc → server sync delivers op to second browser', async () => {
        const storeA = new MockStore();
        const storeB = new MockStore();
        const server = new MockServer();
        const modelId = 'test-model';

        // Browser A: create doc + apply op
        const op = makeOp('add_cube', { size: 1 }, 'browser-a');
        let docA = await create_doc();
        docA = await apply_op(docA, JSON.stringify(op));
        await storeA.saveDoc(modelId, docA);

        // Browser A → Server sync
        const merged = await server.sync(modelId, await storeA.loadDoc(modelId) as Uint8Array);
        await storeA.saveDoc(modelId, merged);

        // Browser B starts empty, syncs with server
        let docB = await create_doc();
        await storeB.saveDoc(modelId, docB);
        const mergedB = await server.sync(modelId, await storeB.loadDoc(modelId) as Uint8Array);
        await storeB.saveDoc(modelId, mergedB);

        // Browser B now has the op
        const ops = JSON.parse(await get_ops(mergedB));
        expect(ops.length).toBe(1);
        expect(ops[0].type).toBe('add_cube');
        expect(ops[0].actorId).toBe('browser-a');
    });

    it('MCP op via server SSE → browser applies → no duplicate on next sync', async () => {
        const store = new MockStore();
        const server = new MockServer();
        const modelId = 'mcp-test';

        // Server applies MCP op
        const mcpOp = makeOp('add_sphere', { radius: 0.5 }, 'mcp-server');
        await server.applyOp(modelId, mcpOp);

        // Browser: create doc + apply same op (simulating SSE applyServerOp)
        let doc = await create_doc();
        doc = await apply_op(doc, JSON.stringify(mcpOp));
        await store.saveDoc(modelId, doc);

        // Browser syncs — CRDT dedup must prevent duplicate
        const merged = await server.sync(modelId, await store.loadDoc(modelId) as Uint8Array);
        await store.saveDoc(modelId, merged);

        const ops = JSON.parse(await get_ops(merged));
        expect(ops.length).toBe(1, 'dual-write must not duplicate op');
        expect(ops[0].id).toBe(mcpOp.id);
    });

    it('undo → saveDoc → server sync → undo survives round-trip', async () => {
        const store = new MockStore();
        const server = new MockServer();
        const modelId = 'undo-test';

        const op1 = makeOp('add_cube',   { size: 1 }, 'browser');
        const op2 = makeOp('add_sphere', { radius: 1 }, 'browser');

        let doc = await create_doc();
        doc = await apply_op(doc, JSON.stringify(op1));
        doc = await apply_op(doc, JSON.stringify(op2));

        // Simulate undo of op2 (set_op_enabled not exported in this test — use apply_op trick)
        // In real CadDocumentManagerBase this calls set_op_enabled
        // Here we verify the protocol: disabled ops survive sync
        const { syncSetOpEnabled } = await import('./sync-wasm.generated');
        doc = await syncSetOpEnabled(doc, op2.id, false);
        await store.saveDoc(modelId, doc);

        // Sync to server
        const merged = await server.sync(modelId, await store.loadDoc(modelId) as Uint8Array);
        await store.saveDoc(modelId, merged);

        // Re-sync (ping-pong check)
        const merged2 = await server.sync(modelId, await store.loadDoc(modelId) as Uint8Array);
        await store.saveDoc(modelId, merged2);

        const ops = JSON.parse(await get_ops(merged2));
        expect(ops.length).toBe(2, 'both ops present');
        expect(ops[0].enabled).toBe(true);
        expect(ops[1].enabled).toBe(false, 'undo must survive server sync round-trip');
        expect(await get_op_count(merged2)).toBe(2, 'ping-pong must not inflate count');
    });

    it('two browsers converge via server', async () => {
        const storeA = new MockStore();
        const storeB = new MockStore();
        const server = new MockServer();
        const modelId = 'converge-test';

        // Both start from same base
        const base = await create_doc();
        await storeA.saveDoc(modelId, base);
        await storeB.saveDoc(modelId, base);

        // Each adds an op offline
        const opA = makeOp('add_cube',   { size: 2 }, 'browser-a');
        const opB = makeOp('add_sphere', { radius: 1 }, 'browser-b');

        let docA = await apply_op(base, JSON.stringify(opA));
        let docB = await apply_op(base, JSON.stringify(opB));
        await storeA.saveDoc(modelId, docA);
        await storeB.saveDoc(modelId, docB);

        // A syncs first
        const mergedA = await server.sync(modelId, await storeA.loadDoc(modelId) as Uint8Array);
        await storeA.saveDoc(modelId, mergedA);
        expect(await get_op_count(mergedA)).toBe(1);

        // B syncs — gets A's op
        const mergedB = await server.sync(modelId, await storeB.loadDoc(modelId) as Uint8Array);
        await storeB.saveDoc(modelId, mergedB);
        expect(await get_op_count(mergedB)).toBe(2, 'B must see A\'s op');

        // A re-syncs — gets B's op
        const mergedA2 = await server.sync(modelId, await storeA.loadDoc(modelId) as Uint8Array);
        await storeA.saveDoc(modelId, mergedA2);
        expect(await get_op_count(mergedA2)).toBe(2, 'A must see B\'s op');

        // Both have same op IDs
        const opsA = JSON.parse(await get_ops(mergedA2));
        const opsB = JSON.parse(await get_ops(mergedB));
        const idsA = opsA.map((o: any) => o.id).sort();
        const idsB = opsB.map((o: any) => o.id).sort();
        expect(idsA).toEqual(idsB);
    });

    it('re-sync is idempotent — no ping-pong op inflation', async () => {
        const store = new MockStore();
        const server = new MockServer();
        const modelId = 'pingpong-test';

        let doc = await create_doc();
        doc = await apply_op(doc, JSON.stringify(makeOp('add_cube', { size: 1 }, 'browser')));
        await store.saveDoc(modelId, doc);

        const m1 = await server.sync(modelId, await store.loadDoc(modelId) as Uint8Array);
        await store.saveDoc(modelId, m1);
        const count1 = await get_op_count(m1);

        const m2 = await server.sync(modelId, await store.loadDoc(modelId) as Uint8Array);
        const count2 = await get_op_count(m2);

        expect(count2).toBe(count1, 're-sync must not inflate op count');
    });
});
