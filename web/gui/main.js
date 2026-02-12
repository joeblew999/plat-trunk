// CAD command UI — calls WASM SceneController directly.
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

// Auto-offset: shift new primitives along X so they partially overlap (useful for booleans).
function autoOffset(idx) {
    if (!ctrl() || idx <= 0) return;
    const size = getSize();
    const dx = idx * size * 0.7;
    ctrl().translate_object(idx, dx, 0, 0);
}

// --- Primitives ---
document.getElementById('addCube')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const mgr = docMgr();
    if (mgr) {
        mgr.applyOperation('add_cube', { size: getSize() });
    } else {
        undo()?.captureBeforeMutation('Add cube');
        const idx = ctrl().add_cube(getSize());
        autoOffset(idx);
        window.selectedObject = idx;
        update();
    }
});

document.getElementById('addSphere')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const mgr = docMgr();
    if (mgr) {
        mgr.applyOperation('add_sphere', { size: getSize() });
    } else {
        undo()?.captureBeforeMutation('Add sphere');
        const idx = ctrl().add_sphere(getSize());
        autoOffset(idx);
        window.selectedObject = idx;
        update();
    }
});

document.getElementById('addCylinder')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const mgr = docMgr();
    if (mgr) {
        mgr.applyOperation('add_cylinder', { radius: getSize() * 0.5, height: getSize() });
    } else {
        undo()?.captureBeforeMutation('Add cylinder');
        const idx = ctrl().add_cylinder(getSize() * 0.5, getSize());
        autoOffset(idx);
        window.selectedObject = idx;
        update();
    }
});

document.getElementById('addTorus')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const mgr = docMgr();
    if (mgr) {
        mgr.applyOperation('add_torus', { majorRadius: getSize(), minorRadius: getSize() * 0.3 });
    } else {
        undo()?.captureBeforeMutation('Add torus');
        const idx = ctrl().add_torus(getSize(), getSize() * 0.3);
        autoOffset(idx);
        window.selectedObject = idx;
        update();
    }
});

// --- Transform ---
document.getElementById('translateBtn')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const idx = window.selectedObject ?? 0;
    const count = ctrl().object_count();
    if (count === 0) {
        showFeedback('No objects to move', true);
        return;
    }
    if (idx >= count) {
        showFeedback(`Object [${idx}] doesn't exist (${count} objects)`, true);
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
        mgr.applyOperation('translate', { objectIndex: idx, dx, dy, dz });
        showFeedback(`Moved [${idx}] by (${dx}, ${dy}, ${dz})`, false);
    } else {
        undo()?.captureBeforeMutation(`Move [${idx}] by (${dx},${dy},${dz})`);
        console.log(`translate_object(${idx}, ${dx}, ${dy}, ${dz})`);
        const ok = ctrl().translate_object(idx, dx, dy, dz);
        if (ok) {
            showFeedback(`Moved [${idx}] by (${dx}, ${dy}, ${dz})`, false);
        } else {
            showFeedback(`Move failed for object [${idx}]`, true);
        }
    }
});

// --- Boolean ---
function getAB() {
    return [
        parseInt(document.getElementById('boolA').value) || 0,
        parseInt(document.getElementById('boolB').value) || 0,
    ];
}

function showBoolResult(idx, op) {
    if (idx >= 0) {
        window.selectedObject = idx;
        showFeedback(`${op} → object [${idx}]`, false);
    } else {
        showFeedback(`${op} failed — ensure objects overlap`, true);
    }
}

document.getElementById('boolUnion')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const [a, b] = getAB();
    const mgr = docMgr();
    if (mgr) {
        mgr.applyOperation('boolean_union', { a, b });
    } else {
        undo()?.captureBeforeMutation(`Union [${a}] + [${b}]`);
        showBoolResult(ctrl().boolean_union(a, b), 'Union');
    }
});

document.getElementById('boolSubtract')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const [a, b] = getAB();
    const mgr = docMgr();
    if (mgr) {
        mgr.applyOperation('boolean_subtract', { a, b });
    } else {
        undo()?.captureBeforeMutation(`Subtract [${b}] from [${a}]`);
        showBoolResult(ctrl().boolean_subtract(a, b), 'Subtract');
    }
});

document.getElementById('boolIntersect')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const [a, b] = getAB();
    const mgr = docMgr();
    if (mgr) {
        mgr.applyOperation('boolean_intersect', { a, b });
    } else {
        undo()?.captureBeforeMutation(`Intersect [${a}] ∩ [${b}]`);
        showBoolResult(ctrl().boolean_intersect(a, b), 'Intersect');
    }
});

// --- Scene management ---
document.getElementById('deleteBtn')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const mgr = docMgr();
    if (mgr) {
        mgr.applyOperation('delete', { objectIndex: window.selectedObject || 0 });
    } else {
        undo()?.captureBeforeMutation(`Delete [${window.selectedObject || 0}]`);
        ctrl().delete_object(window.selectedObject || 0);
        window.selectedObject = 0;
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
        window.selectedObject = 0;
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
        window.selectedObject = 0;
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
        window.selectedObject = 0;
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
                window.selectedObject = 0;
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
