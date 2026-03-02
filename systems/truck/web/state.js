// state.js — ALL CAD state: dispatch commands to Rust, reconcile signals, selection, style.
// cadCommand() is the ONLY way to change state. reconcile() is the ONLY way to sync it.
//
// Data plane vs Control plane (schema-driven):
//   The cad-schema.json declares each command's readonly/ephemeral flags.
//   cadCommand() reads these to auto-determine whether to record to Automerge:
//     Data plane:    !readonly && !ephemeral → record + broadcast (user edits)
//     Control plane: readonly || ephemeral   → no record, no broadcast (queries, UI state)
//   Call sites can still override with explicit { record: true/false }.

import { moduleRouter } from './core/module-router.js';
import { storeBlob } from './blob-store.js';
import { api } from './api-client.js';
import { scheduleThumbnailCapture } from './thumbnail.js';

// ─── Schema-driven command classification ────────────────────────
// The cad-schema.json (served at /api/cad/schema) declares every command:
//
//   schema.commands      → WASM commands with { readonly, ephemeral, domain }
//   schema.controlPlane  → JS commands with { layer: "js" }
//
// Three classifications drive ALL dispatch and recording decisions:
//   1. JS control plane:   undo, redo, set_mode, etc. (from schema.controlPlane)
//   2. WASM control plane: select, get_state, set_camera (readonly || ephemeral)
//   3. WASM data plane:    add_cube, boolean_union, translate (!readonly && !ephemeral)
//
// Only data plane commands record to Automerge and broadcast to the Worker API.
// Call sites never need to specify { record: false } — the schema decides.

let _schema = null;             // { commands: {...}, controlPlane: {...} }
let _jsControlPlane = new Set(); // keys from schema.controlPlane
const _schemaReady = fetch('/api/cad/schema')
  .then(r => r.json())
  .then(s => {
    _schema = s;
    _jsControlPlane = new Set(Object.keys(s.controlPlane || {}));
  })
  .catch(() => { _schema = { commands: {}, controlPlane: {} }; });

/** JS control plane: undo, redo, set_mode, etc. — dispatched to handleJsCommand() */
function isJsControlPlane(type) {
  return _jsControlPlane.has(type);
}

/** WASM data plane: mutations that record to Automerge + broadcast */
function isDataPlane(type) {
  const cmd = _schema?.commands?.[type];
  if (!cmd) return false;
  return !cmd.readonly && !cmd.ephemeral;
}

/** Shared access to the loaded schema (for history.js timeline, etc.) */
const schemaReady = _schemaReady;
function getSchema() { return _schema; }

/**
 * Derive blob param key from schema — no hardcoded BLOB_KEYS map needed.
 * Import commands (scene domain, data plane) have one required string param
 * that contains the large payload (json, data, etc.). Returns the key or null.
 */
function getBlobParam(type, params) {
  const cmd = _schema?.commands?.[type];
  if (!cmd || cmd.domain !== 'scene' || cmd.readonly) return null;
  const required = cmd.params?.required || [];
  const props = cmd.params?.properties || {};
  for (const key of required) {
    if (props[key]?.type === 'string' && params[key]) return key;
  }
  return null;
}

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

// ─── Control Plane (JS Layer) ───────────────────────────────────
// Commands listed in schema.controlPlane are dispatched here.
// isJsControlPlane(type) checks membership — no hardcoded list needed.

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

// ─── Control Plane Sync Path ─────────────────────────────────────
// Synchronous WASM dispatch for control plane commands (readonly/ephemeral).
// Use for 60fps loops (camera, pick) or any call that needs a sync return.
// Never records to Automerge, never broadcasts — the schema says so.

function cadQuery(type, params = {}, options = {}) {
  if (_schema && isDataPlane(type) && !options._internal) {
    console.warn(`[cadQuery] "${type}" is data plane — use cadCommand() for Automerge recording`);
  }
  const doReconcile = options.reconcile ?? true;
  if (!moduleRouter.ready) return { error: 'ModuleRouter not ready' };
  let result;
  try {
    result = moduleRouter.execute(type, params);
  } catch (err) {
    return { error: String(err) };
  }
  const state = doReconcile ? reconcile(result) : {};
  // Control plane commands can still need user feedback (e.g. clash_detect)
  showCommandFeedback(type, result);
  return { ...result, ...state };
}

// ─── Unified command dispatch ────────────────────────────────────
//
// cadCommand() dispatches ALL commands through the schema-driven pipeline:
//
//   1. JS control plane  → handleJsCommand()           (never records)
//   2. WASM control plane → cadQuery() sync fast-path   (never records)
//   3. WASM data plane   → WASM execute + Automerge    (records + broadcasts)
//
// The only override: { record: false } for data plane commands used in
// control plane context (e.g. import_scene during model load / replay).

let _busy = false;
async function cadCommand(type, params = {}, options = {}) {
  // Ensure schema is loaded before first command (no-op after first await)
  if (!_schema) await _schemaReady;

  // ── 1. JS Control Plane (undo, redo, set_mode, etc.) ──────────
  if (isJsControlPlane(type)) {
    try {
      const result = await handleJsCommand(type, params);
      const state = (options.reconcile ?? true) ? reconcile(result) : {};
      return { ...result, ...state };
    } catch (err) {
      return { error: String(err) };
    }
  }

  if (!moduleRouter.ready) return { error: 'ModuleRouter not ready' };

  // Schema-driven defaults (overridable for replay/navigation)
  const dataPlane   = isDataPlane(type);
  const record      = options.record    ?? dataPlane;
  const broadcast   = options.broadcast ?? dataPlane;
  const doReconcile = options.reconcile ?? true;
  const source      = options.source    ?? 'local';

  // ── 2. WASM Control Plane (select, get_state, set_camera, etc.)
  if (!record) {
    return cadQuery(type, params, { ...options, _internal: true });
  }

  // ── 3. WASM Data Plane (add_cube, boolean_union, translate, etc.)
  if (_busy) return { error: 'Busy' };
  _busy = true;

  try {
    const result = moduleRouter.execute(type, params);

    // Record to Automerge
    const mgr = window.cadDocManager?.handle ? window.cadDocManager : null;
    if (mgr) {
      // Strip large blob data from import commands (ADR-0025 Phase 0).
      // Blob param derived from schema: first required string param on import commands.
      let recordParams = params;
      const blobKey = getBlobParam(type, params);
      if (blobKey) {
        const blobRef = await storeBlob(params[blobKey]);
        recordParams = { ...params, blobRef };
        delete recordParams[blobKey];
      }
      await mgr.record(type, recordParams, {
        objectId: result.objectId,
        groupId: options.groupId,
        hierarchy: result.hierarchy
      });
    }

    // Reconcile: WASM state → Datastar signals → UI
    const state = doReconcile ? reconcile(result) : {};

    showCommandFeedback(type, result);
    scheduleThumbnailCapture();

    // Broadcast state to Worker API
    if (broadcast && !window.__cadLocalMode && source !== 'api') {
      const mid = window.__modelId || 'default';
      api.cad[':modelId'].state.$post({
        param: { modelId: mid },
        json: { ...state, broadcast: true },
      }).catch(() => {});
    }

    return { ...result, ...state };
  } finally {
    _busy = false;
  }
}

// ─── Feedback ────────────────────────────────────────────────────

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

/** Schema-driven contextual feedback — works for any command via domain classification. */
function showCommandFeedback(type, result) {
  if (result.error) {
    showFeedback(result.error, true);
    return;
  }
  const cmd = _schema?.commands?.[type];
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

// Add a primitive with auto-offset so new objects don't stack on top of each other
async function addShape(type, params) {
  const result = await cadCommand(type, params);
  if (result.objectId && result.objectIds) {
    const idx = result.objectIds.indexOf(result.objectId);
    if (idx > 0) {
      const size = params.size || params.radius || params.majorRadius || 1;
      // Auto-offset is part of the addShape compound — parent cadCommand records the add
      cadQuery('translate', { objectId: result.objectId, dx: idx * size * 0.7, dy: 0, dz: 0 }, { _internal: true });
    }
  }
  return result;
}

export { cadCommand, cadQuery, moduleRouter, reconcile, loadStyle, applyStyle, showFeedback, addShape, schemaReady, getSchema };

// Window globals: only what's needed for inline HTML handlers and E2E tests
window.cadCommand = cadCommand;
window.cadQuery = cadQuery;
window.addShape = addShape;
window.reconcile = reconcile;
window.__applyStyle = applyStyle;
window.__loadStyle = loadStyle;
window.__moduleRouter = moduleRouter;
window.showFeedbackSignal = showFeedback;
