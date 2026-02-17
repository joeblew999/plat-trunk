// api-bridge.js — Browser-side bridge for the CAD Remote Control API.
// Connects to /api/cad/events via SSE (EventSource) for instant command push.
// Falls back to polling /api/cad/pending if SSE fails.
// Executes commands via cadCommand() (from cad-commands.js), posts results back, reports state.

(function () {
  'use strict';

  const STATE_INTERVAL = 2000; // ms between state reports
  const POLL_INTERVAL = 500;   // fallback polling interval

  let eventSource = null;
  let pollTimer = null;
  let stateTimer = null;
  let connected = false;
  let useSSE = true;

  // -----------------------------------------------------------------------
  // Handle incoming command (from SSE or polling)
  // Uses cadCommand() from cad-commands.js — single WASM dispatch path.
  // skipAutomerge: true because API commands are already recorded server-side.
  // -----------------------------------------------------------------------

  async function handleCommand(id, command) {
    const result = window.cadCommand
      ? window.cadCommand(command.type, command.params || {}, { skipAutomerge: true, source: 'api' })
      : { error: 'cadCommand not loaded' };

    // Handle select_at/deselect — update GUI selection from API
    if (result.selectedId !== undefined && window.setSelection) {
      window.setSelection(result.selectedId, command.params?.shiftSelect ?? false);
    }

    try {
      await fetch(`/api/cad/result/${id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(result.error ? { error: result.error } : { result }),
      });
    } catch (err) {
      console.warn('[api-bridge] Failed to post result:', err);
    }
  }

  // -----------------------------------------------------------------------
  // SSE connection — primary command delivery
  // -----------------------------------------------------------------------

  function connectSSE() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    eventSource = new EventSource('/api/cad/events');

    eventSource.addEventListener('cad-command', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('[api-bridge] SSE command:', data.command.type);
        handleCommand(data.id, data.command);
      } catch (err) {
        console.warn('[api-bridge] SSE parse error:', err);
      }
    });

    eventSource.addEventListener('datastar-patch-signals', (e) => {
      // Apply Datastar signals from server to local reactive store
      try {
        // SSE data format: "signals {json}"
        const raw = e.data.replace(/^signals\s*/, '');
        const signals = JSON.parse(raw);
        const ds = window._ds;
        if (ds?.root) {
          ds.beginBatch();
          for (const [k, v] of Object.entries(signals)) {
            ds.root[k] = v;
          }
          ds.endBatch();
        }
      } catch (err) {
        console.warn('[api-bridge] Failed to apply Datastar signals:', err);
      }
    });

    eventSource.addEventListener('open', () => {
      console.log('[api-bridge] SSE connected');
      useSSE = true;
      // Stop fallback polling if SSE is working
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    });

    eventSource.addEventListener('error', () => {
      console.warn('[api-bridge] SSE error — falling back to polling');
      useSSE = false;
      eventSource.close();
      eventSource = null;
      // Start fallback polling
      if (!pollTimer) {
        pollTimer = setInterval(pollCommands, POLL_INTERVAL);
      }
      // Retry SSE after 5s
      setTimeout(() => {
        if (connected && !eventSource) connectSSE();
      }, 5000);
    });
  }

  // -----------------------------------------------------------------------
  // Fallback polling
  // -----------------------------------------------------------------------

  async function pollCommands() {
    if (!window.sceneController) return;
    try {
      const res = await fetch('/api/cad/pending');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.commands || data.commands.length === 0) return;

      for (const cmd of data.commands) {
        await handleCommand(cmd.id, cmd.command);
      }
    } catch (err) {
      // Network error — silently retry next tick
    }
  }

  // -----------------------------------------------------------------------
  // State reporting
  // -----------------------------------------------------------------------

  async function reportState() {
    const ctrl = window.sceneController;
    if (!ctrl) return;
    try {
      const state = window.buildUIState ? window.buildUIState() : { ready: false };
      // Add per-object styles for API consumers (not in base buildUIState)
      if (state.objectIds) {
        state.styles = state.objectIds.reduce((acc, id) => {
          try { acc[id] = JSON.parse(ctrl.get_object_style(id)); } catch {}
          return acc;
        }, {});
      }
      await fetch('/api/cad/state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(state),
      });
    } catch {
      // ignore
    }
  }

  // -----------------------------------------------------------------------
  // Start / stop
  // -----------------------------------------------------------------------

  function start() {
    if (connected) return;
    connected = true;

    // Connect SSE for instant command push
    connectSSE();

    // Also start polling as fallback (SSE will stop it once connected)
    pollTimer = setInterval(pollCommands, POLL_INTERVAL);

    // Report state periodically
    stateTimer = setInterval(reportState, STATE_INTERVAL);
    setTimeout(reportState, 500);

    console.log('[api-bridge] Started — SSE + polling fallback');
  }

  function stop() {
    connected = false;
    if (eventSource) { eventSource.close(); eventSource = null; }
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (stateTimer) { clearInterval(stateTimer); stateTimer = null; }
    console.log('[api-bridge] Stopped');
  }

  // Wait for WASM to be ready, then start
  function waitAndStart() {
    if (window.sceneController) {
      start();
    } else {
      setTimeout(waitAndStart, 500);
    }
  }

  // Expose globally — delegates to shared cadCommand/buildUIState
  window.apiBridge = {
    start,
    stop,
    executeCommand: (cmd) => window.cadCommand
      ? window.cadCommand(cmd.type, cmd.params || {}, { skipAutomerge: true, source: 'api' })
      : { error: 'cadCommand not loaded' },
    buildState: () => window.buildUIState ? window.buildUIState() : { ready: false },
  };

  // Auto-start
  waitAndStart();
})();
