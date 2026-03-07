// doc-store.ts — IDB wrapper for raw Automerge doc bytes + sidecar metadata.
// Replaces @automerge/automerge-repo-storage-indexeddb.
//
// DB: 'cad-sync' (distinct from old 'cad-docs' — no migration needed)
//   Store 'docs': modelId → Uint8Array  (raw Automerge bytes)
//   Store 'meta': modelId → DocMeta     (name, snapshots, bimHierarchy)

const DB_NAME = 'cad-sync';
const DOCS_STORE = 'docs';
const META_STORE = 'meta';

export interface SnapshotRef {
    blobRef: string;
    atOpIndex: number;
}

export interface DocMeta {
    name: string;
    snapshots: SnapshotRef[];
    bimHierarchy?: unknown;
    snapshotValidFrom?: number;  // Cached — recomputed on undo/redo/toggle
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(DOCS_STORE)) db.createObjectStore(DOCS_STORE);
            if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function saveDoc(modelId: string, bytes: Uint8Array): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DOCS_STORE, 'readwrite');
        const req = tx.objectStore(DOCS_STORE).put(bytes, modelId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function loadDoc(modelId: string): Promise<Uint8Array | null> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DOCS_STORE, 'readonly');
        const req = tx.objectStore(DOCS_STORE).get(modelId);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
    });
}

export async function deleteDoc(modelId: string): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([DOCS_STORE, META_STORE], 'readwrite');
        tx.objectStore(DOCS_STORE).delete(modelId);
        tx.objectStore(META_STORE).delete(modelId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
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
