/**
 * SyncDoc — collaborative op log over PartyKit.
 *
 * Stores operations inside an automerge-repo document (CRDT). Transport is
 * handled by automerge-partyserver over WebSocket with Durable Objects.
 *
 * Architecture:
 *   automerge-repo doc       →  single source of truth (ops array + enabled state)
 *   AutomergeProvider        →  WebSocket + IndexedDB + BroadcastChannel
 *   AutomergeServer (DO)     →  per-peer sync state, 128KB chunked DO storage
 *   SyncDoc                  →  typed API on top (addOp, undo, redo, getReplayOps)
 *
 * Offline-first:
 *   - IndexedDB persists the Automerge doc across tab close/refresh (default: on)
 *   - BroadcastChannel syncs across tabs without a network round-trip (default: on)
 *   - Exponential backoff reconnect (2s → 30s) on network loss
 *   - On reconnect, automerge-repo sends only the diff since last contact
 *
 * The WASM crate (@plat/sync) is NOT required for sync. It's optional —
 * consumers can use it for validation, Blake3 hashing, or server-side replay.
 * SyncDoc works with plain Automerge CRDT ops.
 */

import { type DocHandle, type AnyDocumentId } from '@automerge/automerge-repo';
import { AutomergeProvider, type AutomergeProviderOptions } from 'automerge-partyserver/provider';
import type { Operation } from '../shared/types.ts';

// ── Document schema ──────────────────────────────────────────────────────────

/** The Automerge document structure managed by SyncDoc. */
export interface SyncDocData {
  operations: Operation[];
  name?: string;
}

// ── SyncDoc options ──────────────────────────────────────────────────────────

export interface SyncDocOptions {
  /** PartyKit/wrangler host (e.g. 'localhost:1999') */
  host: string;
  /** Room name — typically the model/document ID */
  room: string;
  /** Actor ID for this peer */
  actorId: string;
  /** WebSocket protocol — 'ws' for local, 'wss' for production (default: auto) */
  protocol?: 'ws' | 'wss';
  /** Party namespace in the URL (default: 'ops') — maps to DO binding name */
  party?: string;
  /**
   * Persist the Automerge doc in IndexedDB so work survives tab close/refresh.
   * Default: true. Set false in tests or environments without IDB.
   */
  indexedDB?: boolean;
  /**
   * IDB database name. Default: 'plat-sync-{room}' — scoped per model so
   * different models don't share storage.
   */
  idbName?: string;
  /**
   * Sync across tabs via BroadcastChannel without a network round-trip.
   * Default: true.
   */
  broadcast?: boolean;
  /** Called when connection state changes — useful for UI indicators. */
  onStatus?: (status: 'connecting' | 'connected' | 'disconnected') => void;
}

// ── SyncDoc ──────────────────────────────────────────────────────────────────

export class SyncDoc {
  private provider: AutomergeProvider;
  private handle: DocHandle<SyncDocData> | null = null;
  private _docId: AnyDocumentId | null = null;

  /** Called when remote changes arrive. Receives the full replay ops list. */
  onRemoteOps?: (ops: Operation[]) => void;

  constructor(opts: SyncDocOptions) {
    const providerOpts: AutomergeProviderOptions = {
      host: opts.host,
      room: opts.room,
      party: opts.party ?? 'ops',
      protocol: opts.protocol,
      indexedDB: opts.indexedDB !== false,
      idbName: opts.idbName ?? `plat-sync-${opts.room}`,
      broadcast: opts.broadcast !== false,
      onStatus: opts.onStatus,
    };

    this.provider = new AutomergeProvider(providerOpts);
  }

  /**
   * Create a new document.
   *
   * With IndexedDB enabled the doc is immediately persisted locally.
   * automerge-repo will sync it to the DO when the WebSocket connects.
   */
  async create(): Promise<AnyDocumentId> {
    // Use repo directly — provider.create() is a thin wrapper but
    // using repo gives us the typed DocHandle without any cast issues.
    this.handle = this.provider.repo.create<SyncDocData>();
    this.handle.change((doc) => {
      doc.operations = [];
    });
    this._docId = this.handle.documentId;
    this.subscribeToChanges();
    return this._docId;
  }

  /**
   * Join an existing document by ID.
   *
   * With IndexedDB enabled, the doc is loaded from local storage first
   * (instant), then synced with the server when online.
   */
  async join(docId: AnyDocumentId): Promise<void> {
    // Use repo.find() directly — avoids the type-cast wrapper in
    // provider.find() which loses the whenReady() method at runtime.
    this.handle = this.provider.repo.find<SyncDocData>(docId);
    await this.handle.whenReady();
    this._docId = docId;
    this.subscribeToChanges();
  }

  /** The automerge-repo document ID (for sharing with other peers). */
  get docId(): AnyDocumentId | null {
    return this._docId;
  }

  /** Whether the WebSocket is currently connected. */
  get connected(): boolean {
    return this.provider.connected;
  }

  // ── Op API ──────────────────────────────────────────────────────────

  /** Add an op. Syncs to all peers automatically. */
  addOp(op: Operation): void {
    this.requireHandle().change((doc) => {
      if (!doc.operations) doc.operations = [];
      doc.operations.push(op);
    });
  }

  /** Undo: disable an op by ID. */
  undo(opId: string): void {
    this.requireHandle().change((doc) => {
      const op = doc.operations?.find((o: Operation) => o.id === opId);
      if (op) op.enabled = false;
    });
  }

  /** Redo: re-enable an op by ID. */
  redo(opId: string): void {
    this.requireHandle().change((doc) => {
      const op = doc.operations?.find((o: Operation) => o.id === opId);
      if (op) op.enabled = true;
    });
  }

  /** Undo/redo all ops in a group atomically. */
  setGroupEnabled(groupId: string, enabled: boolean): void {
    this.requireHandle().change((doc) => {
      for (const op of doc.operations ?? []) {
        if (op.groupId === groupId) op.enabled = enabled;
      }
    });
  }

  /** Get all ops (including disabled). */
  getOps(): Operation[] {
    const doc = this.requireHandle().doc();
    return doc?.operations ?? [];
  }

  /** Get enabled-only ops for scene replay. */
  getReplayOps(): Operation[] {
    return this.getOps().filter((o) => o.enabled);
  }

  /** Get total op count. */
  getOpCount(): number {
    return this.getOps().length;
  }

  /** Get model name. */
  getName(): string {
    const doc = this.requireHandle().doc();
    return doc?.name ?? '';
  }

  /** Set model name — syncs to all peers. */
  setName(name: string): void {
    this.requireHandle().change((doc) => {
      doc.name = name;
    });
  }

  /**
   * Send ephemeral data to all peers (presence, cursor position).
   * Not persisted — lost on disconnect.
   */
  sendEphemeral(data: Uint8Array): void {
    this.provider.sendEphemeral(data);
  }

  /** Close the WebSocket connection. IDB data is retained. */
  close(): void {
    this.provider.destroy();
  }

  // ── Internal ────────────────────────────────────────────────────────

  private requireHandle(): DocHandle<SyncDocData> {
    if (!this.handle) throw new Error('SyncDoc not ready — call create() or join() first');
    return this.handle;
  }

  private subscribeToChanges(): void {
    this.handle?.on('change', () => {
      if (this.onRemoteOps) {
        this.onRemoteOps(this.getReplayOps());
      }
    });
  }
}
