// CadDocumentManager — Automerge-backed operation log for collaborative CAD.
// Replaces snapshot-based undo with a CRDT op log that syncs across peers.
//
// Document schema:
//   { name, createdAt, operations: CadOperation[], snapshotJson?, snapshotAtOpIndex? }
//
// Each CadOperation:
//   { id, type, params, enabled, timestamp, actorId, groupId? }
//
// Undo = set enabled=false on last own op (or entire group). Redo = re-enable.
// Scene is rebuilt by replaying all enabled ops from the last checkpoint.

import { Repo, isValidAutomergeUrl } from '@automerge/automerge-repo';
import { IndexedDBStorageAdapter } from '@automerge/automerge-repo-storage-indexeddb';
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';

const SNAPSHOT_INTERVAL = 10; // checkpoint every N ops for faster replay

class CadDocumentManager {
    constructor() {
        this.repo = null;
        this.handle = null;
        this.actorId = this._getOrCreateActorId();
        this._replayInProgress = false;
        // Maps opId → resultObjectId (UUID returned by WASM for add/boolean ops)
        this._opResultMap = new Map();
        this._syncAdapter = null;
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

        // Wire WorkerSyncAdapter as persistence sidecar
        if (window.WorkerSyncAdapter) {
            this._syncAdapter = new window.WorkerSyncAdapter();
        }

        // Check URL for ?doc= parameter
        const params = new URLSearchParams(window.location.search);
        const docParam = params.get('doc');

        if (docParam && isValidAutomergeUrl(docParam)) {
            await this.loadDocument(docParam);
        } else {
            // Check localStorage for last document
            const lastUrl = localStorage.getItem('cad-last-doc-url');
            if (lastUrl && isValidAutomergeUrl(lastUrl)) {
                await this.loadDocument(lastUrl);
            } else {
                await this.createDocument('Untitled');
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
        localStorage.setItem('cad-last-doc-url', this.handle.url);
        this._listenForChanges();
        this._updateDocInfo();
        this._renderTimeline();
        return this.handle.url;
    }

    /** Load an existing document by Automerge URL */
    async loadDocument(url) {
        this.handle = this.repo.find(url);
        await this.handle.doc();
        localStorage.setItem('cad-last-doc-url', url);
        this._listenForChanges();
        await this._replayScene();
        this._updateDocInfo();
        return url;
    }

    /** Apply a new CAD operation — adds to op log and executes.
     *  Returns the result object UUID (for add/boolean ops) or null. */
    applyOperation(type, params = {}, groupId = null) {
        if (!this.handle || !this._ctrl()) return null;

        const op = {
            id: crypto.randomUUID(),
            type,
            params,
            enabled: true,
            timestamp: Date.now(),
            actorId: this.actorId,
            groupId: groupId || null,
        };

        this.handle.change((d) => {
            d.operations.push(op);

            // Periodic snapshot for fast replay
            if (d.operations.length % SNAPSHOT_INTERVAL === 0) {
                const ctrl = this._ctrl();
                if (ctrl) {
                    d.snapshotJson = ctrl.export_scene();
                    d.snapshotAtOpIndex = d.operations.length;
                }
            }
        });

        // Execute immediately (no need to replay entire log)
        const resultId = this._executeOp(op);
        if (resultId) {
            this._opResultMap.set(op.id, resultId);
        }
        if (window.updateObjectList) window.updateObjectList();
        window.undoManager?.updateButtons();
        this._renderTimeline();
        return resultId;
    }

    /** Undo last own enabled operation (or entire group) — sets enabled=false and replays */
    undo() {
        if (!this.handle) return false;
        const doc = this.handle.docSync();
        if (!doc) return false;

        // Find last enabled op by this actor
        for (let i = doc.operations.length - 1; i >= 0; i--) {
            if (doc.operations[i].actorId === this.actorId && doc.operations[i].enabled) {
                const targetGroupId = doc.operations[i].groupId;
                this.handle.change((d) => {
                    if (targetGroupId) {
                        // Disable ALL ops in this group
                        for (let j = 0; j < d.operations.length; j++) {
                            if (d.operations[j].groupId === targetGroupId) {
                                d.operations[j].enabled = false;
                            }
                        }
                    } else {
                        d.operations[i].enabled = false;
                    }
                });
                this._replayScene();
                return true;
            }
        }
        return false;
    }

    /** Redo — re-enable first disabled own op/group (from end of disabled streak) */
    redo() {
        if (!this.handle) return false;
        const doc = this.handle.docSync();
        if (!doc) return false;

        // Find first disabled op by this actor (scanning from end backward through disabled streak)
        let target = -1;
        for (let i = doc.operations.length - 1; i >= 0; i--) {
            if (doc.operations[i].actorId === this.actorId && !doc.operations[i].enabled) {
                target = i;
            } else if (doc.operations[i].actorId === this.actorId && doc.operations[i].enabled) {
                break; // stop at first enabled own op
            }
        }
        if (target === -1) return false;

        const targetGroupId = doc.operations[target].groupId;
        this.handle.change((d) => {
            if (targetGroupId) {
                // Re-enable ALL ops in this group
                for (let j = 0; j < d.operations.length; j++) {
                    if (d.operations[j].groupId === targetGroupId) {
                        d.operations[j].enabled = true;
                    }
                }
            } else {
                d.operations[target].enabled = true;
            }
        });
        this._replayScene();
        return true;
    }

    get canUndo() {
        const doc = this.handle?.docSync();
        if (!doc) return false;
        return doc.operations.some(op => op.actorId === this.actorId && op.enabled);
    }

    get canRedo() {
        const doc = this.handle?.docSync();
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

    /** Replay all enabled ops to rebuild the scene from scratch */
    async _replayScene() {
        const ctrl = this._ctrl();
        if (!ctrl || this._replayInProgress) return;

        this._replayInProgress = true;
        const doc = this.handle.docSync();
        if (!doc) {
            this._replayInProgress = false;
            return;
        }

        // Save current selection to try to preserve it
        const prevSelectedId = window.selectedObjectId || null;

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
                ctrl.import_scene(doc.snapshotJson);
                startIndex = doc.snapshotAtOpIndex;
            } else {
                ctrl.clear_scene();
            }
        } else {
            ctrl.clear_scene();
        }

        // Clear result map for replay
        this._opResultMap.clear();

        // Replay enabled ops from startIndex
        for (let i = startIndex; i < doc.operations.length; i++) {
            if (doc.operations[i].enabled) {
                const resultId = this._executeOp(doc.operations[i]);
                if (resultId) {
                    this._opResultMap.set(doc.operations[i].id, resultId);
                }
            }
        }

        // Restore selection: if previous object still exists, keep it; else select last
        const ids = ctrl.object_ids();
        if (prevSelectedId && ids.includes(prevSelectedId)) {
            window.selectedObjectId = prevSelectedId;
        } else if (ids.length > 0) {
            window.selectedObjectId = ids[ids.length - 1];
        } else {
            window.selectedObjectId = null;
        }

        if (window.updateObjectList) window.updateObjectList();
        window.undoManager?.updateButtons();
        this._renderTimeline();
        this._replayInProgress = false;
    }

    /** Execute a single operation against the WASM SceneController.
     *  Returns the result object UUID for add/boolean ops, or null. */
    _executeOp(op) {
        const ctrl = this._ctrl();
        if (!ctrl) return null;

        const p = op.params || {};

        switch (op.type) {
            case 'add_cube':
                return ctrl.add_cube(p.size || 1.0);
            case 'add_sphere':
                return ctrl.add_sphere(p.size || 1.0);
            case 'add_cylinder':
                return ctrl.add_cylinder(p.radius || 0.5, p.height || 1.0);
            case 'add_torus':
                return ctrl.add_torus(p.majorRadius || 1.0, p.minorRadius || 0.3);
            case 'translate': {
                // Resolve object UUID: use objectId directly, or look up from prior op result
                const objectId = p.objectId || this._opResultMap.get(p.sourceOpId) || null;
                if (objectId) {
                    ctrl.translate_object(objectId, p.dx || 0, p.dy || 0, p.dz || 0);
                }
                return null;
            }
            case 'rotate': {
                const objectId = p.objectId || this._opResultMap.get(p.sourceOpId) || null;
                if (objectId) {
                    ctrl.rotate_object(objectId, p.axisX || 0, p.axisY || 1, p.axisZ || 0, p.angleDeg || 0);
                }
                return null;
            }
            case 'boolean_union': {
                const result = ctrl.boolean_union(p.idA, p.idB);
                return result || null;
            }
            case 'boolean_subtract': {
                const result = ctrl.boolean_subtract(p.idA, p.idB);
                return result || null;
            }
            case 'boolean_intersect': {
                const result = ctrl.boolean_intersect(p.idA, p.idB);
                return result || null;
            }
            case 'delete': {
                const objectId = p.objectId || null;
                if (objectId) ctrl.delete_object(objectId);
                return null;
            }
            case 'clear':
                ctrl.clear_scene();
                return null;
            default:
                console.warn('Unknown op type:', op.type);
                return null;
        }
    }

    /** Listen for remote changes and replay scene */
    _listenForChanges() {
        if (!this.handle) return;
        this.handle.on('change', (evt) => {
            if (!this._replayInProgress) {
                this._replayScene();
            }
        });
    }

    /** Update the document info display in the UI */
    _updateDocInfo() {
        const el = document.getElementById('docInfo');
        if (!el || !this.handle) return;
        const doc = this.handle.docSync();
        if (doc) {
            el.textContent = doc.name || 'Untitled';
            el.title = this.handle.url;
        }
    }

    /** Render operation timeline chips */
    _renderTimeline() {
        const strip = document.getElementById('timelineStrip');
        if (!strip) return;
        const doc = this.handle?.docSync();
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
            boolean_union: 'btn-success',
            boolean_subtract: 'btn-warning',
            boolean_intersect: 'btn-error',
            delete: 'btn-error',
            clear: 'btn-ghost',
        };

        const TYPE_LABELS = {
            add_cube: 'Cube',
            add_sphere: 'Sphere',
            add_cylinder: 'Cyl',
            add_torus: 'Torus',
            translate: 'Move',
            rotate: 'Rot',
            boolean_union: 'Union',
            boolean_subtract: 'Sub',
            boolean_intersect: 'Inter',
            delete: 'Del',
            clear: 'Clear',
        };

        // Group consecutive ops with same groupId into single chip
        const chips = [];
        let i = 0;
        while (i < doc.operations.length) {
            const op = doc.operations[i];
            if (op.groupId) {
                // Collect all ops with this groupId
                const group = [];
                const gid = op.groupId;
                for (let j = i; j < doc.operations.length; j++) {
                    if (doc.operations[j].groupId === gid) {
                        group.push(doc.operations[j]);
                    }
                }
                // Label: primary op type + count
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
                // Skip past all grouped ops
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

        // Click handler for toggling ops
        strip.querySelectorAll('[data-chip]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const ci = parseInt(btn.dataset.chip);
                const chip = chips[ci];
                if (!chip.own) return; // can only toggle own ops
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
                this._replayScene();
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
        const doc = this.handle?.docSync();
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
