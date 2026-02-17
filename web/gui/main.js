// CAD command UI — calls WASM SceneController (UUID-based API).
// When Automerge is available, operations go through cadDocManager for collaborative sync.
// When not, snapshot-based undo via undoManager is used as fallback.

function ctrl() { return window.sceneController; }
function getSize() { return parseFloat(document.getElementById('sizeParam').value) || 1.0; }
function update() { if (window.updateObjectList) window.updateObjectList(); }
function undo() { return window.undoManager; }
function docMgr() { return window.cadDocManager?.handle ? window.cadDocManager : null; }
// Multi-select state for boolean operations
window.boolSelA = null;  // First selected object (A)
window.boolSelB = null;  // Second selected object (B)

function setSelection(id, addToSet) {
    if (addToSet && id && window.boolSelA && id !== window.boolSelA) {
        // Shift+click: set B, keep A
        window.boolSelB = id;
    } else {
        // Normal click: set A, clear B
        window.boolSelA = id;
        window.boolSelB = null;
    }
    window.selectedObjectId = id;
    if (window.propsPanel) window.propsPanel.onSelectionChanged(id);
    // Update Datastar signals (bool label, selection state, etc.)
    if (window.buildUIState && window.updateSignals) {
        window.updateSignals(window.buildUIState());
    }
}


// --- Primitives (via unified cadCommand) ---
function addPrimitive(type, params) {
    if (!ctrl()) return;
    const groupId = crypto.randomUUID();
    const mgr = window.cadDocManager?.handle ? window.cadDocManager : null;
    // For snapshot undo: capture state once for the whole add+offset group
    if (!mgr && window.undoManager) {
        window.undoManager.captureBeforeMutation(type);
    }
    // skipUndo: snapshot already captured above; Automerge uses groupId internally
    const result = cadCommand(type, params, { groupId, skipUndo: !mgr });
    if (result.objectId) {
        // Auto-offset as grouped op
        const ids = ctrl().object_ids();
        const idx = ids.indexOf(result.objectId);
        if (idx > 0) {
            const dx = idx * (params.size || 1.0) * 0.7;
            cadCommand('translate', { objectId: result.objectId, dx, dy: 0, dz: 0 }, { groupId, skipUndo: !mgr });
        }
        setSelection(result.objectId);
    }
}

document.getElementById('addCube')?.addEventListener('click', () => {
    addPrimitive('add_cube', { size: getSize() });
});

document.getElementById('addSphere')?.addEventListener('click', () => {
    addPrimitive('add_sphere', { size: getSize() });
});

document.getElementById('addCylinder')?.addEventListener('click', () => {
    addPrimitive('add_cylinder', { radius: getSize() * 0.5, height: getSize() });
});

document.getElementById('addTorus')?.addEventListener('click', () => {
    addPrimitive('add_torus', { majorRadius: getSize(), minorRadius: getSize() * 0.3 });
});

// --- Transform ---
document.getElementById('translateBtn')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const ids = ctrl().object_ids();
    if (ids.length === 0) { showFeedbackSignal('No objects to move', true); return; }
    const objectId = window.selectedObjectId || ids[0];
    if (!ids.includes(objectId)) { showFeedbackSignal('Selected object not found', true); return; }
    const dx = parseFloat(document.getElementById('txVal').value) || 0;
    const dy = parseFloat(document.getElementById('tyVal').value) || 0;
    const dz = parseFloat(document.getElementById('tzVal').value) || 0;
    if (dx === 0 && dy === 0 && dz === 0) { showFeedbackSignal('Enter non-zero dx/dy/dz values', true); return; }

    const result = cadCommand('translate', { objectId, dx, dy, dz });
    if (result.error) showFeedbackSignal('Move failed', true);
    else showFeedbackSignal(`Moved ${objectId.slice(0, 8)} by (${dx}, ${dy}, ${dz})`, false);
});

// --- Boolean ---
// Get UUID pairs for boolean ops: from multi-select (A/B)
function getABIds() {
    const a = window.boolSelA || '';
    const b = window.boolSelB || '';
    // Verify both still exist in scene
    const ids = ctrl()?.object_ids() || [];
    if (!ids.includes(a) || !ids.includes(b)) return ['', ''];
    return [a, b];
}

function showBoolResult(resultId, op) {
    if (resultId) {
        setSelection(resultId);
        showFeedbackSignal(`${op} → ${resultId.slice(0, 8)}`, false);
    } else {
        showFeedbackSignal(`${op} failed — ensure objects overlap`, true);
    }
}

document.getElementById('boolUnion')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const [idA, idB] = getABIds();
    if (!idA || !idB) { showFeedbackSignal('Select A, then shift+click B', true); return; }
    const result = cadCommand('boolean_union', { idA, idB });
    showBoolResult(result.objectId || null, 'Union');
});

document.getElementById('boolSubtract')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const [idA, idB] = getABIds();
    if (!idA || !idB) { showFeedbackSignal('Select A, then shift+click B', true); return; }
    const result = cadCommand('boolean_subtract', { idA, idB });
    showBoolResult(result.objectId || null, 'Subtract');
});

document.getElementById('boolIntersect')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const [idA, idB] = getABIds();
    if (!idA || !idB) { showFeedbackSignal('Select A, then shift+click B', true); return; }
    const result = cadCommand('boolean_intersect', { idA, idB });
    showBoolResult(result.objectId || null, 'Intersect');
});

// --- Scene management ---
document.getElementById('deleteBtn')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const ids = ctrl().object_ids();
    const objectId = window.selectedObjectId || ids[0];
    if (!objectId || !ids.includes(objectId)) { showFeedbackSignal('No object selected', true); return; }
    cadCommand('delete', { objectId });
    const remaining = ctrl().object_ids();
    setSelection(remaining.length > 0 ? remaining[remaining.length - 1] : null);
});

document.getElementById('clearBtn')?.addEventListener('click', () => {
    if (!ctrl()) return;
    cadCommand('clear', {});
    setSelection(null);
});

// --- Undo / Redo (meta-operations — not routed through cadCommand) ---
document.getElementById('undoBtn')?.addEventListener('click', () => {
    const mgr = docMgr();
    if (mgr) mgr.undo(); else undo()?.undo();
});

document.getElementById('redoBtn')?.addEventListener('click', () => {
    const mgr = docMgr();
    if (mgr) mgr.redo(); else undo()?.redo();
});

// Keyboard shortcuts: Ctrl+Z = undo, Ctrl+Shift+Z / Ctrl+Y = redo, S = sketch tab
document.addEventListener('keydown', (e) => {
    // S key: switch to sketch tab (when not in input)
    if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'select' && tag !== 'textarea') {
            if (window.cadUI) window.cadUI.setTab('sketch');
            e.preventDefault();
            return;
        }
    }
    // Escape: cancel active sketch
    if (e.key === 'Escape' && window.sketchUI?.isActive) {
        window.sketchUI.cancel();
        e.preventDefault();
        return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const mgr = docMgr();
        if (mgr) mgr.undo();
        else undo()?.undo();
    }
    if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        const mgr = docMgr();
        if (mgr) mgr.redo();
        else undo()?.redo();
    }
});

// --- Document management (Automerge) ---
document.getElementById('newDocBtn')?.addEventListener('click', async () => {
    const mgr = docMgr();
    if (mgr) {
        const name = prompt('Document name:', 'Untitled');
        if (name === null) return;
        ctrl()?.clear_scene();
        await window.cadDocManager.createDocument(name);
        setSelection(null);
        update();
        showFeedbackSignal('New document created', false);
    }
});

document.getElementById('shareBtn')?.addEventListener('click', () => {
    const mgr = docMgr();
    if (mgr) {
        const url = new URL(window.location.href);
        url.searchParams.set('doc', mgr.documentUrl);
        navigator.clipboard.writeText(url.toString()).then(() => {
            showFeedbackSignal('Share URL copied!', false);
        }).catch(() => {
            prompt('Copy this URL to share:', url.toString());
        });
    } else {
        showFeedbackSignal('No collaborative document active', true);
    }
});

document.getElementById('docInfo')?.addEventListener('click', () => {
    const mgr = docMgr();
    if (mgr) {
        navigator.clipboard.writeText(mgr.documentUrl).then(() => {
            showFeedbackSignal('Doc URL copied', false);
        });
    }
});

// --- Save / Load ---
document.getElementById('saveBtn')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const json = ctrl().export_scene();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cad-scene.json';
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('loadBtn')?.addEventListener('click', () => {
    document.getElementById('fileInput')?.click();
});

document.getElementById('fileInput')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file || !ctrl()) return;
    const reader = new FileReader();
    reader.onload = () => {
        cadCommand('import_scene', { json: reader.result });
        const ids = ctrl().object_ids();
        setSelection(ids.length > 0 ? ids[0] : null);
    };
    reader.readAsText(file);
    e.target.value = '';
});

// --- Gizmo: viewport click-to-select + drag-to-translate ---
(function setupGizmo() {
    const canvas = document.getElementById('cad-canvas');
    if (!canvas) return;

    let isDragging = false;
    let prevNdcX = 0;
    let prevNdcY = 0;

    function toNdc(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (2 * (e.clientX - rect.left) / rect.width) - 1;
        const y = 1 - (2 * (e.clientY - rect.top) / rect.height);
        return [x, y];
    }

    // Use pointer events (not mouse events) because truck's winit WASM backend
    // calls preventDefault() on pointerdown, which suppresses mousedown entirely.
    canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || !ctrl()) return;

        const [ndcX, ndcY] = toNdc(e);

        // If an object is selected, try to start a gizmo drag first
        if (ctrl().get_interaction_mode() === 'selected') {
            const axis = ctrl().begin_gizmo_drag(ndcX, ndcY);
            if (axis) {
                isDragging = true;
                prevNdcX = ndcX;
                prevNdcY = ndcY;
                canvas.style.cursor = 'grabbing';
                canvas.setPointerCapture(e.pointerId);
                e.stopPropagation();
                return;
            }
        }

        // Otherwise, pick/select object
        const id = ctrl().select_object_at(ndcX, ndcY);
        setSelection(id || null, e.shiftKey);
        update();
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!isDragging || !ctrl()) return;

        const [ndcX, ndcY] = toNdc(e);
        ctrl().update_gizmo_drag(ndcX, ndcY, prevNdcX, prevNdcY);
        prevNdcX = ndcX;
        prevNdcY = ndcY;
        e.stopPropagation();
    });

    canvas.addEventListener('pointerup', (e) => {
        if (!isDragging || !ctrl()) return;

        isDragging = false;
        canvas.style.cursor = '';
        canvas.releasePointerCapture(e.pointerId);

        const result = ctrl().end_gizmo_drag();
        if (result && result.objectId) {
            // Commit to Automerge op log
            const mgr = docMgr();
            if (mgr) {
                mgr.applyOperation('translate', {
                    objectId: result.objectId,
                    dx: result.dx,
                    dy: result.dy,
                    dz: result.dz,
                });
            } else {
                // For snapshot-based undo, we already applied the transform live.
                // Just capture the final state.
                undo()?.captureBeforeMutation('Gizmo translate');
            }
        }
        update();
        e.stopPropagation();
    });

    // Escape to cancel drag
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isDragging && ctrl()) {
            isDragging = false;
            canvas.style.cursor = '';
            ctrl().cancel_gizmo_drag();
            e.preventDefault();
        }
        // Delete selected object
        if (e.key === 'Delete' && !isDragging && ctrl()) {
            const mode = ctrl().get_interaction_mode();
            if (mode === 'selected') {
                const ids = ctrl().object_ids();
                const objectId = window.selectedObjectId;
                if (objectId && ids.includes(objectId)) {
                    cadCommand('delete', { objectId });
                    const remaining = ctrl().object_ids();
                    setSelection(remaining.length > 0 ? remaining[remaining.length - 1] : null);
                }
            }
        }
    });

    // Register WASM callbacks
    function setupCallbacks() {
        if (!ctrl()) {
            setTimeout(setupCallbacks, 500);
            return;
        }
        ctrl().set_on_select((objectId) => {
            setSelection(objectId || null);
            update();
        });
        ctrl().set_on_drag_complete(() => {
            // Drag commit handled in JS mouseup listener (needs docMgr access).
        });
    }
    setupCallbacks();
})();

// --- Example Scenes ---
(async function loadExamples() {
    const select = document.getElementById('exampleSelect');
    if (!select) return;

    try {
        const res = await fetch('examples/index.json');
        if (!res.ok) return;
        const examples = await res.json();

        for (const ex of examples) {
            const opt = document.createElement('option');
            opt.value = ex.filename;
            opt.textContent = ex.name;
            opt.title = ex.description;
            select.appendChild(opt);
        }

        select.addEventListener('change', async () => {
            if (!select.value || !ctrl()) return;
            try {
                const res = await fetch(`examples/${select.value}`);
                if (!res.ok) throw new Error('Failed to load');
                const json = await res.text();
                cadCommand('import_scene', { json });
                const ids = ctrl().object_ids();
                setSelection(ids.length > 0 ? ids[0] : null);
                showFeedbackSignal(`Loaded: ${select.options[select.selectedIndex].text}`, false);
            } catch (err) {
                showFeedbackSignal('Failed to load example', true);
            }
            select.value = '';
        });
    } catch (err) {
        // No examples available yet — that's fine
    }
})();
