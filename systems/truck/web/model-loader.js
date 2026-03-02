// model-loader.js — Single owner for "URL → rendered scene".
//
// One function, one file. loadModel(modelId, docManager) handles ALL model loading:
//
//   Phase 1: Pre-fetch scene from cloud/example (so fallback is ready)
//   Phase 2: Try Automerge cache (fast local replay with undo/redo support)
//   Phase 3: Fall back to pre-fetched scene data (cloud → example → default cube)
//   Phase 4: Finalize (localStorage pointer, timeline, doc info)
//
// Cloud is source of truth. Automerge is a local acceleration cache.
// If Automerge replay produces empty scene (e.g. blob-store wiped),
// it's treated as cache-invalid and falls through to cloud.

import { cadCommand, reconcile, moduleRouter } from './state.js';
import { storeBlob } from './blob-store.js';
import { api } from './api-client.js';
import { isValidAutomergeUrl } from './vendor/automerge-bundle.js';

// ─── Main entry point ────────────────────────────────────────────

export async function loadModel(modelId, mgr) {
    const params = new URLSearchParams(window.location.search);
    const docParam = params.get('doc');
    const exampleParam = params.get('example');

    // ── Phase 1: Pre-fetch scene from source of truth ────────────
    // Do this BEFORE trying Automerge, so we have a fallback ready.
    let sceneJson = null;
    let sceneSource = 'none';

    if (exampleParam) {
        sceneJson = await fetchExample(exampleParam);
        if (sceneJson) sceneSource = 'example';
    }
    if (!sceneJson && !docParam) {
        sceneJson = await fetchCloud(modelId);
        if (sceneJson) sceneSource = 'cloud';
    }

    // ── Phase 2: Try Automerge cache (local acceleration) ────────
    let restored = false;
    const automergeUrl = docParam || localStorage.getItem(`cad-doc-url-${modelId}`);

    if (automergeUrl && isValidAutomergeUrl(automergeUrl)) {
        restored = await tryRestoreDoc(mgr, automergeUrl);
    }

    // ── Phase 3: Fall back to scene data ─────────────────────────
    if (!restored) {
        if (!sceneJson) {
            sceneJson = await fetchDefault();
            sceneSource = 'default';
        }
        await createDocWithScene(mgr, modelId, sceneJson, sceneSource);
    }

    // ── Phase 4: Finalize ────────────────────────────────────────
    mgr._localOpCount = mgr._getDocOpCount();
    mgr._lastSavedOpIndex = mgr._localOpCount;
    localStorage.setItem(`cad-doc-url-${modelId}`, mgr.handle.url);
    mgr._listenForChanges();
    mgr._updateDocInfo();
    mgr._renderTimeline();
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Try to restore an Automerge doc. Returns true if scene was successfully replayed.
 *  Returns false if doc is missing, corrupt, or replay produces empty scene
 *  (e.g. blob-store was wiped, making snapshots unresolvable). */
async function tryRestoreDoc(mgr, automergeUrl) {
    try {
        mgr.handle = await mgr.repo.find(automergeUrl);
        const doc = mgr.handle.doc();
        if (!doc) return false;

        await mgr._replayScene();

        // Validate: if doc has ops/snapshots but scene is empty, cache is invalid
        const ids = moduleRouter.query('objectIds');
        const hasContent = (doc.operations?.length > 0) || (doc.snapshots?.length > 0);
        if (hasContent && (!ids || ids.length === 0)) {
            console.warn('[loadModel] Automerge cache invalid (blobs missing?) — falling through to cloud');
            return false;
        }

        console.log(`[loadModel] Restored from Automerge cache (${doc.operations?.length || 0} ops)`);
        return true;
    } catch (e) {
        console.warn('[loadModel] Automerge restore failed:', e);
        return false;
    }
}

/** Create fresh Automerge doc and import scene JSON into WASM. */
async function createDocWithScene(mgr, modelId, sceneJson, source) {
    mgr.handle = mgr.repo.create({
        name: `Model ${modelId}`,
        createdAt: new Date().toISOString(),
        operations: [],
    });
    await mgr.handle.doc();

    if (sceneJson) {
        cadCommand('clear', {}, { record: false, reconcile: false });
        cadCommand('import_scene', { json: sceneJson }, { record: false, reconcile: false });
        reconcile({});

        // Store as baseline snapshot at opIndex 0 (not an operation — can't undo opening a model)
        const snapshotRef = await storeBlob(sceneJson);
        mgr.handle.change(d => {
            if (!d.snapshots) d.snapshots = [];
            d.snapshots.push({ blobRef: snapshotRef, atOpIndex: 0 });
        });
        console.log(`[loadModel] Loaded from ${source}`);
    }
}

// ─── Fetch helpers ───────────────────────────────────────────────

async function fetchCloud(modelId) {
    try {
        // HEAD first to avoid noisy 404 in browser console for new models
        const head = await api.models[':id'].$get({ param: { id: modelId } });
        if (!head.ok) return null;
        const res = await api.models[':id'].scene.$get({ param: { id: modelId } });
        if (res.ok) return await res.text();
    } catch { /* cloud unavailable or model not saved */ }
    return null;
}

async function fetchExample(name) {
    try {
        const res = await fetch(`examples/${name}`);
        if (res.ok) {
            console.log(`[loadModel] Fetched example "${name}"`);
            return await res.text();
        }
    } catch (e) { console.warn(`[loadModel] Example fetch failed:`, e); }
    return null;
}

async function fetchDefault() {
    try {
        const res = await fetch('examples/default-cube.json');
        if (res.ok) return await res.text();
    } catch (e) { console.warn('[loadModel] Default scene fetch failed:', e); }
    return null;
}
