// state.js — ALL CAD state: dispatch commands to Rust, reconcile signals, selection, style.
// cadCommand() is the ONLY way to change state. reconcile() is the ONLY way to sync it.

// ─── Core WASM call ─────────────────────────────────────────────

function executeWasm(ctrl, type, params) {
  try {
    const res = ctrl.execute(type, JSON.stringify(params || {}));
    if (!res) return { error: 'Empty response' };
    return JSON.parse(res);
  } catch (err) {
    console.error(`WASM execute(${type}) failed:`, err);
    return { error: String(err) };
  }
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

  // Sync computed signals
  const a = r.boolSelA, b = r.boolSelB;
  r.objectCount = ids.length;
  r.sceneEmpty = ids.length === 0;
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

  ds.endBatch();

  // Load style and BIM metadata for selected object
  if (r.selectedId) {
    try {
      loadStyle(r.selectedId);
      loadBim(r.selectedId);
    } catch (err) {
      console.warn('Metadata load failed:', err);
    }
  }

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

function loadBim(objectId) {
  const ctrl = window.sceneController;
  const ds = window._ds;
  if (!ctrl || !objectId || !ds) return;
  const result = executeWasm(ctrl, 'get_bim_metadata', { objectId });
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
    return `
      <div class="flex items-center gap-1 group">
        <button class="${cls} flex-1" data-testid="outliner-item" data-oid="${id}" title="${id}">${i}: ${name}${label ? ' <b>' + label + '</b>' : ''}</button>
        <button class="btn btn-ghost btn-xs opacity-0 group-hover:opacity-50 hover:!opacity-100 p-0.5 h-auto min-h-0" 
                data-focus-oid="${id}" title="Focus object">
          <svg xmlns="http://www.w3.org/2000/svg" class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        </button>
      </div>`;
  }).join('');
  el.innerHTML = html;
  el.querySelectorAll('[data-oid]').forEach(btn => {
    btn.addEventListener('click', () => {
      cadCommand('select', { id: btn.dataset.oid }, { ephemeral: true });
    });
  });
  el.querySelectorAll('[data-focus-oid]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('viewport').zoomTo(btn.dataset.focusOid);
    });
  });
}

// ─── Control Plane (JS Layer) ───────────────────────────────────

const JS_COMMANDS = new Set([
  'undo', 'redo', 'get_status', 'set_mode', 'create_model', 'set_automerge', 'clear_data'
]);

async function handleJsCommand(type, params) {
  const mgr = window.cadDocManager;
  
  switch (type) {
    case 'undo':
      if (mgr && mgr.canUndo) {
        mgr.handle.undo();
        return { success: true };
      }
      return { error: 'Nothing to undo' };
      
    case 'redo':
      if (mgr && mgr.canRedo) {
        mgr.handle.redo();
        return { success: true };
      }
      return { error: 'Nothing to redo' };

    case 'get_status':
      return {
        mode: window.__cadLocalMode ? 'local' : 'online',
        automergeReady: !!mgr?.handle,
        automergeEnabled: mgr?.enabled ?? true,
        objectCount: window._ds?.root?.objectCount || 0
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
        // Reset scene
        const ctrl = window.sceneController;
        if (ctrl) ctrl.clear_scene();
        return { success: true, modelId: 'new' }; // simplified
      }
      return { error: 'DocManager not ready' };

    case 'clear_data':
      if (confirm('WIPE ALL LOCAL DATA? This cannot be undone.')) {
        localStorage.clear();
        location.reload();
        return { success: true };
      }
      return { success: false };

    default:
      return { error: `Unknown JS command: ${type}` };
  }
}

// ─── Single entry point for all CAD operations ───────────────────

let _busy = false;
async function cadCommand(type, params = {}, options = {}) {
  const ctrl = window.sceneController;
  if (!ctrl && !JS_COMMANDS.has(type)) return { error: 'SceneController not ready' };
  
  // Guard against re-entrancy for WASM commands, but allow JS commands
  if (_busy && !options.ephemeral && !JS_COMMANDS.has(type)) return { error: 'Busy' };
  
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
      // 2. WASM Kernel Dispatch
      try {
        result = executeWasm(ctrl, type, params);
      } catch (err) {
        return { error: String(err) };
      }
    }

  // Record to Automerge (skip for ephemeral commands and JS commands which handle their own state)
  if (!options.ephemeral && !options.skipAutomerge && !JS_COMMANDS.has(type)) {
    const mgr = window.cadDocManager?.handle ? window.cadDocManager : null;
    if (mgr) {
      mgr.record(type, params, { 
        objectId: result.objectId, 
        groupId: options.groupId,
        hierarchy: result.hierarchy 
      });
    }
  }

      // Reconcile: WASM state → Datastar signals → UI
      const state = reconcile(result);
  
      // Contextual feedback
      if (type.startsWith('boolean_') && result.objectId) {
        showFeedback('Operation success');
      } else if (type === 'clash_detect') {
        showFeedback(result.clash ? '💥 CLASH DETECTED!' : '✅ No clash', result.clash);
      } else if (type === 'import_mvt' || type === 'import_step' || type === 'import_ifc') {
        showFeedback(`Imported ${result.objectCount || ''} objects`);
        // Auto-zoom to extents after big imports
        setTimeout(() => {
          const vp = document.getElementById('viewport');
          if (vp && vp.zoomToExtents) vp.zoomToExtents();
        }, 500);
      } else if (result.error) {
        showFeedback(result.error, true);
      }
  
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
