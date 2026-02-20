// worker-relay.js — Handles non-signal SSE events (commands) from Worker.
// Datastar automatically handles 'datastar-patch-signals' via data-sse in index.html.
import { cadCommand, reconcile } from './state.js';

const modelId = window.__modelId || 'default';
const API = {
  events: `/api/cad/${modelId}/events`,
  state: `/api/cad/${modelId}/state`,
  result: (id) => `/api/cad/${modelId}/result/${id}`,
};

let eventSource = null;

async function handleCommand(id, command) {
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

function connect() {
  if (eventSource) eventSource.close();
  
  // We use a separate EventSource for custom events because Datastar RC.7 
  // data-sse plugin consumes the stream for its own events.
  eventSource = new EventSource(API.events);

  eventSource.addEventListener('cad-command', (e) => {
    try {
      const data = JSON.parse(e.data);
      handleCommand(data.id, data.command);
    } catch (err) {
      console.warn('[worker-relay] SSE parse error:', err);
    }
  });

  eventSource.onopen = () => {
    // Initial state sync to worker
    const state = reconcile({});
    fetch(API.state, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(state),
    }).catch(() => {});
  };

  eventSource.onerror = () => {
    eventSource.close();
    setTimeout(connect, 5000);
  };
}

// Wait for WASM, then connect
(function waitAndStart() {
  if (!window.sceneController) { setTimeout(waitAndStart, 500); return; }
  connect();
})();
