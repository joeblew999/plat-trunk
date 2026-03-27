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

// R2-compatible interface (matches Cloudflare R2Bucket)
interface R2Like {
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
  put(key: string, value: ArrayBuffer | Uint8Array): Promise<unknown>;
  delete(key: string): Promise<unknown>;
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
