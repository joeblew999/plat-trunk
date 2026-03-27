/**
 * SyncDoc E2E test GUI.
 *
 * Minimal browser app for Playwright testing.
 * Creates/joins a SyncDoc, shows ops, supports add/undo/redo.
 *
 * URL params:
 *   ?room=my-room    — room name (default: random)
 *   ?actor=user-1    — actor ID (default: random)
 *   ?docId=abc123    — join existing doc instead of creating
 */

import { next as Automerge } from '@automerge/automerge';
import { SyncDoc } from '../../ts/partykit/sync-doc.ts';
import type { Operation } from '../../ts/shared/types.ts';

// Automerge requires WASM init in the browser before any doc operations
await (Automerge as any).initializeWasm?.();

const params = new URLSearchParams(window.location.search);
const room = params.get('room') ?? `e2e-${Date.now()}`;
const actorId = params.get('actor') ?? `actor-${Math.random().toString(36).slice(2, 6)}`;
const joinDocId = params.get('docId');

// Expose to Playwright
declare global {
  interface Window {
    sync: SyncDoc;
    getOps: () => Operation[];
    getReplayOps: () => Operation[];
    addTestOp: (type?: string) => Operation;
    undoLast: () => void;
    redoLast: () => void;
  }
}

const statusEl = document.getElementById('status')!;
const actorEl = document.getElementById('actor-id')!;
const docIdEl = document.getElementById('doc-id')!;
const opsListEl = document.getElementById('ops-list')!;
const logEl = document.getElementById('log')!;

function log(msg: string) {
  const line = document.createElement('div');
  line.textContent = `[${new Date().toISOString().slice(11, 23)}] ${msg}`;
  logEl.prepend(line);
}

function renderOps() {
  const ops = sync.getOps();
  opsListEl.innerHTML = ops.map((op) =>
    `<div class="op ${op.enabled ? '' : 'disabled'}" data-op-id="${op.id}">` +
    `${op.type} (${op.actorId}) [${op.enabled ? 'ON' : 'OFF'}] ${op.id.slice(0, 8)}` +
    `</div>`
  ).join('');
  // Set data attributes for Playwright
  opsListEl.setAttribute('data-op-count', String(ops.length));
  opsListEl.setAttribute('data-replay-count', String(sync.getReplayOps().length));
}

let opCounter = 0;

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
  log(`addOp: ${op.type} ${op.id.slice(0, 8)}`);
  renderOps();
  return op;
}

function undoLast() {
  const ops = sync.getOps().filter(o => o.enabled && o.actorId === actorId);
  if (ops.length === 0) return;
  const last = ops[ops.length - 1];
  sync.undo(last.id);
  log(`undo: ${last.id.slice(0, 8)}`);
  renderOps();
}

function redoLast() {
  const ops = sync.getOps().filter(o => !o.enabled && o.actorId === actorId);
  if (ops.length === 0) return;
  const first = ops[0];
  sync.redo(first.id);
  log(`redo: ${first.id.slice(0, 8)}`);
  renderOps();
}

// Create SyncDoc
const sync = new SyncDoc({
  host: 'localhost:1999',
  room,
  actorId,
  protocol: 'ws',
});

// On remote changes, re-render
sync.onRemoteOps = (ops) => {
  log(`remote: ${ops.length} replay ops`);
  renderOps();
};

// Wire buttons
document.getElementById('btn-create')!.onclick = async () => {
  const docId = await sync.create();
  docIdEl.textContent = `docId: ${docId}`;
  statusEl.textContent = 'connected';
  statusEl.className = 'status connected';
  log(`created doc: ${docId}`);
  renderOps();
};

document.getElementById('btn-join')!.onclick = async () => {
  const id = (document.getElementById('join-id') as HTMLInputElement).value || joinDocId;
  if (!id) return;
  await sync.join(id as any);
  docIdEl.textContent = `docId: ${id}`;
  statusEl.textContent = 'connected';
  statusEl.className = 'status connected';
  log(`joined doc: ${id}`);
  renderOps();
};

document.getElementById('btn-add-op')!.onclick = () => addTestOp();
document.getElementById('btn-undo-last')!.onclick = () => undoLast();
document.getElementById('btn-redo-last')!.onclick = () => redoLast();

// Show actor
actorEl.textContent = ` ${actorId}`;

// Expose to Playwright
window.sync = sync;
window.getOps = () => sync.getOps();
window.getReplayOps = () => sync.getReplayOps();
window.addTestOp = addTestOp;
window.undoLast = undoLast;
window.redoLast = redoLast;

// Auto-create or auto-join from URL params
if (joinDocId) {
  sync.join(joinDocId as any).then(() => {
    docIdEl.textContent = `docId: ${joinDocId}`;
    statusEl.textContent = 'connected';
    statusEl.className = 'status connected';
    log(`auto-joined: ${joinDocId}`);
    renderOps();
  });
} else {
  sync.create().then((docId) => {
    docIdEl.textContent = `docId: ${docId}`;
    statusEl.textContent = 'connected';
    statusEl.className = 'status connected';
    log(`auto-created: ${docId}`);
    // Push docId into URL for Playwright to read
    const url = new URL(window.location.href);
    url.searchParams.set('docId', docId as string);
    window.history.replaceState({}, '', url.toString());
    renderOps();
  });
}
