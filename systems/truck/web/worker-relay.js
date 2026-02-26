// worker-relay.js — Handles non-signal SSE events (commands) from Worker.
import { cadCommand, reconcile } from './state.js';

const modelId = window.__modelId || 'default';
const API = {
  events: `/api/cad/${modelId}/events`,
  state: `/api/cad/${modelId}/state`,
  result: (id) => `/api/cad/${modelId}/result/${id}`,
};

let eventSource = null;

async function handleCommand(id, command) {
  console.log(`[worker-relay] Executing command: ${command.type}`, command.params);
  const result = await cadCommand(command.type, command.params || {}, { source: 'api' });
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

const relay = {
  connect() {
    if (eventSource) return;
    console.log('[worker-relay] Connecting...');
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
      console.log('[worker-relay] Connected');
      const state = reconcile({});
      fetch(API.state, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(state),
      }).catch(() => {});
    };

    eventSource.onerror = () => {
      this.disconnect();
      setTimeout(() => this.connect(), 5000);
    };
  },

  disconnect() {
    if (eventSource) {
      console.log('[worker-relay] Disconnecting...');
      eventSource.close();
      eventSource = null;
    }
  }
};

window.__workerRelay = relay;

// Initial start if not in local mode
if (!window.__cadLocalMode) {
  (function waitAndStart() {
    if (!window.sceneController) { setTimeout(waitAndStart, 500); return; }
    relay.connect();
  })();
}
