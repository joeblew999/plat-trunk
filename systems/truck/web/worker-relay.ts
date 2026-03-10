// worker-relay.js — Handles non-signal SSE events (commands) from Worker.
import { cadCommand } from './dispatch';
import { reconcile } from './reconcile';
import { client } from './api-client';

const modelId = window.__modelId || 'default';

let eventSource: EventSource | null = null;

function getActorId(): string {
  let id = localStorage.getItem('cad-actor-id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('cad-actor-id', id); }
  return id;
}

function getActorName(): string {
  return localStorage.getItem('cad-actor-name') || 'User';
}

async function handleCommand(id: string, command: { type: string; params?: Record<string, unknown> }): Promise<void> {
  console.log(`[worker-relay] Executing command: ${command.type}`, command.params);
  const result = await cadCommand(command.type, command.params || {}, { source: 'api' });
  try {
    await client.POST('/api/cad/{modelId}/result/{id}', {
      params: { path: { modelId, id } },
      body: result.error ? { error: result.error } : { result },
    });
  } catch (err) {
    console.warn('[worker-relay] Failed to post result:', err);
  }
}

const relay = {
  connect() {
    if (eventSource) return;
    console.log('[worker-relay] Connecting...');
    const actorId = getActorId();
    const name = encodeURIComponent(getActorName());
    eventSource = new EventSource(`/api/cad/${modelId}/events?actorId=${actorId}&name=${name}`);

    eventSource.addEventListener('cad-command', (e) => {
      try {
        const data = JSON.parse(e.data);
        handleCommand(data.id, data.command).catch(err => console.warn('[worker-relay] Command failed:', err));
      } catch (err) {
        console.warn('[worker-relay] SSE parse error:', err);
      }
    });

    // Handle server-originated ops (from MCP server-direct execution)
    eventSource.addEventListener('sync-op', (e) => {
      try {
        const op = JSON.parse(e.data);
        const mgr = window.cadDocManager;
        if (mgr?._docBytes) {
          mgr.applyServerOp(op).catch(err => console.warn('[worker-relay] sync-op apply failed:', err));
        }
      } catch (err) {
        console.warn('[worker-relay] sync-op parse error:', err);
      }
    });

    // Handle doc-changed (another browser synced new ops to server — pull to merge)
    // Debounce to prevent feedback loops: syncWithServer → server broadcast → doc-changed → syncWithServer
    let docChangedTimer: ReturnType<typeof setTimeout> | null = null;
    eventSource.addEventListener('doc-changed', (e) => {
      try {
        const data = JSON.parse(e.data);
        const myActorId = getActorId();
        // Skip if we were the sender (we already have the latest)
        if (data.actorId === myActorId) return;
        // Debounce: collapse rapid doc-changed events into one sync
        if (docChangedTimer) clearTimeout(docChangedTimer);
        docChangedTimer = setTimeout(() => {
          docChangedTimer = null;
          console.log(`[worker-relay] doc-changed from ${data.actorId}, syncing...`);
          window.cadDocManager?.syncWithServer();
        }, 500);
      } catch (err) {
        console.warn('[worker-relay] doc-changed parse error:', err);
      }
    });

    // Handle presence updates
    eventSource.addEventListener('presence', (e) => {
      try {
        const data = JSON.parse(e.data);
        (window as any).__presenceActors = data.actors;
        (window as any).__presenceCount = data.actors?.length ?? 0;
        reconcile({});
      } catch (err) {
        console.warn('[worker-relay] presence parse error:', err);
      }
    });

    eventSource.onopen = () => {
      console.log('[worker-relay] Connected');
      const state = reconcile({});
      client.POST('/api/cad/{modelId}/state', {
        params: { path: { modelId } },
        body: { ...state, broadcast: false },
      }).catch(() => {});
      // Sync local doc with server on connect (ADR-0001 Part B2)
      window.cadDocManager?.syncWithServer();
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
