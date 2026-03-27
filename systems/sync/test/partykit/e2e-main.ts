/**
 * PartyKit E2E test GUI — uses REAL PartyKit client libraries.
 *
 * - SyncDoc for ops (automerge-repo)
 * - PartySocket for presence + pubsub (real reconnecting WebSocket)
 * - partyfn RPCClient for RPC
 *
 * URL params:
 *   ?room=my-room    — room name (default: random)
 *   ?actor=user-1    — actor ID (default: random)
 *   ?docId=abc123    — join existing SyncDoc instead of creating
 */

import { next as Automerge } from '@automerge/automerge';
import PartySocket from 'partysocket';
import { SyncDoc } from '../../ts/partykit/sync-doc.ts';
import type { Operation } from '../../ts/shared/types.ts';

// Automerge requires WASM init in the browser
await (Automerge as any).initializeWasm?.();

const params = new URLSearchParams(window.location.search);
const room = params.get('room') ?? `e2e-${Date.now()}`;
const actorId = params.get('actor') ?? `actor-${Math.random().toString(36).slice(2, 6)}`;
const joinDocId = params.get('docId');

// ── Globals for Playwright ───────────────────────────────────────────────────

declare global {
  interface Window {
    sync: SyncDoc;
    getOps: () => Operation[];
    getReplayOps: () => Operation[];
    addTestOp: (type?: string) => Operation;
    undoLast: () => void;
    redoLast: () => void;
    presenceSocket: PartySocket;
    pubsubSocket: PartySocket;
    rpcSocket: PartySocket;
    presenceReceived: any[];
    pubsubReceived: any[];
    rpcResults: any[];
    sendCursor: (x: number, y: number) => void;
    publishTopic: (topic: string, data: any) => void;
    rpcCall: (action: string, args?: any) => Promise<any>;
  }
}

// ── Tab switching ────────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const panel = (tab as HTMLElement).dataset.panel!;
    document.getElementById(`panel-${panel}`)!.classList.add('active');
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(containerId: string, msg: string) {
  const el = document.getElementById(containerId)!;
  const line = document.createElement('div');
  line.textContent = `[${new Date().toISOString().slice(11, 23)}] ${msg}`;
  el.prepend(line);
}

function setStatus(id: string, connected: boolean) {
  const el = document.getElementById(id)!;
  el.textContent = connected ? 'connected' : 'disconnected';
  el.className = `status ${connected ? 'connected' : 'disconnected'}`;
}

// Show info
document.getElementById('actor-id')!.textContent = `actor: ${actorId}`;
document.getElementById('room-id')!.textContent = `room: ${room}`;

// ═══════════════════════════════════════════════════════════════════════════════
// OPS — SyncDoc (automerge-repo)
// ═══════════════════════════════════════════════════════════════════════════════

const sync = new SyncDoc({ host: 'localhost:1999', room, actorId, protocol: 'ws', party: 'ops' });
let opCounter = 0;

function renderOps() {
  const ops = sync.getOps();
  const el = document.getElementById('ops-list')!;
  el.innerHTML = ops.map((op) =>
    `<div class="op ${op.enabled ? '' : 'disabled'}" data-op-id="${op.id}">` +
    `${op.type} (${op.actorId}) [${op.enabled ? 'ON' : 'OFF'}] ${op.id.slice(0, 8)}` +
    `</div>`
  ).join('');
  el.setAttribute('data-op-count', String(ops.length));
  el.setAttribute('data-replay-count', String(sync.getReplayOps().length));
}

function addTestOp(type = 'test_op'): Operation {
  opCounter++;
  const op: Operation = {
    id: `${actorId}-${Date.now()}-${opCounter}`,
    type,
    params: { n: opCounter },
    enabled: true,
    timestamp: Date.now(),
    actorId,
    groupId: null,
  };
  sync.addOp(op);
  log('ops-log', `addOp: ${op.type} ${op.id.slice(0, 8)}`);
  renderOps();
  return op;
}

function undoLast() {
  const ops = sync.getOps().filter(o => o.enabled && o.actorId === actorId);
  if (ops.length === 0) return;
  const last = ops[ops.length - 1];
  sync.undo(last.id);
  log('ops-log', `undo: ${last.id.slice(0, 8)}`);
  renderOps();
}

function redoLast() {
  const ops = sync.getOps().filter(o => !o.enabled && o.actorId === actorId);
  if (ops.length === 0) return;
  sync.redo(ops[0].id);
  log('ops-log', `redo: ${ops[0].id.slice(0, 8)}`);
  renderOps();
}

sync.onRemoteOps = () => { log('ops-log', `remote: ${sync.getReplayOps().length} replay ops`); renderOps(); };

document.getElementById('btn-add-op')!.onclick = () => addTestOp();
document.getElementById('btn-undo-last')!.onclick = () => undoLast();
document.getElementById('btn-redo-last')!.onclick = () => redoLast();
document.getElementById('btn-create')!.onclick = async () => {
  const docId = await sync.create();
  document.getElementById('doc-id-display')!.textContent = `docId: ${docId}`;
  setStatus('ops-status', true);
  const url = new URL(window.location.href);
  url.searchParams.set('docId', docId as string);
  window.history.replaceState({}, '', url.toString());
  renderOps();
};
document.getElementById('btn-join')!.onclick = async () => {
  const id = (document.getElementById('join-id') as HTMLInputElement).value || joinDocId;
  if (!id) return;
  await sync.join(id as any);
  document.getElementById('doc-id-display')!.textContent = `docId: ${id}`;
  setStatus('ops-status', true);
  renderOps();
};

// Auto-create or auto-join
if (joinDocId) {
  sync.join(joinDocId as any).then(() => {
    document.getElementById('doc-id-display')!.textContent = `docId: ${joinDocId}`;
    setStatus('ops-status', true);
    renderOps();
  });
} else {
  sync.create().then((docId) => {
    document.getElementById('doc-id-display')!.textContent = `docId: ${docId}`;
    setStatus('ops-status', true);
    const url = new URL(window.location.href);
    url.searchParams.set('docId', docId as string);
    window.history.replaceState({}, '', url.toString());
    renderOps();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESENCE — PartySocket (real reconnecting WebSocket)
// ═══════════════════════════════════════════════════════════════════════════════

const presenceReceived: any[] = [];
const presenceSocket = new PartySocket({
  host: 'localhost:1999',
  party: 'presence',
  room,
});

presenceSocket.addEventListener('open', () => {
  setStatus('presence-status', true);
  log('presence-log', 'connected');
});
presenceSocket.addEventListener('close', () => setStatus('presence-status', false));
presenceSocket.addEventListener('message', (e) => {
  const data = JSON.parse(e.data);
  presenceReceived.push(data);
  const el = document.getElementById('presence-messages')!;
  const div = document.createElement('div');
  div.className = 'msg';
  div.textContent = `cursor: (${data.x}, ${data.y}) from ${data.actorId}`;
  div.setAttribute('data-from', data.actorId);
  el.prepend(div);
  el.setAttribute('data-msg-count', String(presenceReceived.length));
  log('presence-log', `received cursor from ${data.actorId}`);
});

function sendCursor(x: number, y: number) {
  presenceSocket.send(JSON.stringify({ actorId, x, y }));
  log('presence-log', `sent cursor (${x}, ${y})`);
}

document.getElementById('btn-send-cursor')!.onclick = () => {
  const x = parseInt((document.getElementById('cursor-x') as HTMLInputElement).value);
  const y = parseInt((document.getElementById('cursor-y') as HTMLInputElement).value);
  sendCursor(x, y);
};

// ═══════════════════════════════════════════════════════════════════════════════
// PUBSUB — PartySocket with topic filtering
// ═══════════════════════════════════════════════════════════════════════════════

const pubsubReceived: any[] = [];
const defaultTopic = (params.get('topic') ?? 'updates');
const pubsubSocket = new PartySocket({
  host: 'localhost:1999',
  party: 'pub-sub',
  room,
  query: { topics: defaultTopic },
});

pubsubSocket.addEventListener('open', () => {
  setStatus('pubsub-status', true);
  log('pubsub-log', `connected, subscribed to: ${defaultTopic}`);
});
pubsubSocket.addEventListener('close', () => setStatus('pubsub-status', false));
pubsubSocket.addEventListener('message', (e) => {
  const data = JSON.parse(e.data);
  pubsubReceived.push(data);
  const el = document.getElementById('pubsub-messages')!;
  const div = document.createElement('div');
  div.className = 'msg';
  div.textContent = `[${data.topic}] ${JSON.stringify(data.data)}`;
  el.prepend(div);
  el.setAttribute('data-msg-count', String(pubsubReceived.length));
  log('pubsub-log', `received on topic: ${data.topic}`);
});

function publishTopic(topic: string, data: any) {
  pubsubSocket.send(JSON.stringify({ topic, data }));
  log('pubsub-log', `published to ${topic}`);
}

document.getElementById('btn-publish')!.onclick = () => {
  const topic = (document.getElementById('pubsub-topic') as HTMLInputElement).value;
  const data = (document.getElementById('pubsub-data') as HTMLInputElement).value;
  publishTopic(topic, { text: data, from: actorId });
};

// ═══════════════════════════════════════════════════════════════════════════════
// RPC — PartySocket + manual JSON-RPC (partyfn RPCClient needs browser WebSocket)
// ═══════════════════════════════════════════════════════════════════════════════

const rpcResults: any[] = [];
const rpcSocket = new PartySocket({
  host: 'localhost:1999',
  party: 'rpc',
  room,
});

const rpcPending = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void }>();

rpcSocket.addEventListener('open', () => {
  setStatus('rpc-status', true);
  log('rpc-log', 'connected');
});
rpcSocket.addEventListener('close', () => setStatus('rpc-status', false));
rpcSocket.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.rpc && msg.id) {
    const pending = rpcPending.get(msg.id);
    if (pending) {
      rpcPending.delete(msg.id);
      if (msg.type === 'success') pending.resolve(msg.result);
      else pending.reject(new Error(msg.error));
    }
  }
});

async function rpcCall(action: string, args: any = {}): Promise<any> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return new Promise((resolve, reject) => {
    rpcPending.set(id, { resolve, reject });
    setTimeout(() => { rpcPending.delete(id); reject(new Error('timeout')); }, 5000);
    rpcSocket.send(JSON.stringify({ rpc: true, action, args, id, channel: 'default' }));
    log('rpc-log', `call: ${action}`);
  }).then((result) => {
    rpcResults.push({ action, result });
    const el = document.getElementById('rpc-results')!;
    const div = document.createElement('div');
    div.className = 'msg';
    div.textContent = `${action} → ${JSON.stringify(result)}`;
    el.prepend(div);
    el.setAttribute('data-result-count', String(rpcResults.length));
    log('rpc-log', `result: ${JSON.stringify(result)}`);
    return result;
  });
}

document.getElementById('btn-rpc-echo')!.onclick = () => rpcCall('echo', { hello: 'world' });
document.getElementById('btn-rpc-add')!.onclick = () => rpcCall('add', { a: 3, b: 7 });
document.getElementById('btn-rpc-greet')!.onclick = () => rpcCall('greet', { name: actorId });

// ── Expose to Playwright ─────────────────────────────────────────────────────

window.sync = sync;
window.getOps = () => sync.getOps();
window.getReplayOps = () => sync.getReplayOps();
window.addTestOp = addTestOp;
window.undoLast = undoLast;
window.redoLast = redoLast;
window.presenceSocket = presenceSocket;
window.pubsubSocket = pubsubSocket;
window.rpcSocket = rpcSocket;
window.presenceReceived = presenceReceived;
window.pubsubReceived = pubsubReceived;
window.rpcResults = rpcResults;
window.sendCursor = sendCursor;
window.publishTopic = publishTopic;
window.rpcCall = rpcCall;
