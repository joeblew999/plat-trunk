// worker-relay.ts — Handles non-signal SSE events from the CF worker.
// Owns: cad-command dispatch, sync-op relay, doc-changed trigger, presence.
// Does NOT own: CRDT merge, IDB, server sync — those are SyncClient's concern.
import { cadCommand } from './dispatch';
import { reconcile } from './reconcile';
import { client } from './api-client';
import { cadDocManager } from './history-ui';
import { MODEL_ID } from './app-config';

const modelId = MODEL_ID;

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
        const mgr = cadDocManager;
        if (mgr?._sync?.modelId) {
          mgr.applyServerOp(op).catch(err => console.warn('[worker-relay] sync-op apply failed:', err));
        }
      } catch (err) {
        console.warn('[worker-relay] sync-op parse error:', err);
      }
    });

    // Handle doc-changed (another browser synced new ops to server — pull to merge)
    // Server already excludes the sender's actorId, so we only receive events
    // from OTHER browsers. Debounce to collapse rapid events.
    let docChangedTimer: ReturnType<typeof setTimeout> | null = null;
    eventSource.addEventListener('doc-changed', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (docChangedTimer) clearTimeout(docChangedTimer);
        docChangedTimer = setTimeout(() => {
          docChangedTimer = null;
          console.log(`[worker-relay] doc-changed from ${data.actorId}, syncing...`);
          cadDocManager?.syncWithServer();
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
      cadDocManager?.syncWithServer();
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

export { relay };
window.__workerRelay = relay; // kept for E2E tests

// Initial start if not in local mode
if (!window.__cadLocalMode) {
  (function waitAndStart() {
    if (!window.sceneController) { setTimeout(waitAndStart, 500); return; }
    relay.connect();
  })();
}
