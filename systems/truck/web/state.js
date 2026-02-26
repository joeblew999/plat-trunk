// state.js — ALL CAD state: dispatch commands to Rust, reconcile signals, selection, style.
// cadCommand() is the ONLY way to change state. reconcile() is the ONLY way to sync it.

import { moduleRouter } from './core/module-router.js';
import { storeBlob } from './blob-store.js';

// If WASM was already initialized before state.js loaded, register now
if (window.sceneController && !moduleRouter.ready) {
  moduleRouter.register('core', window.sceneController);
}

// ─── Reconcile: WASM state → Datastar signals → DOM ─────────────
// This is the SINGLE function that syncs everything after any state change.
// Called by cadCommand() after every execute(). No caller needs to remember
// which signals to update — reconcile reads WASM and pushes to Datastar.

// ── reconcileSignals: selection state from command result ────────
function reconcileSignals(r, ids, result) {
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
function reconcileMetadata(r, ids, mgr) {
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

  // Update reactive Lit state object
  r.litState = {
    objectIds: ids,
    selectedId: r.selectedId,
    canUndo: r.canUndo,
    canRedo: r.canRedo
  };

  return { a, b };
}

// ── reconcileView: DOM side effects (outside Datastar batch) ────
function reconcileView(selectedId, ids) {
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

// ── reconcile: orchestrator (backward-compatible API) ───────────
function reconcile(result) {
  const ds = window._ds;
  if (!moduleRouter.ready || !ds?.root) return {};

  const ids = moduleRouter.query('objectIds');
  const mgr = window.cadDocManager?.handle ? window.cadDocManager : null;
  const r = ds.root;

  ds.beginBatch();
  reconcileSignals(r, ids, result);
  const { a, b } = reconcileMetadata(r, ids, mgr);
  ds.endBatch();

  reconcileView(r.selectedId, ids);

  return {
    ready: true, objectCount: r.objectCount, objectIds: ids, warmCount: r.warmCount,
    selectedId: r.selectedId, boolSelA: a, boolSelB: b,
    canUndo: r.canUndo, canRedo: r.canRedo,
  };
}

// ─── Style: WASM ↔ Datastar signals ─────────────────────────────

function loadStyle(objectId) {
  const ds = window._ds;
  if (!moduleRouter.ready || !objectId || !ds) return;
  // Use moduleRouter.execute — NOT cadCommand (would recurse from reconcile)
  const result = moduleRouter.execute('get_object_style', { objectId });
  if (!result.style) return;
  try {
    const s = result.style;
    ds.beginBatch();
    const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');
    ds.root.propColor = '#' + toHex(s.albedo[0]) + toHex(s.albedo[1]) + toHex(s.albedo[2]);
    ds.root.propOpacity = s.albedo[3];
    ds.root.propRoughness = s.roughness;
    ds.root.propReflectance = s.reflectance;
    ds.endBatch();
  } catch {}
}

function loadBim(objectId) {
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

function applyStyle(commit) {
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

// ─── Object list (outliner) ─────────────────────────────────────

// renderObjectList removed — replaced by <cad-outliner> Lit component (Phase 8)

// ─── Control Plane (JS Layer) ───────────────────────────────────

const JS_COMMANDS = new Set([
  'undo', 'redo', 'get_status', 'set_mode', 'create_model', 'set_automerge', 'clear_data'
]);

async function handleJsCommand(type, params) {
  const mgr = window.cadDocManager;
  
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
        automergeReady: !!mgr?.handle,
        automergeEnabled: mgr?.enabled ?? true,
        objectCount: window._ds?.root?.objectCount || 0,
        warmCount: window._ds?.root?.warmCount || 0
      };

    case 'set_mode':
      const mode = params.mode;
      if (mode === 'local') {
        window.__cadLocalMode = true;
      } else if (mode === 'online') {
        window.__cadLocalMode = false;
      }
      return { mode: window.__cadLocalMode ? 'local' : 'online' };

    case 'set_automerge':
      if (mgr) {
        mgr.enabled = !!params.enabled;
        return { enabled: mgr.enabled };
      }
      return { error: 'DocManager not ready' };

    case 'create_model':
      if (mgr) {
        await mgr.createDocument(params.name || 'Untitled');
        // Reset scene via moduleRouter
        const core = moduleRouter.core();
        if (core) core.clear_scene();
        return { success: true, modelId: 'new' }; // simplified
      }
      return { error: 'DocManager not ready' };

    case 'clear_data':
      if (confirm('WIPE ALL LOCAL DATA? This cannot be undone.')) {
        localStorage.clear();
        // Also clear ADR-0025 IndexedDB stores (blob store + object store)
        indexedDB.deleteDatabase('cad-blobs');
        indexedDB.deleteDatabase('cad-objects');
        location.reload();
        return { success: true };
      }
      return { success: false };

    default:
      return { error: `Unknown JS command: ${type}` };
  }
}

// ─── Sync query: WASM dispatch + reconcile, no recording ─────────
// Use this for commands that don't need Automerge recording (record: false).
// Returns the result synchronously — no Promise wrapping.
// Fixes: cadCommand() is async (Phase 0 blob store) which silently broke
// all callers that don't await it (pick_at, addShape, tier manager, etc.).

function cadQuery(type, params = {}, options = {}) {
  const doReconcile = options.reconcile ?? true;
  if (!moduleRouter.ready) return { error: 'ModuleRouter not ready' };
  let result;
  try {
    result = moduleRouter.execute(type, params);
  } catch (err) {
    return { error: String(err) };
  }
  const state = doReconcile ? reconcile(result) : {};
  return { ...result, ...state };
}

// ─── Single entry point for all CAD operations ───────────────────
//
// Options contract (ADR-0019 Phase 2):
//   record:    boolean  — Record to Automerge? (default: true)
//   broadcast: boolean  — POST state to Worker API? (default: true)
//   reconcile: boolean  — Run reconcile pipeline? (default: true)
//   source:    string   — Who initiated? 'local' | 'api' | 'replay' (default: 'local')
//   groupId:   string   — Group ID for Automerge undo grouping (optional)
//
// IMPORTANT: This function is async (blob storage, Automerge recording).
// For non-recording queries/mutations, use cadQuery() instead — it's sync.

let _busy = false;
async function cadCommand(type, params = {}, options = {}) {
  // Resolve options with defaults
  const record    = options.record    ?? true;
  const broadcast = options.broadcast ?? true;
  const doReconcile = options.reconcile ?? true;
  const source    = options.source    ?? 'local';

  if (!moduleRouter.ready && !JS_COMMANDS.has(type)) return { error: 'ModuleRouter not ready' };

  // Non-recording WASM commands: use sync path (no blob storage, no Automerge)
  if (!record && !JS_COMMANDS.has(type)) {
    return cadQuery(type, params, options);
  }

  // Guard against re-entrancy for WASM commands that record
  if (_busy && record && !JS_COMMANDS.has(type)) return { error: 'Busy' };

  if (!JS_COMMANDS.has(type)) _busy = true;

  try {
    let result;

    if (JS_COMMANDS.has(type)) {
      // 1. JS Control Plane Dispatch
      try {
        result = await handleJsCommand(type, params);
      } catch (err) {
        return { error: String(err) };
      }
    } else {
      // 2. WASM Kernel Dispatch via Module Router (ADR-0019)
      try {
        result = moduleRouter.execute(type, params);
      } catch (err) {
        return { error: String(err) };
      }
    }

    // Record to Automerge (only for recording WASM commands)
    if (!JS_COMMANDS.has(type)) {
      const mgr = window.cadDocManager?.handle ? window.cadDocManager : null;
      if (mgr) {
        // Strip large blob data from import commands (ADR-0025 Phase 0).
        // Store in content-addressed blob store; only blobRef goes into Automerge.
        let recordParams = params;
        const BLOB_KEYS = { import_scene: 'json', import_ifc: 'data', import_step: 'data' };
        const dataKey = BLOB_KEYS[type];
        if (dataKey && params[dataKey]) {
          const blobRef = await storeBlob(params[dataKey]);
          recordParams = { ...params, blobRef };
          delete recordParams[dataKey];
        }
        await mgr.record(type, recordParams, {
          objectId: result.objectId,
          groupId: options.groupId,
          hierarchy: result.hierarchy
        });
      }
    }

    // Reconcile: WASM state → Datastar signals → UI
    const state = doReconcile ? reconcile(result) : {};

    // Contextual feedback
    if (type.startsWith('boolean_') && result.objectId) {
      showFeedback('Operation success');
    } else if (type === 'clash_detect') {
      showFeedback(result.clash ? '💥 CLASH DETECTED!' : '✅ No clash', result.clash);
    } else if (type === 'import_mvt' || type === 'import_step' || type === 'import_ifc') {
      showFeedback(`Imported ${result.objectCount || ''} objects`);
      setTimeout(() => {
        const vp = document.getElementById('viewport');
        if (vp && vp.zoomToExtents) vp.zoomToExtents();
      }, 500);
    } else if (result.error) {
      showFeedback(result.error, true);
    }

    // Broadcast state to Worker API
    if (broadcast && !window.__cadLocalMode && source !== 'api') {
      const mid = window.__modelId || 'default';
      fetch(`/api/cad/${mid}/state`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...state, broadcast: true }),
      }).catch(() => {});
    }

    return { ...result, ...state };
  } finally {
    _busy = false;
  }
}
  function showFeedback(msg, isError = false) {
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

// Add a primitive with auto-offset so new objects don't stack on top of each other
async function addShape(type, params) {
  const result = await cadCommand(type, params);
  if (result.objectId && result.objectIds) {
    const idx = result.objectIds.indexOf(result.objectId);
    if (idx > 0) {
      const size = params.size || params.radius || params.majorRadius || 1;
      cadQuery('translate', { objectId: result.objectId, dx: idx * size * 0.7, dy: 0, dz: 0 }, { record: false });
    }
  }
  return result;
}

export { cadCommand, cadQuery, moduleRouter, reconcile, loadStyle, applyStyle, showFeedback, addShape };

// Window globals: only what's needed for inline HTML handlers and E2E tests
window.cadCommand = cadCommand;
window.cadQuery = cadQuery;
window.addShape = addShape;
window.reconcile = reconcile;
window.__applyStyle = applyStyle;
window.__loadStyle = loadStyle;
window.__moduleRouter = moduleRouter;
window.showFeedbackSignal = showFeedback;
