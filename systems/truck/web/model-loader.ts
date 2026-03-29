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

import type { CadDocumentManagerBase } from './cad-doc-manager';
import { parseUrlParams } from './url-params';

export async function loadModel(modelId: string, mgr: CadDocumentManagerBase) {
    const { example: exampleParam } = parseUrlParams();

    // ── Phase 1: Pre-fetch scene from source of truth ────────────
    let sceneJson: string | null = null;
    let sceneSource = 'none';

    if (exampleParam) {
        sceneJson = await fetchExample(exampleParam);
        if (sceneJson) sceneSource = 'example';
    }
    if (!sceneJson) {
        // Try server snapshot cache first (faster than full cloud scene fetch)
        const serverSnapshot = await fetchServerSnapshot(modelId);
        if (serverSnapshot) {
            sceneJson = serverSnapshot;
            sceneSource = 'server-snapshot';
        } else {
            sceneJson = await fetchCloud(modelId);
            if (sceneJson) sceneSource = 'cloud';
        }
    }

    // ── Phase 2: Try WASM sync cache (local acceleration) ────────
    const restored = await mgr.tryRestoreFromIdb(modelId);

    // ── Phase 3: Fall back to scene data ─────────────────────────
    if (!restored) {
        // Try to adopt server's CRDT doc (e.g. MCP created the model first).
        // This avoids creating an independent doc that would lose ops on merge.
        const serverDoc = await fetchServerDoc(modelId);
        if (serverDoc) {
            await mgr.adoptServerDoc(modelId, serverDoc);
        } else {
            if (!sceneJson) {
                sceneJson = await fetchDefault();
                sceneSource = 'default';
            }
            await mgr.createFreshDoc(modelId, sceneJson, sceneSource);
        }
    }

    // ── Phase 4: Finalize ────────────────────────────────────────
    // SyncClient.listen() is called inside createFreshDoc/adoptServerDoc/tryRestoreFromIdb
    // listen() is called inside createFreshDoc/adoptServerDoc/tryRestoreFromIdb
    await mgr.markSaved();
    mgr._updateDocInfo();
    mgr._renderTimeline();
}

async function fetchServerSnapshot(modelId: string): Promise<string | null> {
    try {
        const metaRes = await fetch(`/api/models/${modelId}/scene-meta`);
        if (!metaRes.ok) return null;
        const meta = await metaRes.json();
        if (!meta?.replayOpsHash) return null;
        const sceneRes = await fetch(`/api/models/${modelId}/scene`);
        if (!sceneRes.ok) return null;
        console.log(`[loadModel] Using server snapshot (hash=${meta.replayOpsHash}, ops=${meta.atOpIndex})`);
        return await sceneRes.text();
    } catch { return null; }
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

async function fetchServerDoc(modelId: string): Promise<Uint8Array | null> {
    try {
        const res = await fetch(`/api/models/${modelId}/doc`);
        if (!res.ok) return null;
        return new Uint8Array(await res.arrayBuffer());
    } catch { return null; }
}

async function fetchDefault(): Promise<string | null> {
    try {
        const res = await fetch('examples/default-cube.json');
        if (res.ok) return await res.text();
    } catch (e) { console.warn('[loadModel] Default scene fetch failed:', e); }
    return null;
}
