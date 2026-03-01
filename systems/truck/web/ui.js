// ui.js — Document management, file save/load, example scenes, responsive layout.
// Keyboard shortcuts → keyboard.js. Gizmo interaction → cad-viewport.js (ADR-0013).

import { cadCommand, cadQuery, showFeedback } from './state.js';
import { api } from './api-client.js';

function ctrl() { return window.sceneController; }
function docMgr() { return window.cadDocManager?.handle ? window.cadDocManager : null; }

// ─── Document management (Automerge) ────────────────────────────

document.getElementById('newDocBtn')?.addEventListener('click', async () => {
    const mgr = docMgr();
    if (mgr) {
        const name = prompt('Document name:', 'Untitled');
        if (name === null) return;
        ctrl()?.clear_scene();
        await window.cadDocManager.createDocument(name);
        cadQuery('deselect', {});
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

document.getElementById('saveCloudBtn')?.addEventListener('click', async () => {
    if (!ctrl()) return;
    const defaultName = window.__modelId === 'default' ? 'My Model' : window.__modelId;
    const name = prompt('Model name:', defaultName);
    if (!name) return;
    try {
        const scene = ctrl().export_scene();
        const modelId = window.__modelId === 'default' ? Math.random().toString(36).slice(2, 10) : window.__modelId;
        const res = await api.models[':id'].$put({
            param: { id: modelId },
            json: { name, scene },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showFeedback(`Saved "${name}" to cloud`, false);
        // Update URL to point to the saved model
        if (window.__modelId === 'default') {
            window.__modelId = modelId;
            history.replaceState(null, '', `/model/${modelId}${location.search}`);
        }
        // Refresh gallery if visible
        document.querySelector('cad-gallery')?.refresh();
    } catch (err) {
        showFeedback(`Cloud save failed: ${err.message}`, true);
    }
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
        if (ids.length > 0) cadQuery('select', { id: ids[0] });
    };
    reader.readAsText(file);
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
                if (ids.length > 0) cadQuery('select', { id: ids[0] });
                showFeedback(`Loaded: ${select.options[select.selectedIndex].text}`, false);
            } catch { showFeedback('Failed to load example', true); }
            select.value = '';
        });
    } catch {}
})();

// ─── Responsive UI (mobile dock + sheet toggle) ──────────────────

// Data plane tabs live in right panel, control plane in left
const DATA_PLANE_TABS = new Set(['transform', 'sketch']);

const cadUI = {
    activeTab: null,
    setTab(name) {
        const outliner = document.querySelector('.app-outliner');
        const props = document.querySelector('.app-props');
        const isDataPlane = DATA_PLANE_TABS.has(name);
        const panel = isDataPlane ? props : outliner;
        const otherPanel = isDataPlane ? outliner : props;
        if (!panel) return;

        // Close the other panel if open
        otherPanel?.classList.remove('sheet-open');

        // Toggle: if same tab clicked again, close sheet
        if (this.activeTab === name && panel.classList.contains('sheet-open')) {
            panel.classList.remove('sheet-open');
            this.activeTab = null;
            this._updateDock(null);
            return;
        }

        this.activeTab = name;
        panel.classList.add('sheet-open');

        // Scroll to relevant section within panel
        const heading = panel.querySelector(`[data-section="${name}"]`);
        if (heading) heading.scrollIntoView({ behavior: 'smooth', block: 'start' });

        this._updateDock(name);
    },
    _closeSheets() {
        document.querySelector('.app-outliner')?.classList.remove('sheet-open');
        document.querySelector('.app-props')?.classList.remove('sheet-open');
        this.activeTab = null;
        this._updateDock(null);
    },
    _updateDock(name) {
        document.querySelectorAll('.app-dock button[data-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === name);
        });
    },
    init() {
        // Close sheets when tapping canvas on mobile
        const canvas = document.getElementById('cad-canvas');
        if (canvas) {
            canvas.addEventListener('pointerdown', () => {
                if (window.innerWidth < 1024) this._closeSheets();
            });
        }
        // Auto-close sheets when switching to desktop
        window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
            if (e.matches) this._closeSheets();
        });
    }
};

window.cadUI = cadUI;
cadUI.init();
