// ui.js — Document management, file save/load, example scenes, responsive layout.
// Keyboard shortcuts → keyboard.js. Gizmo interaction → cad-viewport.js (ADR-0013).

import { cadCommand, showFeedback } from './state.js';

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
        cadCommand('deselect', {}, { record: false, broadcast: false });
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
        if (ids.length > 0) cadCommand('select', { id: ids[0] }, { record: false, broadcast: false });
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
                if (ids.length > 0) cadCommand('select', { id: ids[0] }, { record: false, broadcast: false });
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
