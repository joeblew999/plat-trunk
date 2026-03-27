/**
 * main.ts — Sync Protocol Debugger.
 *
 * Tests the real stack: IDB + HTTP (wrangler+R2) + BroadcastChannel.
 * Imports from @plat/sync/* — same boundary external consumers use.
 */

import { SyncClient } from '@plat/sync/client';
import type { Operation, PresenceState } from '@plat/sync/client';
import { IdbStorageAdapter, NullNetworkAdapter, makeSyncFetch } from '@plat/sync/adapters';
import type { SyncWasmAdapter } from '@plat/sync/wasm-adapter';

// ── WASM (loaded from pkg/web/ — the browser target) ────────────────────────

async function loadWasm(): Promise<SyncWasmAdapter> {
  // Vite resolves this via fs.allow on SYNC_ROOT
  const mod = await import('../../pkg/web/plat_sync.js');
  await mod.default();
  return {
    create_doc: () => Promise.resolve(mod.create_doc()),
    apply_op: (doc: Uint8Array, j: string) => Promise.resolve(mod.apply_op(doc, j)),
    merge_docs: (a: Uint8Array, b: Uint8Array) => Promise.resolve(mod.merge_docs(a, b)),
    get_ops: (doc: Uint8Array) => Promise.resolve(mod.get_ops(doc)),
    get_op_count: (doc: Uint8Array) => Promise.resolve(mod.get_op_count(doc)),
    set_op_enabled: (doc: Uint8Array, id: string, e: boolean) => Promise.resolve(mod.set_op_enabled(doc, id, e)),
    set_group_enabled: (doc: Uint8Array, id: string, e: boolean) => Promise.resolve(mod.set_group_enabled(doc, id, e)),
    rollback_to: (doc: Uint8Array, a: string, i: number) => Promise.resolve(mod.rollback_to(doc, a, i)),
    get_replay_ops: (doc: Uint8Array) => Promise.resolve(mod.get_replay_ops(doc)),
    get_name: (doc: Uint8Array) => Promise.resolve(mod.get_name(doc)),
    set_name: (doc: Uint8Array, n: string) => Promise.resolve(mod.set_name(doc, n)),
    doc_hash: (doc: Uint8Array) => Promise.resolve(mod.doc_hash(doc)),
  };
}

// ── Config ───────────────────────────────────────────────────────────────────

const params = new URLSearchParams(location.search);
const MODEL_ID = params.get('model') || 'test-model';
const INITIAL_ACTORS = parseInt(params.get('actors') || '2', 10);
const RESET = params.get('reset') === '1';

const ACTOR_COLORS = ['#4285f4', '#ea4335', '#34a853', '#fbbc04', '#9c27b0', '#ff6d00'];

// ── State ────────────────────────────────────────────────────────────────────

interface ActorState {
  id: string; name: string; color: string; client: SyncClient;
  ops: Operation[]; opCount: number; docSize: number; online: boolean; opCounter: number;
}

interface LogEntry {
  ts: number; actorId: string; actorName: string; color: string;
  event: string; detail: Record<string, unknown>;
}

const actors: ActorState[] = [];
const log: LogEntry[] = [];
let wasm: SyncWasmAdapter;

declare global {
  interface Window {
    __actors: ActorState[];
    __log: LogEntry[];
    __sync: SyncClient;
    __state: ActorState;
  }
}

// ── Actor management ─────────────────────────────────────────────────────────

async function createActor(index: number): Promise<ActorState> {
  const id = `actor-${String.fromCharCode(65 + index)}`;
  const color = ACTOR_COLORS[index % ACTOR_COLORS.length];

  // Real IDB — separate database per actor (simulates different browsers)
  const idbName = `plat-sync-test-${id}`;
  const storage = new IdbStorageAdapter('docs', () =>
    new Promise((resolve, reject) => {
      const req = indexedDB.open(idbName, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('docs')) req.result.createObjectStore('docs');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    })
  );

  // Real HTTP — POST /api/models/:id/sync → wrangler worker + R2
  const network = new NullNetworkAdapter(makeSyncFetch('/api'));

  const client = new SyncClient(wasm, storage, network, {
    actorId: id, debounceMs: 99999, maxRetries: 3, retryBaseMs: 100,
  });

  const state: ActorState = {
    id, name: id, color, client,
    ops: [], opCount: 0, docSize: 0, online: true, opCounter: 0,
  };

  // Pipe sync log → unified log
  const origLog = client.syncLog;
  setInterval(() => {
    while (origLog.length > 0) {
      const e = origLog.shift()!;
      log.push({ ts: e.ts, actorId: id, actorName: id, color, event: e.event, detail: e.detail });
    }
    renderLog();
  }, 100);

  client.onRemoteOps = () => refreshActor(state);
  client.onSyncComplete = () => refreshActor(state);

  if (RESET) await storage.delete(MODEL_ID);

  const found = await client.loadAndSync(MODEL_ID);
  if (!found) { await client.createDoc(MODEL_ID); await client.saveToStorage(); }

  client.openBroadcast(`sync-debug:${MODEL_ID}`);
  actors.push(state);
  return state;
}

async function refreshActor(a: ActorState) {
  a.ops = await a.client.getOps();
  a.opCount = await a.client.getOpCount();
  a.docSize = a.client.docSize;
  a.online = a.client.isOnline;
  renderActor(a);
}

// ── Rendering ────────────────────────────────────────────────────────────────

const $ = (id: string) => document.getElementById(id)!;

function renderActorCard(a: ActorState): string {
  const opsHtml = a.ops.length
    ? a.ops.map((o, i) => `<span class="op-chip ${o.enabled ? 'op-enabled' : 'op-disabled'}" data-actor="${a.id}" data-op-id="${o.id}">${i}: ${o.type.replace('test_op_', '#')}</span>`).join(' ')
    : '<span style="color:#999">no ops</span>';
  return `
    <div class="actor-card${a.online ? '' : ' offline'}" id="card-${a.id}" data-testid="actor-${a.id}">
      <div class="actor-header"><span><span class="actor-color" style="background:${a.color}"></span><span class="actor-name">${a.name}</span></span><span class="badge ${a.online ? 'online' : 'offline'}">${a.online ? 'online' : 'offline'}</span></div>
      <div class="actor-stats">ops: ${a.opCount} | doc: ${a.docSize}B</div>
      <div class="actor-buttons">
        <button data-action="add-op" data-actor="${a.id}" data-testid="${a.id}-add-op">+ Op</button>
        <button data-action="undo" data-actor="${a.id}" data-testid="${a.id}-undo">Undo</button>
        <button data-action="redo" data-actor="${a.id}" data-testid="${a.id}-redo">Redo</button>
        <button data-action="sync" data-actor="${a.id}" data-testid="${a.id}-sync" ${a.online ? '' : 'disabled'}>Sync</button>
        <button data-action="toggle-net" data-actor="${a.id}" data-testid="${a.id}-toggle-net">${a.online ? 'Go Offline' : 'Go Online'}</button>
        <button data-action="presence" data-actor="${a.id}" data-testid="${a.id}-presence">Presence</button>
      </div>
      <div class="ops-list" data-testid="${a.id}-ops">${opsHtml}</div>
    </div>`;
}

function renderActor(a: ActorState) {
  const el = document.getElementById(`card-${a.id}`);
  if (el) { const t = document.createElement('div'); t.innerHTML = renderActorCard(a); el.replaceWith(t.firstElementChild!); }
  renderPresence();
  if (actors[0] === a) window.__state = a;
}

function renderAllActors() {
  $('actors-grid').innerHTML = actors.map(renderActorCard).join('');
  $('actor-count').textContent = String(actors.length);
  renderPresence();
}

function renderPresence() {
  const unique = new Map<string, PresenceState>();
  for (const a of actors) for (const p of a.client.getPresence()) unique.set(p.actorId, p);
  $('presence-bar').innerHTML = unique.size
    ? Array.from(unique.values()).map(p => { const c = actors.find(a => a.id === p.actorId)?.color || '#999'; return `<span class="presence-dot"><span class="actor-color" style="background:${c}"></span>${p.name || p.actorId}</span>`; }).join('')
    : 'No presence';
}

function renderLog() {
  const f = ($('log-filter') as HTMLInputElement).value.toLowerCase();
  const entries = (f ? log.filter(e => e.actorName.includes(f) || e.event.includes(f)) : log).slice(-100);
  $('log-entries').innerHTML = entries.map(e => {
    const ts = new Date(e.ts).toISOString().slice(11, 23);
    const d = JSON.stringify(e.detail);
    return `<div class="log-entry${e.event === 'merge' && e.detail.hadNewOps ? ' had-new-ops' : ''}"><span class="log-ts">${ts}</span><span class="log-actor" style="color:${e.color}">${e.actorName}</span><span class="log-event">${e.event}</span><span class="log-detail" title="${d.replace(/"/g, '&quot;')}">${d}</span></div>`;
  }).join('');
  $('log-entries').scrollTop = $('log-entries').scrollHeight;
}

// ── Events ───────────────────────────────────────────────────────────────────

document.addEventListener('click', async (e) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) {
    const chip = (e.target as HTMLElement).closest('.op-chip') as HTMLElement | null;
    if (chip) {
      const a = actors.find(x => x.id === chip.dataset.actor);
      const op = a?.ops.find(o => o.id === chip.dataset.opId);
      if (a && op) { await a.client.setOpEnabled(op.id, !op.enabled); await refreshActor(a); }
    }
    return;
  }
  const action = btn.dataset.action, actorId = btn.dataset.actor;
  if (action && actorId) {
    const a = actors.find(x => x.id === actorId);
    if (!a) return;
    switch (action) {
      case 'add-op': {
        a.opCounter++;
        await a.client.addOp({ id: crypto.randomUUID(), type: `test_op_${a.opCounter}`, params: { index: a.opCounter }, enabled: true, timestamp: Date.now(), actorId: a.id, groupId: null });
        await refreshActor(a); break;
      }
      case 'undo': { const ops = await a.client.getOps(); for (let i = ops.length - 1; i >= 0; i--) if (ops[i].actorId === a.id && ops[i].enabled) { await a.client.setOpEnabled(ops[i].id, false); break; } await refreshActor(a); break; }
      case 'redo': { const ops = await a.client.getOps(); for (let i = ops.length - 1; i >= 0; i--) if (ops[i].actorId === a.id && !ops[i].enabled) { await a.client.setOpEnabled(ops[i].id, true); break; } await refreshActor(a); break; }
      case 'sync': await a.client.syncWithServer(); await refreshActor(a); for (const x of actors) if (x !== a) await refreshActor(x); break;
      case 'toggle-net': if (a.online) a.client.goOffline(); else a.client.goOnline(); await refreshActor(a); break;
      case 'presence': a.client.setPresence({ name: a.name, cursor: { x: Math.random() * 100 | 0, y: Math.random() * 100 | 0 } }); renderPresence(); break;
    }
    return;
  }
  if (btn.id === 'btn-add-actor') { await createActor(actors.length); renderAllActors(); }
  else if (btn.id === 'btn-reset') {
    for (const a of actors) await a.client.reset(MODEL_ID);
    try { await fetch(`/api/models/${MODEL_ID}`, { method: 'DELETE' }); } catch {}
    actors.length = 0; log.length = 0;
    for (let i = 0; i < INITIAL_ACTORS; i++) await createActor(i);
    renderAllActors(); renderLog();
  }
  else if (btn.id === 'btn-export-log') { const b = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `sync-log-${Date.now()}.json`; a.click(); URL.revokeObjectURL(u); }
  else if (btn.id === 'btn-clear-log') { log.length = 0; renderLog(); }
});
$('log-filter')?.addEventListener('input', () => renderLog());

// ── Boot ─────────────────────────────────────────────────────────────────────

async function boot() {
  wasm = await loadWasm();
  for (let i = 0; i < INITIAL_ACTORS; i++) await createActor(i);
  window.__actors = actors as any; window.__log = log;
  window.__sync = actors[0]?.client; window.__state = actors[0] as any;
  renderAllActors(); renderLog();
  $('model-id').textContent = MODEL_ID;
  console.log('[sync-debugger] Ready', { modelId: MODEL_ID, actors: actors.length });
}

boot().catch(err => { document.body.innerHTML = `<pre style="color:red">Boot failed:\n${err.stack || err}</pre>`; });
