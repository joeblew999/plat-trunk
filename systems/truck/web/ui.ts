// ui.ts — Thin event bindings for model lifecycle + file I/O + responsive layout.
// All model operations go through cadCommand() — see dispatch.ts handleJsCommand().
// Keyboard shortcuts → keyboard.ts. Gizmo interaction → cad-viewport.ts (ADR-0013).

import { cadCommand, cadQuery, showFeedback } from './dispatch';

function ctrl() { return window.sceneController; }

// ─── Model lifecycle (all via cadCommand) ────────────────────────

document.getElementById('newDocBtn')?.addEventListener('click', () => {
    cadCommand('create_model');
});

document.getElementById('shareBtn')?.addEventListener('click', async () => {
    const result = await cadCommand('share_model');
    if (result?.url) showFeedback('Share URL copied!', false);
    else showFeedback('No document active', true);
});

document.getElementById('docInfo')?.addEventListener('click', async () => {
    const result = await cadCommand('share_model');
    if (result?.url) showFeedback('Doc URL copied', false);
});

// ─── Save / Load ─────────────────────────────────────────────────

document.getElementById('saveBtn')?.addEventListener('click', async () => {
    const result = cadQuery('export_scene', {});
    const json = result?.scene;
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cad-scene.json';
    a.click();
    URL.revokeObjectURL(a.href);
});

document.getElementById('saveCloudBtn')?.addEventListener('click', async () => {
    const name = prompt('Model name:', window.__modelId);
    if (!name) return;
    const btn = document.getElementById('saveCloudBtn') as HTMLButtonElement | null;
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
        const result = await cadCommand('save_cloud', { name });
        if (result?.success) showFeedback(`Saved "${name}" to cloud`, false);
        else showFeedback(result?.error || 'Cloud save failed', true);
    } catch (err) {
        showFeedback(`Cloud save failed: ${err instanceof Error ? err.message : String(err)}`, true);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Cloud';
    }
});

document.getElementById('loadBtn')?.addEventListener('click', () => {
    document.getElementById('fileInput')?.click();
});

document.getElementById('fileInput')?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file || !ctrl()) return;
    const reader = new FileReader();
    reader.onload = () => {
        cadCommand('import_scene', { json: reader.result });
    };
    reader.readAsText(file);
    target.value = '';
});

// ─── Example scenes ──────────────────────────────────────────────

(async function loadExamples() {
    const select = document.getElementById('exampleSelect') as unknown as HTMLSelectElement | null;
    if (!select) return;
    try {
        const res = await fetch('examples/index.json');
        if (!res.ok) return;
        const examples = await res.json() as any[];
        for (const ex of examples) {
            const opt = document.createElement('option');
            opt.value = ex.filename;
            opt.textContent = ex.name;
            opt.title = ex.description;
            select.appendChild(opt);
        }
        select.addEventListener('change', () => {
            if (!select.value) return;
            // Navigate to a fresh model with the example as baseline.
            // This prevents Automerge cross-contamination with the current model.
            window.location.href = `/model/new?example=${encodeURIComponent(select.value)}`;
        });
    } catch {}
})();

// ─── Responsive UI (mobile dock + sheet toggle) ──────────────────

// Data plane tabs live in right panel, control plane in left
const DATA_PLANE_TABS = new Set(['transform', 'sketch']);

const cadUI = {
    activeTab: null as string | null,
    setTab(name: string | null) {
        const outliner = document.querySelector('.app-outliner');
        const props = document.querySelector('.app-props');
        const isDataPlane = name !== null && DATA_PLANE_TABS.has(name);
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
    _updateDock(name: string | null) {
        document.querySelectorAll<HTMLElement>('.app-dock button[data-tab]').forEach(btn => {
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
