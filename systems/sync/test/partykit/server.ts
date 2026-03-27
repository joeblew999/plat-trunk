/**
 * PartyKit test server for sync.
 *
 * Minimal Automerge sync server using the Automerge sync protocol
 * over PartyKit WebSocket. One room per model.
 *
 * This is what automerge-partyserver does internally — inlined here
 * for testing until the package is published.
 *
 * Run: npx partykit dev server.ts
 */

import type * as Party from 'partykit/server';
import { next as Automerge } from '@automerge/automerge';

export default class SyncServer implements Party.Server {
  room: Party.Room;
  doc: Automerge.Doc<unknown> = Automerge.init();
  syncStates = new Map<string, Automerge.SyncState>();

  constructor(room: Party.Room) {
    this.room = room;
  }

  async onStart() {
    // Load from DO storage if exists
    const saved = await this.room.storage.get<ArrayBuffer>('doc');
    if (saved) {
      this.doc = Automerge.load(new Uint8Array(saved));
    }
    console.log(`[sync-server] Room ${this.room.id} started, doc loaded: ${!!saved}`);
  }

  onConnect(conn: Party.Connection) {
    console.log(`[sync-server] Peer connected: ${conn.id}`);
    // Initialize sync state for this peer
    const syncState = Automerge.initSyncState();
    this.syncStates.set(conn.id, syncState);
    // Send initial sync message
    this.sendSync(conn);
  }

  onClose(conn: Party.Connection) {
    this.syncStates.delete(conn.id);
    console.log(`[sync-server] Peer disconnected: ${conn.id}`);

    // Save when last peer disconnects
    if ([...this.room.getConnections()].length <= 1) {
      this.save();
    }
  }

  onMessage(raw: string | ArrayBuffer | ArrayBufferView, conn: Party.Connection) {
    if (typeof raw === 'string') return;

    const bytes = raw instanceof ArrayBuffer
      ? new Uint8Array(raw)
      : new Uint8Array((raw as ArrayBufferView).buffer);

    // Receive sync message from this peer
    let syncState = this.syncStates.get(conn.id) ?? Automerge.initSyncState();
    const [newDoc, newSyncState] = Automerge.receiveSyncMessage(
      this.doc,
      syncState,
      bytes,
    );
    this.doc = newDoc;
    this.syncStates.set(conn.id, newSyncState);

    // Reply to sender
    this.sendSync(conn);

    // Broadcast to other peers
    for (const other of this.room.getConnections()) {
      if (other.id !== conn.id) {
        this.sendSync(other);
      }
    }

    // Debounced save
    this.scheduleSave();
  }

  async onRequest(req: Party.Request) {
    return new Response(JSON.stringify({
      room: this.room.id,
      peers: [...this.room.getConnections()].length,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // ── Sync protocol ──────────────────────────────────────────────────

  private sendSync(conn: Party.Connection) {
    let syncState = this.syncStates.get(conn.id) ?? Automerge.initSyncState();
    const [nextState, message] = Automerge.generateSyncMessage(this.doc, syncState);
    this.syncStates.set(conn.id, nextState);
    if (message) {
      conn.send(message);
    }
  }

  // ── Persistence ────────────────────────────────────────────────────

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  private scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, 2000);
  }

  private async save() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    const bytes = Automerge.save(this.doc);
    await this.room.storage.put('doc', bytes.buffer);
    console.log(`[sync-server] Saved doc (${bytes.length} bytes)`);
  }
}
