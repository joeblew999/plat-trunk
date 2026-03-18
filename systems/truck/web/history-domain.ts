/**
 * history-domain.ts — Thin CAD wrapper over SyncClient (ADR-0008).
 *
 * This file owns:
 *   - Op recording (knowing WHEN and WHAT to record after cadCommand executes)
 *   - Scene replay (knowing HOW to replay ops into the WASM geometry engine)
 *   - Snapshot management (IDB blob cache for fast replay)
 *   - UI state (canUndo/canRedo signals, timeline render)
 *
 * This file does NOT own:
 *   - CRDT doc bytes           → SyncClient
 *   - IDB persistence          → SyncClient + IdbStorageAdapter
 *   - Server sync round-trip   → SyncClient + HttpSseNetworkAdapter
 *   - Cross-tab BroadcastChannel → SyncClient (future: BroadcastNetworkAdapter)
 *   - Network state            → SyncClient
 *   - Structured sync tracing  → SyncClient.syncLog
 */

import initSyncWasm, {
    create_doc, apply_op, get_ops, get_op_count, get_name, set_name,
    set_op_enabled, set_group_enabled, rollback_to,
} from './pkg-sync/truck_sync.js';
import { loadMeta, saveMeta, type DocMeta, type SnapshotRef } from './doc-store';
import { storeBlob, getBlob } from './blob-store';
import { refreshBudget } from './storage-budget';
import { cadCommand } from './dispatch';
import { reconcile } from './reconcile';
import { moduleRouter } from './core/module-router';
import { executeReplayPlan, type ReplayPlan } from './replay-executor';
import type { CadOperation } from '../../sync/ts/sync-types.generated';
import { SyncClient, type SyncWasmAdapter } from '../../sync/ts/sync-client';
import { IdbStorageAdapter, HttpSseNetworkAdapter } from '../../sync/ts/adapters';

export type { CadOperation };
export interface SyncMessage {
    type: 'doc_update';
    modelId: string;
    bytes: number[];
    tabId: string;
}

export const SNAPSHOT_INTERVAL = 10;

// ── WASM init ─────────────────────────────────────────────────────────────────
let _wasmReady: Promise<void> | null = null;
function ensureWasm(): Promise<void> {
    if (!_wasmReady) _wasmReady = initSyncWasm().then(() => {});
    return _wasmReady;
}

// ── SyncWasm adapter — wraps async generated WASM functions ───────────────────
// SyncWasmAdapter is async (matches wasm-bindgen generated signatures).
// merge_docs is intentionally not used by SyncClient directly —
// server merges happen via syncWithServer() using network.postSync().
const syncWasmAdapter: SyncWasmAdapter = {
    create_doc: () => Promise.resolve(create_doc()),
    apply_op: (doc, json) => Promise.resolve(apply_op(doc, json)),
    merge_docs: async (_a, _b) => { throw new Error('use SyncClient.syncWithServer()'); },
    get_ops: (doc) => Promise.resolve(get_ops(doc)),
    get_op_count: (doc) => Promise.resolve(get_op_count(doc)),
    get_replay_ops: (doc) => {
        const all: CadOperation[] = JSON.parse(get_ops(doc));
        return Promise.resolve(JSON.stringify(all.filter(o => o.enabled)));
    },
    set_op_enabled: (doc, id, en) => Promise.resolve(set_op_enabled(doc, id, en)),
    set_group_enabled: (doc, gid, en) => Promise.resolve(set_group_enabled(doc, gid, en)),
    rollback_to: (doc, actor, idx) => Promise.resolve(rollback_to(doc, actor, idx)),
    get_name: (doc) => Promise.resolve(get_name(doc)),
    set_name: (doc, name) => Promise.resolve(set_name(doc, name)),
};

// ── Snapshot metadata imported from doc-store (CAD concern, not sync) ───────────

// ── CadDocumentManagerBase ────────────────────────────────────────────────────

export class CadDocumentManagerBase {
    // SyncClient owns all CRDT + sync logic
    protected _sync: SyncClient;
    protected _net: HttpSseNetworkAdapter;

    // CAD-specific state (not sync's concern)
    protected _meta: DocMeta = { name: '', snapshots: [] };
    tabId: string;
    _replayInProgress = false;
    _lastSavedOpIndex = 0;

    constructor() {
        this.tabId = crypto.randomUUID();
        const actorId = this._getOrCreateActorId();
        this._net = new HttpSseNetworkAdapter();

        this._sync = new SyncClient(
            syncWasmAdapter,
            new IdbStorageAdapter(),
            this._net,
            { actorId, debounceMs: 2000 },
        );

        // When remote ops arrive — trigger scene replay
        this._sync.onRemoteOps = (_ops) => {
            this._scheduleRemoteReplay();
        };

        // Network state events
        this._sync.onNetworkState = (online) => {
            console.log(`[CAD] Network: ${online ? 'online' : 'offline'}`);
        };

        // Sync errors
        this._sync.onError = (err, ctx) => {
            console.warn(`[CAD] Sync error in ${ctx}:`, err);
        };

        // Wire up online/offline detection
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this._sync.goOnline());
            window.addEventListener('offline', () => this._sync.goOffline());
        }
    }

    _getOrCreateActorId(): string {
        if (typeof localStorage === 'undefined') return crypto.randomUUID();
        let id = localStorage.getItem('cad-actor-id');
        if (!id) { id = crypto.randomUUID(); localStorage.setItem('cad-actor-id', id); }
        return id;
    }

    get actorId(): string { return (this._sync as any).opts?.actorId ?? ''; }
    _ctrl() { return (window as any).sceneController; }

    async initRepo(): Promise<void> {
        await ensureWasm();
    }

    // ── Doc lifecycle ─────────────────────────────────────────────────────────

    async tryRestoreFromIdb(modelId: string): Promise<boolean> {
        console.log(`[Sync] IDB restore: modelId=${modelId}`);
        try {
            const found = await this._sync.loadFromStorage(modelId);
            if (!found) {
                this._emitEvent('cad:idb-restore-failed', { modelId, reason: 'no-bytes' });
                return false;
            }
            this._sync.listen(modelId);
            await this._replayScene();
            const ids = moduleRouter.query('objectIds') as string[] | null;
            const opCount = await this._sync.getOpCount();
            const hasContent = opCount > 0 || this._meta.snapshots.length > 0;
            if (hasContent && (!ids || ids.length === 0)) {
                console.warn('[loadModel] Sync cache invalid — falling through to cloud');
                this._emitEvent('cad:idb-restore-failed', { modelId, reason: 'empty-scene' });
                return false;
            }
            this._emitEvent('cad:idb-restore-done', { modelId, ops: opCount });
            return true;
        } catch (e) {
            console.warn('[loadModel] Sync restore failed:', e);
            this._emitEvent('cad:idb-restore-failed', { modelId, reason: String(e) });
            return false;
        }
    }

    async createFreshDoc(modelId: string, sceneJson: string | null, source: string): Promise<void> {
        this._sync.createDoc(modelId);
        this._sync.setName(`Model ${modelId}`);
        this._meta = { name: `Model ${modelId}`, snapshots: [] };

        if (sceneJson) {
            cadCommand('clear', {}, { record: false, reconcile: false });
            cadCommand('import_scene', { json: sceneJson }, { record: false, reconcile: false });
            reconcile({});
            const snapshotRef = await storeBlob(sceneJson) as string;
            this._meta.snapshots.push({ blobRef: snapshotRef, atOpIndex: 0 });
            console.log(`[loadModel] Loaded from ${source}`);
        }
        await this._sync.saveToStorage();
        this._sync.listen(modelId);
    }

    async adoptServerDoc(modelId: string, docBytes: Uint8Array): Promise<void> {
        this._sync.adoptDoc(modelId, docBytes);
        const docName = await this._sync.getName();
        this._meta = { name: docName || `Model ${modelId}`, snapshots: [] };

        const ops = await this._sync.getReplayOps();
        if (ops.length > 0) {
            cadCommand('clear', {}, { record: false, reconcile: false });
            for (const op of ops) {
                cadCommand(op.type, op.params, { record: false, reconcile: false, source: 'server' });
            }
            reconcile({});
            console.log(`[loadModel] Adopted server doc (${ops.length} ops)`);
        }
        await this._sync.saveToStorage();
        this._sync.listen(modelId);
    }

    // ── Op recording ──────────────────────────────────────────────────────────

    async record(type: string, params: Record<string, any> = {}, meta: any = {}): Promise<void> {
        if (!this._sync.docBytes || !this._sync.modelId) return;

        const op: CadOperation = {
            id: crypto.randomUUID(),
            type,
            params: { ...params, _replayId: meta.objectId || null },
            enabled: true,
            timestamp: Date.now(),
            actorId: this.actorId,
            groupId: meta.groupId || null,
        };

        const nextOpCount = await this._sync.getOpCount() + 1;
        let snapshotRef: string | null = null;
        if (nextOpCount % SNAPSHOT_INTERVAL === 0) {
            const ctrl = this._ctrl();
            if (ctrl) snapshotRef = await storeBlob(ctrl.export_scene()) as string;
        }

        await this._sync.addOp(op);

        const opCount = await this._sync.getOpCount();
        if (type === 'import_ifc' && meta.hierarchy) this._meta.bimHierarchy = meta.hierarchy;
        if (snapshotRef) {
            this._meta.snapshots.push({ blobRef: snapshotRef, atOpIndex: opCount });
            while (this._meta.snapshots.length > 3) this._meta.snapshots.splice(0, 1);
        }
        if (opCount % SNAPSHOT_INTERVAL === 0) refreshBudget().catch(() => {});

        reconcile({});
        this._renderTimeline();
    }

    async undo(): Promise<boolean> {
        const ops = await this._sync.getOps();
        for (let i = ops.length - 1; i >= 0; i--) {
            if (ops[i].actorId === this.actorId && ops[i].enabled) {
                if (ops[i].groupId) {
                    await this._sync.setGroupEnabled(ops[i].groupId!, false);
                } else {
                    await this._sync.setOpEnabled(ops[i].id, false);
                }
                this._meta.snapshotValidFrom = undefined;
                await this._refreshUndoState();
                await this._replayScene();
                return true;
            }
        }
        return false;
    }

    async redo(): Promise<boolean> {
        const ops = await this._sync.getOps();
        let target = -1;
        for (let i = ops.length - 1; i >= 0; i--) {
            if (ops[i].actorId === this.actorId && !ops[i].enabled) target = i;
            else if (ops[i].actorId === this.actorId && ops[i].enabled) break;
        }
        if (target === -1) return false;
        const targetGroupId = ops[target].groupId;
        if (targetGroupId) {
            await this._sync.setGroupEnabled(targetGroupId, true);
        } else {
            await this._sync.setOpEnabled(ops[target].id, true);
        }
        this._meta.snapshotValidFrom = undefined;
        await this._refreshUndoState();
        await this._replayScene();
        return true;
    }

    async rollback(toOpIndex: number): Promise<boolean> {
        const ops = await this._sync.getOps();
        if (toOpIndex < 0 || toOpIndex >= ops.length) return false;
        await this._sync.rollbackTo(toOpIndex);
        this._meta.snapshotValidFrom = undefined;
        await this._refreshUndoState();
        await this._replayScene();
        return true;
    }

    async toggleOpAtIndex(opIndex: number, groupId: string | null | undefined, currentEnabled: boolean): Promise<void> {
        if (groupId) {
            await this._sync.setGroupEnabled(groupId, !currentEnabled);
        } else {
            const opId = (await this._sync.getOps())[opIndex]?.id;
            if (opId) await this._sync.setOpEnabled(opId, !currentEnabled);
        }
        this._meta.snapshotValidFrom = undefined;
        await this._replayScene();
    }

    get canUndo(): boolean { return false; } // sync via this._sync.canUndo() async
    get canRedo(): boolean { return false; } // sync via this._sync.canRedo() async
    get isDirty(): boolean { return false; } // use async isDirtyAsync()
    async markSaved(): Promise<void> { this._lastSavedOpIndex = await this._sync.getOpCount(); }
    get documentUrl(): string | null { return this._sync.modelId; }

    get stats() {
        const ops = await this._sync.getOps();
        const enabled = ops.filter(op => op.enabled).length;
        return { total: ops.length, enabled, disabled: ops.length - enabled };
    }

    // ── Server sync (delegates to SyncClient) ─────────────────────────────────

    async applyServerOp(op: CadOperation): Promise<void> {
        if (!this._sync.docBytes || !this._sync.modelId) return;
        cadCommand(op.type, op.params, { record: false, reconcile: false, source: 'server' });
        await this._sync.addOp(op);
        await this._refreshUndoState();
        reconcile({});
        this._renderTimeline();
    }

    async syncWithServer(): Promise<void> {
        const { hadNewOps } = await this._sync.syncWithServer();
        const name = await this._sync.getName();
        if (name) { this._meta.name = name; this._updateDocInfo(); }
        if (hadNewOps) await this._replayScene();
    }

    // ── Replay (CAD concern — not sync's) ────────────────────────────────────

    _computeSnapshotValidFrom(ops: CadOperation[]): number {
        let validFrom = 0;
        for (let i = 0; i < ops.length; i++) {
            if (!ops[i].enabled) break;
            validFrom = i + 1;
        }
        return validFrom;
    }

    async _computeReplayPlan(source: 'local' | 'remote' | 'server' = 'local'): Promise<ReplayPlan> {
        const ops = await this._sync.getOps();
        let startIndex = 0;
        let snapshotJson: string | null = null;
        const validFrom = this._meta.snapshotValidFrom ?? this._computeSnapshotValidFrom(ops);
        if (this._meta.snapshotValidFrom === undefined) this._meta.snapshotValidFrom = validFrom;
        for (let s = (this._meta.snapshots || []).length - 1; s >= 0; s--) {
            const snap = this._meta.snapshots[s];
            if (snap.atOpIndex == null || snap.atOpIndex > validFrom) continue;
            let json: string | null = null;
            if (snap.blobRef) { try { json = await getBlob(snap.blobRef) as string | null; } catch {} }
            if (json) { snapshotJson = json; startIndex = snap.atOpIndex; break; }
        }
        return { snapshotJson, startIndex, ops, totalEnabledOps: ops.filter(o => o.enabled).length, source };
    }

    async _replayScene(source: 'local' | 'remote' | 'server' = 'local'): Promise<void> {
        if (!moduleRouter.ready || this._replayInProgress) return;
        this._replayInProgress = true;
        try {
            const prevSelectedId = (window as any)._ds?.root?.selectedId ?? null;
            const plan = await this._computeReplayPlan(source);
            await executeReplayPlan(plan);
            const ids = (moduleRouter.query('objectIds') as string[] | null) ?? [];
            const ds = (window as any)._ds;
            let newSel: string | null = null;
            if (prevSelectedId && ids.includes(prevSelectedId)) newSel = prevSelectedId;
            else if (ids.length > 0) newSel = ids[ids.length - 1];
            if (newSel) cadCommand('select', { id: newSel }, { reconcile: false, source: 'replay' });
            if (ds?.root) ds.root.selectedId = newSel;
            reconcile({ selectedId: newSel });
            this._renderTimeline();
            this._emitSceneChanged(plan);
        } finally {
            this._replayInProgress = false;
        }
    }

    private _remoteReplayTimer: ReturnType<typeof setTimeout> | null = null;
    _scheduleRemoteReplay(): void {
        if (this._replayInProgress) return;
        if (this._remoteReplayTimer) clearTimeout(this._remoteReplayTimer);
        this._remoteReplayTimer = setTimeout(() => {
            this._remoteReplayTimer = null;
            this._replayScene('remote');
        }, 500);
    }

    _emitSceneChanged(plan: ReplayPlan): void {
        this._emitEvent('cad-scene-changed', { source: plan.source, opCount: plan.totalEnabledOps });
    }

    _emitEvent(name: string, detail: object): void {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(name, { detail }));
        }
    }

    // ── UI stubs ──────────────────────────────────────────────────────────────
    _renderTimeline(): void {}
    _updateDocInfo(): void {}
}
