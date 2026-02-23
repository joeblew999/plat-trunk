import { cadCommand, reconcile, moduleRouter } from './state.js';

// CadDocumentManager — Automerge-backed operation log for collaborative CAD.
// Acts as a SUBSCRIBER (like bc?.broadcast() in test-hono), NOT a gateway.
// cadCommand() always executes WASM directly; this records ops after the fact.
//
// Document schema:
//   { name, createdAt, operations: CadOperation[], snapshotJson?, snapshotAtOpIndex? }
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
        const modelId = window.__modelId || 'default';

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
                // Fallback to legacy last-doc
                const lastUrl = localStorage.getItem('cad-last-doc-url');
                if (lastUrl && isValidAutomergeUrl(lastUrl)) {
                    console.log(`[Automerge] Loading legacy last-doc: ${lastUrl}`);
                    await this.loadDocument(lastUrl);
                } else {
                    console.log(`[Automerge] Creating new doc for model ${modelId}`);
                    await this.createDocument(modelId === 'default' ? 'Untitled' : `Model ${modelId}`);
                }
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

        // Record the default cube (created by Rust SceneController::new) into the op log
        // so it's replayable in other tabs. We don't execute — WASM already has it.
        const ctrl = this._ctrl();
        if (ctrl) {
            const ids = ctrl.object_ids();
            if (ids.length > 0) {
                this.record('add_cube', { size: 1.0 }, { objectId: ids[0] });
            }
        }

        this._localOpCount = this._getDocOpCount();
        const modelId = window.__modelId || 'default';
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
        const modelId = window.__modelId || 'default';
        localStorage.setItem('cad-last-doc-url', url);
        localStorage.setItem(`cad-doc-url-${modelId}`, url);
        this._listenForChanges();
        await this._replayScene();
        this._localOpCount = this._getDocOpCount();
        this._updateDocInfo();
        return url;
    }

    /** Record a completed operation into the Automerge op log.
     *  Fire-and-forget — WASM has already executed. This is for undo/redo and cross-tab sync.
     *  (Like bc?.broadcast() in test-hono.) */
    record(type, params = {}, meta = {}) {
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

        this._suppressChangeReplay = true;
        this.handle.change((d) => {
            d.operations.push(op);

            // Special case: BIM hierarchy from IFC import
            if (type === 'import_ifc' && meta.hierarchy) {
                d.bimHierarchy = meta.hierarchy;
            }

            // Periodic snapshot for fast replay
            if (d.operations.length % SNAPSHOT_INTERVAL === 0) {
                const ctrl = this._ctrl();
                if (ctrl) {
                    d.snapshotJson = ctrl.export_scene();
                    d.snapshotAtOpIndex = d.operations.length;
                }
            }
        });
        this._suppressChangeReplay = false;

        this._localOpCount = this._getDocOpCount();
        reconcile({});
        this._renderTimeline();
    }

    /** Undo last own enabled operation (or entire group) — sets enabled=false and replays */
    undo() {
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
                this._replayScene();
                this._localOpCount = this._getDocOpCount();
                return true;
            }
        }
        return false;
    }

    /** Redo — re-enable first disabled own op/group (from end of disabled streak) */
    redo() {
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
        this._replayScene();
        this._localOpCount = this._getDocOpCount();
        return true;
    }

    /** Rollback: disable all own ops after the given op index, then replay.
     *  Double-click on a timeline chip triggers this. */
    rollback(toOpIndex) {
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
        this._replayScene();
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

    /** Replay all enabled ops to rebuild the scene from scratch.
     *  Only used by undo/redo and remote sync — not every command.
     *  All WASM ops go through cadCommand with reconcile:false for batching (ADR-0019 Phase 3). */
    async _replayScene() {
        if (!moduleRouter.ready || this._replayInProgress) return;

        this._replayInProgress = true;
        const doc = this.handle.doc();
        if (!doc) {
            this._replayInProgress = false;
            return;
        }

        const REPLAY = { record: false, broadcast: false, reconcile: false, source: 'replay' };
        const prevSelectedId = window._ds?.root?.selectedId ?? null;

        // Find nearest valid snapshot checkpoint
        let startIndex = 0;
        if (doc.snapshotJson && doc.snapshotAtOpIndex) {
            let snapshotValid = true;
            for (let i = 0; i < doc.snapshotAtOpIndex && i < doc.operations.length; i++) {
                if (!doc.operations[i].enabled) {
                    snapshotValid = false;
                    break;
                }
            }
            if (snapshotValid) {
                cadCommand('import_scene', { json: doc.snapshotJson }, REPLAY);
                startIndex = doc.snapshotAtOpIndex;
            } else {
                cadCommand('clear', {}, REPLAY);
            }
        } else {
            cadCommand('clear', {}, REPLAY);
        }

        // Replay each enabled op through cadCommand (no per-op reconcile)
        for (let i = startIndex; i < doc.operations.length; i++) {
            if (doc.operations[i].enabled) {
                const op = doc.operations[i];
                cadCommand(op.type, op.params, REPLAY);
            }
        }

        // Restore selection via Datastar signals
        const ids = moduleRouter.query('objectIds');
        const ds = window._ds;
        let newSel = null;
        if (prevSelectedId && ids.includes(prevSelectedId)) {
            newSel = prevSelectedId;
        } else if (ids.length > 0) {
            newSel = ids[ids.length - 1];
        }
        if (ds?.root) ds.root.selectedId = newSel;

        // Single reconcile at the end — WASM state → Datastar signals → DOM
        reconcile({ selectedId: newSel });
        this._renderTimeline();
        this._replayInProgress = false;
    }

    /** Listen for remote changes via Automerge and replay scene. */
    _listenForChanges() {
        if (!this.handle) return;
        this.handle.on('change', () => {
            if (this._replayInProgress || this._suppressChangeReplay) return;

            console.log('[Automerge] Remote change detected, replaying scene...');
            setTimeout(() => {
                this._replayScene();
                this._localOpCount = this._getDocOpCount();
            }, 0);
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

        const TYPE_COLORS = {
            add_cube: 'btn-primary',
            add_sphere: 'btn-secondary',
            add_cylinder: 'btn-accent',
            add_torus: 'btn-info',
            translate: 'btn-ghost',
            rotate: 'btn-ghost',
            scale: 'btn-ghost',
            duplicate: 'btn-info',
            boolean_union: 'btn-success',
            boolean_subtract: 'btn-warning',
            boolean_intersect: 'btn-error',
            delete: 'btn-error',
            clear: 'btn-ghost',
            set_style: 'btn-ghost',
            sketch_extrude: 'btn-primary',
        };

        const TYPE_LABELS = {
            add_cube: 'Cube',
            add_sphere: 'Sphere',
            add_cylinder: 'Cyl',
            add_torus: 'Torus',
            translate: 'Move',
            rotate: 'Rot',
            scale: 'Scale',
            duplicate: 'Dup',
            boolean_union: 'Union',
            boolean_subtract: 'Sub',
            boolean_intersect: 'Inter',
            delete: 'Del',
            clear: 'Clear',
            set_style: 'Style',
            sketch_extrude: 'Extrude',
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
                const label = (TYPE_LABELS[primary.type] || primary.type) +
                    (group.length > 1 ? `+${group.length - 1}` : '');
                chips.push({
                    label,
                    color: TYPE_COLORS[primary.type] || 'btn-ghost',
                    enabled: primary.enabled,
                    own: primary.actorId === this.actorId,
                    groupId: gid,
                    opIndex: i,
                });
                i += group.length;
            } else {
                chips.push({
                    label: TYPE_LABELS[op.type] || op.type,
                    color: TYPE_COLORS[op.type] || 'btn-ghost',
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
