// blob-store.js — Content-addressed blob storage (ADR-0025 Phase 0).
// Large data (IFC files, STEP files, scene snapshots) stored here by SHA-256 hash.
// Only lightweight refs (blobRef: "sha256-...") go into the Automerge CRDT document.

import { currentBudget } from './storage-budget';

const DB_NAME = 'cad-blobs';
const DB_VERSION = 1;
const STORE_NAME = 'blobs';

let _db: IDBDatabase | null = null;

function openBlobDb(): Promise<IDBDatabase> {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
        };
        req.onsuccess = () => { _db = req.result; resolve(_db); };
        req.onerror = () => reject(req.error);
    });
}

async function computeHash(data: string): Promise<string> {
    const encoded = new TextEncoder().encode(data);
    const hash = await crypto.subtle.digest('SHA-256', encoded);
    return 'sha256-' + [...new Uint8Array(hash)]
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Store data by content hash. Returns the key (sha256-...). Deduplicates automatically. */
export async function storeBlob(data: string): Promise<string> {
    const budget = currentBudget();
    if (budget && !budget.canStoreSnapshot) {
        console.warn('[blob-store] Storage > 90%, skipping blob write');
        return 'budget-exceeded';
    }
    const key = await computeHash(data);
    const db = await openBlobDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({
            key,
            data,
            size: data.length,
            createdAt: Date.now(),
        });
        tx.oncomplete = () => resolve(key);
        tx.onerror = () => reject(tx.error);
    });
}

/** Retrieve blob data by key. Returns null if not found. */
export async function getBlob(key: string): Promise<string | null> {
    const db = await openBlobDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result?.data ?? null);
        req.onerror = () => reject(req.error);
    });
}
