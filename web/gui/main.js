// CAD command UI — calls WASM SceneController directly.

function ctrl() { return window.sceneController; }
function getSize() { return parseFloat(document.getElementById('sizeParam').value) || 1.0; }
function update() { if (window.updateObjectList) window.updateObjectList(); }

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
    const dx = parseFloat(document.getElementById('txVal').value) || 0;
    const dy = parseFloat(document.getElementById('tyVal').value) || 0;
    const dz = parseFloat(document.getElementById('tzVal').value) || 0;
    ctrl().translate_object(window.selectedObject || 0, dx, dy, dz);
    update();
});

// --- Boolean ---
function getAB() {
    return [
        parseInt(document.getElementById('boolA').value) || 0,
        parseInt(document.getElementById('boolB').value) || 0,
    ];
}

function showBoolResult(idx, op) {
    const el = document.getElementById('objectList');
    if (idx >= 0) {
        window.selectedObject = idx;
        update();
    } else {
        el.textContent = `${op} failed — ensure objects overlap`;
        el.classList.add('text-error');
        setTimeout(() => { el.classList.remove('text-error'); update(); }, 3000);
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
