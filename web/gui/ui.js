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
});

// ─── Document management (Automerge) ────────────────────────────

document.getElementById('newDocBtn')?.addEventListener('click', async () => {
    const mgr = docMgr();
    if (mgr) {
        const name = prompt('Document name:', 'Untitled');
        if (name === null) return;
        ctrl()?.clear_scene();
        await window.cadDocManager.createDocument(name);
        cadCommand('deselect', {}, { ephemeral: true });
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

document.getElementById('loadBtn')?.addEventListener('click', () => {
    document.getElementById('fileInput')?.click();
});

document.getElementById('fileInput')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file || !ctrl()) return;
    const reader = new FileReader();
    reader.onload = () => {
        cadCommand('import_scene', { json: reader.result });
        // Select first object after import
        const ids = ctrl().object_ids();
        if (ids.length > 0) cadCommand('select', { id: ids[0] }, { ephemeral: true });
    };
    reader.readAsText(file);
    e.target.value = '';
});

// ─── Gizmo: canvas click-to-select + drag-to-translate ──────────
// Skipped when <cad-viewport> manages interaction (ADR-0013 Passive WASM).

(function setupGizmo() {
    if (document.querySelector('cad-viewport')) return; // cad-viewport owns interaction
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

    canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || !ctrl()) return;
        const [ndcX, ndcY] = toNdc(e);

        // Skip gizmo when picking B for boolean (A set, B not yet)
        const r = ds()?.root;
        const pickingB = r?.boolSelA && !r?.boolSelB;
        if (!pickingB && ctrl().get_interaction_mode() === 'selected') {
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

        // Pick + select: two commands, same path as outliner click
        const { pickedId } = cadCommand('pick_at', { ndcX, ndcY }, { ephemeral: true });
        cadCommand('select', { id: pickedId || '' }, { ephemeral: true });
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
            const mgr = docMgr();
            if (mgr) {
                mgr.record('translate', {
                    objectId: result.objectId,
                    dx: result.dx, dy: result.dy, dz: result.dz,
                });
            }
        }
        reconcile({});
        e.stopPropagation();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (isDragging && ctrl()) {
                isDragging = false;
                canvas.style.cursor = '';
                ctrl().cancel_gizmo_drag();
            } else if (ctrl()) {
                cadCommand('deselect', {}, { ephemeral: true });
            }
            e.preventDefault();
        }
        if (e.key === 'Delete' && !isDragging && ctrl()) {
            const objectId = ds()?.root?.selectedId;
            if (objectId && ctrl().object_ids().includes(objectId)) {
                cadCommand('delete', { objectId });
            }
        }
    });
})();

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
