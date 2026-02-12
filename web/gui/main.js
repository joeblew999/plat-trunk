// CAD command UI — calls WASM SceneController directly.

function ctrl() { return window.sceneController; }
function getSize() { return parseFloat(document.getElementById('sizeParam').value) || 1.0; }
function update() { if (window.updateObjectList) window.updateObjectList(); }

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
    const idx = ctrl().add_cube(getSize());
    autoOffset(idx);
    window.selectedObject = idx;
    update();
});

document.getElementById('addSphere')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const idx = ctrl().add_sphere(getSize());
    autoOffset(idx);
    window.selectedObject = idx;
    update();
});

document.getElementById('addCylinder')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const idx = ctrl().add_cylinder(getSize() * 0.5, getSize());
    autoOffset(idx);
    window.selectedObject = idx;
    update();
});

document.getElementById('addTorus')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const idx = ctrl().add_torus(getSize(), getSize() * 0.3);
    autoOffset(idx);
    window.selectedObject = idx;
    update();
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
    console.log(`translate_object(${idx}, ${dx}, ${dy}, ${dz})`);
    const ok = ctrl().translate_object(idx, dx, dy, dz);
    if (ok) {
        showFeedback(`Moved [${idx}] by (${dx}, ${dy}, ${dz})`, false);
    } else {
        showFeedback(`Move failed for object [${idx}]`, true);
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
    showBoolResult(ctrl().boolean_union(a, b), 'Union');
});

document.getElementById('boolSubtract')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const [a, b] = getAB();
    showBoolResult(ctrl().boolean_subtract(a, b), 'Subtract');
});

document.getElementById('boolIntersect')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const [a, b] = getAB();
    showBoolResult(ctrl().boolean_intersect(a, b), 'Intersect');
});

// --- Scene management ---
document.getElementById('deleteBtn')?.addEventListener('click', () => {
    if (!ctrl()) return;
    ctrl().delete_object(window.selectedObject || 0);
    window.selectedObject = 0;
    update();
});

document.getElementById('clearBtn')?.addEventListener('click', () => {
    if (!ctrl()) return;
    ctrl().clear_scene();
    window.selectedObject = 0;
    update();
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
        ctrl().import_scene(reader.result);
        window.selectedObject = 0;
        update();
    };
    reader.readAsText(file);
    e.target.value = '';
});
