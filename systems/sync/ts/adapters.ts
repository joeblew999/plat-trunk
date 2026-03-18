/**
 * adapters.ts — Concrete adapter implementations for SyncClient.
 *
 * Production (browser):
 *   IdbStorageAdapter      — IndexedDB
 *   HttpSseNetworkAdapter  — fetch + EventSource
 *
 * Production (CF worker):
 *   R2DocStore in systems/truck/worker/src/doc-store.ts — SyncClient not used server-side
 *
 * Tests (all environments):
 *   MemoryStorageAdapter   — Map<string, Uint8Array>
 *   DirectNetworkAdapter   — function call, no HTTP
 *
 * Import only the adapters you need — tree-shaking handles the rest.
 */

import type { SyncStorageAdapter, SyncNetworkAdapter } from './sync-client';

// ── Memory (tests) ────────────────────────────────────────────────────────────

/** In-memory storage — no IDB. Use in all test environments. */
export class MemoryStorageAdapter implements SyncStorageAdapter {
  private docs = new Map<string, Uint8Array>();

  async save(modelId: string, bytes: Uint8Array): Promise<void> {
    this.docs.set(modelId, new Uint8Array(bytes));
  }
  async load(modelId: string): Promise<Uint8Array | null> {
    return this.docs.get(modelId) ?? null;
  }
  async delete(modelId: string): Promise<void> {
    this.docs.delete(modelId);
  }
  /** Test helper — inspect stored bytes directly */
  peek(modelId: string): Uint8Array | null {
    return this.docs.get(modelId) ?? null;
  }
}

/**
 * Direct network — no HTTP, no SSE.
 * The "server" is a function you inject. Use in all test environments.
 *
 * Usage:
 *   const server = new MemoryStorageAdapter();
 *   const netA = new DirectNetworkAdapter((bytes) => serverSync(server, bytes, wasm));
 *   const netB = new DirectNetworkAdapter((bytes) => serverSync(server, bytes, wasm));
 *   netA.triggerRemoteChange('model-1'); // simulate SSE from B→A
 */
export class DirectNetworkAdapter implements SyncNetworkAdapter {
  private handlers = new Map<string, (() => void)[]>();

  constructor(
    private readonly _postSync: (
      modelId: string,
      bytes: Uint8Array,
      actorId: string,
    ) => Promise<Uint8Array | null>,
  ) {}

  async postSync(modelId: string, bytes: Uint8Array, actorId: string): Promise<Uint8Array | null> {
    return this._postSync(modelId, bytes, actorId);
  }

  onRemoteChange(modelId: string, callback: () => void): void {
    const list = this.handlers.get(modelId) ?? [];
    list.push(callback);
    this.handlers.set(modelId, list);
  }

  /** Call this in tests to simulate a remote actor changing the doc. */
  triggerRemoteChange(modelId: string): void {
    for (const cb of this.handlers.get(modelId) ?? []) cb();
  }

  disconnect(): void {
    this.handlers.clear();
  }
}

// ── Null network (browser with external SSE owner) ───────────────────────────
//
// Use when the SSE connection is owned externally (e.g. worker-relay.ts) and
// SyncClient.syncWithServer() is called directly rather than via the adapter.
//
// postSync accepts an injected fetchFn to keep adapters.ts platform-agnostic
// (cannot import truck's api-client.ts — that would make sync depend on truck).
// In the browser, history-domain.ts injects a typed wrapper over api-client.ts.
//
// onRemoteChange: no-op — the external SSE owner triggers syncs directly.

export type SyncFetchFn = (
  modelId: string,
  bytes: Uint8Array,
  actorId: string,
) => Promise<Uint8Array | null>;

/** Default fetch implementation — raw fetch with the standard sync endpoint URL. */
export async function defaultSyncFetch(
  modelId: string,
  bytes: Uint8Array,
  actorId: string,
): Promise<Uint8Array | null> {
  try {
    const resp = await fetch(`/api/models/${modelId}/sync?actorId=${actorId}`, {
      method: 'POST',
      body: bytes.buffer as ArrayBuffer,
      headers: { 'content-type': 'application/octet-stream' },
    });
    if (!resp.ok) return null;
    return new Uint8Array(await resp.arrayBuffer());
  } catch {
    return null;
  }
}

export class NullNetworkAdapter implements SyncNetworkAdapter {
  constructor(private readonly _fetch: SyncFetchFn = defaultSyncFetch) {}

  async postSync(modelId: string, bytes: Uint8Array, actorId: string): Promise<Uint8Array | null> {
    return this._fetch(modelId, bytes, actorId);
  }
  onRemoteChange(_modelId: string, _callback: () => void): void {
    // SSE-triggered syncs are driven externally by worker-relay.ts
  }
  disconnect(): void {}
}

// ── IDB (browser production) ──────────────────────────────────────────────────
//
// IdbStorageAdapter accepts an injected openDb function so the caller controls
// which database and version is opened. In the browser this must be the shared
// openCadSyncDb() from systems/truck/web/idb.ts — which creates BOTH the 'docs'
// and 'meta' stores in a single onupgradeneeded handler.
//
// Default: a standalone opener that creates only 'docs' — suitable for tests
// and environments where doc-store.ts metadata is not needed.

const _DEFAULT_STORE = 'docs';

function _defaultOpenIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('cad-sync', 2);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(_DEFAULT_STORE)) db.createObjectStore(_DEFAULT_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * IndexedDB storage — browser production.
 *
 * Usage in browser (inject shared opener to avoid split-version bug):
 *   import { openCadSyncDb } from '../truck/web/idb';
 *   new IdbStorageAdapter('docs', openCadSyncDb)
 *
 * Usage in tests (standalone, no shared opener needed):
 *   new IdbStorageAdapter()
 */
export class IdbStorageAdapter implements SyncStorageAdapter {
  private readonly _storeName: string;
  private readonly _openDb: () => Promise<IDBDatabase>;

  constructor(
    storeName = _DEFAULT_STORE,
    openDb: () => Promise<IDBDatabase> = _defaultOpenIdb,
  ) {
    this._storeName = storeName;
    this._openDb = openDb;
  }

  async save(modelId: string, bytes: Uint8Array): Promise<void> {
    const db = await this._openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this._storeName, 'readwrite');
      tx.objectStore(this._storeName).put(bytes, modelId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async load(modelId: string): Promise<Uint8Array | null> {
    const db = await this._openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this._storeName, 'readonly');
      const req = tx.objectStore(this._storeName).get(modelId);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async delete(modelId: string): Promise<void> {
    const db = await this._openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this._storeName, 'readwrite');
      tx.objectStore(this._storeName).delete(modelId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// ── HTTP + SSE (browser production) ──────────────────────────────────────────

/**
 * HTTP fetch + EventSource network adapter — browser production.
 *
 * postSync → POST /api/models/:id/sync
 * onRemoteChange → listens for `doc-changed` on the existing SSE stream.
 *
 * The SSE stream is provided externally (worker-relay owns EventSource lifecycle).
 * Register the doc-changed handler via registerDocChangedSource().
 */
export class HttpSseNetworkAdapter implements SyncNetworkAdapter {
  private _handlers = new Map<string, (() => void)[]>();
  private _connected = false;

  /** Register the SSE EventSource's doc-changed event here. */
  registerDocChangedSource(eventSource: EventTarget): void {
    eventSource.addEventListener('doc-changed', () => {
      for (const cbs of this._handlers.values()) {
        for (const cb of cbs) cb();
      }
    });
    this._connected = true;
  }

  async postSync(modelId: string, bytes: Uint8Array, actorId: string): Promise<Uint8Array | null> {
    try {
      const resp = await fetch(`/api/models/${modelId}/sync?actorId=${actorId}`, {
        method: 'POST',
        body: bytes.buffer as ArrayBuffer,
        headers: { 'content-type': 'application/octet-stream' },
      });
      if (!resp.ok) return null;
      return new Uint8Array(await resp.arrayBuffer());
    } catch {
      return null;
    }
  }

  onRemoteChange(modelId: string, callback: () => void): void {
    const list = this._handlers.get(modelId) ?? [];
    list.push(callback);
    this._handlers.set(modelId, list);
  }

  disconnect(): void {
    this._handlers.clear();
    this._connected = false;
  }
}
