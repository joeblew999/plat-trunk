/**
 * doc-store.ts — R2-backed Automerge doc store (ADR-0008).
 *
 * Implements SyncStorageAdapter (systems/sync/ts/sync-client.ts) for
 * Cloudflare R2. Stores automerge.bin alongside model artifacts:
 *   models/{id}/manifest.json
 *   models/{id}/scene.json
 *   models/{id}/thumbnail.png
 *   models/{id}/automerge.bin
 *
 * Supports optimistic concurrency via R2 etag for concurrent MCP writes.
 * Used directly by the truck worker — SyncClient is browser-only.
 */

import type { DocStore } from '../../../sync/ts/sync-client';

const PREFIX = 'models/';

export interface DocWithEtag {
  doc: Uint8Array;
  etag: string;
}

export class R2DocStore implements DocStore {
  constructor(private bucket: R2Bucket) {}

  async load(modelId: string): Promise<Uint8Array | null> {
    const obj = await this.bucket.get(`${PREFIX}${modelId}/automerge.bin`);
    if (!obj) return null;
    return new Uint8Array(await obj.arrayBuffer());
  }

  async save(modelId: string, bytes: Uint8Array): Promise<void> {
    await this.bucket.put(`${PREFIX}${modelId}/automerge.bin`, bytes, {
      httpMetadata: { contentType: 'application/octet-stream' },
    });
  }

  /** Load doc with etag for optimistic concurrency. */
  async loadWithEtag(modelId: string): Promise<DocWithEtag | null> {
    const obj = await this.bucket.get(`${PREFIX}${modelId}/automerge.bin`);
    if (!obj) return null;
    return {
      doc: new Uint8Array(await obj.arrayBuffer()),
      etag: obj.etag,
    };
  }

  async delete(modelId: string): Promise<void> {
    await this.bucket.delete(`${PREFIX}${modelId}/automerge.bin`);
  }

  /** Save only if etag matches (optimistic concurrency). Returns false on conflict. */
  async saveConditional(modelId: string, bytes: Uint8Array, etag: string): Promise<boolean> {
    try {
      await this.bucket.put(`${PREFIX}${modelId}/automerge.bin`, bytes, {
        httpMetadata: { contentType: 'application/octet-stream' },
        onlyIf: { etagMatches: etag },
      });
      return true;
    } catch {
      // R2 throws on etag mismatch (412 Precondition Failed)
      return false;
    }
  }
}
