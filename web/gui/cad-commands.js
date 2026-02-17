// cad-commands.js — Unified CAD command dispatcher.
// All commands (GUI buttons, API bridge, keyboard shortcuts, tests) go through here.
// Provides a single executeWasm() mapping and cadCommand() entry point.

'use strict';

/**
 * Execute a command directly on the WASM SceneController.
 * This is the canonical mapping from command type + params → WASM method call.
 * Used by cadCommand() and cad-document.js _replayScene().
 *
 * @param {object} ctrl - The WASM SceneController instance
 * @param {string} type - Command type (e.g., 'add_cube', 'translate')
 * @param {object} params - Command parameters
 * @returns {object} Result with objectId, success, scene, style, error, etc.
 */
function executeWasm(ctrl, type, params) {
  const p = params || {};
  switch (type) {
    // --- Primitives ---
    case 'add_cube':
      return { objectId: ctrl.add_cube(p.size ?? 1.0) };
    case 'add_sphere':
      return { objectId: ctrl.add_sphere(p.radius ?? p.size ?? 1.0) };
    case 'add_cylinder':
      return { objectId: ctrl.add_cylinder(p.radius ?? 0.5, p.height ?? 1.0) };
    case 'add_torus':
      return { objectId: ctrl.add_torus(p.majorRadius ?? 1.0, p.minorRadius ?? 0.3) };

    // --- Transforms ---
    case 'translate':
      return { success: ctrl.translate_object(p.objectId, p.dx ?? 0, p.dy ?? 0, p.dz ?? 0) };
    case 'rotate':
      return { success: ctrl.rotate_object(p.objectId, p.axisX ?? 0, p.axisY ?? 1, p.axisZ ?? 0, p.angleDeg ?? 0) };

    // --- Booleans ---
    case 'boolean_union': {
      const id = ctrl.boolean_union(p.idA, p.idB);
      return id ? { objectId: id } : { error: 'Boolean union failed' };
    }
    case 'boolean_subtract': {
      const id = ctrl.boolean_subtract(p.idA, p.idB);
      return id ? { objectId: id } : { error: 'Boolean subtract failed' };
    }
    case 'boolean_intersect': {
      const id = ctrl.boolean_intersect(p.idA, p.idB);
      return id ? { objectId: id } : { error: 'Boolean intersect failed' };
    }

    // --- Scene management ---
    case 'delete':
      ctrl.delete_object(p.objectId);
      return { success: true };
    case 'clear':
      ctrl.clear_scene();
      return { success: true };
    case 'export_scene':
      return { scene: ctrl.export_scene() };
    case 'import_scene': {
      const ok = ctrl.import_scene(p.json);
      return { success: ok };
    }

    // --- Selection ---
    case 'select_at': {
      const id = ctrl.select_object_at(p.ndcX ?? 0, p.ndcY ?? 0);
      return { selectedId: id || null };
    }
    case 'deselect':
      ctrl.select_object_at(-999, -999); // miss on purpose
      return { selectedId: null };

    // --- Style ---
    case 'get_object_style': {
      const json = ctrl.get_object_style(p.objectId);
      return json ? { style: JSON.parse(json) } : { error: 'Object not found' };
    }
    case 'set_style': {
      const ok = ctrl.set_object_style(p.objectId, JSON.stringify(p.style));
      return { success: ok };
    }
    case 'set_color': {
      const ok = ctrl.set_object_color(p.objectId, p.r ?? 1, p.g ?? 0, p.b ?? 0, p.a ?? 1);
      return { success: ok };
    }

    // --- Sketch ---
    case 'sketch_extrude': {
      if (p.sketchJson && p.height) {
        ctrl.sketch_import(p.sketchJson);
        const resultId = ctrl.sketch_extrude(p.height);
        return resultId ? { objectId: resultId } : { error: 'Sketch extrude failed' };
      }
      return { error: 'Missing sketchJson or height' };
    }

    // --- Queries ---
    case 'get_state':
      return buildUIState();
    case 'pick_mesh_stats':
      return { stats: JSON.parse(ctrl.pick_mesh_stats() || '[]') };

    default:
      return { error: `Unknown command type: ${type}` };
  }
}

/**
 * Build a snapshot of the current UI state from the WASM controller.
 * Used for state reporting to the Worker and for Datastar signal updates.
 */
function buildUIState() {
  const ctrl = window.sceneController;
  if (!ctrl) return { ready: false };
  try {
    const ids = ctrl.object_ids() || [];
    const mgr = window.cadDocManager?.handle ? window.cadDocManager : null;
    return {
      ready: true,
      objectCount: ids.length,
      objectIds: ids,
      selectedId: window.selectedObjectId || null,
      boolSelA: window.boolSelA || null,
      boolSelB: window.boolSelB || null,
      canUndo: mgr?.canUndo ?? false,
      canRedo: mgr?.canRedo ?? false,
      interactionMode: ctrl.get_interaction_mode(),
    };
  } catch (err) {
    return { ready: true, error: String(err) };
  }
}

/**
 * Push UI state into Datastar reactive signals.
 * Uses the _ds bridge (exposed from datastar.js module) to set signal values.
 * Datastar picks up changes and updates any data-text/data-show/data-attr bindings.
 */
function updateSignals(state) {
  const ds = window._ds;
  if (!ds?.root) return;

  // Build bool label from state
  const a = state.boolSelA;
  const b = state.boolSelB;
  let boolLabel, boolReady;
  if (a && b) {
    boolLabel = `A: ${a.slice(0,4)} | B: ${b.slice(0,4)}`;
    boolReady = true;
  } else if (a) {
    boolLabel = `A: ${a.slice(0,4)} | B: shift+click`;
    boolReady = false;
  } else {
    boolLabel = 'Click A, shift+click B';
    boolReady = false;
  }

  try {
    ds.beginBatch();
    ds.root.objectCount = state.objectCount ?? 0;
    ds.root.sceneEmpty = (state.objectCount ?? 0) === 0;
    ds.root.selectedId = state.selectedId ?? null;
    ds.root.boolSelA = a ?? null;
    ds.root.boolSelB = b ?? null;
    ds.root.boolLabel = boolLabel;
    ds.root.boolReady = boolReady;
    ds.root.canUndo = state.canUndo ?? false;
    ds.root.canRedo = state.canRedo ?? false;
    ds.endBatch();
  } catch {
    // Datastar not loaded yet — ignore
  }
}

/**
 * Unified command entry point. All CAD operations should go through here.
 *
 * @param {string} type - Command type
 * @param {object} params - Command parameters
 * @param {object} options
 * @param {boolean} options.skipAutomerge - Skip Automerge recording (for API-relayed commands)
 * @param {string|null} options.groupId - Group ID for atomic undo grouping
 * @param {string} options.source - 'gui' | 'api' | 'keyboard' | 'test'
 * @returns {object} Result including any objectId/success + UI state
 */
function cadCommand(type, params = {}, options = {}) {
  const { skipAutomerge = false, groupId = null, source = 'gui' } = options;

  const ctrl = window.sceneController;
  if (!ctrl) return { error: 'SceneController not ready' };

  const mgr = window.cadDocManager?.handle ? window.cadDocManager : null;

  let result;

  try {
    // Always execute directly — WASM is truth (single gateway, like test-hono)
    result = executeWasm(ctrl, type, params);

    // Record in op log after the fact (fire-and-forget, like bc?.broadcast() in test-hono)
    if (mgr && !skipAutomerge) {
      mgr.record(type, params, { objectId: result.objectId, groupId });
    }
  } catch (err) {
    result = { error: String(err) };
  }

  // Update selection for commands that return a new object
  if (result.selectedId !== undefined && window.setSelection) {
    window.setSelection(result.selectedId);
  }

  // Refresh UI
  if (window.updateObjectList) window.updateObjectList();

  // Update Datastar reactive signals
  const state = buildUIState();
  updateSignals(state);

  // Push state to Worker for SSE broadcast (fire-and-forget).
  // broadcast: true tells the Worker to push signals to other SSE clients.
  // api-bridge's periodic reportState() omits this flag (just stores for GET).
  if (source !== 'api') {
    try {
      fetch('/api/cad/state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...state, broadcast: true }),
      }).catch(() => {});
    } catch { /* offline / no worker */ }
  }

  return { ...result, ...state };
}

/**
 * Show a brief feedback message via Datastar signals.
 * Auto-clears after 2 seconds.
 */
function showFeedbackSignal(msg, isError = false) {
  const ds = window._ds;
  if (!ds?.root) return;
  try {
    ds.beginBatch();
    ds.root.feedback = msg;
    ds.root.feedbackError = isError;
    ds.endBatch();
    setTimeout(() => {
      try {
        ds.beginBatch();
        ds.root.feedback = '';
        ds.root.feedbackError = false;
        ds.endBatch();
      } catch { /* ignore */ }
    }, 2000);
  } catch { /* Datastar not loaded */ }
}

// Expose globally for use by main.js, api-bridge.js, and E2E tests
window.cadCommand = cadCommand;
window.executeWasm = executeWasm;
window.buildUIState = buildUIState;
window.updateSignals = updateSignals;
window.showFeedbackSignal = showFeedbackSignal;
