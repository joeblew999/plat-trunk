import { cadCommand, reconcile, moduleRouter, getSchema } from './state.js';
import { storeBlob, getBlob } from './blob-store.js';
import { resetTierState, registerWarmObjects } from './tier-manager.js';
import { api } from './api-client.js';

// CadDocumentManager — Automerge-backed operation log for collaborative CAD.
// Acts as a SUBSCRIBER (like bc?.broadcast() in test-hono), NOT a gateway.
// cadCommand() always executes WASM directly; this records ops after the fact.
//
// Document schema:
//   { name, createdAt, operations: CadOperation[], snapshots?: [{json, atOpIndex}] }
//
// Each CadOperation:
//   { id, type, params, enabled, timestamp, actorId, groupId? }
//
// Undo = set enabled=false on last own op (or entire group). Redo = re-enable.
// Scene is rebuilt by replaying all enabled ops from the last checkpoint.

import { Repo, isValidAutomergeUrl, IndexedDBStorageAdapter, BroadcastChannelNetworkAdapter } from './vendor/automerge-bundle.js';

const SNAPSHOT_INTERVAL = 10; // checkpoint every N ops for faster replay

class CadDocumentManager {
    constructor() {
        this.repo = null;
        this.handle = null;
        this.actorId = this._getOrCreateActorId();
        this._replayInProgress = false;
        this._suppressChangeReplay = false;
        this._localOpCount = 0;
        this._lastSavedOpIndex = 0;  // op count at last cloud save
        this.enabled = !window.__cadSyncDisabled;
    }

    _getOrCreateActorId() {
        let id = localStorage.getItem('cad-actor-id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('cad-actor-id', id);
        }
        return id;
    }

    _ctrl() { return window.sceneController; }

    /** Initialize the Automerge repo with local storage + cross-tab sync */
    async init(networkAdapters = []) {
        const adapters = [
            new BroadcastChannelNetworkAdapter(),
            ...networkAdapters,
        ];

        this.repo = new Repo({
            network: adapters,
            storage: new IndexedDBStorageAdapter('cad-docs'),
        });

        // Check URL for ?doc= parameter
        const params = new URLSearchParams(window.location.search);
        const docParam = params.get('doc');
        const modelId = window.__modelId;

        if (docParam && isValidAutomergeUrl(docParam)) {
            console.log(`[Automerge] Loading doc from URL: ${docParam}`);
            await this.loadDocument(docParam);
        } else {
            // Check localStorage for document associated with this modelId
            const modelDocUrl = localStorage.getItem(`cad-doc-url-${modelId}`);
            if (modelDocUrl && isValidAutomergeUrl(modelDocUrl)) {
                console.log(`[Automerge] Loading doc for model ${modelId}: ${modelDocUrl}`);
                await this.loadDocument(modelDocUrl);
            } else {
                // New model with no local doc — create new + try cloud
                console.log(`[Automerge] Creating new doc for model ${modelId}`);
                await this.createDocument(`Model ${modelId}`);
            }
        }
    }

    /** Create a new document with empty op log */
    async createDocument(name) {
        this.handle = this.repo.create({
            name: name || 'Untitled',
            createdAt: new Date().toISOString(),
            operations: [],
        });

        await this.handle.doc();

        // First visit — load baseline scene (cloud model or demo).
        // These are navigation/restore actions, NOT user edits.
        // Store as snapshot (baseline state) — not as an Automerge operation.
        // This means you can't "undo" opening a model, which is correct.
        const modelId = window.__modelId;
        const exampleParam = new URLSearchParams(window.location.search).get('example');
        let sceneJson = null;
        if (exampleParam) {
            // Example file requested via ?example= query param (from dropdown)
            try {
                const res = await fetch(`examples/${exampleParam}`);
                if (res.ok) {
                    sceneJson = await res.text();
                    console.log(`[Example] Loaded "${exampleParam}" as baseline`);
                }
            } catch (e) {
                console.warn(`[Example] Failed to load "${exampleParam}":`, e);
            }
        } else {
            // Try cloud model first, fall back to default cube
            try {
                const res = await api.models[':id'].scene.$get({ param: { id: modelId } });
                if (res.ok) {
                    sceneJson = await res.text();
                    console.log(`[Cloud] Loaded model "${modelId}" from cloud`);
                }
            } catch (e) {
                console.warn(`[Cloud] Model "${modelId}" not in cloud, loading default`, e);
            }
            if (!sceneJson) {
                try {
                    const res = await fetch('examples/default-cube.json');
                    if (res.ok) sceneJson = await res.text();
                } catch (e) {
                    console.warn('[Demo] Failed to load demo scene:', e);
                }
            }
        }

        if (sceneJson) {
            // Import into WASM — data plane commands used for navigation (override schema defaults)
            cadCommand('clear', {}, { record: false, reconcile: false });
            cadCommand('import_scene', { json: sceneJson }, { record: false, reconcile: false });
            reconcile({});

            // Store as baseline snapshot at op index 0 (not an operation)
            const snapshotRef = await storeBlob(sceneJson);
            this.handle.change(d => {
                if (!d.snapshots) d.snapshots = [];
                d.snapshots.push({ blobRef: snapshotRef, atOpIndex: 0 });
            });
        }

        this._localOpCount = this._getDocOpCount();
        this._lastSavedOpIndex = this._localOpCount;  // baseline = "saved"
        localStorage.setItem('cad-last-doc-url', this.handle.url);
        localStorage.setItem(`cad-doc-url-${modelId}`, this.handle.url);
        this._listenForChanges();
        this._updateDocInfo();
        this._renderTimeline();
        return this.handle.url;
    }

    /** Load an existing document by Automerge URL */
    async loadDocument(url) {
        this.handle = await this.repo.find(url);
        const modelId = window.__modelId;
        localStorage.setItem('cad-last-doc-url', url);
        localStorage.setItem(`cad-doc-url-${modelId}`, url);
        this._listenForChanges();
        await this._replayScene();

        // Fallback: if doc exists but scene is empty (e.g. blob store was wiped),
        // try loading from cloud API as a recovery measure.
        const ids = moduleRouter.query('objectIds');
        const doc = this.handle.doc();
        const hasOps = doc?.operations?.length > 0;
        if ((!ids || ids.length === 0) && !hasOps) {
            try {
                const res = await api.models[':id'].scene.$get({ param: { id: modelId } });
                if (res.ok) {
                    const sceneJson = await res.text();
                    if (sceneJson) {
                        cadCommand('clear', {}, { record: false, reconcile: false });
                        cadCommand('import_scene', { json: sceneJson }, { record: false, reconcile: false });
                        reconcile({});
                        // Store as baseline snapshot (matches createDocument behavior)
                        const snapshotRef = await storeBlob(sceneJson);
                        this.handle.change(d => {
                            if (!d.snapshots) d.snapshots = [];
                            d.snapshots.push({ blobRef: snapshotRef, atOpIndex: 0 });
                        });
                        console.log(`[Cloud] Recovered model "${modelId}" from cloud`);
                    }
                }
            } catch (e) {
                console.warn(`[Cloud] Recovery fetch failed for "${modelId}":`, e);
            }
        }

        this._localOpCount = this._getDocOpCount();
        this._lastSavedOpIndex = this._localOpCount;  // baseline = "saved"
        this._updateDocInfo();
        return url;
    }

    /** Record a completed operation into the Automerge op log.
     *  Fire-and-forget — WASM has already executed. This is for undo/redo and cross-tab sync.
     *  (Like bc?.broadcast() in test-hono.) */
    async record(type, params = {}, meta = {}) {
        if (!this.handle || !this.enabled) return;

        const op = {
            id: crypto.randomUUID(),
            type,
            params: { ...params, _replayId: meta.objectId || null },
            enabled: true,
            timestamp: Date.now(),
            actorId: this.actorId,
            groupId: meta.groupId || null,
        };

        // Pre-compute snapshot blob ref if this op triggers a checkpoint (ADR-0025 Phase 0).
        // Blob storage is async so it must happen before the sync handle.change() callback.
        const doc = this.handle.doc();
        const nextOpCount = (doc?.operations?.length || 0) + 1;
        let snapshotRef = null;
        if (nextOpCount % SNAPSHOT_INTERVAL === 0) {
            const ctrl = this._ctrl();
            if (ctrl) {
                const sceneJson = ctrl.export_scene();
                snapshotRef = await storeBlob(sceneJson);
            }
        }

        this._suppressChangeReplay = true;
        this.handle.change((d) => {
            d.operations.push(op);

            // Special case: BIM hierarchy from IFC import
            if (type === 'import_ifc' && meta.hierarchy) {
                d.bimHierarchy = meta.hierarchy;
            }

            // Periodic snapshot for fast replay (keep last 3 checkpoints)
            if (snapshotRef) {
                if (!d.snapshots) d.snapshots = [];
                d.snapshots.push({
                    blobRef: snapshotRef,
                    atOpIndex: d.operations.length,
                });
                while (d.snapshots.length > 3) d.snapshots.splice(0, 1);
            }
        });
        this._suppressChangeReplay = false;

        this._localOpCount = this._getDocOpCount();
        reconcile({});
        this._renderTimeline();
    }

    /** Undo last own enabled operation (or entire group) — sets enabled=false and replays */
    async undo() {
        if (!this.handle) return false;
        const doc = this.handle.doc();
        if (!doc) return false;

        // Find last enabled op by this actor
        for (let i = doc.operations.length - 1; i >= 0; i--) {
            if (doc.operations[i].actorId === this.actorId && doc.operations[i].enabled) {
                const targetGroupId = doc.operations[i].groupId;
                this._suppressChangeReplay = true;
                this.handle.change((d) => {
                    if (targetGroupId) {
                        for (let j = 0; j < d.operations.length; j++) {
                            if (d.operations[j].groupId === targetGroupId) {
                                d.operations[j].enabled = false;
                            }
                        }
                    } else {
                        d.operations[i].enabled = false;
                    }
                });
                this._suppressChangeReplay = false;
                await this._replayScene();
                this._localOpCount = this._getDocOpCount();
                return true;
            }
        }
        return false;
    }

    /** Redo — re-enable first disabled own op/group (from end of disabled streak) */
    async redo() {
        if (!this.handle) return false;
        const doc = this.handle.doc();
        if (!doc) return false;

        let target = -1;
        for (let i = doc.operations.length - 1; i >= 0; i--) {
            if (doc.operations[i].actorId === this.actorId && !doc.operations[i].enabled) {
                target = i;
            } else if (doc.operations[i].actorId === this.actorId && doc.operations[i].enabled) {
                break;
            }
        }
        if (target === -1) return false;

        const targetGroupId = doc.operations[target].groupId;
        this._suppressChangeReplay = true;
        this.handle.change((d) => {
            if (targetGroupId) {
                for (let j = 0; j < d.operations.length; j++) {
                    if (d.operations[j].groupId === targetGroupId) {
                        d.operations[j].enabled = true;
                    }
                }
            } else {
                d.operations[target].enabled = true;
            }
        });
        this._suppressChangeReplay = false;
        await this._replayScene();
        this._localOpCount = this._getDocOpCount();
        return true;
    }

    /** Rollback: disable all own ops after the given op index, then replay.
     *  Double-click on a timeline chip triggers this. */
    async rollback(toOpIndex) {
        if (!this.handle) return false;
        const doc = this.handle.doc();
        if (!doc || toOpIndex < 0 || toOpIndex >= doc.operations.length) return false;
        this._suppressChangeReplay = true;
        this.handle.change((d) => {
            for (let i = 0; i < d.operations.length; i++) {
                if (d.operations[i].actorId !== this.actorId) continue;
                // Enable ops at or before toOpIndex, disable ops after
                d.operations[i].enabled = (i <= toOpIndex);
            }
        });
        this._suppressChangeReplay = false;
        await this._replayScene();
        this._localOpCount = this._getDocOpCount();
        return true;
    }

    get canUndo() {
        const doc = this.handle?.doc();
        if (!doc) return false;
        return doc.operations.some(op => op.actorId === this.actorId && op.enabled);
    }

    get canRedo() {
        const doc = this.handle?.doc();
        if (!doc) return false;
        let foundDisabled = false;
        for (let i = doc.operations.length - 1; i >= 0; i--) {
            if (doc.operations[i].actorId === this.actorId) {
                if (!doc.operations[i].enabled) foundDisabled = true;
                else break;
            }
        }
        return foundDisabled;
    }

    /** True when there are user ops recorded since the last cloud save. */
    get isDirty() {
        const doc = this.handle?.doc();
        if (!doc) return false;
        return doc.operations.length > this._lastSavedOpIndex;
    }

    /** Mark current op count as "saved" — resets isDirty. Called after cloud save. */
    markSaved() {
        this._lastSavedOpIndex = this._getDocOpCount();
    }

    /** Replay all enabled ops to rebuild the scene from scratch.
     *  Only used by undo/redo and remote sync — not every command.
     *  All WASM ops go through cadCommand with reconcile:false for batching (ADR-0019 Phase 3).
     *  Large snapshots (>= 50 entries) use progressive loading (ADR-0025 Phase 3):
     *  viewport-visible objects → Hot, rest → Warm (IDB + LOD proxy). */
    async _replayScene() {
        if (!moduleRouter.ready || this._replayInProgress) return;

        this._replayInProgress = true;
        try {
            const doc = this.handle.doc();
            if (!doc) return;

            // Data plane commands used for replay — override schema defaults
            const REPLAY = { record: false, reconcile: false, source: 'replay' };
            const prevSelectedId = window._ds?.root?.selectedId ?? null;

            // Clear stale tier manager state — scene is about to be rebuilt from scratch
            await resetTierState();

            // Find nearest valid snapshot checkpoint (search newest → oldest).
            // Supports both legacy inline (snap.json) and blobRef (ADR-0025 Phase 0).
            let startIndex = 0;
            let snapshotJson = null;
            const snaps = doc.snapshots || [];
            for (let s = snaps.length - 1; s >= 0; s--) {
                const snap = snaps[s];
                if (snap.atOpIndex == null) continue;
                // Resolve snapshot data: blobRef (Phase 0) or legacy inline json
                let json = null;
                if (snap.blobRef) {
                    try { json = await getBlob(snap.blobRef); }
                    catch (err) { console.warn('[BlobStore] Snapshot fetch failed:', err); }
                } else if (snap.json) {
                    json = snap.json; // legacy inline snapshot
                }
                if (!json) continue;
                // Valid if all ops before the snapshot are enabled
                let valid = true;
                for (let i = 0; i < snap.atOpIndex && i < doc.operations.length; i++) {
                    if (!doc.operations[i].enabled) { valid = false; break; }
                }
                if (valid) {
                    snapshotJson = json;
                    startIndex = snap.atOpIndex;
                    break;
                }
            }

            // Decide: progressive or monolithic loading
            const PROGRESSIVE_THRESHOLD = 50;
            let entries = null;
            if (snapshotJson) {
                try { entries = JSON.parse(snapshotJson); } catch { entries = null; }
            }
            const useProgressive = entries && Array.isArray(entries) && entries.length >= PROGRESSIVE_THRESHOLD;

            if (useProgressive) {
                await this._progressiveLoad(entries, doc, startIndex, REPLAY);
            } else {
                // Existing monolithic path
                if (snapshotJson) {
                    cadCommand('import_scene', { json: snapshotJson }, REPLAY);
                } else {
                    cadCommand('clear', {}, REPLAY);
                }
                await this._replayRemainingOps(doc, startIndex, REPLAY);
            }

            // Restore selection in WASM + Datastar (fixes ADR-0025 selection-during-replay bug)
            const ids = moduleRouter.query('objectIds');
            const ds = window._ds;
            let newSel = null;
            if (prevSelectedId && ids.includes(prevSelectedId)) {
                newSel = prevSelectedId;
            } else if (ids.length > 0) {
                newSel = ids[ids.length - 1];
            }
            // Tell WASM about selection so tier manager's "never evict selected" guard works
            if (newSel) {
                cadCommand('select', { id: newSel }, { reconcile: false, source: 'replay' });
            }
            if (ds?.root) ds.root.selectedId = newSel;

            // Single reconcile at the end — WASM state → Datastar signals → DOM
            reconcile({ selectedId: newSel });
            this._renderTimeline();
        } finally {
            this._replayInProgress = false;
        }
    }

    /** Replay remaining ops after a snapshot (shared by both monolithic and progressive paths). */
    async _replayRemainingOps(doc, startIndex, REPLAY) {
        for (let i = startIndex; i < doc.operations.length; i++) {
            if (doc.operations[i].enabled) {
                const op = doc.operations[i];
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

    /** Progressive loading path (ADR-0025 Phase 3).
     *  Loads viewport-visible objects as Hot, rest as Warm (IDB + LOD proxy).
     *  Uses THREE.Frustum from the already-loaded Three.js for culling. */
    async _progressiveLoad(entries, doc, startIndex, REPLAY) {
        const ctrl = this._ctrl();
        if (!ctrl) return;
        const modelId = window.__modelId;

        // Clear current scene
        cadCommand('clear', {}, REPLAY);

        // 1. Collect object IDs needed by remaining ops — these must be Hot
        const neededIds = new Set();
        for (let i = startIndex; i < doc.operations.length; i++) {
            if (!doc.operations[i].enabled) continue;
            const p = doc.operations[i].params;
            if (p.id) neededIds.add(p.id);
            if (p.objectId) neededIds.add(p.objectId);
            if (p._replayId) neededIds.add(p._replayId);
            if (p.selA) neededIds.add(p.selA);
            if (p.selB) neededIds.add(p.selB);
        }

        // 2. Build camera frustum from <cad-viewport>'s Three.js camera
        let frustum = null;
        const viewport = document.querySelector('cad-viewport');
        if (viewport?.camera) {
            const THREE = await import('./vendor/three.js');
            const cam = viewport.camera;
            cam.updateMatrixWorld();
            cam.updateProjectionMatrix();
            frustum = new THREE.Frustum();
            const vp = new THREE.Matrix4();
            vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
            frustum.setFromProjectionMatrix(vp);
        }

        // 3. Split entries: Hot (viewport-visible + needed-by-ops) vs Warm (rest)
        const hotEntries = [];
        const warmEntries = [];
        // Cache the THREE import for sphere creation (module already loaded — instant)
        const THREE = frustum ? await import('./vendor/three.js') : null;

        for (const entry of entries) {
            const isNeeded = neededIds.has(entry.id);
            let isVisible = true; // default to visible if no frustum or no sphere
            if (frustum && THREE && entry.bounding_sphere) {
                const [cx, cy, cz, r] = entry.bounding_sphere;
                isVisible = frustum.intersectsSphere(
                    new THREE.Sphere(new THREE.Vector3(cx, cy, cz), r)
                );
            }
            if (isNeeded || isVisible) {
                hotEntries.push(entry);
            } else {
                warmEntries.push(entry);
            }
        }

        // 4. Import Hot entries to WASM
        for (const entry of hotEntries) {
            ctrl.import_entry(JSON.stringify(entry));
        }

        // 5. Store Warm entries in IDB + add LOD proxies + register with tier manager
        if (warmEntries.length > 0) {
            const { bulkPutObjects } = await import('./object-store.js');
            const warmItems = warmEntries.map(e => ({
                objectId: e.id,
                entryJson: JSON.stringify(e),
            }));
            await bulkPutObjects(modelId, warmItems);

            const warmSphereMap = new Map();
            for (const entry of warmEntries) {
                if (entry.bounding_sphere) {
                    const [cx, cy, cz, r] = entry.bounding_sphere;
                    const color = entry.style?.albedo || [0.5, 0.5, 0.5, 1.0];
                    ctrl.add_lod_proxy(JSON.stringify({
                        objectId: entry.id,
                        center: [cx, cy, cz],
                        radius: r,
                        color,
                    }));
                    warmSphereMap.set(entry.id, { center: [cx, cy, cz], radius: r, color });
                }
            }
            registerWarmObjects(warmSphereMap);
        }

        console.log(`[Progressive] ${hotEntries.length} Hot, ${warmEntries.length} Warm, ${doc.operations.length - startIndex} remaining ops`);

        // 6. Replay remaining ops (referenced objects are Hot)
        await this._replayRemainingOps(doc, startIndex, REPLAY);
    }

    /** Listen for remote changes via Automerge and replay scene.
     *  Debounced — multiple rapid mutations (batch ops from a remote peer)
     *  collapse into a single replay after 100ms of quiet. */
    _listenForChanges() {
        if (!this.handle) return;
        let debounceTimer = null;
        this.handle.on('change', () => {
            if (this._replayInProgress || this._suppressChangeReplay) return;

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                console.log('[Automerge] Remote change detected, replaying scene...');
                this._replayScene();
                this._localOpCount = this._getDocOpCount();
            }, 100);
        });
    }

    /** Get current op count from doc */
    _getDocOpCount() {
        const doc = this.handle?.doc();
        return doc?.operations?.length || 0;
    }

    /** Update the document info display in the UI */
    _updateDocInfo() {
        const el = document.getElementById('docInfo');
        if (!el || !this.handle) return;
        const doc = this.handle.doc();
        if (doc) {
            el.textContent = doc.name || 'Untitled';
            el.title = this.handle.url;
        }
    }

    /** Render operation timeline chips */
    _renderTimeline() {
        const strip = document.getElementById('timelineStrip');
        if (!strip) return;
        const doc = this.handle?.doc();
        if (!doc || !doc.operations) {
            strip.innerHTML = '';
            return;
        }

        // Schema-driven timeline metadata — new commands auto-inherit domain styling.
        // Domain → default chip color. Only 5 domain-level overrides exist.
        const DOMAIN_COLORS = {
            geometry: 'btn-primary', booleans: 'btn-success',
            scene: 'btn-ghost',     style: 'btn-ghost',
            sketch: 'btn-primary',
        };
        // Per-command color overrides where domain default is wrong (presentation-only)
        const COLOR_OVERRIDES = {
            boolean_subtract: 'btn-warning', boolean_intersect: 'btn-error',
            clash_detect: 'btn-info', delete: 'btn-error', duplicate: 'btn-info',
        };
        const schema = getSchema();
        const chipColor = (type) => {
            if (COLOR_OVERRIDES[type]) return COLOR_OVERRIDES[type];
            const cmd = schema?.commands?.[type];
            if (!cmd) return 'btn-ghost';
            // Geometry domain: only creation (add_*) gets primary; transforms are ghost
            if (cmd.domain === 'geometry' && !type.startsWith('add_')) return 'btn-ghost';
            return DOMAIN_COLORS[cmd.domain] || 'btn-ghost';
        };
        // Label derived from schema description — no hardcoded command→label map.
        const chipLabel = (type) => {
            const cmd = schema?.commands?.[type];
            if (!cmd?.description) return type;
            // Strip parentheticals: "Set object color (RGBA)" → "Set object color"
            const desc = cmd.description.replace(/\s*\(.*\)/, '');
            const words = desc.split(/\s+/);
            // "Add a cube primitive" → "Cube"
            if (words[0] === 'Add' && words.length >= 3) return words[2][0].toUpperCase() + words[2].slice(1);
            // "Set object material style" → "Style", "Get full scene state" → "State"
            if (words[0] === 'Set' || words[0] === 'Get') {
                const w = words[words.length - 1];
                return w[0].toUpperCase() + w.slice(1);
            }
            // First verb: "Move", "Union", "Delete", "Extrude", "Scale", "Rotate", "Clear", etc.
            const ABBR = { Delete: 'Del', Subtract: 'Sub', Duplicate: 'Dup', Intersect: 'Inter', Rotate: 'Rot' };
            return ABBR[words[0]] || words[0];
        };

        // Group consecutive ops with same groupId into single chip
        const chips = [];
        let i = 0;
        while (i < doc.operations.length) {
            const op = doc.operations[i];
            if (op.groupId) {
                const group = [];
                const gid = op.groupId;
                for (let j = i; j < doc.operations.length; j++) {
                    if (doc.operations[j].groupId === gid) {
                        group.push(doc.operations[j]);
                    }
                }
                const primary = group[0];
                const label = chipLabel(primary.type) +
                    (group.length > 1 ? `+${group.length - 1}` : '');
                chips.push({
                    label,
                    color: chipColor(primary.type),
                    enabled: primary.enabled,
                    own: primary.actorId === this.actorId,
                    groupId: gid,
                    opIndex: i,
                });
                i += group.length;
            } else {
                chips.push({
                    label: chipLabel(op.type),
                    color: chipColor(op.type),
                    enabled: op.enabled,
                    own: op.actorId === this.actorId,
                    groupId: null,
                    opIndex: i,
                });
                i++;
            }
        }

        strip.innerHTML = chips.map((chip, ci) => {
            const disabled = chip.enabled ? '' : 'timeline-chip-disabled';
            const own = chip.own ? 'timeline-chip-own' : 'timeline-chip-remote';
            return `<button class="btn btn-xs ${chip.color} ${disabled} ${own}" data-chip="${ci}" title="${chip.enabled ? 'Click to disable' : 'Click to re-enable'}">${chip.label}</button>`;
        }).join('');

        // Click handler for toggling individual ops
        strip.querySelectorAll('[data-chip]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const ci = parseInt(btn.dataset.chip);
                const chip = chips[ci];
                if (!chip.own) return;
                this._suppressChangeReplay = true;
                this.handle.change((d) => {
                    if (chip.groupId) {
                        for (let j = 0; j < d.operations.length; j++) {
                            if (d.operations[j].groupId === chip.groupId) {
                                d.operations[j].enabled = !chip.enabled;
                            }
                        }
                    } else {
                        d.operations[chip.opIndex].enabled = !chip.enabled;
                    }
                });
                this._suppressChangeReplay = false;
                this._replayScene();
                this._localOpCount = this._getDocOpCount();
            });

            // Double-click: rollback to this point (disable all own ops after it)
            btn.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const ci = parseInt(btn.dataset.chip);
                const chip = chips[ci];
                if (!chip.own) return;
                this.rollback(chip.opIndex);
            });
        });

        // Auto-scroll to end
        strip.scrollLeft = strip.scrollWidth;
    }

    /** Get the current document URL for sharing */
    get documentUrl() {
        return this.handle?.url || null;
    }

    /** Get operation count stats */
    get stats() {
        const doc = this.handle?.doc();
        if (!doc) return { total: 0, enabled: 0, disabled: 0 };
        const enabled = doc.operations.filter(op => op.enabled).length;
        return {
            total: doc.operations.length,
            enabled,
            disabled: doc.operations.length - enabled,
        };
    }
}

window.cadDocManager = new CadDocumentManager();
