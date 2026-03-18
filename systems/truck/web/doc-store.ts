// doc-store.ts — IDB wrapper for CAD snapshot metadata (DocMeta).
//
// Raw Automerge doc bytes are now owned by SyncClient + IdbStorageAdapter
// in systems/sync/ts/adapters.ts — this file is CAD-specific only.
//
// DB: 'cad-sync'
//   Store 'meta': modelId → DocMeta (name, snapshots, bimHierarchy)

const DB_NAME = 'cad-sync';
const META_STORE = 'meta';

export interface SnapshotRef {
    blobRef: string;
    atOpIndex: number;
}

export interface DocMeta {
    name: string;
    snapshots: SnapshotRef[];
    bimHierarchy?: unknown;
    snapshotValidFrom?: number;
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function loadMeta(modelId: string): Promise<DocMeta> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(META_STORE, 'readonly');
        const req = tx.objectStore(META_STORE).get(modelId);
        req.onsuccess = () => resolve(req.result ?? { name: '', snapshots: [] });
        req.onerror = () => reject(req.error);
    });
}

export async function saveMeta(modelId: string, meta: DocMeta): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(META_STORE, 'readwrite');
        const req = tx.objectStore(META_STORE).put(meta, modelId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function deleteMeta(modelId: string): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(META_STORE, 'readwrite');
        tx.objectStore(META_STORE).delete(modelId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
