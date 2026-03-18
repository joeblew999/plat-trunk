/**
 * sync-interfaces.ts — Injectable interfaces for sync storage and network.
 *
 * CadDocumentManagerBase depends on these interfaces, not on concrete IDB/fetch
 * implementations. This makes the class fully testable in vitest with mock
 * implementations — no IDB, no BroadcastChannel, no fetch required.
 *
 * Platform implementations:
 *   IdbDocStore      → doc-store.ts  (browser IDB)
 *   R2DocStore       → systems/truck/worker/src/doc-store.ts (CF R2)
 *   MockDocStore     → this file, exported for tests
 *   MockServerSync   → this file, exported for tests
 */

import type { DocMeta } from './doc-store';

// ── Storage ───────────────────────────────────────────────────────────────────

/** Platform-agnostic doc + metadata storage. Browser = IDB, Worker = R2. */
export interface BrowserDocStore {
    loadDoc(modelId: string): Promise<Uint8Array | null>;
    saveDoc(modelId: string, bytes: Uint8Array): Promise<void>;
    loadMeta(modelId: string): Promise<DocMeta>;
    saveMeta(modelId: string, meta: DocMeta): Promise<void>;
}

// ── Network ───────────────────────────────────────────────────────────────────

/** Platform-agnostic server sync. Browser = fetch, tests = mock. */
export interface ServerSync {
    /** POST doc bytes to server, receive merged doc bytes back. */
    sync(modelId: string, actorId: string, docBytes: Uint8Array): Promise<Uint8Array | null>;
}

// ── BroadcastChannel ─────────────────────────────────────────────────────────

/** Platform-agnostic cross-tab messaging. Browser = BroadcastChannel, tests = mock. */
export interface TabBroadcast {
    send(bytes: Uint8Array, modelId: string, tabId: string): void;
    onMessage(handler: (bytes: Uint8Array, modelId: string, tabId: string) => void): void;
    close(): void;
}

// ── Mock implementations (for vitest) ─────────────────────────────────────────

/** In-memory DocStore — no IDB required. Use in vitest tests. */
export class MockDocStore implements BrowserDocStore {
    private docs = new Map<string, Uint8Array>();
    private metas = new Map<string, DocMeta>();

    async loadDoc(modelId: string): Promise<Uint8Array | null> {
        return this.docs.get(modelId) ?? null;
    }
    async saveDoc(modelId: string, bytes: Uint8Array): Promise<void> {
        this.docs.set(modelId, bytes);
    }
    async loadMeta(modelId: string): Promise<DocMeta> {
        return this.metas.get(modelId) ?? { name: '', snapshots: [] };
    }
    async saveMeta(modelId: string, meta: DocMeta): Promise<void> {
        this.metas.set(modelId, meta);
    }
}

/** In-memory ServerSync — simulates CF Worker R2 merge. Use in vitest tests. */
export class MockServerSync implements ServerSync {
    private r2 = new Map<string, Uint8Array>();
    private _mergeDoc: ((local: Uint8Array, remote: Uint8Array) => Uint8Array) | null = null;
    private _createDoc: (() => Uint8Array) | null = null;

    /** Inject WASM functions after WASM init. */
    init(createDoc: () => Uint8Array, mergeDocs: (a: Uint8Array, b: Uint8Array) => Uint8Array) {
        this._createDoc = createDoc;
        this._mergeDoc = mergeDocs;
    }

    async sync(modelId: string, _actorId: string, browserDoc: Uint8Array): Promise<Uint8Array | null> {
        if (!this._mergeDoc) return null;
        const serverDoc = this.r2.get(modelId);
        const merged = serverDoc
            ? this._mergeDoc(serverDoc, browserDoc)
            : browserDoc;
        this.r2.set(modelId, new Uint8Array(merged));
        return merged;
    }

    /** Directly apply an op server-side (simulates MCP executeServerDirect). */
    applyOp(modelId: string, op: object, applyOpFn: (doc: Uint8Array, json: string) => Uint8Array, createDocFn: () => Uint8Array): void {
        const existing = this.r2.get(modelId) ?? createDocFn();
        const updated = applyOpFn(existing, JSON.stringify(op));
        this.r2.set(modelId, updated);
    }

    getR2Doc(modelId: string): Uint8Array | null {
        return this.r2.get(modelId) ?? null;
    }
}

/** No-op TabBroadcast — captures sent messages. Use in vitest tests. */
export class MockTabBroadcast implements TabBroadcast {
    sent: Array<{ bytes: Uint8Array; modelId: string; tabId: string }> = [];
    private _handler: ((bytes: Uint8Array, modelId: string, tabId: string) => void) | null = null;

    send(bytes: Uint8Array, modelId: string, tabId: string): void {
        this.sent.push({ bytes, modelId, tabId });
    }
    onMessage(handler: (bytes: Uint8Array, modelId: string, tabId: string) => void): void {
        this._handler = handler;
    }
    /** Simulate receiving a message from another tab. */
    receive(bytes: Uint8Array, modelId: string, tabId: string): void {
        this._handler?.(bytes, modelId, tabId);
    }
    close(): void {}
}

// ── Production IDB adapter ────────────────────────────────────────────────────

/** Wraps doc-store.ts functions into the BrowserDocStore interface. */
export class IdbDocStore implements BrowserDocStore {
    constructor(
        private readonly _saveDoc: (id: string, b: Uint8Array) => Promise<void>,
        private readonly _loadDoc: (id: string) => Promise<Uint8Array | null>,
        private readonly _loadMeta: (id: string) => Promise<DocMeta>,
        private readonly _saveMeta: (id: string, m: DocMeta) => Promise<void>,
    ) {}

    loadDoc(id: string) { return this._loadDoc(id); }
    saveDoc(id: string, b: Uint8Array) { return this._saveDoc(id, b); }
    loadMeta(id: string) { return this._loadMeta(id); }
    saveMeta(id: string, m: DocMeta) { return this._saveMeta(id, m); }
}

// ── Production fetch adapter ──────────────────────────────────────────────────

/** Wraps fetch into the ServerSync interface. */
export class FetchServerSync implements ServerSync {
    async sync(modelId: string, actorId: string, docBytes: Uint8Array): Promise<Uint8Array | null> {
        try {
            const resp = await fetch(`/api/models/${modelId}/sync?actorId=${actorId}`, {
                method: 'POST',
                body: docBytes as unknown as BodyInit,
                headers: { 'content-type': 'application/octet-stream' },
            });
            if (!resp.ok) return null;
            return new Uint8Array(await resp.arrayBuffer());
        } catch {
            return null;
        }
    }
}

// ── Production BroadcastChannel adapter ──────────────────────────────────────

import type { SyncMessage } from './history-domain';

/** Wraps BroadcastChannel into the TabBroadcast interface. */
export class BroadcastChannelSync implements TabBroadcast {
    private _bc: BroadcastChannel;

    constructor(channelName = 'cad-sync') {
        this._bc = new BroadcastChannel(channelName);
    }

    send(bytes: Uint8Array, modelId: string, tabId: string): void {
        try {
            const msg: SyncMessage = { type: 'doc_update', modelId, bytes: Array.from(bytes), tabId };
            this._bc.postMessage(msg);
        } catch { /* channel may be closed */ }
    }

    onMessage(handler: (bytes: Uint8Array, modelId: string, tabId: string) => void): void {
        this._bc.onmessage = (event) => {
            const msg = event.data as Partial<SyncMessage>;
            if (msg.type !== 'doc_update' || !msg.bytes || !msg.modelId || !msg.tabId) return;
            handler(new Uint8Array(msg.bytes), msg.modelId, msg.tabId);
        };
    }

    close(): void { this._bc.close(); }
}
