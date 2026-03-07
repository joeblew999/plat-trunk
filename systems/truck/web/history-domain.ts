import initSyncWasm, {
    create_doc, apply_op, get_ops,
    set_op_enabled, set_group_enabled, rollback_to, merge_docs,
} from './pkg-sync/truck_sync.js';
import { saveDoc, loadDoc, loadMeta, saveMeta, type DocMeta } from './doc-store';
import { storeBlob, getBlob } from './blob-store';
import { cadCommand } from './dispatch';
import { reconcile } from './reconcile';
import { moduleRouter } from './core/module-router';
import { resetTierState, registerWarmObjects } from './tier-manager';
import type { CadOptions, SceneEntry } from './types';
import type { CadOperation } from '../../sync/ts/sync-types.generated';

// CadDocumentManager — truck-sync WASM-backed operation log for collaborative CAD.
// Replaces @automerge/automerge-repo + IndexedDBStorageAdapter + BroadcastChannelNetworkAdapter.
//
// Doc bytes are stored in IDB ('cad-sync') via doc-store.ts.
// Cross-tab sync uses BroadcastChannel + CRDT merge_docs().
//
// Sidecar metadata (name, snapshots, bimHierarchy) is stored alongside doc bytes in IDB.
// Snapshots are NOT part of the CRDT op log — they are local optimisation caches.

// ── WASM init (lazy, idempotent) ─────────────────────────────────────────────
let _wasmReady: Promise<void> | null = null;
function ensureWasm(): Promise<void> {
    if (!_wasmReady) _wasmReady = initSyncWasm().then(() => {});
    return _wasmReady;
}

// ── Types ─────────────────────────────────────────────────────────────────────

/** Formal contract for BroadcastChannel messages between tabs.
 *  TypeScript enforces this shape — missing modelId is now a compile error.
 *  Maps to truck-sync Op bytes: apply_op returns bytes, merge_docs takes bytes. */
export interface SyncMessage {
    type: 'doc_update';
    modelId: string;      // Scope: only merge when this matches local model
    bytes: number[];      // Uint8Array serialised as Array (structured clone compatible)
    actorId: string;      // Filter: skip own messages
}

// CadOperation is now generated from Rust Op struct — imported above, re-exported here.
export type { CadOperation } from '../../sync/ts/sync-types.generated';

export const SNAPSHOT_INTERVAL = 10;

// ── CadDocumentManagerBase ────────────────────────────────────────────────────

export class CadDocumentManagerBase {
    _docBytes: Uint8Array | null = null;
    _modelId: string | null = null;
    _meta: DocMeta = { name: '', snapshots: [] };
    actorId: string;
    _replayInProgress = false;
    _localOpCount = 0;
    _lastSavedOpIndex = 0;
    enabled: boolean;
    _bc: BroadcastChannel | null = null;

    constructor() {
        this.actorId = this._getOrCreateActorId();
        this.enabled = !window.__cadSyncDisabled;
    }

    _getOrCreateActorId(): string {
        let id = localStorage.getItem('cad-actor-id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('cad-actor-id', id);
        }
        return id;
    }

    _ctrl() { return window.sceneController; }

    /** Initialize the truck-sync WASM. Called by boot.ts before loadModel(). */
    async initRepo(): Promise<void> {
        await ensureWasm();
    }

    /** Try to load a doc from IDB. Returns true if scene was successfully replayed.
     *  Dispatches cad:idb-restore-done or cad:idb-restore-failed for observability. */
    async tryRestoreFromIdb(modelId: string): Promise<boolean> {
        console.log(`[Sync] IDB restore: modelId=${modelId}`);
        try {
            const bytes = await loadDoc(modelId);
            if (!bytes) {
                window.dispatchEvent(new CustomEvent('cad:idb-restore-failed', { detail: { modelId, reason: 'no-bytes' } }));
                return false;
            }
            this._docBytes = bytes;
            this._modelId = modelId;
            this._meta = await loadMeta(modelId);
            await this._replayScene();
            const ids = moduleRouter.query('objectIds') as string[] | null;
            const ops = this._getOps();
            const hasContent = ops.length > 0 || this._meta.snapshots.length > 0;
            console.log(`[Sync] IDB restore: ops=${ops.length} ids=${ids?.length ?? 0} hasContent=${hasContent}`);
            if (hasContent && (!ids || ids.length === 0)) {
                console.warn('[loadModel] Sync cache invalid (blobs missing?) — falling through to cloud');
                this._docBytes = null;
                window.dispatchEvent(new CustomEvent('cad:idb-restore-failed', { detail: { modelId, reason: 'empty-scene' } }));
                return false;
            }
            console.log(`[loadModel] Restored from WASM sync cache (${ops.length} ops)`);
            window.dispatchEvent(new CustomEvent('cad:idb-restore-done', { detail: { modelId, ops: ops.length } }));
            return true;
        } catch (e) {
            console.warn('[loadModel] Sync restore failed:', e);
            this._docBytes = null;
            window.dispatchEvent(new CustomEvent('cad:idb-restore-failed', { detail: { modelId, reason: String(e) } }));
            return false;
        }
    }

    /** Create a fresh doc and optionally import scene JSON into WASM. */
    async createFreshDoc(modelId: string, sceneJson: string | null, source: string): Promise<void> {
        this._docBytes = create_doc();
        this._modelId = modelId;
        this._meta = { name: `Model ${modelId}`, snapshots: [] };
        if (sceneJson) {
            cadCommand('clear', {}, { record: false, reconcile: false });
            cadCommand('import_scene', { json: sceneJson }, { record: false, reconcile: false });
            reconcile({});
            const snapshotRef = await storeBlob(sceneJson) as string;
            this._meta.snapshots.push({ blobRef: snapshotRef, atOpIndex: 0 });
            console.log(`[loadModel] Loaded from ${source}`);
        }
        await saveDoc(modelId, this._docBytes);
        await saveMeta(modelId, this._meta);
    }

    /** Record a completed operation into the WASM op log.
     *  Fire-and-forget — WASM has already executed. */
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

        if (type === 'import_ifc' && meta.hierarchy) {
            this._meta.bimHierarchy = meta.hierarchy;
        }
        if (snapshotRef) {
            this._meta.snapshots.push({ blobRef: snapshotRef, atOpIndex: nextOpCount });
            while (this._meta.snapshots.length > 3) this._meta.snapshots.splice(0, 1);
        }

        await this._saveAndBroadcast();
        this._localOpCount = this._getDocOpCount();
        reconcile({});
        this._renderTimeline();
    }

    /** Undo last own enabled op (or group) — sets enabled=false and replays. */
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
                await this._saveAndBroadcast();
                await this._replayScene();
                this._localOpCount = this._getDocOpCount();
                return true;
            }
        }
        return false;
    }

    /** Redo — re-enable first disabled own op/group from end of disabled streak. */
    async redo(): Promise<boolean> {
        if (!this._docBytes) return false;
        const ops = this._getOps();
        let target = -1;
        for (let i = ops.length - 1; i >= 0; i--) {
            if (ops[i].actorId === this.actorId && !ops[i].enabled) {
                target = i;
            } else if (ops[i].actorId === this.actorId && ops[i].enabled) {
                break;
            }
        }
        if (target === -1) return false;
        const targetGroupId = ops[target].groupId;
        if (targetGroupId) {
            this._docBytes = set_group_enabled(this._docBytes, targetGroupId, true);
        } else {
            this._docBytes = set_op_enabled(this._docBytes, ops[target].id, true);
        }
        await this._saveAndBroadcast();
        await this._replayScene();
        this._localOpCount = this._getDocOpCount();
        return true;
    }

    /** Rollback: disable all own ops after toOpIndex, then replay. */
    async rollback(toOpIndex: number): Promise<boolean> {
        if (!this._docBytes) return false;
        const ops = this._getOps();
        if (toOpIndex < 0 || toOpIndex >= ops.length) return false;
        this._docBytes = rollback_to(this._docBytes, this.actorId, toOpIndex);
        await this._saveAndBroadcast();
        await this._replayScene();
        this._localOpCount = this._getDocOpCount();
        return true;
    }

    /** Toggle enabled on a single op or group (called from timeline UI). */
    async toggleOpAtIndex(opIndex: number, groupId: string | null | undefined, currentEnabled: boolean): Promise<void> {
        if (!this._docBytes) return;
        if (groupId) {
            this._docBytes = set_group_enabled(this._docBytes, groupId, !currentEnabled);
        } else {
            const opId = this._getOps()[opIndex]?.id;
            if (opId) this._docBytes = set_op_enabled(this._docBytes, opId, !currentEnabled);
        }
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

    get isDirty(): boolean {
        return this._getDocOpCount() > this._lastSavedOpIndex;
    }

    markSaved(): void {
        this._lastSavedOpIndex = this._getDocOpCount();
    }

    /** Model ID used as the document reference (no longer an Automerge URL). */
    get documentUrl(): string | null {
        return this._modelId;
    }

    get stats(): { total: number; enabled: number; disabled: number } {
        if (!this._docBytes) return { total: 0, enabled: 0, disabled: 0 };
        const ops = this._getOps();
        const enabled = ops.filter(op => op.enabled).length;
        return { total: ops.length, enabled, disabled: ops.length - enabled };
    }

    _getOps(): CadOperation[] {
        if (!this._docBytes) return [];
        try {
            return JSON.parse(get_ops(this._docBytes)) as CadOperation[];
        } catch {
            return [];
        }
    }

    _getDocOpCount(): number {
        return this._getOps().length;
    }

    async _saveAndBroadcast(): Promise<void> {
        if (!this._docBytes || !this._modelId) return;
        await saveDoc(this._modelId, this._docBytes);
        await saveMeta(this._modelId, this._meta);
        if (this._bc) {
            try {
                const msg: SyncMessage = {
                    type: 'doc_update',
                    modelId: this._modelId,
                    bytes: Array.from(this._docBytes),
                    actorId: this.actorId,
                };
                this._bc.postMessage(msg);
            } catch { /* BroadcastChannel may be closed */ }
        }
    }

    _listenForChanges(): void {
        this._bc = new BroadcastChannel('cad-sync');
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        this._bc.onmessage = (event) => {
            const msg = event.data as Partial<SyncMessage>;
            const { type, bytes, actorId, modelId } = msg;
            if (type !== 'doc_update' || actorId === this.actorId) return;
            if (modelId !== this._modelId) return;  // ignore other models
            if (!this._docBytes) return;
            try {
                if (!bytes) return;
                this._docBytes = merge_docs(this._docBytes, new Uint8Array(bytes));
                saveDoc(this._modelId!, this._docBytes).catch(() => {});
            } catch (e) {
                console.warn('[Sync] CRDT merge failed:', e);
                return;
            }
            if (this._replayInProgress) return;
            clearTimeout(debounceTimer!);
            debounceTimer = setTimeout(() => {
                console.log('[Sync] Remote change detected, replaying scene...');
                this._replayScene();
                this._localOpCount = this._getDocOpCount();
            }, 100);
        };
    }

    async _replayScene(): Promise<void> {
        if (!moduleRouter.ready || this._replayInProgress) return;
        this._replayInProgress = true;
        try {
            const ops = this._getOps();
            const REPLAY = { record: false, reconcile: false, source: 'replay' };
            const prevSelectedId = window._ds?.root?.selectedId ?? null;

            await resetTierState();

            let startIndex = 0;
            let snapshotJson: string | null = null;
            const snaps = this._meta.snapshots || [];
            for (let s = snaps.length - 1; s >= 0; s--) {
                const snap = snaps[s];
                if (snap.atOpIndex == null) continue;
                let json: string | null = null;
                if (snap.blobRef) {
                    try { json = await getBlob(snap.blobRef) as string | null; }
                    catch (err) { console.warn('[BlobStore] Snapshot fetch failed:', err); }
                }
                if (!json) continue;
                let valid = true;
                for (let i = 0; i < snap.atOpIndex && i < ops.length; i++) {
                    if (!ops[i].enabled) { valid = false; break; }
                }
                if (valid) { snapshotJson = json; startIndex = snap.atOpIndex; break; }
            }

            const PROGRESSIVE_THRESHOLD = 50;
            let entries: SceneEntry[] | null = null;
            if (snapshotJson) {
                try { entries = JSON.parse(snapshotJson); } catch { entries = null; }
            }
            const useProgressive = entries && Array.isArray(entries) && entries.length >= PROGRESSIVE_THRESHOLD;

            if (useProgressive) {
                await this._progressiveLoad(entries!, ops, startIndex, REPLAY);
            } else {
                if (snapshotJson) {
                    cadCommand('import_scene', { json: snapshotJson }, REPLAY);
                } else {
                    cadCommand('clear', {}, REPLAY);
                }
                await this._replayRemainingOps(ops, startIndex, REPLAY);
            }

            const ids = (moduleRouter.query('objectIds') as string[] | null) ?? [];
            const ds = window._ds;
            let newSel: string | null = null;
            if (prevSelectedId && ids.includes(prevSelectedId)) {
                newSel = prevSelectedId;
            } else if (ids.length > 0) {
                newSel = ids[ids.length - 1];
            }
            if (newSel) cadCommand('select', { id: newSel }, { reconcile: false, source: 'replay' });
            if (ds?.root) ds.root.selectedId = newSel;
            reconcile({ selectedId: newSel });
            this._renderTimeline();
        } finally {
            this._replayInProgress = false;
        }
    }

    async _replayRemainingOps(ops: CadOperation[], startIndex: number, REPLAY: CadOptions): Promise<void> {
        for (let i = startIndex; i < ops.length; i++) {
            if (ops[i].enabled) {
                const op = ops[i];
                let replayParams = op.params;
                if (op.params.blobRef) {
                    const blob = await getBlob(op.params.blobRef);
                    const dataKey = op.type === 'import_scene' ? 'json' : 'data';
                    replayParams = { ...op.params, [dataKey]: blob };
                }
                cadCommand(op.type, replayParams, REPLAY);
            }
        }
    }

    async _progressiveLoad(entries: SceneEntry[], ops: CadOperation[], startIndex: number, REPLAY: CadOptions): Promise<void> {
        const ctrl = this._ctrl();
        if (!ctrl) return;
        const modelId = window.__modelId;
        cadCommand('clear', {}, REPLAY);

        const neededIds = new Set<string>();
        for (let i = startIndex; i < ops.length; i++) {
            if (!ops[i].enabled) continue;
            const p = ops[i].params;
            if (p.id) neededIds.add(p.id);
            if (p.objectId) neededIds.add(p.objectId);
            if (p._replayId) neededIds.add(p._replayId);
            if (p.selA) neededIds.add(p.selA);
            if (p.selB) neededIds.add(p.selB);
        }

        let frustum: any = null;
        const viewport = document.querySelector('cad-viewport') as any;
        if (viewport?.camera) {
            const THREE = await import('three');
            const cam = viewport.camera;
            cam.updateMatrixWorld();
            cam.updateProjectionMatrix();
            frustum = new THREE.Frustum();
            const vp = new THREE.Matrix4();
            vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
            frustum.setFromProjectionMatrix(vp);
        }
        const THREE = frustum ? await import('three') : null;

        const hotEntries: SceneEntry[] = [];
        const warmEntries: SceneEntry[] = [];
        for (const entry of entries) {
            const isNeeded = neededIds.has(entry.id);
            let isVisible = true;
            if (frustum && THREE && entry.bounding_sphere) {
                const [cx, cy, cz, r] = entry.bounding_sphere;
                isVisible = frustum.intersectsSphere(new THREE.Sphere(new THREE.Vector3(cx, cy, cz), r));
            }
            (isNeeded || isVisible ? hotEntries : warmEntries).push(entry);
        }

        for (const entry of hotEntries) ctrl.import_entry(JSON.stringify(entry));
        if (warmEntries.length > 0) {
            const { bulkPutObjects } = await import('./object-store');
            await bulkPutObjects(modelId, warmEntries.map(e => ({ objectId: e.id, entryJson: JSON.stringify(e) })));
            const warmSphereMap = new Map();
            for (const entry of warmEntries) {
                if (entry.bounding_sphere) {
                    const [cx, cy, cz, r] = entry.bounding_sphere;
                    const color = entry.style?.albedo || [0.5, 0.5, 0.5, 1.0];
                    ctrl.add_lod_proxy(JSON.stringify({ objectId: entry.id, center: [cx, cy, cz], radius: r, color }));
                    warmSphereMap.set(entry.id, { center: [cx, cy, cz], radius: r, color });
                }
            }
            registerWarmObjects(warmSphereMap);
        }

        console.log(`[Progressive] ${hotEntries.length} Hot, ${warmEntries.length} Warm, ${ops.length - startIndex} remaining ops`);
        await this._replayRemainingOps(ops, startIndex, REPLAY);
    }

    // ── UI stubs ──────────────────────────────────────────────────────────────
    _renderTimeline(): void {}
    _updateDocInfo(): void {}
}
