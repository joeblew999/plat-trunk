// model-loader.ts — Single owner for "URL → rendered scene".
//
// One function, one file. loadModel(modelId, docManager) handles ALL model loading:
//
//   Phase 1: Pre-fetch scene from cloud/example (so fallback is ready)
//   Phase 2: Try sync cache (fast local replay with undo/redo support)
//   Phase 3: Fall back to pre-fetched scene data (cloud → example → default cube)
//   Phase 4: Finalize (timeline, doc info, change listener)
//
// Cloud is source of truth. WASM sync cache is a local acceleration cache.
// If sync cache replay produces empty scene (e.g. blob-store wiped),
// it's treated as cache-invalid and falls through to cloud.

export async function loadModel(modelId: string, mgr: any) {
    const params = new URLSearchParams(window.location.search);
    const exampleParam = params.get('example');

    // ── Phase 1: Pre-fetch scene from source of truth ────────────
    let sceneJson: string | null = null;
    let sceneSource = 'none';

    if (exampleParam) {
        sceneJson = await fetchExample(exampleParam);
        if (sceneJson) sceneSource = 'example';
    }
    if (!sceneJson) {
        sceneJson = await fetchCloud(modelId);
        if (sceneJson) sceneSource = 'cloud';
    }

    // ── Phase 2: Try WASM sync cache (local acceleration) ────────
    const restored = await mgr.tryRestoreFromIdb(modelId);

    // ── Phase 3: Fall back to scene data ─────────────────────────
    if (!restored) {
        if (!sceneJson) {
            sceneJson = await fetchDefault();
            sceneSource = 'default';
        }
        await mgr.createFreshDoc(modelId, sceneJson, sceneSource);
    }

    // ── Phase 4: Finalize ────────────────────────────────────────
    mgr._localOpCount = mgr._getDocOpCount();
    mgr._lastSavedOpIndex = mgr._localOpCount;
    mgr._listenForChanges();
    mgr._updateDocInfo();
    mgr._renderTimeline();
}

async function fetchCloud(modelId: string): Promise<string | null> {
    try {
        const res = await fetch(`/api/models/${modelId}/scene`);
        if (res.ok) return await res.text();
    } catch { /* cloud unavailable or model not saved */ }
    return null;
}

async function fetchExample(name: string): Promise<string | null> {
    try {
        const res = await fetch(`examples/${name}`);
        if (res.ok) {
            console.log(`[loadModel] Fetched example "${name}"`);
            return await res.text();
        }
    } catch (e) { console.warn(`[loadModel] Example fetch failed:`, e); }
    return null;
}

async function fetchDefault(): Promise<string | null> {
    try {
        const res = await fetch('examples/default-cube.json');
        if (res.ok) return await res.text();
    } catch (e) { console.warn('[loadModel] Default scene fetch failed:', e); }
    return null;
}
