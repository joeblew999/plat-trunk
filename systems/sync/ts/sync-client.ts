/**
 * sync-client.ts — ADR-0008 Phase 1: SyncClient
 *
 * Single class that owns the full sync protocol:
 *   - CRDT doc bytes (Automerge)
 *   - Storage (IDB in browser, R2 in worker, Memory in tests)
 *   - Server sync round-trip (HTTP in production, direct fn in tests)
 *   - Cross-tab/cross-actor messaging (BroadcastChannel in browser, direct in tests)
 *   - Network state (online/offline, unsent op queue, auto-resync on reconnect)
 *   - Structured tracing (every event logged, assertable in tests and CI)
 *
 * The WASM adapter is the REAL sync WASM in all environments.
 * Only storage and network are swapped between production and tests.
 *
 * Lives in systems/sync/ts/ — imported by truck (and any future system).
 * Has zero knowledge of CAD geometry, replay, or truck-specific state.
 */

import type { CadOperation } from './sync-types.generated';

// ── Adapter interfaces ────────────────────────────────────────────────────────

/** WASM functions — same signatures in browser and CF worker. */
export interface SyncWasmAdapter {
  create_doc(): Uint8Array;
  apply_op(doc: Uint8Array, opJson: string): Uint8Array;
  merge_docs(local: Uint8Array, remote: Uint8Array): Uint8Array;
  get_ops(doc: Uint8Array): string;
  get_op_count(doc: Uint8Array): number;
  get_replay_ops(doc: Uint8Array): string;
  set_op_enabled(doc: Uint8Array, opId: string, enabled: boolean): Uint8Array;
  set_group_enabled(doc: Uint8Array, groupId: string, enabled: boolean): Uint8Array;
  rollback_to(doc: Uint8Array, actorId: string, toIndex: number): Uint8Array;
  get_name(doc: Uint8Array): string;
  set_name(doc: Uint8Array, name: string): Uint8Array;
}

/** Persistent storage — IDB in browser, R2 in worker, Map in tests. */
export interface SyncStorageAdapter {
  save(modelId: string, bytes: Uint8Array): Promise<void>;
  load(modelId: string): Promise<Uint8Array | null>;
  delete(modelId: string): Promise<void>;
}

/**
 * Network adapter — HTTP+SSE in production, direct function call in tests.
 *
 * NOTE: The adapter owns the connection lifecycle. `postSync` sends local doc
 * bytes to the server and receives the merged doc back. `onRemoteChange`
 * registers a callback that fires whenever another actor changes the doc
 * (SSE `doc-changed` event in production, direct invocation in tests).
 */
export interface SyncNetworkAdapter {
  postSync(modelId: string, bytes: Uint8Array, actorId: string): Promise<Uint8Array | null>;
  onRemoteChange(modelId: string, callback: () => void): void;
  disconnect(): void;
}

// ── Structured tracing ────────────────────────────────────────────────────────

export type SyncEventType =
  | 'add_op'
  | 'undo_op'
  | 'redo_op'
  | 'undo_group'
  | 'redo_group'
  | 'rollback'
  | 'load_storage'
  | 'save_storage'
  | 'sync_start'
  | 'sync_complete'
  | 'sync_error'
  | 'remote_change'
  | 'merge'
  | 'network_online'
  | 'network_offline'
  | 'queue_op'
  | 'flush_queue';

export interface SyncLogEntry {
  ts: number;
  modelId: string;
  actorId: string;
  event: SyncEventType;
  detail: Record<string, unknown>;
}

// ── SyncClient ────────────────────────────────────────────────────────────────

export interface SyncClientOptions {
  actorId: string;
  debounceMs?: number;       // default 2000
  maxLogEntries?: number;    // default 200
}

export class SyncClient {
  private _docBytes: Uint8Array | null = null;
  private _modelId: string | null = null;
  private _syncing = false;
  private _syncTimer: ReturnType<typeof setTimeout> | null = null;
  private _online = true;
  private _pendingSync = false;  // queued while offline

  readonly syncLog: SyncLogEntry[] = [];
  private readonly _maxLog: number;
  private readonly _debounceMs: number;

  // ── Events emitted to consumers (truck's history-domain, etc.) ────────────
  onRemoteOps?: (ops: CadOperation[]) => void;
  onSyncComplete?: (hadNewOps: boolean) => void;
  onNetworkState?: (online: boolean) => void;
  onError?: (error: Error, context: string) => void;

  constructor(
    private readonly wasm: SyncWasmAdapter,
    private readonly storage: SyncStorageAdapter,
    private readonly network: SyncNetworkAdapter,
    private readonly opts: SyncClientOptions,
  ) {
    this._debounceMs = opts.debounceMs ?? 2000;
    this._maxLog = opts.maxLogEntries ?? 200;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Start listening for remote changes on a model.
   * Call after loadFromStorage or createDoc.
   */
  listen(modelId: string): void {
    this.network.onRemoteChange(modelId, () => {
      this._log('remote_change', { modelId });
      this._triggerRemoteSync();
    });
  }

  disconnect(): void {
    this.network.disconnect();
    if (this._syncTimer) clearTimeout(this._syncTimer);
  }

  // ── Network state ─────────────────────────────────────────────────────────

  goOffline(): void {
    this._online = false;
    this._log('network_offline', {});
    this.onNetworkState?.(false);
  }

  goOnline(): void {
    this._online = true;
    this._log('network_online', {});
    this.onNetworkState?.(true);
    // Flush any queued sync
    if (this._pendingSync && this._modelId) {
      this._log('flush_queue', { modelId: this._modelId });
      this._pendingSync = false;
      this.syncWithServer();
    }
  }

  get isOnline(): boolean { return this._online; }

  // ── Doc lifecycle ─────────────────────────────────────────────────────────

  /** Create a fresh empty doc. Does not save to storage. */
  createDoc(modelId: string): void {
    this._docBytes = this.wasm.create_doc();
    this._modelId = modelId;
  }

  /** Load doc from storage. Returns true if found. */
  async loadFromStorage(modelId: string): Promise<boolean> {
    const bytes = await this.storage.load(modelId);
    if (!bytes) {
      this._log('load_storage', { modelId, found: false });
      return false;
    }
    this._docBytes = bytes;
    this._modelId = modelId;
    this._log('load_storage', { modelId, found: true, opCount: this.opCount });
    return true;
  }

  /** Adopt externally-provided doc bytes (e.g. from server bootstrap). */
  adoptDoc(modelId: string, bytes: Uint8Array): void {
    this._docBytes = bytes;
    this._modelId = modelId;
  }

  /** Save current doc to storage. */
  async saveToStorage(): Promise<void> {
    if (!this._docBytes || !this._modelId) return;
    await this.storage.save(this._modelId, this._docBytes);
    this._log('save_storage', { modelId: this._modelId, opCount: this.opCount });
  }

  // ── Op recording ──────────────────────────────────────────────────────────

  /** Record a completed op into the CRDT doc. */
  async addOp(op: CadOperation): Promise<void> {
    if (!this._docBytes || !this._modelId) return;
    this._docBytes = this.wasm.apply_op(this._docBytes, JSON.stringify(op));
    this._log('add_op', { modelId: this._modelId, opType: op.type, opId: op.id, opCount: this.opCount });
    await this.saveToStorage();
    this._scheduleSyncIfOnline();
  }

  /** Disable an op by ID (undo). */
  async setOpEnabled(opId: string, enabled: boolean): Promise<void> {
    if (!this._docBytes || !this._modelId) return;
    this._docBytes = this.wasm.set_op_enabled(this._docBytes, opId, enabled);
    this._log(enabled ? 'redo_op' : 'undo_op', { modelId: this._modelId, opId });
    await this.saveToStorage();
    this._scheduleSyncIfOnline();
  }

  /** Disable all ops in a group. */
  async setGroupEnabled(groupId: string, enabled: boolean): Promise<void> {
    if (!this._docBytes || !this._modelId) return;
    this._docBytes = this.wasm.set_group_enabled(this._docBytes, groupId, enabled);
    this._log(enabled ? 'redo_group' : 'undo_group', { modelId: this._modelId, groupId });
    await this.saveToStorage();
    this._scheduleSyncIfOnline();
  }

  /** Disable all own ops after toIndex. */
  async rollbackTo(toIndex: number): Promise<void> {
    if (!this._docBytes || !this._modelId) return;
    this._docBytes = this.wasm.rollback_to(this._docBytes, this.opts.actorId, toIndex);
    this._log('rollback', { modelId: this._modelId, toIndex });
    await this.saveToStorage();
    this._scheduleSyncIfOnline();
  }

  // ── Read state ────────────────────────────────────────────────────────────

  get ops(): CadOperation[] {
    if (!this._docBytes) return [];
    try { return JSON.parse(this.wasm.get_ops(this._docBytes)); }
    catch { return []; }
  }

  get replayOps(): CadOperation[] {
    if (!this._docBytes) return [];
    try { return JSON.parse(this.wasm.get_replay_ops(this._docBytes)); }
    catch { return []; }
  }

  get opCount(): number {
    if (!this._docBytes) return 0;
    try { return this.wasm.get_op_count(this._docBytes); }
    catch { return 0; }
  }

  get name(): string {
    if (!this._docBytes) return '';
    try { return this.wasm.get_name(this._docBytes); }
    catch { return ''; }
  }

  setName(name: string): void {
    if (!this._docBytes) return;
    this._docBytes = this.wasm.set_name(this._docBytes, name);
  }

  get docBytes(): Uint8Array | null { return this._docBytes; }
  get modelId(): string | null { return this._modelId; }

  get canUndo(): boolean {
    return this.ops.some(op => op.actorId === this.opts.actorId && op.enabled);
  }

  get canRedo(): boolean {
    const ops = this.ops;
    let foundDisabled = false;
    for (let i = ops.length - 1; i >= 0; i--) {
      if (ops[i].actorId === this.opts.actorId) {
        if (!ops[i].enabled) foundDisabled = true;
        else break;
      }
    }
    return foundDisabled;
  }

  // ── Server sync ───────────────────────────────────────────────────────────

  /** Push local doc to server, merge returned doc, return whether new ops arrived. */
  async syncWithServer(): Promise<{ hadNewOps: boolean }> {
    if (!this._docBytes || !this._modelId || this._syncing) {
      return { hadNewOps: false };
    }
    if (!this._online) {
      this._pendingSync = true;
      this._log('queue_op', { modelId: this._modelId, reason: 'offline' });
      return { hadNewOps: false };
    }

    this._syncing = true;
    this._log('sync_start', { modelId: this._modelId, localOpCount: this.opCount });

    try {
      const serverDoc = await this.network.postSync(
        this._modelId,
        this._docBytes,
        this.opts.actorId,
      );

      if (!serverDoc) {
        this._log('sync_error', { modelId: this._modelId, reason: 'no response' });
        return { hadNewOps: false };
      }

      const localOpCount = this.opCount;
      this._docBytes = this.wasm.merge_docs(this._docBytes, serverDoc);
      const mergedOpCount = this.opCount;
      const hadNewOps = mergedOpCount > localOpCount;

      this._log('merge', {
        modelId: this._modelId,
        localOpCount,
        mergedOpCount,
        hadNewOps,
        source: 'server',
      });

      await this.saveToStorage();
      this.onSyncComplete?.(hadNewOps);

      if (hadNewOps) {
        const newOps = this.ops.slice(localOpCount);
        this.onRemoteOps?.(newOps);
      }

      this._log('sync_complete', { modelId: this._modelId, hadNewOps, mergedOpCount });
      return { hadNewOps };

    } catch (err: any) {
      this._log('sync_error', { modelId: this._modelId, error: err?.message });
      this.onError?.(err, 'syncWithServer');
      return { hadNewOps: false };
    } finally {
      this._syncing = false;
    }
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private _scheduleSyncIfOnline(): void {
    if (!this._online) {
      this._pendingSync = true;
      return;
    }
    if (this._syncTimer) clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => {
      this._syncTimer = null;
      this.syncWithServer();
    }, this._debounceMs);
  }

  private _triggerRemoteSync(): void {
    // Remote change arrived — sync immediately (don't debounce)
    if (this._syncTimer) clearTimeout(this._syncTimer);
    this.syncWithServer();
  }

  private _log(event: SyncEventType, detail: Record<string, unknown>): void {
    const entry: SyncLogEntry = {
      ts: Date.now(),
      modelId: this._modelId ?? '',
      actorId: this.opts.actorId,
      event,
      detail,
    };
    this.syncLog.push(entry);
    // Trim to max
    if (this.syncLog.length > this._maxLog) {
      this.syncLog.splice(0, this.syncLog.length - this._maxLog);
    }
    // Structured console output — assertable in tests
    console.log(`[sync:${event}]`, JSON.stringify(detail));
  }
}
