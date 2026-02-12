// UndoManager — snapshot-based undo/redo for the CAD scene.
// Uses export_scene()/import_scene() to capture and restore full B-Rep state.
// Phase 1: standalone. Phase 2: replaced by Automerge op log (but kept as fallback).

const MAX_UNDO_STACK = 50;

class UndoManager {
    constructor() {
        this.undoStack = [];   // Array<{snapshot: string, desc: string}>
        this.redoStack = [];
        this._busy = false;
    }

    _ctrl() { return window.sceneController; }

    /** Call BEFORE any mutating WASM operation. Saves current state to undo stack. */
    captureBeforeMutation(desc) {
        const ctrl = this._ctrl();
        if (!ctrl || this._busy) return;

        const snapshot = ctrl.export_scene();
        this.undoStack.push({ snapshot, desc });

        if (this.undoStack.length > MAX_UNDO_STACK) {
            this.undoStack.shift();
        }

        // New mutation invalidates redo history
        this.redoStack = [];
        this.updateButtons();
    }

    /** Undo: restore previous state, push current to redo stack. */
    undo() {
        const ctrl = this._ctrl();
        if (!ctrl || this.undoStack.length === 0) return false;
        this._busy = true;

        const current = ctrl.export_scene();
        const entry = this.undoStack.pop();
        this.redoStack.push({ snapshot: current, desc: entry.desc });

        ctrl.import_scene(entry.snapshot);
        window.selectedObject = 0;
        if (window.updateObjectList) window.updateObjectList();
        this.updateButtons();

        this._busy = false;
        return true;
    }

    /** Redo: re-apply undone state, push current to undo stack. */
    redo() {
        const ctrl = this._ctrl();
        if (!ctrl || this.redoStack.length === 0) return false;
        this._busy = true;

        const current = ctrl.export_scene();
        const entry = this.redoStack.pop();
        this.undoStack.push({ snapshot: current, desc: entry.desc });

        ctrl.import_scene(entry.snapshot);
        window.selectedObject = 0;
        if (window.updateObjectList) window.updateObjectList();
        this.updateButtons();

        this._busy = false;
        return true;
    }

    get canUndo() { return this.undoStack.length > 0; }
    get canRedo() { return this.redoStack.length > 0; }

    updateButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        if (undoBtn) undoBtn.disabled = !this.canUndo;
        if (redoBtn) redoBtn.disabled = !this.canRedo;
    }

    /** Reset stacks (e.g. after loading a new document) */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.updateButtons();
    }
}

window.undoManager = new UndoManager();
