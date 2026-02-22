// ui.js — UI only: gizmo mouse handlers, keyboard shortcuts, file save/load, responsive layout.
// ALL selection goes through cadCommand(). No direct WASM selection calls.

import { cadCommand, reconcile, showFeedback } from './state.js';

function ctrl() { return window.sceneController; }
function ds() { return window._ds; }
function docMgr() { return window.cadDocManager?.handle ? window.cadDocManager : null; }

// ─── Keyboard shortcuts ─────────────────────────────────────────

document.addEventListener('keydown', (e) => {
    if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'select' && tag !== 'textarea') {
            cadUI.setTab('sketch');
            e.preventDefault();
            return;
        }
    }
    if (e.key === 'Escape' && window.__sketch?.isActive) {
        window.__sketch.cancel();
        e.preventDefault();
        return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        docMgr()?.undo();
    }
    if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        docMgr()?.redo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        const sel = window._ds?.root?.selectedId;
        if (sel) cadCommand('duplicate', { objectId: sel });
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'select' && tag !== 'textarea') {
            const sel = window._ds?.root?.selectedId;
            if (sel) cadCommand('delete', { objectId: sel });
        }
    }
});

// ─── Document management (Automerge) ────────────────────────────

document.getElementById('importIfcBtn')?.addEventListener('click', () => {
    document.getElementById('fileInput')?.click();
});

document.getElementById('importGltfBtn')?.addEventListener('click', () => {
    document.getElementById('fileInput')?.click();
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

// ─── Save / Load ─────────────────────────────────────────────────

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

document.getElementById('exportStepBtn')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const result = cadCommand('export_step', {}, { ephemeral: true });
    if (result.step) {
        const blob = new Blob([result.step], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cad-export.step';
        a.click();
        URL.revokeObjectURL(url);
    } else {
        showFeedback('Export failed — no solids in scene', true);
    }
});

document.getElementById('exportObjBtn')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const result = cadCommand('export_obj', {}, { ephemeral: true });
    if (result.obj) {
        const blob = new Blob([result.obj], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cad-export.obj';
        a.click();
        URL.revokeObjectURL(url);
    } else {
        showFeedback('Export failed', true);
    }
});

document.getElementById('exportStlBtn')?.addEventListener('click', () => {
    if (!ctrl()) return;
    const result = cadCommand('export_stl', {}, { ephemeral: true });
    if (result.stl) {
        const blob = new Blob([result.stl], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cad-export.stl';
        a.click();
        URL.revokeObjectURL(url);
    } else {
        showFeedback('Export failed', true);
    }
});

document.getElementById('loadBtn')?.addEventListener('click', () => {
    document.getElementById('fileInput')?.click();
});

document.getElementById('importStepBtn')?.addEventListener('click', () => {
    document.getElementById('fileInput')?.click();
});

document.getElementById('importIfcBtn')?.addEventListener('click', () => {
    document.getElementById('fileInput')?.click();
});

document.getElementById('fileInput')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file || !ctrl()) return;
    const name = file.name.toLowerCase();
    const reader = new FileReader();
    
    reader.onload = () => {
        const data = reader.result;
        
        if (name.endsWith('.glb') || name.endsWith('.gltf')) {
            const bytes = new Uint8Array(data);
            let binary = '';
            // Chunked processing to avoid stack overflow on large files
            const chunk = 8192;
            for (let i = 0; i < bytes.length; i += chunk) {
                binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
            }
            const b64 = btoa(binary);
            cadCommand('import_gltf', { data: b64, x: 0, y: 0, z: 0 });
        } else {
            // Text based formats
            const str = new TextDecoder().decode(data);
            if (name.endsWith('.json')) {
                cadCommand('import_scene', { json: str });
            } else if (name.endsWith('.step') || name.endsWith('.stp')) {
                cadCommand('import_step', { data: str });
            } else if (name.endsWith('.ifc')) {
                cadCommand('import_ifc', { data: str });
            }
        }
        
        // Select first object after import
        setTimeout(() => {
            const ids = ctrl().object_ids();
            if (ids.length > 0) cadCommand('select', { id: ids[0] }, { ephemeral: true });
        }, 100);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
});

// ─── Example scenes ──────────────────────────────────────────────

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
                if (ids.length > 0) cadCommand('select', { id: ids[0] }, { ephemeral: true });
                showFeedback(`Loaded: ${select.options[select.selectedIndex].text}`, false);
            } catch { showFeedback('Failed to load example', true); }
            select.value = '';
        });
    } catch {}
})();

// ─── Responsive UI (mobile dock + sheet toggle) ──────────────────

const cadUI = {
    activeTab: null,
    setTab(name) {
        const outliner = document.querySelector('.app-outliner');
        if (!outliner) return;

        // Toggle: if same tab clicked again, close sheet
        if (this.activeTab === name && outliner.classList.contains('sheet-open')) {
            outliner.classList.remove('sheet-open');
            this.activeTab = null;
            this._updateDock(null);
            return;
        }

        this.activeTab = name;
        outliner.classList.add('sheet-open');

        // Scroll to relevant section within outliner
        const heading = outliner.querySelector(`[data-section="${name}"]`);
        if (heading) heading.scrollIntoView({ behavior: 'smooth', block: 'start' });

        this._updateDock(name);
    },
    _updateDock(name) {
        document.querySelectorAll('.app-dock button[data-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === name);
        });
    },
    init() {
        // Close sheet when tapping canvas on mobile
        const canvas = document.getElementById('cad-canvas');
        if (canvas) {
            canvas.addEventListener('pointerdown', () => {
                if (window.innerWidth < 1024) {
                    const outliner = document.querySelector('.app-outliner');
                    if (outliner?.classList.contains('sheet-open')) {
                        outliner.classList.remove('sheet-open');
                        this.activeTab = null;
                        this._updateDock(null);
                    }
                }
            });
        }
        // Auto-close sheet when switching to desktop
        window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
            if (e.matches) {
                document.querySelector('.app-outliner')?.classList.remove('sheet-open');
                this.activeTab = null;
            }
        });
    }
};

window.cadUI = cadUI;
cadUI.init();
