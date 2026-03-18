// dispatch.ts — Command routing and execution.
//
// cadCommand() is the ONLY way to change state. It routes through three paths:
//   1. JS control plane  → handleJsCommand()           (never records)
//   2. WASM control plane → cadQuery() sync fast-path   (never records)
//   3. WASM data plane   → WASM execute + Automerge    (records + broadcasts)
//
// The schema (schema.ts) determines which path each command takes.
// The reconcile pipeline (reconcile.ts) syncs WASM state back to the UI.

import { moduleRouter } from './core/module-router';
import type { WasmResult, CadOptions } from './types';
import { isJsControlPlane, isDataPlane, getBlobParam, getSchema, schemaReady } from './schema';
import { reconcile } from './reconcile';
import { storeBlob } from './blob-store';
import { client } from './api-client';
import { scheduleThumbnailCapture, getLatestThumbnail, captureCanvasThumbnail, uploadThumbnail } from './thumbnail';
import { cadDocManager } from './history-ui';
import { relay as workerRelay } from './worker-relay';
import { MODEL_ID, LOCAL_MODE } from './app-config';

// ─── Style (write path) ──────────────────────────────────────────
// loadStyle / loadBim (read path) live in reconcile.ts — called during reconcileView.

export function applyStyle(commit: boolean) {
  const ds = window._ds;
  const id = ds?.root?.selectedId;
  if (!moduleRouter.ready || !id) return;
  const hex = ds.root.propColor || '#3399ff';
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const style = {
    albedo: [r, g, b, ds.root.propOpacity],
    roughness: ds.root.propRoughness,
    reflectance: ds.root.propReflectance,
    ambient_ratio: 0.05,
  };
  if (commit) {
    // Full dispatch: WASM + Automerge + reconcile
    cadCommand('set_style', { objectId: id, style });
  } else {
    // Live preview only: WASM via moduleRouter, no Automerge
    moduleRouter.execute('set_style', { objectId: id, style });
  }
}

// ─── Feedback ────────────────────────────────────────────────────

export function showFeedback(msg: string, isError = false) {
  const ds = window._ds;
  if (!ds?.root) return;
  try {
    ds.beginBatch();
    ds.root.feedback = msg;
    ds.root.feedbackError = isError;
    ds.endBatch();
    setTimeout(() => {
      try { ds.beginBatch(); ds.root.feedback = ''; ds.root.feedbackError = false; ds.endBatch(); }
      catch {}
    }, 2000);
  } catch {}
}

/** Schema-driven contextual feedback — works for any command via domain classification. */
function showCommandFeedback(type: string, result: WasmResult) {
  if (result.error) {
    showFeedback(result.error, true);
    return;
  }
  const cmd = getSchema()?.commands?.[type];
  if (!cmd) return;
  const domain = cmd.domain;

  if (domain === 'booleans' && cmd.readonly) {
    // clash_detect — readonly boolean, user expects a result
    showFeedback(result.clash ? 'CLASH DETECTED!' : 'No clash', result.clash);
  } else if (domain === 'booleans' && result.objectId) {
    // boolean_union/subtract/intersect
    showFeedback('Operation success');
  } else if (domain === 'scene' && !cmd.readonly && result.objectCount !== undefined) {
    // import_scene/step/ifc — data plane scene mutations with objectCount
    showFeedback(`Imported ${result.objectCount} objects`);
  }
}

// ─── JS Control Plane ────────────────────────────────────────────
// Commands listed in schema.controlPlane are dispatched here.
// isJsControlPlane(type) checks membership — no hardcoded list needed.

async function handleJsCommand(type: string, params: Record<string, unknown>): Promise<WasmResult> {
  const mgr = cadDocManager;

  switch (type) {
    case 'undo':
      if (mgr && mgr.canUndo) {
        await mgr.undo();
        return { success: true };
      }
      return { error: 'Nothing to undo' };

    case 'redo':
      if (mgr && mgr.canRedo) {
        await mgr.redo();
        return { success: true };
      }
      return { error: 'Nothing to redo' };

    case 'get_status':
      return {
        mode: window.__cadLocalMode ? 'local' : 'online',
        automergeReady: !!mgr?._sync?.modelId,
        automergeEnabled: mgr?.enabled ?? true,
        objectCount: window._ds?.root?.objectCount || 0,
        warmCount: window._ds?.root?.warmCount || 0
      };

    case 'set_mode':
      const mode = params.mode as string;
      if (mode === 'local') {
        window.__cadLocalMode = true; // kept for index.html read
      } else if (mode === 'online') {
        window.__cadLocalMode = false; // kept for index.html read
      }
      return { mode: window.__cadLocalMode ? 'local' : 'online' };

    case 'set_automerge':
      if (mgr) {
        mgr.enabled = !!params.enabled;
        return { enabled: mgr.enabled };
      }
      return { error: 'DocManager not ready' };

    case 'create_model':
      // Navigate to /model/new — generates fresh random ID + clean Automerge doc
      window.location.href = '/model/new';
      return { success: true };

    case 'save_cloud': {
      const mid = MODEL_ID;
      const result = moduleRouter.execute('export_scene', {});
      const sceneJson = result.scene;
      if (!sceneJson) throw new Error('Scene export returned no data');
      const { error: saveErr } = await client.PUT('/api/models/{id}', {
        params: { path: { id: mid } },
        body: { name: params.name as string, scene: sceneJson },
      });
      if (saveErr) throw new Error(`Cloud save failed: ${JSON.stringify(saveErr)}`);
      const thumb = getLatestThumbnail() || await captureCanvasThumbnail();
      if (thumb) await uploadThumbnail(mid, thumb);
      (document.querySelector('cad-gallery') as any)?.refresh();
      cadDocManager?.markSaved();
      return { success: true, modelId: mid };
    }

    case 'delete_model': {
      const delId = params.id as string;
      // Disconnect SSE if deleting the active model to prevent sync race
      if (delId === MODEL_ID) workerRelay?.disconnect();
      await client.DELETE('/api/models/{id}', { params: { path: { id: delId } } });
      (document.querySelector('cad-gallery') as any)?.refresh();
      return { success: true };
    }

    case 'share_model': {
      const mid = mgr?.documentUrl;
      if (!mid) return { error: 'No document active' };
      const shareUrl = `${window.location.origin}/model/${mid}`;
      try { await navigator.clipboard.writeText(shareUrl); } catch {}
      return { url: shareUrl };
    }

    case 'clear_data': {
      const wipeMode = (params.mode as string) || 'local';
      const msg = wipeMode === 'full'
        ? 'DELETE MODEL? This removes local AND server data permanently.'
        : 'RESET LOCAL DATA? Server state will repopulate on next connect.';
      if (confirm(msg)) {
        localStorage.clear();
        indexedDB.deleteDatabase('cad-blobs');
        indexedDB.deleteDatabase('cad-objects');
        indexedDB.deleteDatabase('cad-docs');
        indexedDB.deleteDatabase('cad-sync');
        if (wipeMode === 'full') {
          const mid = MODEL_ID;
          if (mid) await handleJsCommand('delete_model', { id: mid });
          window.location.href = '/model/new';
        } else {
          location.reload();
        }
        return { success: true };
      }
      return { success: false };
    }

    default:
      return { error: `Unknown JS command: ${type}` };
  }
}

// ─── Control Plane Sync Path ─────────────────────────────────────
// Synchronous WASM dispatch for control plane commands (readonly/ephemeral).
// Use for 60fps loops (camera, pick) or any call that needs a sync return.
// Never records to Automerge, never broadcasts — the schema says so.

export function cadQuery(type: string, params?: Record<string, unknown>, options?: CadOptions) {
  const p = params ?? {};
  const o = options ?? {};
  if (getSchema() && isDataPlane(type) && !o._internal) {
    console.warn(`[cadQuery] "${type}" is data plane — use cadCommand() for Automerge recording`);
  }
  const doReconcile = o.reconcile ?? true;
  if (!moduleRouter.ready) return { error: 'ModuleRouter not ready' };
  let result: WasmResult;
  try {
    result = moduleRouter.execute(type, p);
  } catch (err) {
    return { error: String(err) };
  }
  const state = doReconcile ? reconcile(result) : ({} as WasmResult);
  // Control plane commands can still need user feedback (e.g. clash_detect)
  showCommandFeedback(type, result);
  return { ...result, ...state };
}

// ─── Unified command dispatch ────────────────────────────────────

let _busy = false;

export async function cadCommand(type: string, params?: Record<string, unknown>, options?: CadOptions) {
  const p = params ?? {};
  const o = options ?? {};

  // Ensure schema is loaded before first command (no-op after first await)
  if (!getSchema()) await schemaReady;

  // ── 1. JS Control Plane (undo, redo, set_mode, etc.) ──────────
  if (isJsControlPlane(type)) {
    try {
      const result = await handleJsCommand(type, p);
      const state = (o.reconcile ?? true) ? reconcile(result) : ({} as WasmResult);
      return { ...result, ...state };
    } catch (err) {
      return { error: String(err) };
    }
  }

  if (!moduleRouter.ready) return { error: 'ModuleRouter not ready' };

  // Schema-driven defaults (overridable for replay/navigation)
  const dataPlane   = isDataPlane(type);
  const record      = o.record    ?? dataPlane;
  const broadcast   = o.broadcast ?? dataPlane;
  const doReconcile = o.reconcile ?? true;
  const source      = o.source    ?? 'local';

  // ── 2. WASM Control Plane (select, get_state, set_camera, etc.)
  if (!record) {
    return cadQuery(type, p, { ...o, _internal: true });
  }

  // ── 3. WASM Data Plane (add_cube, boolean_union, translate, etc.)
  if (_busy) return { error: 'Busy' };
  _busy = true;

  try {
    const result = moduleRouter.execute(type, p);

    // Record to Automerge
    const mgr = cadDocManager?._sync?.modelId ? cadDocManager : null;
    if (mgr) {
      // Strip large blob data from import commands (ADR-0025 Phase 0).
      // Blob param derived from schema: first required string param on import commands.
      let recordParams = p;
      const blobKey = getBlobParam(type, p);
      if (blobKey) {
        const blobRef = await storeBlob(p[blobKey] as string);
        recordParams = { ...p, blobRef };
        delete recordParams[blobKey];
      }
      await mgr.record(type, recordParams, {
        objectId: result.objectId,
        groupId: o.groupId,
        hierarchy: result.hierarchy
      });
    }

    // Reconcile: WASM state → Datastar signals → UI
    const state = doReconcile ? reconcile(result) : ({} as WasmResult);

    showCommandFeedback(type, result);

    // Auto-select first object after scene import (import_scene/step/ifc)
    if (type.startsWith('import_') && (state.objectIds?.length ?? 0) > 0 && !state.selectedId) {
      cadQuery('select', { id: state.objectIds![0] });
    }

    scheduleThumbnailCapture();

    // Broadcast state to Worker API
    if (broadcast && !window.__cadLocalMode && source !== 'api') { // __cadLocalMode can change at runtime
      const mid = MODEL_ID;
      client.POST('/api/cad/{modelId}/state', {
        params: { path: { modelId: mid } },
        body: { ...state, broadcast: true },
      }).catch(() => {});
    }

    return { ...result, ...state };
  } finally {
    _busy = false;
  }
}

// ─── addShape ────────────────────────────────────────────────────
// Add a primitive with auto-offset so new objects don't stack on top of each other

export async function addShape(type: string, params?: Record<string, unknown>) {
  const p = params ?? {};
  const result = await cadCommand(type, p);
  if (result.objectId && result.objectIds) {
    const idx = result.objectIds.indexOf(result.objectId);
    if (idx > 0) {
      const size = (p.size || p.radius || p.majorRadius || 1) as number;
      // Auto-offset is part of the addShape compound — parent cadCommand records the add
      cadQuery('translate', { objectId: result.objectId, dx: idx * size * 0.7, dy: 0, dz: 0 }, { _internal: true });
    }
  }
  return result;
}
