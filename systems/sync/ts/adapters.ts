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

// ── IDB (browser production) ──────────────────────────────────────────────────

const IDB_NAME = 'cad-sync';
const IDB_STORE = 'docs';

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** IndexedDB storage — browser production. */
export class IdbStorageAdapter implements SyncStorageAdapter {
  async save(modelId: string, bytes: Uint8Array): Promise<void> {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(bytes, modelId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async load(modelId: string): Promise<Uint8Array | null> {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(modelId);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async delete(modelId: string): Promise<void> {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(modelId);
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
