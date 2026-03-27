/**
 * adapters.ts — Concrete adapter implementations for SyncClient.
 *
 * Production (browser):
 *   IdbStorageAdapter      — IndexedDB
 *   HttpSseNetworkAdapter  — fetch + EventSource
 *
 * Production (server):
 *   Implement SyncStorageAdapter against your storage backend (R2, S3, etc.)
 *
 * Tests (all environments):
 *   MemoryStorageAdapter   — Map<string, Uint8Array>
 *   DirectNetworkAdapter   — function call, no HTTP
 *
 * Import only the adapters you need — tree-shaking handles the rest.
 */

import type { SyncStorageAdapter, SyncNetworkAdapter, SyncClient, PresenceState } from './sync-client';

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
// postSync accepts an injected fetchFn to keep adapters.ts platform-agnostic.
// The consuming system provides the fetch implementation with its own URL pattern.
//
// onRemoteChange: no-op — the external SSE owner triggers syncs directly.

export type SyncFetchFn = (
  modelId: string,
  bytes: Uint8Array,
  actorId: string,
) => Promise<Uint8Array | null>;

/**
 * Create a fetch-based SyncFetchFn for a given base URL.
 * URL pattern: `${baseUrl}/models/${modelId}/sync?actorId=${actorId}`
 *
 * Usage:
 *   const fetchFn = makeSyncFetch('/api');           // → /api/models/:id/sync
 *   const fetchFn = makeSyncFetch('https://my.app'); // → https://my.app/models/:id/sync
 */
export function makeSyncFetch(baseUrl: string): SyncFetchFn {
  return async (modelId, bytes, actorId) => {
    try {
      const url = `${baseUrl}/models/${encodeURIComponent(modelId)}/sync?actorId=${encodeURIComponent(actorId)}`;
      const resp = await fetch(url, {
        method: 'POST',
        body: bytes.buffer as ArrayBuffer,
        headers: { 'content-type': 'application/octet-stream' },
      });
      if (!resp.ok) return null;
      return new Uint8Array(await resp.arrayBuffer());
    } catch {
      return null;
    }
  };
}

export class NullNetworkAdapter implements SyncNetworkAdapter {
  constructor(private readonly _fetch: SyncFetchFn) {}

  async postSync(modelId: string, bytes: Uint8Array, actorId: string): Promise<Uint8Array | null> {
    return this._fetch(modelId, bytes, actorId);
  }
  onRemoteChange(_modelId: string, _callback: () => void): void {
    // SSE-triggered syncs are driven externally by worker-relay.ts
  }
  disconnect(): void {}
}

// ── IDB type stubs (browser globals not available in CF Workers tsconfig) ────
// IdbStorageAdapter only runs in a browser. These stubs satisfy tsc when
// adapters.ts is compiled under a non-dom tsconfig (e.g. sync test worker).
/* eslint-disable @typescript-eslint/no-explicit-any */
type IDBDatabase = any;
type IDBOpenDBRequest = any;
declare const indexedDB: { open(name: string, version: number): IDBOpenDBRequest };
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── IDB (browser production) ──────────────────────────────────────────────────
//
// IdbStorageAdapter accepts an injected openDb function so the caller controls
// which database and version is opened. The consuming app can provide a shared
// opener that creates additional stores (e.g. metadata) in a single
// onupgradeneeded handler.
//
// Default: a standalone opener that creates only 'docs' — suitable for tests
// and simple integrations.

const _DEFAULT_STORE = 'docs';

function _defaultOpenIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('plat-sync', 2);
    req.onupgradeneeded = (e: Event) => {
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
 *   new IdbStorageAdapter('docs', mySharedOpenDb)
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
 * postSync → delegates to the injected SyncFetchFn (use makeSyncFetch to create one).
 * onRemoteChange → listens for `doc-changed` on the existing SSE stream.
 *
 * The SSE stream is provided externally (the consuming app owns EventSource lifecycle).
 * Register the doc-changed handler via registerDocChangedSource().
 *
 * Usage:
 *   new HttpSseNetworkAdapter(makeSyncFetch('/api'))
 */
export class HttpSseNetworkAdapter implements SyncNetworkAdapter {
  private _handlers = new Map<string, (() => void)[]>();

  constructor(private readonly _fetch: SyncFetchFn) {}

  /** Register the SSE EventSource's doc-changed event here. */
  registerDocChangedSource(eventSource: EventTarget): void {
    eventSource.addEventListener('doc-changed', () => {
      for (const cbs of this._handlers.values()) {
        for (const cb of cbs) cb();
      }
    });
  }

  async postSync(modelId: string, bytes: Uint8Array, actorId: string): Promise<Uint8Array | null> {
    return this._fetch(modelId, bytes, actorId);
  }

  onRemoteChange(modelId: string, callback: () => void): void {
    const list = this._handlers.get(modelId) ?? [];
    list.push(callback);
    this._handlers.set(modelId, list);
  }

  disconnect(): void {
    this._handlers.clear();
  }
}

// ── SSE Relay (G13) ─────────────────────────────────────────────────────────

export interface SyncRelayOptions {
  /** SSE endpoint URL. Consumer provides the full URL including modelId/actorId. */
  eventsUrl: string;
  /** Reconnect delay in ms after SSE error. Default: 5000 */
  reconnectMs?: number;
}

/**
 * SyncRelay — reusable SSE connection manager for sync.
 *
 * Owns the EventSource lifecycle: connect, reconnect, parse events,
 * and drive SyncClient accordingly. Extracted from truck's worker-relay.ts
 * so any consuming system can use it.
 *
 * Handles these SSE event types:
 *   - `doc-changed` → triggers syncWithServer() on the SyncClient
 *   - `sync-op` → applies a single op via SyncClient.addOp()
 *   - `presence` → updates remote presence via SyncClient.updateRemotePresence()
 *
 * Usage:
 *   const relay = new SyncRelay(client, {
 *     eventsUrl: `/api/models/${modelId}/events?actorId=${actorId}`,
 *   });
 *   relay.connect();
 *   // later: relay.disconnect();
 */
export class SyncRelay {
  private _es: EventSource | null = null;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly _reconnectMs: number;

  constructor(
    private readonly _client: SyncClient,
    private readonly _opts: SyncRelayOptions,
  ) {
    this._reconnectMs = _opts.reconnectMs ?? 5000;
  }

  connect(): void {
    if (this._es) return;
    this._es = new EventSource(this._opts.eventsUrl);

    this._es.addEventListener('doc-changed', () => {
      this._client.syncWithServer();
    });

    this._es.addEventListener('sync-op', (e: MessageEvent) => {
      try {
        const op = JSON.parse(e.data);
        this._client.addOp(op);
      } catch { /* ignore malformed */ }
    });

    this._es.addEventListener('presence', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (Array.isArray(data.actors)) {
          for (const actor of data.actors as PresenceState[]) {
            this._client.updateRemotePresence(actor);
          }
        }
      } catch { /* ignore malformed */ }
    });

    this._es.onopen = () => {
      // Sync on connect to catch up with any missed changes
      this._client.syncWithServer();
    };

    this._es.onerror = () => {
      this.disconnect();
      this._reconnectTimer = setTimeout(() => {
        this._reconnectTimer = null;
        this.connect();
      }, this._reconnectMs);
    };
  }

  disconnect(): void {
    if (this._es) {
      this._es.close();
      this._es = null;
    }
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  get connected(): boolean {
    return this._es !== null;
  }
}
