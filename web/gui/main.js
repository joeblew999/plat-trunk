// CAD command UI — calls WASM SceneController (UUID-based API).
// When Automerge is available, operations go through cadDocManager for collaborative sync.
// When not, snapshot-based undo via undoManager is used as fallback.

function ctrl() { return window.sceneController; }
function getSize() { return parseFloat(document.getElementById('sizeParam').value) || 1.0; }
function update() { if (window.updateObjectList) window.updateObjectList(); }
function undo() { return window.undoManager; }
function docMgr() { return window.cadDocManager?.handle ? window.cadDocManager : null; }

// Show brief feedback in the object list area
function showFeedback(msg, isError) {
    const el = document.getElementById('objectList');
    if (!el) return;
    el.textContent = msg;
    if (isError) el.classList.add('text-error');
    else el.classList.add('text-success');
    setTimeout(() => {
        el.classList.remove('text-error', 'text-success');
        update();
    }, 2000);
}

// Auto-offset: shift new primitives along X so they partially overlap.
// Returns the UUID of the offset target (same as input).
function autoOffset(objectId) {
    if (!ctrl()) return;
    const ids = ctrl().object_ids();
    const idx = ids.indexOf(objectId);
    if (idx <= 0) return;
    const size = getSize();
    const dx = idx * size * 0.7;
    ctrl().translate_object(objectId, dx, 0, 0);
}

// --- Primitives ---
function addPrimitive(addFn, docType, docParams) {
    if (!ctrl()) return;
    const mgr = docMgr();
    if (mgr) {
        const groupId = crypto.randomUUID();
        const resultId = mgr.applyOperation(docType, docParams, groupId);
        if (resultId) {
            // Auto-offset as grouped op
            const ids = ctrl().object_ids();
            const idx = ids.indexOf(resultId);
            if (idx > 0) {
                const dx = idx * (docParams.size || 1.0) * 0.7;
                mgr.applyOperation('translate', { objectId: resultId, dx, dy: 0, dz: 0 }, groupId);
            }
            window.selectedObjectId = resultId;
        }
        update();
    } else {
        undo()?.captureBeforeMutation(`Add ${docType}`);
        const id = addFn();
        autoOffset(id);
        window.selectedObjectId = id;
        update();
    }
}

document.getElementById('addCube')?.addEventListener('click', () => {
    addPrimitive(
        () => ctrl().add_cube(getSize()),
        'add_cube',
        { size: getSize() },
    );
});

document.getElementById('addSphere')?.addEventListener('click', () => {
    addPrimitive(
        () => ctrl().add_sphere(getSize()),
        'add_sphere',
        { size: getSize() },
    );
});

document.getElementById('addCylinder')?.addEventListener('click', () => {
    addPrimitive(
        () => ctrl().add_cylinder(getSize() * 0.5, getSize()),
        'add_cylinder',
        { radius: getSize() * 0.5, height: getSize() },
    );
});

document.getElementById('addTorus')?.addEventListener('click', () => {
    addPrimitive(
        () => ctrl().add_torus(getSize(), getSize() * 0.3),
        'add_torus',
        { majorRadius: getSize(), minorRadius: getSize() * 0.3 },
    );
});

// --- Transform ---
document.getElementById('translateBtn')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const ids = ctrl().object_ids();
    if (ids.length === 0) {
        showFeedback('No objects to move', true);
        return;
    }
    const objectId = window.selectedObjectId || ids[0];
    if (!ids.includes(objectId)) {
        showFeedback('Selected object not found', true);
        return;
    }
    const dx = parseFloat(document.getElementById('txVal').value) || 0;
    const dy = parseFloat(document.getElementById('tyVal').value) || 0;
    const dz = parseFloat(document.getElementById('tzVal').value) || 0;
    if (dx === 0 && dy === 0 && dz === 0) {
        showFeedback('Enter non-zero dx/dy/dz values', true);
        return;
    }

    const mgr = docMgr();
    if (mgr) {
        mgr.applyOperation('translate', { objectId, dx, dy, dz });
        showFeedback(`Moved ${objectId.slice(0, 8)} by (${dx}, ${dy}, ${dz})`, false);
    } else {
        undo()?.captureBeforeMutation(`Move ${objectId.slice(0, 8)}`);
        const ok = ctrl().translate_object(objectId, dx, dy, dz);
        if (ok) {
            showFeedback(`Moved ${objectId.slice(0, 8)} by (${dx}, ${dy}, ${dz})`, false);
        } else {
            showFeedback('Move failed', true);
        }
    }
});

// --- Boolean ---
// Get UUID pairs for boolean ops: use object_ids() by index from UI inputs
function getABIds() {
    const ids = ctrl()?.object_ids() || [];
    const a = parseInt(document.getElementById('boolA').value) || 0;
    const b = parseInt(document.getElementById('boolB').value) || 0;
    return [ids[a] || '', ids[b] || ''];
}

function showBoolResult(resultId, op) {
    if (resultId) {
        window.selectedObjectId = resultId;
        showFeedback(`${op} → ${resultId.slice(0, 8)}`, false);
    } else {
        showFeedback(`${op} failed — ensure objects overlap`, true);
    }
}

document.getElementById('boolUnion')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const [idA, idB] = getABIds();
    if (!idA || !idB) { showFeedback('Invalid object indices', true); return; }
    const mgr = docMgr();
    if (mgr) {
        const resultId = mgr.applyOperation('boolean_union', { idA, idB });
        showBoolResult(resultId, 'Union');
    } else {
        undo()?.captureBeforeMutation('Union');
        showBoolResult(ctrl().boolean_union(idA, idB) || null, 'Union');
    }
});

document.getElementById('boolSubtract')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const [idA, idB] = getABIds();
    if (!idA || !idB) { showFeedback('Invalid object indices', true); return; }
    const mgr = docMgr();
    if (mgr) {
        const resultId = mgr.applyOperation('boolean_subtract', { idA, idB });
        showBoolResult(resultId, 'Subtract');
    } else {
        undo()?.captureBeforeMutation('Subtract');
        showBoolResult(ctrl().boolean_subtract(idA, idB) || null, 'Subtract');
    }
});

document.getElementById('boolIntersect')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const [idA, idB] = getABIds();
    if (!idA || !idB) { showFeedback('Invalid object indices', true); return; }
    const mgr = docMgr();
    if (mgr) {
        const resultId = mgr.applyOperation('boolean_intersect', { idA, idB });
        showBoolResult(resultId, 'Intersect');
    } else {
        undo()?.captureBeforeMutation('Intersect');
        showBoolResult(ctrl().boolean_intersect(idA, idB) || null, 'Intersect');
    }
});

// --- Scene management ---
document.getElementById('deleteBtn')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const ids = ctrl().object_ids();
    const objectId = window.selectedObjectId || ids[0];
    if (!objectId || !ids.includes(objectId)) {
        showFeedback('No object selected', true);
        return;
    }
    const mgr = docMgr();
    if (mgr) {
        mgr.applyOperation('delete', { objectId });
    } else {
        undo()?.captureBeforeMutation('Delete');
        ctrl().delete_object(objectId);
        const remaining = ctrl().object_ids();
        window.selectedObjectId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
        update();
    }
});

document.getElementById('clearBtn')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const mgr = docMgr();
    if (mgr) {
        mgr.applyOperation('clear', {});
    } else {
        undo()?.captureBeforeMutation('Clear scene');
        ctrl().clear_scene();
        window.selectedObjectId = null;
        update();
    }
});

// --- Undo / Redo ---
document.getElementById('undoBtn')?.addEventListener('click', () => {
    const mgr = docMgr();
    if (mgr) {
        mgr.undo();
    } else {
        undo()?.undo();
    }
});

document.getElementById('redoBtn')?.addEventListener('click', () => {
    const mgr = docMgr();
    if (mgr) {
        mgr.redo();
    } else {
        undo()?.redo();
    }
});

// Keyboard shortcuts: Ctrl+Z = undo, Ctrl+Shift+Z / Ctrl+Y = redo
document.addEventListener('keydown', (e) => {
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
        window.selectedObjectId = null;
        update();
        showFeedback('New document created', false);
    }
});

document.getElementById('shareBtn')?.addEventListener('click', () => {
    const mgr = docMgr();
    if (mgr) {
        const url = new URL(window.location.href);
        url.searchParams.set('doc', mgr.documentUrl);
        navigator.clipboard.writeText(url.toString()).then(() => {
            showFeedback('Share URL copied!', false);
        }).catch(() => {
            prompt('Copy this URL to share:', url.toString());
        });
    } else {
        showFeedback('No collaborative document active', true);
    }
});

document.getElementById('docInfo')?.addEventListener('click', () => {
    const mgr = docMgr();
    if (mgr) {
        navigator.clipboard.writeText(mgr.documentUrl).then(() => {
            showFeedback('Doc URL copied', false);
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
        undo()?.captureBeforeMutation('Load file');
        ctrl().import_scene(reader.result);
        const ids = ctrl().object_ids();
        window.selectedObjectId = ids.length > 0 ? ids[0] : null;
        update();
    };
    reader.readAsText(file);
    e.target.value = '';
});

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
                undo()?.captureBeforeMutation(`Load example: ${select.value}`);
                ctrl().import_scene(json);
                const ids = ctrl().object_ids();
                window.selectedObjectId = ids.length > 0 ? ids[0] : null;
                update();
                showFeedback(`Loaded: ${select.options[select.selectedIndex].text}`, false);
            } catch (err) {
                showFeedback('Failed to load example', true);
            }
            select.value = '';
        });
    } catch (err) {
        // No examples available yet — that's fine
    }
})();
