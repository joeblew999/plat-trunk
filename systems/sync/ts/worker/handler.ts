/**
 * worker.ts — Reusable sync server for Cloudflare Workers.
 *
 * Two exports:
 *   createWasmAdapter(wasmModule, glue) — init WASM, returns SyncWasmAdapter
 *   createSyncHandler(wasm)             — returns HTTP handler (R2 + merge + SSE)
 *
 * Usage (complete CF Worker — 5 lines):
 *
 *   import { createSyncHandler, createWasmAdapter } from '@plat/sync/worker';
 *   import wasmModule from './pkg-sync/plat_sync_bg.wasm';
 *   import * as glue from './pkg-sync/plat_sync_bg.js';
 *
 *   const handler = createSyncHandler(await createWasmAdapter(wasmModule, glue));
 *   export default { fetch: (req, env) => handler(req, env.SYNC_R2, '/api') };
 */

import type { SyncWasmAdapter } from '../shared/wasm-adapter';

// ── WASM adapter factory ─────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Create a SyncWasmAdapter from a WebAssembly.Module and glue JS.
 *
 * In CF Workers, wrangler provides the WASM module via `import wasmModule from '*.wasm'`
 * and the glue JS via `import * as glue from '*_bg.js'`.
 *
 * @param wasmModule — WebAssembly.Module (from `import ... from '*.wasm'`)
 * @param glue — glue JS namespace (from `import * as glue from '*_bg.js'`)
 */
export async function createWasmAdapter(wasmModule: any, glue: any): Promise<SyncWasmAdapter> {
  const imports: Record<string, WebAssembly.ImportValue> = {};
  for (const [k, v] of Object.entries(glue)) {
    if (typeof v === 'function') imports[k] = v as WebAssembly.ImportValue;
  }

  // Find the glue import key — wasm-pack uses './<crate_name>_bg.js'
  // Match any key ending in '_bg.js'
  const bgKey = Object.keys(
    (wasmModule as WebAssembly.Module & { __wasmImports?: Record<string, unknown> }) || {}
  ).find(k => k.endsWith('_bg.js')) || './plat_sync_bg.js';

  const instance = await WebAssembly.instantiate(wasmModule, { [bgKey]: imports });
  glue.__wbg_set_wasm(instance.exports);

  const bg = glue;
  return {
    create_doc: () => Promise.resolve(bg.create_doc()),
    apply_op: (d: Uint8Array, j: string) => Promise.resolve(bg.apply_op(d, j)),
    merge_docs: (a: Uint8Array, b: Uint8Array) => Promise.resolve(bg.merge_docs(a, b)),
    get_ops: (d: Uint8Array) => Promise.resolve(bg.get_ops(d)),
    get_op_count: (d: Uint8Array) => Promise.resolve(bg.get_op_count(d)),
    set_op_enabled: (d: Uint8Array, id: string, e: boolean) => Promise.resolve(bg.set_op_enabled(d, id, e)),
    set_group_enabled: (d: Uint8Array, id: string, e: boolean) => Promise.resolve(bg.set_group_enabled(d, id, e)),
    rollback_to: (d: Uint8Array, a: string, i: number) => Promise.resolve(bg.rollback_to(d, a, i)),
    get_replay_ops: (d: Uint8Array) => Promise.resolve(bg.get_replay_ops(d)),
    get_name: (d: Uint8Array) => Promise.resolve(bg.get_name(d)),
    set_name: (d: Uint8Array, n: string) => Promise.resolve(bg.set_name(d, n)),
    doc_hash: (d: Uint8Array) => Promise.resolve(bg.doc_hash(d)),
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// R2-compatible interface (matches Cloudflare R2Bucket subset)
export interface R2Like {
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; etag: string } | null>;
  put(key: string, value: ArrayBuffer | Uint8Array, options?: Record<string, unknown>): Promise<unknown>;
  delete(key: string): Promise<unknown>;
}

// ── R2DocStore — SyncStorageAdapter for R2 ───────────────────────────────────

import type { SyncStorageAdapter } from '../client/sync-client';

export interface DocWithEtag {
  doc: Uint8Array;
  etag: string;
}

/**
 * R2-backed storage adapter with optimistic concurrency (etag).
 *
 * Usage:
 *   const store = new R2DocStore(env.SYNC_R2);
 *   const client = new SyncClient(wasm, store, network, opts);
 *
 * Or server-side with etag:
 *   const { doc, etag } = await store.loadWithEtag(modelId);
 *   const ok = await store.saveConditional(modelId, merged, etag);
 */
export class R2DocStore implements SyncStorageAdapter {
  constructor(private bucket: R2Like, private prefix = 'models/') {}

  private key(modelId: string): string {
    return `${this.prefix}${modelId}/automerge.bin`;
  }

  async load(modelId: string): Promise<Uint8Array | null> {
    const obj = await this.bucket.get(this.key(modelId));
    if (!obj) return null;
    return new Uint8Array(await obj.arrayBuffer());
  }

  async save(modelId: string, bytes: Uint8Array): Promise<void> {
    await this.bucket.put(this.key(modelId), bytes, {
      httpMetadata: { contentType: 'application/octet-stream' },
    });
  }

  async delete(modelId: string): Promise<void> {
    await this.bucket.delete(this.key(modelId));
  }

  /** Load doc with etag for optimistic concurrency. */
  async loadWithEtag(modelId: string): Promise<DocWithEtag | null> {
    const obj = await this.bucket.get(this.key(modelId));
    if (!obj) return null;
    return { doc: new Uint8Array(await obj.arrayBuffer()), etag: obj.etag };
  }

  /** Save only if etag matches. Returns false on conflict (412). */
  async saveConditional(modelId: string, bytes: Uint8Array, etag: string): Promise<boolean> {
    try {
      await this.bucket.put(this.key(modelId), bytes, {
        httpMetadata: { contentType: 'application/octet-stream' },
        onlyIf: { etagMatches: etag },
      });
      return true;
    } catch {
      return false;
    }
  }
}

// ── SSE state ────────────────────────────────────────────────────────────────

interface SseClient {
  modelId: string;
  actorId: string;
  writer: WritableStreamDefaultWriter;
}

const sseClients: SseClient[] = [];
const encoder = new TextEncoder();

function broadcast(modelId: string, senderActorId: string) {
  const data = JSON.stringify({ modelId, actorId: senderActorId });
  const msg = `event: doc-changed\ndata: ${data}\n\n`;
  for (const client of sseClients) {
    if (client.modelId === modelId && client.actorId !== senderActorId) {
      client.writer.write(encoder.encode(msg)).catch(() => {});
    }
  }
}

// ── CORS ─────────────────────────────────────────────────────────────────────

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── R2 key ───────────────────────────────────────────────────────────────────

function r2Key(modelId: string): string {
  return `models/${modelId}/automerge.bin`;
}

// ── Handler factory ──────────────────────────────────────────────────────────

/**
 * Create a sync HTTP handler.
 *
 * @param wasm — SyncWasmAdapter (must be initialized before first request)
 * @returns async function(request, r2, prefix?) → Response
 */
export function createSyncHandler(wasm: SyncWasmAdapter) {
  return async function handleSync(
    request: Request,
    r2: R2Like,
    prefix = '',
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.slice(prefix.length); // strip prefix

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (path === '/health') {
      return new Response('ok', { headers: CORS });
    }

    // Parse /models/:id/...
    const m = path.match(/^\/models\/([^/]+)(\/.*)?$/);
    if (!m) return new Response('not found', { status: 404, headers: CORS });

    const modelId = decodeURIComponent(m[1]);
    const sub = m[2] || '';
    const actorId = url.searchParams.get('actorId') || 'unknown';

    // ── POST /models/:id/sync ────────────────────────────────────────

    if (request.method === 'POST' && sub === '/sync') {
      const incoming = new Uint8Array(await request.arrayBuffer());

      const obj = await r2.get(r2Key(modelId));
      let merged: Uint8Array;

      if (obj) {
        const existing = new Uint8Array(await obj.arrayBuffer());
        merged = await wasm.merge_docs(existing, incoming);
      } else {
        merged = incoming;
      }

      await r2.put(r2Key(modelId), merged);
      broadcast(modelId, actorId);

      return new Response(merged, {
        headers: { ...CORS, 'Content-Type': 'application/octet-stream' },
      });
    }

    // ── GET /models/:id/events ───────────────────────────────────────

    if (request.method === 'GET' && sub === '/events') {
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      const client: SseClient = { modelId, actorId, writer };
      sseClients.push(client);

      writer.write(encoder.encode(
        `event: connected\ndata: ${JSON.stringify({ modelId, actorId })}\n\n`
      ));

      request.signal.addEventListener('abort', () => {
        const idx = sseClients.indexOf(client);
        if (idx >= 0) sseClients.splice(idx, 1);
        writer.close().catch(() => {});
      });

      return new Response(readable, {
        headers: { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }

    // ── DELETE /models/:id ───────────────────────────────────────────

    if (request.method === 'DELETE' && !sub) {
      await r2.delete(r2Key(modelId));
      return new Response('deleted', { headers: CORS });
    }

    return new Response('not found', { status: 404, headers: CORS });
  };
}
