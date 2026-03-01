// model-store.ts — R2-backed model persistence.
// Works identically in dev (wrangler local R2 emulation) and production (Cloudflare R2).

export interface ModelManifest {
  id: string;
  name: string;
  description?: string;
  objectCount: number;
  version: string;
  createdAt: string;
  updatedAt: string;
  hasThumbnail: boolean;
}

const PREFIX = 'models/';

export class ModelStore {
  constructor(private bucket: R2Bucket) {}

  async save(id: string, manifest: ModelManifest, scene: string): Promise<void> {
    await Promise.all([
      this.bucket.put(`${PREFIX}${id}/manifest.json`, JSON.stringify(manifest), {
        httpMetadata: { contentType: 'application/json' },
      }),
      this.bucket.put(`${PREFIX}${id}/scene.json`, scene, {
        httpMetadata: { contentType: 'application/json' },
      }),
    ]);
  }

  async load(id: string): Promise<{ manifest: ModelManifest; scene: string } | null> {
    const [mObj, sObj] = await Promise.all([
      this.bucket.get(`${PREFIX}${id}/manifest.json`),
      this.bucket.get(`${PREFIX}${id}/scene.json`),
    ]);
    if (!mObj || !sObj) return null;
    const manifest = await mObj.json<ModelManifest>();
    const scene = await sObj.text();
    return { manifest, scene };
  }

  async getManifest(id: string): Promise<ModelManifest | null> {
    const obj = await this.bucket.get(`${PREFIX}${id}/manifest.json`);
    return obj ? obj.json<ModelManifest>() : null;
  }

  async list(): Promise<ModelManifest[]> {
    // Use delimiter to get unique model IDs under models/
    const listed = await this.bucket.list({ prefix: PREFIX, delimiter: '/' });
    const ids = (listed.delimitedPrefixes || []).map(p => p.replace(PREFIX, '').replace(/\/$/, ''));
    const manifests = await Promise.all(ids.map(id => this.getManifest(id)));
    return manifests
      .filter((m): m is ModelManifest => m !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async delete(id: string): Promise<void> {
    // Delete all keys under this model's prefix
    const listed = await this.bucket.list({ prefix: `${PREFIX}${id}/` });
    if (listed.objects.length > 0) {
      await Promise.all(listed.objects.map(obj => this.bucket.delete(obj.key)));
    }
  }

  async saveThumbnail(id: string, png: ArrayBuffer): Promise<void> {
    await this.bucket.put(`${PREFIX}${id}/thumbnail.png`, png, {
      httpMetadata: { contentType: 'image/png' },
    });
    // Update manifest to reflect thumbnail
    const manifest = await this.getManifest(id);
    if (manifest) {
      manifest.hasThumbnail = true;
      await this.bucket.put(`${PREFIX}${id}/manifest.json`, JSON.stringify(manifest), {
        httpMetadata: { contentType: 'application/json' },
      });
    }
  }

  async getThumbnail(id: string): Promise<ArrayBuffer | null> {
    const obj = await this.bucket.get(`${PREFIX}${id}/thumbnail.png`);
    return obj ? obj.arrayBuffer() : null;
  }
}
