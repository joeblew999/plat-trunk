/**
 * r2-store.ts — R2-backed storage for Automerge CRDT docs.
 *
 * R2DocStore implements SyncStorageAdapter using Cloudflare R2 with
 * optimistic concurrency (etag-based conditional writes).
 *
 * Key layout: models/{modelId}/automerge.bin
 */

export interface DocWithEtag {
  doc: Uint8Array;
  etag: string;
}

interface R2Like {
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; etag: string } | null>;
  put(key: string, value: ArrayBuffer | Uint8Array, options?: Record<string, unknown>): Promise<unknown>;
  delete(key: string): Promise<unknown>;
}

export class R2DocStore {
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

  async loadWithEtag(modelId: string): Promise<DocWithEtag | null> {
    const obj = await this.bucket.get(this.key(modelId));
    if (!obj) return null;
    return { doc: new Uint8Array(await obj.arrayBuffer()), etag: obj.etag };
  }

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

// ── mergeWithRetry ────────────────────────────────────────────────────────────
// Merge an incoming Automerge doc with the server doc using etag-based
// optimistic concurrency. Two retries before falling back to unconditional save.

export interface SyncWasmAdapterMinimal {
  merge_docs(a: Uint8Array, b: Uint8Array): Promise<Uint8Array>;
  doc_hash(d: Uint8Array): Promise<string>;
}

export interface MergeResult {
  merged: Uint8Array;
  hadNewOps: boolean;
}

export async function mergeWithRetry(
  store: R2DocStore,
  wasm: SyncWasmAdapterMinimal,
  modelId: string,
  incomingDoc: Uint8Array,
): Promise<MergeResult> {
  const existing = await store.loadWithEtag(modelId);

  if (!existing) {
    await store.save(modelId, incomingDoc);
    return { merged: incomingDoc, hadNewOps: true };
  }

  const hashBefore = await wasm.doc_hash(existing.doc);
  let merged = await wasm.merge_docs(existing.doc, incomingDoc);
  const hashAfter = await wasm.doc_hash(merged);
  let hadNewOps = hashBefore !== hashAfter;

  const saved = await store.saveConditional(modelId, merged, existing.etag);
  if (!saved) {
    const fresh = await store.loadWithEtag(modelId);
    if (fresh) {
      const h1 = await wasm.doc_hash(fresh.doc);
      merged = await wasm.merge_docs(fresh.doc, incomingDoc);
      const h2 = await wasm.doc_hash(merged);
      hadNewOps = h1 !== h2;
      const saved2 = await store.saveConditional(modelId, merged, fresh.etag);
      if (!saved2) await store.save(modelId, merged);
    } else {
      merged = incomingDoc;
      hadNewOps = true;
      await store.save(modelId, merged);
    }
  }

  return { merged, hadNewOps };
}
