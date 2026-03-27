/**
 * SyncDoc — collaborative op log over PartyKit.
 *
 * Stores operations inside an automerge-repo document (CRDT). Transport is
 * handled by automerge-partyserver over WebSocket with Durable Objects.
 *
 * Architecture:
 *   automerge-repo doc  →  single source of truth (ops array + enabled state)
 *   automerge-partyserver  →  syncs doc between peers via WebSocket + DO
 *   SyncDoc  →  typed API on top (addOp, undo, redo, getReplayOps)
 *
 * The WASM crate (@plat/sync) is NOT required for sync. It's optional —
 * consumers can use it for validation, Blake3 hashing, or server-side replay.
 * SyncDoc works with plain Automerge CRDT ops.
 */

import {
  Repo,
  type PeerId,
  type DocHandle,
  type AnyDocumentId,
  NetworkAdapter,
  type NetworkAdapterInterface,
  type Message,
} from '@automerge/automerge-repo';
import { encode as cborEncode, decode as cborDecode } from 'cborg';
import type { Operation } from '../shared/types.ts';

// ── Document schema ──────────────────────────────────────────────────────────

/** The Automerge document structure managed by SyncDoc. */
export interface SyncDocData {
  operations: Operation[];
  name?: string;
}

// ── WebSocket NetworkAdapter for Node.js / browser ───────────────────────────

class SyncDocNetworkAdapter extends NetworkAdapter {
  private ws: WebSocket | null = null;
  private serverPeerId: string | null = null;
  private destroyed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private resolveReady!: () => void;
  private _ready: Promise<void>;

  constructor(private url: string) {
    super();
    this._ready = new Promise((resolve) => { this.resolveReady = resolve; });
  }

  connect(peerId: PeerId): void {
    this.peerId = peerId;
    this.openWebSocket();
  }

  disconnect(): void {
    this.destroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) { this.ws.close(); this.ws = null; }
  }

  send(message: Message): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(cborEncode(message));
    } catch { /* ignore */ }
  }

  isReady(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.serverPeerId !== null;
  }

  whenReady(): Promise<void> {
    return this._ready;
  }

  private openWebSocket(): void {
    if (this.destroyed) return;

    this.ws = new WebSocket(this.url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      const joinMsg = {
        type: 'join',
        senderId: this.peerId,
        peerMetadata: {},
        supportedProtocolVersions: ['1'],
      };
      this.ws!.send(cborEncode(joinMsg));
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = new Uint8Array(event.data as ArrayBuffer);
        const message = cborDecode(data) as any;

        if (message.type === 'peer' && message.senderId) {
          this.serverPeerId = message.senderId;
          this.emit('peer-candidate', {
            peerId: message.senderId as PeerId,
            peerMetadata: message.peerMetadata,
          });
          this.resolveReady();
          return;
        }

        this.emit('message', message);
      } catch { /* malformed */ }
    };

    this.ws.onclose = () => {
      if (this.serverPeerId) {
        this.emit('peer-disconnected', { peerId: this.serverPeerId as PeerId });
      }
      this.serverPeerId = null;
      if (!this.destroyed) this.scheduleReconnect();
    };

    this.ws.onerror = () => this.ws?.close();
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this._ready = new Promise((resolve) => { this.resolveReady = resolve; });
      this.openWebSocket();
    }, 1000);
  }
}

// ── SyncDoc options ──────────────────────────────────────────────────────────

export interface SyncDocOptions {
  /** PartyKit/wrangler host (e.g. 'localhost:1999') */
  host: string;
  /** Room name — typically the model/document ID */
  room: string;
  /** Actor ID for this peer */
  actorId: string;
  /** WebSocket protocol — 'ws' for local, 'wss' for production */
  protocol?: 'ws' | 'wss';
  /** Party namespace in the URL (default: 'ops') — maps to DO binding name */
  party?: string;
}

// ── SyncDoc ──────────────────────────────────────────────────────────────────

export class SyncDoc {
  private repo: Repo;
  private adapter: SyncDocNetworkAdapter;
  private handle: DocHandle<SyncDocData> | null = null;
  private actorId: string;
  private _docId: AnyDocumentId | null = null;

  /** Called when remote changes arrive. Receives the full replay ops list. */
  onRemoteOps?: (ops: Operation[]) => void;

  constructor(opts: SyncDocOptions) {
    this.actorId = opts.actorId;
    const protocol = opts.protocol ?? 'ws';
    const party = opts.party ?? 'ops';
    const url = `${protocol}://${opts.host}/parties/${party}/${opts.room}`;

    this.adapter = new SyncDocNetworkAdapter(url);
    this.repo = new Repo({
      network: [this.adapter as unknown as NetworkAdapterInterface],
      peerId: `syncdoc-${opts.actorId}-${Math.random().toString(36).slice(2, 6)}` as PeerId,
    });
  }

  /** Create a new document and wait for server handshake. */
  async create(): Promise<AnyDocumentId> {
    await this.adapter.whenReady();
    this.handle = this.repo.create<SyncDocData>();
    this.handle.change((doc) => {
      doc.operations = [];
    });
    this._docId = this.handle.documentId;
    this.subscribeToChanges();
    return this._docId;
  }

  /** Join an existing document by ID. */
  async join(docId: AnyDocumentId): Promise<void> {
    await this.adapter.whenReady();
    this.handle = await this.repo.find<SyncDocData>(docId);
    await this.handle.whenReady();
    this._docId = docId;
    this.subscribeToChanges();
  }

  /** The automerge-repo document ID (for sharing with other peers). */
  get docId(): AnyDocumentId | null {
    return this._docId;
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

  /** Undo/redo all ops in a group. */
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

  /** Get enabled-only ops for replay. */
  getReplayOps(): Operation[] {
    return this.getOps().filter((o) => o.enabled);
  }

  /** Get op count. */
  getOpCount(): number {
    return this.getOps().length;
  }

  /** Get/set model name. */
  getName(): string {
    const doc = this.requireHandle().doc();
    return doc?.name ?? '';
  }

  setName(name: string): void {
    this.requireHandle().change((doc) => {
      doc.name = name;
    });
  }

  /** Close the connection. */
  close(): void {
    this.adapter.disconnect();
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
