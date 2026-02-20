// state.js — ALL CAD state: dispatch commands to Rust, reconcile signals, selection, style.
// cadCommand() is the ONLY way to change state. reconcile() is the ONLY way to sync it.

// ─── Core WASM call ─────────────────────────────────────────────

function executeWasm(ctrl, type, params) {
  return JSON.parse(ctrl.execute(type, JSON.stringify(params || {})));
}

// ─── Reconcile: WASM state → Datastar signals → DOM ─────────────
// This is the SINGLE function that syncs everything after any state change.
// Called by cadCommand() after every execute(). No caller needs to remember
// which signals to update — reconcile reads WASM and pushes to Datastar.

function reconcile(result) {
  const ctrl = window.sceneController;
  const ds = window._ds;
  if (!ctrl || !ds?.root) return {};

  const ids = ctrl.object_ids() || [];
  const mgr = window.cadDocManager?.handle ? window.cadDocManager : null;
  const r = ds.root;

  ds.beginBatch();

  // Prune stale selections (objects may have been deleted)
  // Use '' not null — Datastar breaks reactivity for signals initialized as null
  if (r.selectedId && !ids.includes(r.selectedId)) r.selectedId = '';
  if (r.boolSelA && !ids.includes(r.boolSelA)) r.boolSelA = '';
  if (r.boolSelB && !ids.includes(r.boolSelB)) r.boolSelB = '';

  // Apply selection from result (select/deselect/pick commands)
  if (result.selectedId !== undefined) {
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

  // Auto-select new object after mutations (e.g. boolean result)
  if (result.objectId && !r.selectedId && ids.includes(result.objectId)) {
    r.selectedId = result.objectId;
    r.boolSelA = result.objectId;
    r.boolSelB = '';
  }

  // Sync computed signals
  const a = r.boolSelA, b = r.boolSelB;
  r.objectCount = ids.length;
  r.sceneEmpty = ids.length === 0;
  r.boolLabel = a && b ? `A: ${a.slice(0,4)} | B: ${b.slice(0,4)}`
    : a ? `A: ${a.slice(0,4)} | B: click another` : 'Click first object';
  r.boolReady = !!(a && b);
  r.canUndo = mgr?.canUndo ?? false;
  r.canRedo = mgr?.canRedo ?? false;

  ds.endBatch();

  // Load style for selected object
  if (r.selectedId) loadStyle(r.selectedId);

  // Update object list DOM
  renderObjectList(ids);

  return {
    ready: true, objectCount: ids.length, objectIds: ids,
    selectedId: r.selectedId, boolSelA: a, boolSelB: b,
    canUndo: r.canUndo, canRedo: r.canRedo,
  };
}

// ─── Style: WASM ↔ Datastar signals ─────────────────────────────

function loadStyle(objectId) {
  const ctrl = window.sceneController;
  const ds = window._ds;
  if (!ctrl || !objectId || !ds) return;
  // Use executeWasm (unified dispatch) — NOT cadCommand (would recurse from reconcile)
  const result = executeWasm(ctrl, 'get_object_style', { objectId });
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

function applyStyle(commit) {
  const ctrl = window.sceneController;
  const ds = window._ds;
  const id = ds?.root?.selectedId;
  if (!ctrl || !id) return;
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
    // Live preview only: WASM, no Automerge
    executeWasm(ctrl, 'set_style', { objectId: id, style });
  }
}

// ─── Object list (outliner) ─────────────────────────────────────

function renderObjectList(ids) {
  const c = window.sceneController;
  if (!c) return;
  if (!ids) ids = c.object_ids() || [];
  const el = document.getElementById('objectList');
  if (!el) return;
  if (ids.length === 0) {
    el.innerHTML = '<span class="opacity-50">Scene empty</span>';
    return;
  }
  const r = window._ds?.root;
  const selA = r?.boolSelA || null;
  const selB = r?.boolSelB || null;
  let names = {};
  try {
    const state = JSON.parse(c.execute('get_state', '{}'));
    names = state.objectNames || {};
  } catch {}
  const html = ids.map((id, i) => {
    const isA = id === selA;
    const isB = id === selB;
    const cls = isA ? 'obj-item obj-sel-a' : isB ? 'obj-item obj-sel-b' : 'obj-item';
    const label = isA ? 'A' : isB ? 'B' : '';
    const name = names[id] || id.slice(0, 6);
    return `<button class="${cls}" data-testid="outliner-item" data-oid="${id}" title="Click to select&#10;${id}">${i}: ${name}${label ? ' <b>' + label + '</b>' : ''}</button>`;
  }).join('');
  el.innerHTML = html;
  el.querySelectorAll('[data-oid]').forEach(btn => {
    btn.addEventListener('click', () => {
      cadCommand('select', { id: btn.dataset.oid }, { ephemeral: true });
    });
  });
}

// ─── Single entry point for all CAD operations ───────────────────

function cadCommand(type, params = {}, options = {}) {
  const ctrl = window.sceneController;
  if (!ctrl) return { error: 'SceneController not ready' };

  let result;
  try {
    result = executeWasm(ctrl, type, params);
  } catch (err) {
    return { error: String(err) };
  }

  // Record to Automerge (skip for ephemeral commands like select/deselect/pick_at)
  if (!options.ephemeral && !options.skipAutomerge) {
    const mgr = window.cadDocManager?.handle ? window.cadDocManager : null;
    if (mgr) mgr.record(type, params, { objectId: result.objectId, groupId: options.groupId });
  }

  // Reconcile: WASM state → Datastar signals → UI
  const state = reconcile(result);

  // Broadcast (skip for ephemeral + api-sourced)
  if (!options.ephemeral && !window.__cadLocalMode && options.source !== 'api') {
    const mid = window.__modelId || 'default';
    fetch(`/api/cad/${mid}/state`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...state, broadcast: true }),
    }).catch(() => {});
  }

  return { ...result, ...state };
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
function addShape(type, params) {
  const result = cadCommand(type, params);
  if (result.objectId && result.objectIds) {
    const idx = result.objectIds.indexOf(result.objectId);
    if (idx > 0) {
      const size = params.size || params.radius || params.majorRadius || 1;
      cadCommand('translate', { objectId: result.objectId, dx: idx * size * 0.7, dy: 0, dz: 0 }, { skipAutomerge: true });
    }
  }
  return result;
}

export { cadCommand, executeWasm, reconcile, loadStyle, applyStyle, renderObjectList, showFeedback, addShape };

// Window globals: only what's needed for inline HTML handlers and E2E tests
window.cadCommand = cadCommand;
window.addShape = addShape;
window.reconcile = reconcile;
window.__applyStyle = applyStyle;
window.__loadStyle = loadStyle;
window.showFeedbackSignal = showFeedback;
