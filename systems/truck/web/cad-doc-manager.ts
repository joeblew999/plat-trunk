/**
 * cad-doc-manager.ts — Thin CAD wrapper over SyncClient (ADR-0008).
 *
 * This file owns:
 *   - Op recording (knowing WHEN and WHAT to record after window.cadCommand executes)
 *   - Scene replay (knowing HOW to replay ops into the WASM geometry engine)
 *   - Snapshot management (IDB blob cache for fast replay)
 *   - UI state (canUndo/canRedo signals, timeline render)
 *
 * This file does NOT own:
 *   - CRDT doc bytes           → SyncClient
 *   - IDB persistence          → SyncClient + IdbStorageAdapter
 *   - Server sync round-trip   → SyncClient + NullNetworkAdapter (SSE owned by worker-relay.ts)
 *   - Cross-tab BroadcastChannel → SyncClient (future: BroadcastNetworkAdapter)
 *   - Network state            → SyncClient
 *   - Structured sync tracing  → SyncClient.syncLog
 */

import { loadMeta, saveMeta, type DocMeta, type SnapshotRef } from './cad-meta-store';
import { storeBlob, getBlob } from './blob-store';
import { refreshBudget } from './storage-budget';
import { moduleRouter } from './core/module-router';
import { executeReplayPlan, type ReplayPlan } from './replay-executor';
import type { CadOperation } from '../../sync/ts/shared/types';
import { SyncDoc } from '../../sync/ts/partykit/sync-doc';
import { getSceneController } from './scene-controller';

export type { CadOperation };

export const SNAPSHOT_INTERVAL = 10;

// ── CadDocumentManagerBase ────────────────────────────────────────────────────
//
// SyncDoc (automerge-partyserver) replaces SyncClient:
//   - IDB persistence    → AutomergeProvider (IndexedDBStorageAdapter) — built-in
//   - Cross-tab sync     → AutomergeProvider (BroadcastChannelNetworkAdapter) — built-in
//   - Server sync        → WebSocket to Ops Durable Object — automatic on connect
//   - Reconnect/backoff  → AutomergeProvider exponential backoff — built-in
//   - syncWithServer()   → no-op (DO WebSocket handles it)
//
// docId (automerge URL) is stored in localStorage keyed by modelId so the
// same doc is rejoined across page refreshes without needing the server.

export class CadDocumentManagerBase {
    protected _syncDoc: SyncDoc | null = null;
    protected _actorId: string;
    _modelId: string | null = null;  // public — read by dispatch, keyboard, reconcile, viewport
    enabled = true;                  // public — toggled by dispatch for local-mode

    // CAD-specific state (not sync's concern)
    protected _meta: DocMeta = { name: '', snapshots: [] };
    tabId: string;
    _replayInProgress = false;
    _lastSavedOpIndex = 0;

    constructor() {
        this.tabId = crypto.randomUUID();
        this._actorId = this._getOrCreateActorId();
    }

    _getOrCreateActorId(): string {
        if (typeof localStorage === 'undefined') return crypto.randomUUID();
        let id = localStorage.getItem('cad-actor-id');
        if (!id) { id = crypto.randomUUID(); localStorage.setItem('cad-actor-id', id); }
        return id;
    }

    // ── docId persistence — maps modelId → automerge docId in localStorage ────

    private _docIdKey(modelId: string) { return `plat-doc-id:${modelId}`; }

    private _getStoredDocId(modelId: string): string | null {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem(this._docIdKey(modelId));
    }

    private _storeDocId(modelId: string, docId: string): void {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(this._docIdKey(modelId), docId);
        }
    }

    // ── SyncDoc factory ───────────────────────────────────────────────────────

    private _makeSyncDoc(modelId: string): SyncDoc {
        const isLocal = typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const doc = new SyncDoc({
            host: window.location.host,
            room: modelId,
            actorId: this._actorId,
            protocol: isLocal ? 'ws' : 'wss',
            party: 'ops',
            indexedDB: true,
            idbName: `plat-sync-${modelId}`,
            broadcast: true,
            onStatus: (s) => console.log(`[Sync] WS ${s} (model=${modelId})`),
        });
        doc.onRemoteOps = () => this._scheduleRemoteReplay();
        return doc;
    }

    get actorId(): string { return this._actorId; }

    async initRepo(): Promise<void> {
        // No WASM needed — automerge-repo handles the CRDT
    }

    // ── Doc lifecycle ─────────────────────────────────────────────────────────

    async tryRestoreFromIdb(modelId: string): Promise<boolean> {
        console.log(`[Sync] IDB restore: modelId=${modelId}`);
        const storedDocId = this._getStoredDocId(modelId);
        if (!storedDocId) {
            this._emitEvent('cad:idb-restore-failed', { modelId, reason: 'no-doc-id' });
            return false;
        }
        try {
            this._syncDoc = this._makeSyncDoc(modelId);
            await this._syncDoc.join(storedDocId as any);
            this._modelId = modelId;

            const opCount = this._syncDoc.getOpCount();
            const hasContent = opCount > 0 || this._meta.snapshots.length > 0;
            if (!hasContent) {
                this._syncDoc.close();
                this._syncDoc = null;
                this._modelId = null;
                this._emitEvent('cad:idb-restore-failed', { modelId, reason: 'no-bytes' });
                return false;
            }

            const name = this._syncDoc.getName();
            if (name) this._meta.name = name;

            await this._refreshUndoState();
            await this._replayScene();

            const ids = moduleRouter.query('objectIds') as string[] | null;
            if (hasContent && (!ids || ids.length === 0)) {
                console.warn('[loadModel] Sync cache invalid — falling through to cloud');
                this._emitEvent('cad:idb-restore-failed', { modelId, reason: 'empty-scene' });
                return false;
            }
            this._emitEvent('cad:idb-restore-done', { modelId, ops: opCount });
            return true;
        } catch (e) {
            console.warn('[loadModel] Sync restore failed:', e);
            this._syncDoc?.close();
            this._syncDoc = null;
            this._modelId = null;
            this._emitEvent('cad:idb-restore-failed', { modelId, reason: String(e) });
            return false;
        }
    }

    async createFreshDoc(modelId: string, sceneJson: string | null, source: string): Promise<void> {
        this._syncDoc?.close();
        this._syncDoc = this._makeSyncDoc(modelId);
        const docId = await this._syncDoc.create();
        this._storeDocId(modelId, String(docId));
        this._modelId = modelId;

        this._syncDoc.setName(`Model ${modelId}`);
        this._meta = { name: `Model ${modelId}`, snapshots: [] };

        if (sceneJson) {
            window.cadCommand('clear', {}, { record: false, reconcile: false });
            window.cadCommand('import_scene', { json: sceneJson }, { record: false, reconcile: false });
            window.reconcile({});
            const snapshotRef = await storeBlob(sceneJson) as string;
            this._meta.snapshots.push({ blobRef: snapshotRef, atOpIndex: 0 });
            console.log(`[loadModel] Loaded from ${source}`);
        }
        await this._refreshUndoState();
    }

    async adoptServerDoc(modelId: string, _docBytes: Uint8Array): Promise<void> {
        const storedDocId = this._getStoredDocId(modelId);
        this._syncDoc?.close();
        this._syncDoc = this._makeSyncDoc(modelId);

        if (storedDocId) {
            await this._syncDoc.join(storedDocId as any);
        } else {
            const docId = await this._syncDoc.create();
            this._storeDocId(modelId, String(docId));
        }
        this._modelId = modelId;

        const docName = this._syncDoc.getName();
        this._meta = { name: docName || `Model ${modelId}`, snapshots: [] };

        const ops = this._syncDoc.getReplayOps();
        if (ops.length > 0) {
            window.cadCommand('clear', {}, { record: false, reconcile: false });
            for (const op of ops) {
                window.cadCommand(op.type, op.params, { record: false, reconcile: false, source: 'server' });
            }
            window.reconcile({});
            console.log(`[loadModel] Adopted server doc (${ops.length} ops)`);
        }
        await this._refreshUndoState();
    }

    // ── Op recording ──────────────────────────────────────────────────────────

    async record(type: string, params: Record<string, unknown> = {}, meta: { objectId?: string; groupId?: string; hierarchy?: unknown } = {}): Promise<void> {
        if (!this._syncDoc || !this._modelId) return;

        const op: CadOperation = {
            id: crypto.randomUUID(),
            type,
            params: { ...(params as Record<string, unknown>), _replayId: meta.objectId ?? null },
            enabled: true,
            timestamp: Date.now(),
            actorId: this.actorId,
            groupId: meta.groupId || null,
        };

        const nextOpCount = this._syncDoc.getOpCount() + 1;
        let snapshotRef: string | null = null;
        if (nextOpCount % SNAPSHOT_INTERVAL === 0) {
            const ctrl = getSceneController();
            if (ctrl) snapshotRef = await storeBlob(ctrl.export_scene()) as string;
        }

        this._syncDoc.addOp(op);

        const opCount = this._syncDoc.getOpCount();
        if (type === 'import_ifc' && meta.hierarchy) this._meta.bimHierarchy = meta.hierarchy;
        if (snapshotRef) {
            this._meta.snapshots.push({ blobRef: snapshotRef, atOpIndex: opCount });
            while (this._meta.snapshots.length > 3) this._meta.snapshots.splice(0, 1);
        }
        if (opCount % SNAPSHOT_INTERVAL === 0) refreshBudget().catch(() => {});

        window.reconcile({});
        this._renderTimeline();
    }

    async undo(): Promise<boolean> {
        if (!this._syncDoc) return false;
        const ops = this._syncDoc.getOps();
        for (let i = ops.length - 1; i >= 0; i--) {
            if (ops[i].actorId === this.actorId && ops[i].enabled) {
                if (ops[i].groupId) {
                    this._syncDoc.setGroupEnabled(ops[i].groupId!, false);
                } else {
                    this._syncDoc.undo(ops[i].id);
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
        if (!this._syncDoc) return false;
        const ops = this._syncDoc.getOps();
        let target = -1;
        for (let i = ops.length - 1; i >= 0; i--) {
            if (ops[i].actorId === this.actorId && !ops[i].enabled) target = i;
            else if (ops[i].actorId === this.actorId && ops[i].enabled) break;
        }
        if (target === -1) return false;
        const targetGroupId = ops[target].groupId;
        if (targetGroupId) {
            this._syncDoc.setGroupEnabled(targetGroupId, true);
        } else {
            this._syncDoc.redo(ops[target].id);
        }
        this._meta.snapshotValidFrom = undefined;
        await this._refreshUndoState();
        await this._replayScene();
        return true;
    }

    async rollback(toOpIndex: number): Promise<boolean> {
        if (!this._syncDoc) return false;
        const ops = this._syncDoc.getOps();
        if (toOpIndex < 0 || toOpIndex >= ops.length) return false;
        const toDisable = ops.slice(toOpIndex + 1);
        const disabledGroups = new Set<string>();
        for (const op of toDisable) {
            if (op.groupId && !disabledGroups.has(op.groupId)) {
                this._syncDoc.setGroupEnabled(op.groupId, false);
                disabledGroups.add(op.groupId);
            } else if (!op.groupId) {
                this._syncDoc.undo(op.id);
            }
        }
        this._meta.snapshotValidFrom = undefined;
        await this._refreshUndoState();
        await this._replayScene();
        return true;
    }

    async toggleOpAtIndex(opIndex: number, groupId: string | null | undefined, currentEnabled: boolean): Promise<void> {
        if (!this._syncDoc) return;
        if (groupId) {
            this._syncDoc.setGroupEnabled(groupId, !currentEnabled);
        } else {
            const opId = this._syncDoc.getOps()[opIndex]?.id;
            if (opId) {
                if (currentEnabled) this._syncDoc.undo(opId);
                else this._syncDoc.redo(opId);
            }
        }
        this._meta.snapshotValidFrom = undefined;
        await this._replayScene();
    }

    get canUndo(): boolean { return false; }
    get canRedo(): boolean { return false; }
    get isDirty(): boolean { return false; }
    async markSaved(): Promise<void> { this._lastSavedOpIndex = this._syncDoc?.getOpCount() ?? 0; }
    get documentUrl(): string | null { return this._modelId; }

    get stats() {
        const ops = this._syncDoc?.getOps() ?? [];
        const enabled = ops.filter(op => op.enabled).length;
        return { total: ops.length, enabled, disabled: ops.length - enabled };
    }

    // ── Server sync ───────────────────────────────────────────────────────────

    async applyServerOp(op: CadOperation): Promise<void> {
        if (!this._syncDoc || !this._modelId) return;
        window.cadCommand(op.type, op.params, { record: false, reconcile: false, source: 'server' });
        this._syncDoc.addOp(op);
        await this._refreshUndoState();
        window.reconcile({});
        this._renderTimeline();
    }

    async syncWithServer(): Promise<void> {
        // WebSocket to the Ops DO handles CRDT sync automatically.
        // Refresh doc name in case it changed server-side.
        if (!this._syncDoc) return;
        const name = this._syncDoc.getName();
        if (name && name !== this._meta.name) {
            this._meta.name = name;
            this._updateDocInfo();
        }
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
        const ops = this._syncDoc?.getOps() ?? [];
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
            const prevSelectedId = window._ds?.root?.selectedId ?? null;
            const plan = await this._computeReplayPlan(source);
            await executeReplayPlan(plan);
            const ids = (moduleRouter.query('objectIds') as string[] | null) ?? [];
            const ds = window._ds;
            let newSel: string | null = null;
            if (prevSelectedId && ids.includes(prevSelectedId)) newSel = prevSelectedId;
            else if (ids.length > 0) newSel = ids[ids.length - 1];
            if (newSel) window.cadCommand('select', { id: newSel }, { reconcile: false, source: 'replay' });
            if (ds?.root) ds.root.selectedId = newSel;
            window.reconcile({ selectedId: newSel });
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
    protected async _refreshUndoState(): Promise<void> {}
}
