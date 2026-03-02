// boot.js — App initialization sequence.
// Extracted from index.html to make the boot logic readable and testable.
//
// Sequence:
//   1. Clean state if ?reset=1
//   2. Import WASM + custom elements + core modules
//   3. Wait for WASM SceneController
//   4. Initialize Automerge repo + load model
//   5. Signal readiness

import { loadModel } from './model-loader.js';

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
        ]);
        if (window.resetTierState) window.resetTierState();
    }

    // ── 2. Import modules ───────────────────────────────────────────
    // UI components (no WASM dependency)
    await import('./live-signals.js');
    await import('./cf-control-plane.js');

    // WASM modules (cad-viewport does the actual WebGPU init)
    const wasm = await import('./pkg-browser-renderer/truck_webgpu_gui.js');
    window.__wasmInit = wasm.default;
    window.__SceneController = wasm.SceneController;

    // Custom elements
    await import('./cad-viewport.js');
    await import('./cad-outliner.js');
    await import('./cad-gallery.js');

    // Core modules (state, history, UI, keyboard, sketch)
    await import('./state.js');
    await import('./history.js');
    await import('./ui.js');
    await import('./keyboard.js');
    await import('./sketch.js');

    // ── 3. Wait for WASM SceneController ────────────────────────────
    await waitFor(() => window.sceneController, 6000, 'WASM SceneController');
    console.log('CAD running.');

    // Mode indicators
    setModeIndicators();

    // ── 4. Initialize Automerge repo + load model ───────────────────
    await waitFor(() => window.cadDocManager, 3000, 'cadDocManager');
    await window.cadDocManager.initRepo();
    await loadModel(window.__modelId, window.cadDocManager);
    console.log('Automerge doc ready:', window.cadDocManager.documentUrl);

    // ── 5. Ready ────────────────────────────────────────────────────
    window.__appReady = true;
    document.getElementById('loading-overlay')?.remove();
    console.log('App ready.');
}

// ─── Helpers ─────────────────────────────────────────────────────

function deleteDb(name) {
    return new Promise(resolve => {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = resolve;
        req.onerror = resolve;
    });
}

async function waitFor(fn, timeoutMs, label) {
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
