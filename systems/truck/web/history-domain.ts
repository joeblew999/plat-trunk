import initSyncWasm, {
    create_doc, apply_op, get_ops, get_op_count, get_name, set_name,
    set_op_enabled, set_group_enabled, rollback_to, merge_docs,
} from './pkg-sync/truck_sync.js';
import { loadDoc, saveDoc, loadMeta, saveMeta, type DocMeta } from './doc-store';
import { storeBlob, getBlob } from './blob-store';
import { refreshBudget } from './storage-budget';
import { cadCommand } from './dispatch';
import { reconcile } from './reconcile';
import { moduleRouter } from './core/module-router';
import { executeReplayPlan, type ReplayPlan } from './replay-executor';
import type { CadOptions } from './types';
import type { CadOperation } from '../../sync/ts/sync-types.generated';
import {
    IdbDocStore, FetchServerSync, BroadcastChannelSync,
    type BrowserDocStore, type ServerSync, type TabBroadcast,
} from './sync-interfaces';

// CadDocumentManager — truck-sync WASM-backed operation log for collaborative CAD.
// Replaces @automerge/automerge-repo + IndexedDBStorageAdapter + BroadcastChannelNetworkAdapter.
//
// Storage (IDB) and network (fetch) are injected via interfaces — fully testable
// without a browser. See sync-interfaces.ts for mock implementations.

// ── WASM init (lazy, idempotent) ─────────────────────────────────────────────
let _wasmReady: Promise<void> | null = null;
function ensureWasm(): Promise<void> {
    if (!_wasmReady) _wasmReady = initSyncWasm().then(() => {});
    return _wasmReady;
}

// ── Types ─────────────────────────────────────────────────────────────────────

/** Formal contract for BroadcastChannel messages between tabs. */
export interface SyncMessage {
    type: 'doc_update';
    modelId: string;
    bytes: number[];
    tabId: string;
}

export type { CadOperation } from '../../sync/ts/sync-types.generated';

export const SNAPSHOT_INTERVAL = 10;

// ── CadDocumentManagerBase ────────────────────────────────────────────────────

export class CadDocumentManagerBase {
    _docBytes: Uint8Array | null = null;
    _modelId: string | null = null;
    _meta: DocMeta = { name: '', snapshots: [] };
    actorId: string;
    tabId: string;
    _replayInProgress = false;
    _localOpCount = 0;
    _lastSavedOpIndex = 0;
    enabled: boolean;

    // ── Injected platform dependencies ────────────────────────────────────────
    protected _store: BrowserDocStore;
    protected _serverSync: ServerSync;
    protected _broadcast: TabBroadcast | null = null;

    constructor(
        store?: BrowserDocStore,
        serverSync?: ServerSync,
    ) {
        this.actorId = this._getOrCreateActorId();
        this.tabId = crypto.randomUUID();
        this.enabled = !(typeof window !== 'undefined' && (window as any).__cadSyncDisabled);
        // Default to production implementations when running in browser
        this._store = store ?? new IdbDocStore(saveDoc, loadDoc, loadMeta, saveMeta);
        this._serverSync = serverSync ?? new FetchServerSync();
    }

    _getOrCreateActorId(): string {
        if (typeof localStorage === 'undefined') return crypto.randomUUID();
        let id = localStorage.getItem('cad-actor-id');
        if (!id) { id = crypto.randomUUID(); localStorage.setItem('cad-actor-id', id); }
        return id;
    }

    _ctrl() { return (window as any).sceneController; }

    async initRepo(): Promise<void> {
        await ensureWasm();
    }

    async tryRestoreFromIdb(modelId: string): Promise<boolean> {
        console.log(`[Sync] IDB restore: modelId=${modelId}`);
        try {
            const bytes = await this._store.loadDoc(modelId);
            if (!bytes) {
                this._emitEvent('cad:idb-restore-failed', { modelId, reason: 'no-bytes' });
                return false;
            }
            this._docBytes = bytes;
            this._modelId = modelId;
            this._meta = await this._store.loadMeta(modelId);
            const docName = get_name(this._docBytes);
            if (docName) this._meta.name = docName;
            await this._replayScene();
            const ids = moduleRouter.query('objectIds') as string[] | null;
            const ops = this._getOps();
            const hasContent = ops.length > 0 || this._meta.snapshots.length > 0;
            console.log(`[Sync] IDB restore: ops=${ops.length} ids=${ids?.length ?? 0} hasContent=${hasContent}`);
            if (hasContent && (!ids || ids.length === 0)) {
                console.warn('[loadModel] Sync cache invalid — falling through to cloud');
                this._docBytes = null;
                this._emitEvent('cad:idb-restore-failed', { modelId, reason: 'empty-scene' });
                return false;
            }
            console.log(`[loadModel] Restored from WASM sync cache (${ops.length} ops)`);
            this._emitEvent('cad:idb-restore-done', { modelId, ops: ops.length });
            return true;
        } catch (e) {
            console.warn('[loadModel] Sync restore failed:', e);
            this._docBytes = null;
            this._emitEvent('cad:idb-restore-failed', { modelId, reason: String(e) });
            return false;
        }
    }

    async createFreshDoc(modelId: string, sceneJson: string | null, source: string): Promise<void> {
        this._docBytes = create_doc();
        this._modelId = modelId;
        const defaultName = `Model ${modelId}`;
        this._docBytes = set_name(this._docBytes, defaultName);
        this._meta = { name: defaultName, snapshots: [] };
        if (sceneJson) {
            cadCommand('clear', {}, { record: false, reconcile: false });
            cadCommand('import_scene', { json: sceneJson }, { record: false, reconcile: false });
            reconcile({});
            const snapshotRef = await storeBlob(sceneJson) as string;
            this._meta.snapshots.push({ blobRef: snapshotRef, atOpIndex: 0 });
            console.log(`[loadModel] Loaded from ${source}`);
        }
        await this._store.saveDoc(modelId, this._docBytes);
        await this._store.saveMeta(modelId, this._meta);
    }

    async adoptServerDoc(modelId: string, docBytes: Uint8Array): Promise<void> {
        this._docBytes = docBytes;
        this._modelId = modelId;
        const docName = get_name(this._docBytes) || `Model ${modelId}`;
        this._meta = { name: docName, snapshots: [] };
        const ops: CadOperation[] = JSON.parse(get_ops(this._docBytes));
        if (ops.length > 0) {
            cadCommand('clear', {}, { record: false, reconcile: false });
            for (const op of ops) {
                cadCommand(op.type, op.params, { record: false, reconcile: false, source: 'server' });
            }
            reconcile({});
            console.log(`[loadModel] Adopted server doc (${ops.length} ops)`);
        }
        await this._store.saveDoc(modelId, this._docBytes);
        await this._store.saveMeta(modelId, this._meta);
    }

    async record(type: string, params: Record<string, any> = {}, meta: any = {}): Promise<void> {
        if (!this._docBytes || !this.enabled || !this._modelId) return;

        const op: CadOperation = {
            id: crypto.randomUUID(),
            type,
            params: { ...params, _replayId: meta.objectId || null },
            enabled: true,
            timestamp: Date.now(),
            actorId: this.actorId,
            groupId: meta.groupId || null,
        };

        const nextOpCount = this._getDocOpCount() + 1;
        let snapshotRef: string | null = null;
        if (nextOpCount % SNAPSHOT_INTERVAL === 0) {
            const ctrl = this._ctrl();
            if (ctrl) snapshotRef = await storeBlob(ctrl.export_scene()) as string;
        }

        this._docBytes = apply_op(this._docBytes, JSON.stringify(op));

        if (type === 'import_ifc' && meta.hierarchy) this._meta.bimHierarchy = meta.hierarchy;
        if (snapshotRef) {
            this._meta.snapshots.push({ blobRef: snapshotRef, atOpIndex: nextOpCount });
            while (this._meta.snapshots.length > 3) this._meta.snapshots.splice(0, 1);
        }
        if (nextOpCount % SNAPSHOT_INTERVAL === 0) refreshBudget().catch(() => {});

        await this._saveAndBroadcast();
        this._localOpCount = this._getDocOpCount();
        reconcile({});
        this._renderTimeline();
    }

    async undo(): Promise<boolean> {
        if (!this._docBytes) return false;
        const ops = this._getOps();
        for (let i = ops.length - 1; i >= 0; i--) {
            if (ops[i].actorId === this.actorId && ops[i].enabled) {
                if (ops[i].groupId) {
                    this._docBytes = set_group_enabled(this._docBytes, ops[i].groupId!, false);
                } else {
                    this._docBytes = set_op_enabled(this._docBytes, ops[i].id, false);
                }
                this._meta.snapshotValidFrom = undefined;
                await this._saveAndBroadcast();
                await this._replayScene();
                this._localOpCount = this._getDocOpCount();
                return true;
            }
        }
        return false;
    }

    async redo(): Promise<boolean> {
        if (!this._docBytes) return false;
        const ops = this._getOps();
        let target = -1;
        for (let i = ops.length - 1; i >= 0; i--) {
            if (ops[i].actorId === this.actorId && !ops[i].enabled) target = i;
            else if (ops[i].actorId === this.actorId && ops[i].enabled) break;
        }
        if (target === -1) return false;
        const targetGroupId = ops[target].groupId;
        if (targetGroupId) {
            this._docBytes = set_group_enabled(this._docBytes, targetGroupId, true);
        } else {
            this._docBytes = set_op_enabled(this._docBytes, ops[target].id, true);
        }
        this._meta.snapshotValidFrom = undefined;
        await this._saveAndBroadcast();
        await this._replayScene();
        this._localOpCount = this._getDocOpCount();
        return true;
    }

    async rollback(toOpIndex: number): Promise<boolean> {
        if (!this._docBytes) return false;
        const ops = this._getOps();
        if (toOpIndex < 0 || toOpIndex >= ops.length) return false;
        this._docBytes = rollback_to(this._docBytes, this.actorId, toOpIndex);
        this._meta.snapshotValidFrom = undefined;
        await this._saveAndBroadcast();
        await this._replayScene();
        this._localOpCount = this._getDocOpCount();
        return true;
    }

    async toggleOpAtIndex(opIndex: number, groupId: string | null | undefined, currentEnabled: boolean): Promise<void> {
        if (!this._docBytes) return;
        if (groupId) {
            this._docBytes = set_group_enabled(this._docBytes, groupId, !currentEnabled);
        } else {
            const opId = this._getOps()[opIndex]?.id;
            if (opId) this._docBytes = set_op_enabled(this._docBytes, opId, !currentEnabled);
        }
        this._meta.snapshotValidFrom = undefined;
        await this._saveAndBroadcast();
        await this._replayScene();
        this._localOpCount = this._getDocOpCount();
    }

    get canUndo(): boolean {
        if (!this._docBytes) return false;
        return this._getOps().some(op => op.actorId === this.actorId && op.enabled);
    }

    get canRedo(): boolean {
        if (!this._docBytes) return false;
        let foundDisabled = false;
        const ops = this._getOps();
        for (let i = ops.length - 1; i >= 0; i--) {
            if (ops[i].actorId === this.actorId) {
                if (!ops[i].enabled) foundDisabled = true;
                else break;
            }
        }
        return foundDisabled;
    }

    get isDirty(): boolean { return this._getDocOpCount() > this._lastSavedOpIndex; }
    markSaved(): void { this._lastSavedOpIndex = this._getDocOpCount(); }
    get documentUrl(): string | null { return this._modelId; }

    get stats(): { total: number; enabled: number; disabled: number } {
        if (!this._docBytes) return { total: 0, enabled: 0, disabled: 0 };
        const ops = this._getOps();
        const enabled = ops.filter(op => op.enabled).length;
        return { total: ops.length, enabled, disabled: ops.length - enabled };
    }

    _getOps(): CadOperation[] {
        if (!this._docBytes) return [];
        try { return JSON.parse(get_ops(this._docBytes)) as CadOperation[]; }
        catch { return []; }
    }

    _getDocOpCount(): number {
        if (!this._docBytes) return 0;
        try { return get_op_count(this._docBytes); } catch { return 0; }
    }

    async _saveAndBroadcast(): Promise<void> {
        if (!this._docBytes || !this._modelId) return;
        await this._store.saveDoc(this._modelId, this._docBytes);
        await this._store.saveMeta(this._modelId, this._meta);
        if (this._broadcast) {
            this._broadcast.send(this._docBytes, this._modelId, this.tabId);
        }
        if (typeof navigator !== 'undefined' && navigator.onLine) {
            this._debouncedSync();
        }
    }

    _listenForChanges(): void {
        this._broadcast = new BroadcastChannelSync();
        this._broadcast.onMessage((bytes, modelId, tabId) => {
            if (tabId === this.tabId || modelId !== this._modelId || !this._docBytes) return;
            try {
                this._docBytes = merge_docs(this._docBytes, bytes);
                this._store.saveDoc(this._modelId!, this._docBytes).catch(() => {});
            } catch (e) {
                console.warn('[Sync] CRDT merge failed:', e);
                return;
            }
            this._scheduleRemoteReplay();
        });
    }

    private _remoteReplayTimer: ReturnType<typeof setTimeout> | null = null;

    _scheduleRemoteReplay(): void {
        if (this._replayInProgress) return;
        if (this._remoteReplayTimer) clearTimeout(this._remoteReplayTimer);
        this._remoteReplayTimer = setTimeout(() => {
            this._remoteReplayTimer = null;
            console.log('[Sync] Remote change detected, replaying scene...');
            this._replayScene('remote');
            this._localOpCount = this._getDocOpCount();
        }, 500);
    }

    _computeSnapshotValidFrom(ops: CadOperation[]): number {
        let validFrom = 0;
        for (let i = 0; i < ops.length; i++) {
            if (!ops[i].enabled) break;
            validFrom = i + 1;
        }
        return validFrom;
    }

    async _computeReplayPlan(source: 'local' | 'remote' | 'server' = 'local'): Promise<ReplayPlan> {
        const ops = this._getOps();
        let startIndex = 0;
        let snapshotJson: string | null = null;
        const validFrom = this._meta.snapshotValidFrom ?? this._computeSnapshotValidFrom(ops);
        if (this._meta.snapshotValidFrom === undefined) this._meta.snapshotValidFrom = validFrom;
        const snaps = this._meta.snapshots || [];
        for (let s = snaps.length - 1; s >= 0; s--) {
            const snap = snaps[s];
            if (snap.atOpIndex == null || snap.atOpIndex > validFrom) continue;
            let json: string | null = null;
            if (snap.blobRef) {
                try { json = await getBlob(snap.blobRef) as string | null; } catch {}
            }
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

    _emitSceneChanged(plan: ReplayPlan): void {
        this._emitEvent('cad-scene-changed', { source: plan.source, opCount: plan.totalEnabledOps });
    }

    _emitEvent(name: string, detail: object): void {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(name, { detail }));
        }
    }

    // ── Server sync ───────────────────────────────────────────────────────────

    async applyServerOp(op: CadOperation): Promise<void> {
        if (!this._docBytes || !this._modelId) return;
        cadCommand(op.type, op.params, { record: false, reconcile: false, source: 'server' });
        this._docBytes = apply_op(this._docBytes, JSON.stringify(op));
        await this._store.saveDoc(this._modelId, this._docBytes);
        this._localOpCount = this._getDocOpCount();
        reconcile({});
        this._renderTimeline();
    }

    private _syncing = false;

    async syncWithServer(): Promise<void> {
        if (!this._docBytes || !this._modelId || this._syncing) return;
        this._syncing = true;
        try {
            const serverDoc = await this._serverSync.sync(this._modelId, this.actorId, this._docBytes);
            if (!serverDoc) return;
            const localOpCount = get_op_count(this._docBytes);
            const merged = merge_docs(this._docBytes, serverDoc);
            const mergedOpCount = get_op_count(merged);
            const hadNewOps = mergedOpCount > localOpCount;
            this._docBytes = merged;
            const docName = get_name(merged);
            if (docName) { this._meta.name = docName; this._updateDocInfo(); }
            await this._store.saveDoc(this._modelId, merged);
            if (hadNewOps) {
                console.log(`[Sync] Server merge: ${localOpCount} → ${mergedOpCount} ops, replaying...`);
                await this._replayScene();
            }
            this._localOpCount = mergedOpCount;
        } catch (err) {
            console.warn('[Sync] Server sync failed:', err);
        } finally {
            this._syncing = false;
        }
    }

    private _syncTimer: ReturnType<typeof setTimeout> | null = null;

    _debouncedSync(): void {
        if (this._syncTimer) clearTimeout(this._syncTimer);
        this._syncTimer = setTimeout(() => { this._syncTimer = null; this.syncWithServer(); }, 2000);
    }

    // ── UI stubs ──────────────────────────────────────────────────────────────
    _renderTimeline(): void {}
    _updateDocInfo(): void {}
}
