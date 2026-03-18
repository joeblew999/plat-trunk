// object-store.js — Per-object IndexedDB store (ADR-0025 Phase 1+3).
import { getSceneController } from './scene-controller';
// Each ExportEntry is stored individually, keyed by {modelId}/{objectId}.
// Enables: evict one object to Warm, promote one object back to Hot.
// Phase 3 additions: bulkPutObjects, listObjectsWithSpheres.

const DB_NAME = 'cad-objects';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

let _db: IDBDatabase | null = null;

function openObjectDb(): Promise<IDBDatabase> {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const store = req.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
            store.createIndex('model', 'modelId');
            store.createIndex('tier', 'tier');
        };
        req.onsuccess = () => { _db = req.result; resolve(_db); };
        req.onerror = () => reject(req.error);
    });
}

/**
 * Extract bounding_sphere [cx,cy,cz,r] from an ExportEntry JSON string.
 * Returns null if not present or parse fails.
 */
function extractBoundingSphere(entryJson: string) {
    try {
        const parsed = JSON.parse(entryJson);
        return parsed.bounding_sphere ?? null;
    } catch { return null; }
}

/** Store a Warm object (serialized ExportEntry JSON from WASM export_entry). */
export async function putObject(modelId: string, objectId: string, entryJson: string) {
    const db = await openObjectDb();
    const bs = extractBoundingSphere(entryJson);
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({
            key: `${modelId}/${objectId}`,
            modelId,
            objectId,
            tier: 'warm',
            entry: entryJson,
            boundingSphere: bs,  // [cx, cy, cz, r] or null
            lastAccessed: Date.now(),
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * Bulk-store multiple Warm objects in a single IDB transaction (Phase 3).
 * @param {string} modelId
 * @param {Array<{objectId: string, entryJson: string}>} items
 */
export async function bulkPutObjects(modelId: string, items: Array<{objectId: string, entryJson: string}>) {
    if (!items.length) return;
    const db = await openObjectDb();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const { objectId, entryJson } of items) {
            const bs = extractBoundingSphere(entryJson);
            store.put({
                key: `${modelId}/${objectId}`,
                modelId,
                objectId,
                tier: 'warm',
                entry: entryJson,
                boundingSphere: bs,
                lastAccessed: Date.now(),
            });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** Retrieve a Warm object's ExportEntry JSON. Returns null if not found. */
export async function getObject(modelId: string, objectId: string) {
    const db = await openObjectDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(`${modelId}/${objectId}`);
        req.onsuccess = () => resolve(req.result?.entry ?? null);
        req.onerror = () => reject(req.error);
    });
}

/** Remove a Warm object from the store. */
export async function removeObject(modelId: string, objectId: string) {
    const db = await openObjectDb();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(`${modelId}/${objectId}`);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** List all object IDs for a model. */
export async function listObjects(modelId: string) {
    const db = await openObjectDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const index = tx.objectStore(STORE_NAME).index('model');
        const req = index.getAllKeys(modelId);
        req.onsuccess = () => resolve(req.result.map(k => String(k).split('/')[1]));
        req.onerror = () => reject(req.error);
    });
}

/**
 * List all objects for a model with their bounding spheres (Phase 3).
 * Returns Array<{ objectId, boundingSphere: [cx,cy,cz,r] | null }>.
 * Used for viewport culling — decide which Warm objects to promote without loading geometry.
 */
export async function listObjectsWithSpheres(modelId: string): Promise<Array<{ objectId: string; boundingSphere: number[] | null; style: any }>> {
    const db = await openObjectDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const index = tx.objectStore(STORE_NAME).index('model');
        const req = index.getAll(modelId);
        req.onsuccess = () => {
            resolve((req.result || []).map(r => {
                let style = null;
                try { style = JSON.parse(r.entry)?.style ?? null; } catch {}
                return { objectId: r.objectId, boundingSphere: r.boundingSphere ?? null, style };
            }));
        };
        req.onerror = () => reject(req.error);
    });
}

/** Remove all entries for a model (used on wipe/replay to avoid stale warm objects). */
export async function clearObjects(modelId: string) {
    const db = await openObjectDb();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('model');
        const req = index.getAllKeys(modelId);
        req.onsuccess = () => {
            for (const key of req.result) store.delete(key);
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * Evict: Hot → Warm. Serialize object via WASM, store in IDB, delete from WASM.
 * Returns true if successful.
 */
export async function evictObject(modelId: string, objectId: string) {
    const ctrl = getSceneController();
    if (!ctrl) return false;
    const entryJson = ctrl.export_entry(objectId);
    if (!entryJson || entryJson === 'null') return false;
    await putObject(modelId, objectId, entryJson);
    ctrl.delete_object(objectId);
    return true;
}

/**
 * Promote: Warm → Hot. Read from IDB, import into WASM, remove from IDB.
 * Returns the objectId if successful, null otherwise.
 */
export async function promoteObject(modelId: string, objectId: string) {
    const ctrl = getSceneController();
    if (!ctrl) return null;
    const entryJson = await getObject(modelId, objectId);
    if (!entryJson) return null;
    const result = ctrl.import_entry(entryJson);
    // import_entry returns JSON string like {"objectId":"..."} or {"error":"..."}
    let parsed;
    try { parsed = JSON.parse(typeof result === 'string' ? result : result.toString()); }
    catch { return null; }
    if (parsed.objectId) {
        await removeObject(modelId, objectId);
        return parsed.objectId;
    }
    return null;
}
