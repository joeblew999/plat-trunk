// idb.ts — Single IndexedDB opener for the 'cad-sync' database.
//
// Both the sync doc bytes (IdbStorageAdapter) and the CAD metadata (doc-store.ts)
// live in the same database. A single opener ensures both stores are created in
// the same onupgradeneeded handler — preventing the split-version bug where
// each opener only created its own store.
//
// DB: 'cad-sync' version 2
//   Store 'docs': modelId → Uint8Array  (Automerge doc bytes — owned by IdbStorageAdapter)
//   Store 'meta': modelId → DocMeta     (snapshot metadata — owned by doc-store.ts)

export const IDB_NAME = 'cad-sync';
export const IDB_VERSION = 2;
export const DOCS_STORE = 'docs';
export const META_STORE = 'meta';

let _db: IDBDatabase | null = null;

/** Open (or reuse) the cad-sync database, creating both stores if needed. */
export function openCadSyncDb(): Promise<IDBDatabase> {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(DOCS_STORE)) db.createObjectStore(DOCS_STORE);
            if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
        };
        req.onsuccess = () => { _db = req.result; resolve(_db); };
        req.onerror = () => reject(req.error);
    });
}
