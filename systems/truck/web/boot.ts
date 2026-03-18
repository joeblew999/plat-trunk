// boot.ts — App initialization sequence.
// Extracted from index.html to make the boot logic readable and testable.
//
// Sequence:
//   1. Clean state if ?reset=1
//   2. Import WASM + custom elements + core modules
//   3. Wait for WASM SceneController
//   4. Initialize Automerge repo + load model
//   5. Signal readiness

import { loadModel } from './model-loader';
import { refreshBudget } from './storage-budget';
import { cadDocManager } from './history-ui';

export async function boot() {
    // Bail out if redirecting — prevent stale Automerge doc from loading
    if (window.__redirecting) throw new Error('redirect');

    // ── 1. Clean state if ?reset=1 (ADR-0026 Phase 4: test isolation) ──
    if (window.__resetRequested) {
        localStorage.clear();
        await Promise.all([
            deleteDb('cad-objects'),
            deleteDb('cad-blobs'),
            deleteDb('cad-docs'),
            deleteDb('cad-sync'),
        ]);
        if (window.resetTierState) window.resetTierState();
    }

    // ── 2. Import modules ───────────────────────────────────────────
    // UI components (no WASM dependency)
    await import('./live-signals');
    await import('./cf-control-plane');

    // WASM modules (cad-viewport does the actual WebGPU init)
    const wasm = await import('./pkg-browser-renderer/truck_cad.js');
    window.__wasmInit = wasm.default;
    window.__SceneController = wasm.SceneController;

    // Custom elements
    await import('./cad-viewport');
    await import('./cad-outliner');
    await import('./cad-gallery');

    // Core modules (state, history, UI, keyboard, sketch)
    await import('./state');
    await import('./history-ui');
    await import('./ui');
    await import('./keyboard');
    await import('./sketch');

    // Plugin system — must come after state.ts sets window.cadCommand
    const { initPluginManager } = await import('./plugin-manager-ui');
    const pluginMgr = initPluginManager();

    // Auto-load first-party plugins (served at /plugins/{name}/ by Vite dev / wrangler ASSETS prod)
    // Failures are non-fatal — a missing or broken plugin should never block the app
    const BUILTIN_PLUGINS = ['example', 'howick'];
    for (const name of BUILTIN_PLUGINS) {
        pluginMgr.loadBuiltin(`/plugins/${name}`).catch(err => {
            console.warn(`[plugins] Failed to load builtin "${name}":`, err);
        });
    }

    // ── 3. Wait for WASM SceneController ────────────────────────────
    await waitFor(() => window.sceneController, 6000, 'WASM SceneController');
    console.log('CAD running.');

    // Mode indicators
    setModeIndicators();

    // ── 4. Initialize Automerge repo + load model ───────────────────
    // cadDocManager is the module singleton from history-ui.ts — no waitFor needed
    await cadDocManager.initRepo();
    await loadModel(window.__modelId, cadDocManager);
    console.log('Automerge doc ready:', cadDocManager.documentUrl);

    // ── 5. Start worker relay (online mode only) ─────────────────────
    if (!window.__cadLocalMode) {
        import('./worker-relay');
    }

    // ── 6. Actor ID + storage persistence + budget ─────────────────
    if (!localStorage.getItem('cad-actor-id')) {
        localStorage.setItem('cad-actor-id', crypto.randomUUID());
    }
    navigator.storage?.persist?.().catch(() => {});
    await refreshBudget();

    // ── 7. Ready ────────────────────────────────────────────────────

    // ── 7. Auth session ─────────────────────────────────────────────
    // Non-blocking — fetch session in background, populate $authUser signal if logged in.
    // Fails silently if auth worker is not running (local dev without auth).
    fetch('/auth/api/get-session', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then((data: any) => {
            const email = data?.user?.email ?? '';
            if (email && (window as any).__ds) {
                (window as any).__ds.signals.authUser = email;
            }
        })
        .catch(() => {}); // auth worker not running — silently ignore

    window.__appReady = true;
    document.getElementById('loading-overlay')?.remove();
    console.log('App ready.');
}

// ─── Helpers ─────────────────────────────────────────────────────

function deleteDb(name: string): Promise<void> {
    return new Promise(resolve => {
        const timeout = setTimeout(() => {
            console.warn(`[reset] deleteDatabase("${name}") timed out — continuing`);
            resolve();
        }, 3000);
        const done = () => { clearTimeout(timeout); resolve(); };
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = done;
        req.onerror = done;
        // Safari blocks deleteDatabase if another tab/connection holds it open.
        // Without this handler the Promise hangs forever → infinite loading.
        req.onblocked = () => {
            console.warn(`[reset] deleteDatabase("${name}") blocked — continuing`);
            done();
        };
    });
}

async function waitFor(fn: () => unknown, timeoutMs: number, label: string): Promise<void> {
    const interval = 100;
    const maxRetries = Math.ceil(timeoutMs / interval);
    for (let i = 0; i < maxRetries; i++) {
        if (fn()) return;
        await new Promise(r => setTimeout(r, interval));
    }
    throw new Error(`${label} timeout (${timeoutMs}ms)`);
}

function setModeIndicators() {
    const modeEl = document.getElementById('status-mode');
    const indicatorEl = document.getElementById('mode-indicator');
    if (window.__cadLocalMode) {
        if (modeEl) modeEl.textContent = 'Local mode';
        if (indicatorEl) indicatorEl.textContent = 'Local';
    } else {
        if (modeEl) modeEl.textContent = 'Online';
        if (indicatorEl) indicatorEl.textContent = 'Online';
    }

    // MCP section: populate origin URL
    const mcpUrl = document.querySelector('[data-testid="mcp-url"]');
    if (mcpUrl) mcpUrl.textContent = location.origin + '/mcp';
    document.querySelectorAll('.mcp-origin').forEach(el => { el.textContent = location.origin; });
}
