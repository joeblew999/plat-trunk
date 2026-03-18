// doc-store.ts — IDB wrapper for CAD snapshot metadata (DocMeta).
//
// Raw Automerge doc bytes are owned by IdbStorageAdapter (systems/sync/ts/adapters.ts).
// Both use the shared openCadSyncDb() from idb.ts — single DB, both stores created
// together to prevent the split-version bug.

import { openCadSyncDb, META_STORE } from './idb';

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

export async function loadMeta(modelId: string): Promise<DocMeta> {
    const db = await openCadSyncDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(META_STORE, 'readonly');
        const req = tx.objectStore(META_STORE).get(modelId);
        req.onsuccess = () => resolve(req.result ?? { name: '', snapshots: [] });
        req.onerror = () => reject(req.error);
    });
}

export async function saveMeta(modelId: string, meta: DocMeta): Promise<void> {
    const db = await openCadSyncDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(META_STORE, 'readwrite');
        const req = tx.objectStore(META_STORE).put(meta, modelId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function deleteMeta(modelId: string): Promise<void> {
    const db = await openCadSyncDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(META_STORE, 'readwrite');
        tx.objectStore(META_STORE).delete(modelId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
