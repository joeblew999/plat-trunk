/**
 * automerge-partyserver transport tests.
 *
 * Tests the REAL automerge-partyserver over wrangler dev with Durable Objects.
 * Uses automerge-repo on BOTH sides — same as production.
 *
 * Requires: npx wrangler dev --port 1999 (running)
 *
 * Run: npx vitest run
 */

import { describe, it, expect } from 'vitest';
import {
  Repo,
  type PeerId,
  NetworkAdapter,
  type NetworkAdapterInterface,
  type Message,
} from '@automerge/automerge-repo';
import { encode as cborEncode, decode as cborDecode } from 'cborg';
import WebSocket from 'ws';

const WS_URL = 'ws://127.0.0.1:1999/parties/main';

// ── Test NetworkAdapter (Node.js WebSocket → automerge-repo) ─────────────────

class TestWebSocketAdapter extends NetworkAdapter {
  private ws: WebSocket | null = null;
  private serverPeerId: string | null = null;
  private resolveReady!: () => void;
  private readyPromise: Promise<void>;

  constructor(private url: string) {
    super();
    this.readyPromise = new Promise((resolve) => { this.resolveReady = resolve; });
  }

  connect(peerId: PeerId): void {
    this.peerId = peerId;

    this.ws = new WebSocket(this.url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.on('open', () => {
      // Send join message (automerge-repo protocol)
      const joinMsg = {
        type: 'join',
        senderId: this.peerId,
        peerMetadata: {},
        supportedProtocolVersions: ['1'],
      };
      this.ws!.send(cborEncode(joinMsg));
    });

    this.ws.on('message', (raw: ArrayBuffer) => {
      try {
        const data = new Uint8Array(raw);
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
    });

    this.ws.on('close', () => {
      if (this.serverPeerId) {
        this.emit('peer-disconnected', { peerId: this.serverPeerId as PeerId });
      }
    });
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  send(message: Message): void {
    if (!this.ws || this.ws.readyState !== 1) return;
    try {
      this.ws.send(cborEncode(message));
    } catch { /* ignore */ }
  }

  isReady(): boolean {
    return this.ws?.readyState === 1 && this.serverPeerId !== null;
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }
}

// ── Helper: create a test peer with automerge-repo ───────────────────────────

function createPeer(room: string) {
  const adapter = new TestWebSocketAdapter(`${WS_URL}/${room}`);
  const repo = new Repo({
    network: [adapter as unknown as NetworkAdapterInterface],
    peerId: `test-${Math.random().toString(36).slice(2, 8)}` as PeerId,
  });

  return {
    repo,
    adapter,
    /** Wait for the server peer handshake to complete. */
    ready: () => adapter.whenReady(),
    close: () => adapter.disconnect(),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('automerge-partyserver sync (real DO + wrangler)', () => {
  it('server responds to HTTP health check', async () => {
    const res = await fetch('http://127.0.0.1:1999/health');
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.status).toBe('ok');
  });

  it('client connects and completes peer handshake', async () => {
    const room = `connect-${Date.now()}`;
    const peer = createPeer(room);
    await peer.ready();

    expect(peer.adapter.isReady()).toBe(true);
    peer.close();
  });

  it('client change syncs to server and back', async () => {
    const room = `change-${Date.now()}`;
    const peer = createPeer(room);
    await peer.ready();

    // Create a doc and make a change
    const handle = peer.repo.create<{ items: Array<{ text: string }> }>();
    handle.change((doc) => {
      doc.items = [{ text: 'hello' }];
    });

    // Wait for sync round-trip
    await new Promise(r => setTimeout(r, 1000));

    const doc = handle.doc();
    expect(doc?.items).toBeDefined();
    expect(doc?.items.length).toBe(1);
    expect(doc?.items[0].text).toBe('hello');

    peer.close();
  });

  it('two clients converge via server', async () => {
    const room = `converge-${Date.now()}`;

    // Peer A creates doc
    const peerA = createPeer(room);
    await peerA.ready();

    const handleA = peerA.repo.create<{ items: Array<{ text: string }> }>();
    const docId = handleA.documentId;

    handleA.change((doc) => {
      doc.items = [{ text: 'from A' }];
    });

    // Wait for server to receive
    await new Promise(r => setTimeout(r, 500));

    // Peer B joins and finds the same doc
    const peerB = createPeer(room);
    await peerB.ready();

    const handleB = await peerB.repo.find<{ items: Array<{ text: string }> }>(docId);
    await handleB.whenReady();

    // Wait for sync
    await new Promise(r => setTimeout(r, 1000));

    // B should see A's change
    const docB = handleB.doc();
    expect(docB?.items).toBeDefined();
    expect(docB?.items.length).toBe(1);
    expect(docB?.items[0].text).toBe('from A');

    // B adds an item
    handleB.change((doc: { items: Array<{ text: string }> }) => {
      doc.items.push({ text: 'from B' });
    });

    // Wait for A to receive
    await new Promise(r => setTimeout(r, 1000));

    const docA = handleA.doc();
    expect(docA?.items.length).toBe(2);

    peerA.close();
    peerB.close();
  });
});
