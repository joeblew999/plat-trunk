// replay-executor.ts — Tiering layer: executes a ReplayPlan computed by sync.
// Owns all tiering concerns: resetTierState, progressive load, warm objects.
// history-domain.ts (sync layer) never imports object-store or tier-manager directly.

import { cadCommand } from './dispatch';
import { getBlob } from './blob-store';
import { resetTierState, registerWarmObjects } from './tier-manager';
import type { CadOptions, SceneEntry } from './types';
import type { CadOperation } from '../../sync/ts/sync-types.generated';
import { MODEL_ID } from './app-config';
import { getSceneController } from './scene-controller';

const PROGRESSIVE_THRESHOLD = 50;

export interface ReplayPlan {
  snapshotJson: string | null;
  startIndex: number;
  ops: CadOperation[];
  totalEnabledOps: number;
  source: 'local' | 'remote' | 'server';
}

export async function executeReplayPlan(plan: ReplayPlan): Promise<void> {
  await resetTierState();

  const REPLAY: CadOptions = { record: false, reconcile: false, source: 'replay' };
  let entries: SceneEntry[] | null = null;
  if (plan.snapshotJson) {
    try { entries = JSON.parse(plan.snapshotJson); } catch { entries = null; }
  }
  const useProgressive = entries && Array.isArray(entries) && entries.length >= PROGRESSIVE_THRESHOLD;

  if (useProgressive) {
    await progressiveLoad(entries!, plan.ops, plan.startIndex, REPLAY);
  } else {
    if (plan.snapshotJson) {
      cadCommand('import_scene', { json: plan.snapshotJson }, REPLAY);
    } else {
      cadCommand('clear', {}, REPLAY);
    }
    await replayRemainingOps(plan.ops, plan.startIndex, REPLAY);
  }
}

async function replayRemainingOps(ops: CadOperation[], startIndex: number, REPLAY: CadOptions): Promise<void> {
  for (let i = startIndex; i < ops.length; i++) {
    if (ops[i].enabled) {
      const op = ops[i];
      let replayParams = op.params;
      if (op.params.blobRef) {
        const blob = await getBlob(op.params.blobRef);
        const dataKey = op.type === 'import_scene' ? 'json' : 'data';
        replayParams = { ...op.params, [dataKey]: blob };
      }
      cadCommand(op.type, replayParams, REPLAY);
    }
  }
}

async function progressiveLoad(entries: SceneEntry[], ops: CadOperation[], startIndex: number, REPLAY: CadOptions): Promise<void> {
  const ctrl = getSceneController();
  if (!ctrl) return;
  const modelId = MODEL_ID;
  cadCommand('clear', {}, REPLAY);

  const neededIds = new Set<string>();
  for (let i = startIndex; i < ops.length; i++) {
    if (!ops[i].enabled) continue;
    const p = ops[i].params;
    if (p.id) neededIds.add(p.id as string);
    if (p.objectId) neededIds.add(p.objectId as string);
    if (p._replayId) neededIds.add(p._replayId as string);
    if (p.selA) neededIds.add(p.selA as string);
    if (p.selB) neededIds.add(p.selB as string);
  }

  let frustum: any = null;
  const viewport = document.querySelector('cad-viewport') as any;
  if (viewport?.camera) {
    const THREE = await import('three');
    const cam = viewport.camera;
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    frustum = new THREE.Frustum();
    const vp = new THREE.Matrix4();
    vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(vp);
  }
  const THREE = frustum ? await import('three') : null;

  const hotEntries: SceneEntry[] = [];
  const warmEntries: SceneEntry[] = [];
  for (const entry of entries) {
    const isNeeded = neededIds.has(entry.id);
    let isVisible = true;
    if (frustum && THREE && entry.bounding_sphere) {
      const [cx, cy, cz, r] = entry.bounding_sphere;
      isVisible = frustum.intersectsSphere(new THREE.Sphere(new THREE.Vector3(cx, cy, cz), r));
    }
    (isNeeded || isVisible ? hotEntries : warmEntries).push(entry);
  }

  for (const entry of hotEntries) ctrl.import_entry(JSON.stringify(entry));
  if (warmEntries.length > 0) {
    const { bulkPutObjects } = await import('./object-store');
    await bulkPutObjects(modelId, warmEntries.map(e => ({ objectId: e.id, entryJson: JSON.stringify(e) })));
    const warmSphereMap = new Map();
    for (const entry of warmEntries) {
      if (entry.bounding_sphere) {
        const [cx, cy, cz, r] = entry.bounding_sphere;
        const color = entry.style?.albedo || [0.5, 0.5, 0.5, 1.0];
        ctrl.add_lod_proxy(JSON.stringify({ objectId: entry.id, center: [cx, cy, cz], radius: r, color }));
        warmSphereMap.set(entry.id, { center: [cx, cy, cz], radius: r, color });
      }
    }
    registerWarmObjects(warmSphereMap);
  }

  console.log(`[Progressive] ${hotEntries.length} Hot, ${warmEntries.length} Warm, ${ops.length - startIndex} remaining ops`);
  await replayRemainingOps(ops, startIndex, REPLAY);
}
