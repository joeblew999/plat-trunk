// reconcile.ts — WASM state → Datastar signals → DOM pipeline.
//
// reconcile() is the SINGLE function that syncs everything after any state change.
// Called by cadCommand() after every execute(). No caller needs to remember
// which signals to update — reconcile reads WASM and pushes to Datastar.
//
// Also owns the read-only WASM queries (loadStyle, loadBim) that are called
// during the reconcileView step to populate the data plane panel.

import { moduleRouter } from './core/module-router';
import type { WasmResult, DocManagerMeta } from './types';

// ── reconcileSignals: selection state from command result ────────
// r: any — Datastar root signal tree, no TS bindings available
function reconcileSignals(r: any, ids: string[], result: WasmResult) {
  // Prune stale selections (objects may have been deleted)
  // Use '' not null — Datastar breaks reactivity for signals initialized as null
  if (r.selectedId && !ids.includes(r.selectedId)) r.selectedId = '';
  if (r.boolSelA && !ids.includes(r.boolSelA)) r.boolSelA = '';
  if (r.boolSelB && !ids.includes(r.boolSelB)) r.boolSelB = '';

  // Apply selection from result (select/deselect/pick commands)
  if (result && result.selectedId !== undefined) {
    const id = result.selectedId || '';  // coerce null → ''
    // Auto-B: if A exists and selecting a different object, assign B
    if (id && r.boolSelA && id !== r.boolSelA) {
      r.boolSelB = id;
    } else {
      r.boolSelA = id;
      r.boolSelB = '';
    }
    r.selectedId = id;
  }

  // Auto-select new object after mutations (e.g. creation or boolean result)
  if (result && result.objectId && ids.includes(result.objectId)) {
    r.selectedId = result.objectId;
    r.boolSelA = result.objectId;
    r.boolSelB = '';
  }
}

// ── reconcileMetadata: derived/computed signals ─────────────────
function reconcileMetadata(r: any, ids: string[], mgr: DocManagerMeta | null) {
  const a = r.boolSelA, b = r.boolSelB;
  const wc = window.__warmCount ?? 0;
  r.objectCount = ids.length + wc;
  r.warmCount = wc;
  r.sceneEmpty = ids.length === 0 && wc === 0;
  r.boolLabel = a && b ? `A: ${a.slice(0,4)} | B: ${b.slice(0,4)}`
    : a ? `A: ${a.slice(0,4)} | B: click another` : 'Click first object';
  r.boolReady = !!(a && b);
  r.canUndo = mgr?.canUndo ?? false;
  r.canRedo = mgr?.canRedo ?? false;
  r.statusMode = window.__cadLocalMode ? 'Local' : 'Online';
  r.automergeEnabled = mgr?.enabled ?? true;
  r.storagePct = (window as any).__storagePct ?? 0;
  r.presenceCount = (window as any).__presenceCount ?? 0;

  // Update reactive Lit state object
  r.litState = {
    objectIds: ids,
    selectedId: r.selectedId,
    canUndo: r.canUndo,
    canRedo: r.canRedo
  };

  return { a, b };
}

// ── loadStyle / loadBim: read WASM metadata into Datastar signals ─
// Use moduleRouter.execute directly — NOT cadCommand (would recurse from reconcileView)

export function loadStyle(objectId: string) {
  const ds = window._ds;
  if (!moduleRouter.ready || !objectId || !ds) return;
  const result = moduleRouter.execute('get_object_style', { objectId });
  if (!result.style) return;
  try {
    const s = result.style;
    ds.beginBatch();
    const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
    ds.root.propColor = '#' + toHex(s.albedo[0]) + toHex(s.albedo[1]) + toHex(s.albedo[2]);
    ds.root.propOpacity = s.albedo[3];
    ds.root.propRoughness = s.roughness;
    ds.root.propReflectance = s.reflectance;
    ds.endBatch();
  } catch {}
}

export function loadBim(objectId: string) {
  const ds = window._ds;
  if (!moduleRouter.ready || !objectId || !ds) return;
  const result = moduleRouter.execute('get_bim_metadata', { objectId });
  ds.beginBatch();
  if (result.bim) {
    ds.root.bimType = result.bim.ifc_type || '';
    ds.root.bimId = result.bim.global_id || '';
  } else {
    ds.root.bimType = '';
    ds.root.bimId = '';
  }
  ds.endBatch();
}

// ── reconcileView: DOM side effects (outside Datastar batch) ────
function reconcileView(selectedId: string, ids: string[]) {
  // Load style and BIM metadata for selected object
  if (selectedId) {
    try {
      loadStyle(selectedId);
      loadBim(selectedId);
    } catch (err) {
      console.warn('Metadata load failed:', err);
    }
  }

  // Object list: <cad-outliner> renders reactively via Datastar → Lit data-attr bridge.
  // No imperative DOM update needed (Phase 8).
}

// ── reconcile: orchestrator ──────────────────────────────────────
export function reconcile(result: WasmResult): WasmResult {
  const ds = window._ds;
  if (!moduleRouter.ready || !ds?.root) return {};

  const ids = moduleRouter.query('objectIds') as string[];
  const mgr = window.cadDocManager?._sync?.modelId ? window.cadDocManager : null;
  const r = ds.root;

  ds.beginBatch();
  reconcileSignals(r, ids, result);
  const { a, b } = reconcileMetadata(r, ids, mgr);
  ds.endBatch();

  reconcileView(r.selectedId, ids);

  // Broadcast to plugins (no-op if plugin manager not yet initialised)
  if (window.pluginManager) {
    window.pluginManager.onSelectionChange(r.selectedId ? [r.selectedId] : []);
    if (result?.objectId || result?.objectIds) {
      const changed = result.objectIds as string[] ?? (result.objectId ? [result.objectId as string] : []);
      window.pluginManager.onModelChange(changed, 'browser');
    }
  }

  return {
    ready: true, objectCount: r.objectCount, objectIds: ids, warmCount: r.warmCount,
    selectedId: r.selectedId, boolSelA: a, boolSelB: b,
    canUndo: r.canUndo, canRedo: r.canRedo,
  };
}
