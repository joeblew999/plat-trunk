// storage-budget.ts — Browser storage quota monitoring (ADR-0001 Part D).
// Tracks IndexedDB/Cache usage via navigator.storage.estimate().

export interface StorageBudget {
  pctUsed: number;
  canStoreSnapshot: boolean;  // false > 90%
  canEvictToWarm: boolean;    // false > 95%
}

let _current: StorageBudget | null = null;

export async function refreshBudget(): Promise<StorageBudget> {
  if (!navigator.storage?.estimate) {
    _current = { pctUsed: 0, canStoreSnapshot: true, canEvictToWarm: true };
    return _current;
  }
  const { usage = 0, quota = 1 } = await navigator.storage.estimate();
  const pctUsed = Math.round((usage / quota) * 100);
  _current = {
    pctUsed,
    canStoreSnapshot: pctUsed <= 90,
    canEvictToWarm: pctUsed <= 95,
  };
  (window as any).__storagePct = pctUsed;
  return _current;
}

export function currentBudget(): StorageBudget | null {
  return _current;
}
