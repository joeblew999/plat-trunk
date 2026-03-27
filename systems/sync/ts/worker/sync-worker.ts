/**
 * sync-worker.ts — Server-side application loop for sync.
 *
 * SyncWorker owns the full server-side protocol:
 *   - Apply op to CRDT doc (receive op → apply → save to R2 → broadcast)
 *   - Handle POST /sync (merge browser doc with R2 doc)
 *   - Handle GET /events (SSE stream)
 *   - Handle DELETE (remove model)
 *   - Execute ops via consumer callback (what the op actually DOES)
 *
 * The consumer provides:
 *   - onExecute(op) — what happens when an op is applied (geometry, data, etc)
 *   - Optionally: onAfterSync(modelId, merged, hadNewOps) — post-sync hook
 *
 * Usage:
 *   import { SyncWorker, createWasmAdapter } from '@plat/sync/worker';
 *
 *   const sync = new SyncWorker(await createWasmAdapter(wasm, glue), env.SYNC_R2, {
 *     onExecute: async (op) => {
 *       // consumer-specific: run the command, return result
 *       return myEngine.execute(op.type, op.params);
 *     },
 *   });
 *
 *   export default {
 *     fetch(req, env) {
 *       return sync.fetch(req, env.SYNC_R2, '/api');
 *     },
 *   };
 */

import type { SyncWasmAdapter } from '../shared/wasm-adapter';
import type { Operation } from '../shared/types';
import { R2DocStore, mergeWithRetry, type R2Like, type MergeResult } from './handler';

// ── SSE state (per-isolate) ──────────────────────────────────────────────────

interface SseClient {
  modelId: string;
  actorId: string;
  writer: WritableStreamDefaultWriter;
}

const sseClients: SseClient[] = [];
const encoder = new TextEncoder();

function sseBroadcast(modelId: string, event: string, data: unknown, excludeActorId?: string) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    if (client.modelId === modelId && client.actorId !== excludeActorId) {
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

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function binary(data: Uint8Array): Response {
  return new Response(data, {
    headers: { ...CORS, 'Content-Type': 'application/octet-stream' },
  });
}

// ── SyncWorker options ───────────────────────────────────────────────────────

export interface SyncWorkerOptions {
  /**
   * Called when an op is applied server-side (e.g. from MCP or API).
   * Consumer implements the actual command execution.
   * Return the execution result (passed back to the caller).
   */
  onExecute?: (op: Operation, modelId: string) => Promise<unknown>;

  /**
   * Called after a POST /sync merge completes.
   * Useful for updating manifests, triggering webhooks, etc.
   */
  onAfterSync?: (modelId: string, merged: Uint8Array, hadNewOps: boolean) => Promise<void>;

  /**
   * R2 key prefix. Default: 'models/'
   */
  prefix?: string;
}

// ── SyncWorker ───────────────────────────────────────────────────────────────

export class SyncWorker {
  private readonly wasm: SyncWasmAdapter;
  private readonly opts: SyncWorkerOptions;
  private store: R2DocStore | null = null;

  constructor(wasm: SyncWasmAdapter, opts: SyncWorkerOptions = {}) {
    this.wasm = wasm;
    this.opts = opts;
  }

  private getStore(r2: R2Like): R2DocStore {
    if (!this.store) this.store = new R2DocStore(r2, this.opts.prefix);
    return this.store;
  }

  // ── Apply op server-side ─────────────────────────────────────────────────

  /**
   * Apply a single op: add to CRDT doc → save to R2 → broadcast → execute.
   *
   * This is the server-direct path (MCP, API). The op is recorded in the
   * CRDT doc and broadcast to all browsers via SSE. If onExecute is provided,
   * the consumer's command handler runs and its result is returned.
   */
  async applyOp(r2: R2Like, modelId: string, op: Operation): Promise<{ result: unknown; opCount: number }> {
    const store = this.getStore(r2);

    // Load or create doc
    let docBytes = await store.load(modelId);
    if (!docBytes) {
      docBytes = await this.wasm.create_doc();
    }

    // Apply op to CRDT doc
    docBytes = await this.wasm.apply_op(docBytes, JSON.stringify(op));
    await store.save(modelId, docBytes);

    // Broadcast to browsers
    sseBroadcast(modelId, 'sync-op', op, op.actorId);
    sseBroadcast(modelId, 'doc-changed', { actorId: op.actorId, modelId });

    // Execute consumer command
    let result: unknown = { success: true };
    if (this.opts.onExecute) {
      result = await this.opts.onExecute(op, modelId);
    }

    const opCount = await this.wasm.get_op_count(docBytes);
    return { result, opCount };
  }

  // ── Bulk apply (replay) ──────────────────────────────────────────────────

  /**
   * Get the replay ops (enabled only, in order) for a model.
   * Consumer uses these to rebuild state.
   */
  async getReplayOps(r2: R2Like, modelId: string): Promise<Operation[]> {
    const store = this.getStore(r2);
    const docBytes = await store.load(modelId);
    if (!docBytes) return [];
    const json = await this.wasm.get_replay_ops(docBytes);
    return JSON.parse(json);
  }

  /**
   * Get all ops for a model.
   */
  async getOps(r2: R2Like, modelId: string): Promise<Operation[]> {
    const store = this.getStore(r2);
    const docBytes = await store.load(modelId);
    if (!docBytes) return [];
    const json = await this.wasm.get_ops(docBytes);
    return JSON.parse(json);
  }

  // ── HTTP handler ─────────────────────────────────────────────────────────

  /**
   * Handle an HTTP request. Mount this in your CF Worker's fetch handler.
   *
   * Routes (after prefix):
   *   POST   /models/:id/sync?actorId=...   Merge browser doc with R2
   *   POST   /models/:id/ops                Apply a single op server-side
   *   GET    /models/:id/ops                Get all ops
   *   GET    /models/:id/replay             Get replay ops (enabled only)
   *   GET    /models/:id/events?actorId=... SSE stream
   *   DELETE /models/:id                    Delete model
   *   GET    /health                        200 OK
   */
  async fetch(request: Request, r2: R2Like, prefix = ''): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.slice(prefix.length);
    const store = this.getStore(r2);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (path === '/health') {
      return new Response('ok', { headers: CORS });
    }

    const m = path.match(/^\/models\/([^/]+)(\/.*)?$/);
    if (!m) return new Response('not found', { status: 404, headers: CORS });

    const modelId = decodeURIComponent(m[1]);
    const sub = m[2] || '';
    const actorId = url.searchParams.get('actorId') || 'unknown';

    // ── POST /models/:id/sync ──────────────────────────────────────

    if (request.method === 'POST' && sub === '/sync') {
      const incoming = new Uint8Array(await request.arrayBuffer());
      const { merged, hadNewOps } = await mergeWithRetry(store, this.wasm, modelId, incoming);

      if (hadNewOps) {
        sseBroadcast(modelId, 'doc-changed', { actorId, modelId }, actorId);
      }

      if (this.opts.onAfterSync) {
        await this.opts.onAfterSync(modelId, merged, hadNewOps).catch(() => {});
      }

      return binary(merged);
    }

    // ── POST /models/:id/ops ───────────────────────────────────────

    if (request.method === 'POST' && sub === '/ops') {
      const op = await request.json() as Operation;
      const { result, opCount } = await this.applyOp(r2, modelId, op);
      return json({ result, opCount });
    }

    // ── GET /models/:id/ops ────────────────────────────────────────

    if (request.method === 'GET' && sub === '/ops') {
      const ops = await this.getOps(r2, modelId);
      return json(ops);
    }

    // ── GET /models/:id/replay ─────────────────────────────────────

    if (request.method === 'GET' && sub === '/replay') {
      const ops = await this.getReplayOps(r2, modelId);
      return json(ops);
    }

    // ── GET /models/:id/events ─────────────────────────────────────

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

    // ── DELETE /models/:id ─────────────────────────────────────────

    if (request.method === 'DELETE' && !sub) {
      await store.delete(modelId);
      return new Response('deleted', { headers: CORS });
    }

    return new Response('not found', { status: 404, headers: CORS });
  }
}
