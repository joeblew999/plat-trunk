// worker-relay.js — Online mode only: SSE/polling relay between browser and Worker.

import { cadCommand, executeWasm, reconcile } from './state.js';

const STATE_INTERVAL = 2000;
const POLL_INTERVAL = 500;

// Model-scoped API paths — use modelId from URL routing
const modelId = window.__modelId || 'default';
const API = {
  events:  `/api/cad/${modelId}/events`,
  exec:    `/api/cad/${modelId}/exec`,
  pending: `/api/cad/${modelId}/pending`,
  state:   `/api/cad/${modelId}/state`,
  result:  (id) => `/api/cad/${modelId}/result/${id}`,
};

let eventSource = null;
let pollTimer = null;
let stateTimer = null;
let connected = false;

async function handleCommand(id, command) {
  // cadCommand already calls reconcile() — no need for separate setSelection
  const result = cadCommand(command.type, command.params || {}, { skipAutomerge: true, source: 'api' });
  try {
    await fetch(API.result(id), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(result.error ? { error: result.error } : { result }),
    });
  } catch (err) {
    console.warn('[worker-relay] Failed to post result:', err);
  }
}

function connectSSE() {
  if (eventSource) { eventSource.close(); eventSource = null; }
  eventSource = new EventSource(API.events);

  eventSource.addEventListener('cad-command', (e) => {
    try {
      const data = JSON.parse(e.data);
      handleCommand(data.id, data.command);
    } catch (err) {
      console.warn('[worker-relay] SSE parse error:', err);
    }
  });

  eventSource.addEventListener('datastar-patch-signals', (e) => {
    try {
      const raw = e.data.replace(/^signals\s*/, '');
      const signals = JSON.parse(raw);
      const ds = window._ds;
      if (ds?.root) {
        ds.beginBatch();
        for (const [k, v] of Object.entries(signals)) ds.root[k] = v;
        ds.endBatch();
      }
    } catch (err) {
      console.warn('[worker-relay] Failed to apply Datastar signals:', err);
    }
  });

  eventSource.addEventListener('open', () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    // Re-register state after reconnect (handles Worker GC eviction)
    reportState();
  });

  eventSource.addEventListener('error', () => {
    console.warn('[worker-relay] SSE error — falling back to polling');
    eventSource.close();
    eventSource = null;
    if (!pollTimer) pollTimer = setInterval(pollCommands, POLL_INTERVAL);
    setTimeout(() => { if (connected && !eventSource) connectSSE(); }, 5000);
  });
}

async function pollCommands() {
  if (!window.sceneController) return;
  try {
    const res = await fetch(API.pending);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.commands?.length) return;
    for (const cmd of data.commands) await handleCommand(cmd.id, cmd.command);
  } catch { /* retry next tick */ }
}

async function reportState() {
  const ctrl = window.sceneController;
  if (!ctrl) return;
  try {
    const state = reconcile({});
    if (state.objectIds) {
      state.styles = state.objectIds.reduce((acc, id) => {
        try {
          const r = executeWasm(ctrl, 'get_object_style', { objectId: id });
          if (r.style) acc[id] = r.style;
        } catch {}
        return acc;
      }, {});
    }
    await fetch(API.state, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(state),
    });
  } catch { /* ignore */ }
}

// Wait for WASM, then connect SSE + start state reporting
(function waitAndStart() {
  if (!window.sceneController) { setTimeout(waitAndStart, 500); return; }
  connected = true;
  connectSSE();
  pollTimer = setInterval(pollCommands, POLL_INTERVAL);
  stateTimer = setInterval(reportState, STATE_INTERVAL);
  setTimeout(reportState, 500);
})();
