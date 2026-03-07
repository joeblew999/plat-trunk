// replay.ts — Headless WASM replay from R2 automerge.bin (ADR-0001 Part C).
// Loads doc → gets replay ops → executes in HeadlessController → returns scene JSON.
// Caches scene.json + scene-meta.json in R2 for fast subsequent loads.

import { R2DocStorage } from './doc-storage';
import { syncGetReplayOps } from './sync-wasm.generated';
import { initHeadlessWasm } from './truck-wasm.generated';

export interface ReplayResult {
  sceneJson: string;
  opCount: number;
  replayOpsHash: string;
  cached: boolean;
}

interface SceneMeta {
  replayOpsHash: string;
  atOpIndex: number;
  objectCount: number;
  updatedAt: number;
}

async function computeReplayOpsHash(replayOpsJson: string): Promise<string> {
  const encoded = new TextEncoder().encode(replayOpsJson);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export async function replayModel(
  modelId: string,
  bucket: R2Bucket,
  opts?: { forceRefresh?: boolean }
): Promise<ReplayResult | null> {
  const storage = new R2DocStorage(bucket);
  const docBytes = await storage.load(modelId);
  if (!docBytes) return null;

  const replayOpsJson = await syncGetReplayOps(docBytes);
  const replayOps: Array<{ type: string; params: Record<string, unknown> }> = JSON.parse(replayOpsJson);
  if (replayOps.length === 0) return null;

  const opsHash = await computeReplayOpsHash(replayOpsJson);

  // Check cache unless forced refresh
  if (!opts?.forceRefresh) {
    const metaObj = await bucket.get(`models/${modelId}/scene-meta.json`);
    if (metaObj) {
      try {
        const meta: SceneMeta = await metaObj.json();
        if (meta.replayOpsHash === opsHash) {
          const sceneObj = await bucket.get(`models/${modelId}/scene.json`);
          if (sceneObj) {
            const sceneJson = await sceneObj.text();
            return { sceneJson, opCount: replayOps.length, replayOpsHash: opsHash, cached: true };
          }
        }
      } catch { /* cache miss, continue to replay */ }
    }
  }

  // Full replay
  const wasm = await initHeadlessWasm();
  const ctrl = new wasm.HeadlessController();
  for (const op of replayOps) {
    ctrl.execute(op.type, JSON.stringify(op.params));
  }
  const exportResult = JSON.parse(ctrl.execute('export_scene', '{}'));
  const sceneJson = exportResult.scene as string;
  const objectCount = exportResult.objectCount ?? 0;

  // Cache scene + meta in R2
  await bucket.put(`models/${modelId}/scene.json`, sceneJson, {
    httpMetadata: { contentType: 'application/json' },
  });
  const meta: SceneMeta = {
    replayOpsHash: opsHash,
    atOpIndex: replayOps.length,
    objectCount,
    updatedAt: Date.now(),
  };
  await bucket.put(`models/${modelId}/scene-meta.json`, JSON.stringify(meta), {
    httpMetadata: { contentType: 'application/json' },
  });

  return { sceneJson, opCount: replayOps.length, replayOpsHash: opsHash, cached: false };
}
