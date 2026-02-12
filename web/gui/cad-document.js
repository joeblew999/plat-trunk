// CadDocumentManager — Automerge-backed operation log for collaborative CAD.
// Replaces snapshot-based undo with a CRDT op log that syncs across peers.
//
// Document schema:
//   { name, createdAt, operations: CadOperation[], snapshotJson?, snapshotAtOpIndex? }
//
// Each CadOperation:
//   { id, type, params, enabled, timestamp, actorId }
//
// Undo = set enabled=false on last own op. Redo = re-enable first disabled own op.
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

    /** Apply a new CAD operation — adds to op log and executes */
    async applyOperation(type, params = {}) {
        if (!this.handle || !this._ctrl()) return;

        const op = {
            id: crypto.randomUUID(),
            type,
            params,
            enabled: true,
            timestamp: Date.now(),
            actorId: this.actorId,
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
        this._executeOp(op);
        if (window.updateObjectList) window.updateObjectList();
        window.undoManager?.updateButtons();
    }

    /** Undo last own enabled operation — sets enabled=false and replays */
    undo() {
        if (!this.handle) return false;
        const doc = this.handle.docSync();
        if (!doc) return false;

        // Find last enabled op by this actor
        for (let i = doc.operations.length - 1; i >= 0; i--) {
            if (doc.operations[i].actorId === this.actorId && doc.operations[i].enabled) {
                this.handle.change((d) => {
                    d.operations[i].enabled = false;
                });
                this._replayScene();
                return true;
            }
        }
        return false;
    }

    /** Redo — re-enable first disabled own op (from end of disabled streak) */
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

        this.handle.change((d) => {
            d.operations[target].enabled = true;
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
        // Check if there are disabled own ops after last enabled own op
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

        // Find nearest valid snapshot checkpoint
        let startIndex = 0;
        if (doc.snapshotJson && doc.snapshotAtOpIndex) {
            // Check if all ops before checkpoint are still enabled
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

        // Replay enabled ops from startIndex
        for (let i = startIndex; i < doc.operations.length; i++) {
            if (doc.operations[i].enabled) {
                this._executeOp(doc.operations[i]);
            }
        }

        window.selectedObject = 0;
        if (window.updateObjectList) window.updateObjectList();
        window.undoManager?.updateButtons();
        this._replayInProgress = false;
    }

    /** Execute a single operation against the WASM SceneController */
    _executeOp(op) {
        const ctrl = this._ctrl();
        if (!ctrl) return;

        const p = op.params || {};

        switch (op.type) {
            case 'add_cube':
                ctrl.add_cube(p.size || 1.0);
                break;
            case 'add_sphere':
                ctrl.add_sphere(p.size || 1.0);
                break;
            case 'add_cylinder':
                ctrl.add_cylinder(p.radius || 0.5, p.height || 1.0);
                break;
            case 'add_torus':
                ctrl.add_torus(p.majorRadius || 1.0, p.minorRadius || 0.3);
                break;
            case 'translate': {
                const idx = p.objectIndex ?? 0;
                ctrl.translate_object(idx, p.dx || 0, p.dy || 0, p.dz || 0);
                break;
            }
            case 'boolean_union':
                ctrl.boolean_union(p.a ?? 0, p.b ?? 1);
                break;
            case 'boolean_subtract':
                ctrl.boolean_subtract(p.a ?? 0, p.b ?? 1);
                break;
            case 'boolean_intersect':
                ctrl.boolean_intersect(p.a ?? 0, p.b ?? 1);
                break;
            case 'delete':
                ctrl.delete_object(p.objectIndex ?? 0);
                break;
            case 'clear':
                ctrl.clear_scene();
                break;
            default:
                console.warn('Unknown op type:', op.type);
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
