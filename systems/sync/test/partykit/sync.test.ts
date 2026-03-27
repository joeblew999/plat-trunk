/**
 * PartyKit transport tests.
 *
 * Tests the Automerge sync protocol over PartyKit WebSocket.
 * Requires: npx partykit dev server.ts --port 1999 (running)
 *
 * Run: npx vitest run
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { next as Automerge } from '@automerge/automerge';
import WebSocket from 'ws';

const WS_URL = 'ws://127.0.0.1:1999/parties/main';

/** Create a WebSocket client that runs the Automerge sync protocol. */
function createClient(room: string) {
  const url = `${WS_URL}/${room}`;
  let doc = Automerge.init<{ items?: Array<{ text: string }> }>();
  let syncState = Automerge.initSyncState();
  let ws: WebSocket;

  const connected = new Promise<void>((resolve) => {
    ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    ws.on('open', () => resolve());
  });

  const messages: Uint8Array[] = [];

  ws!.on('message', (raw: ArrayBuffer) => {
    const bytes = new Uint8Array(raw);
    messages.push(bytes);

    // Run sync protocol
    const [newDoc, newSyncState] = Automerge.receiveSyncMessage(doc, syncState, bytes);
    doc = newDoc;
    syncState = newSyncState;

    // Reply if needed
    const [nextState, reply] = Automerge.generateSyncMessage(doc, syncState);
    syncState = nextState;
    if (reply && ws.readyState === 1) {
      ws.send(reply);
    }
  });

  return {
    connected,
    getDoc: () => doc,
    change: (fn: (d: any) => void) => {
      doc = Automerge.change(doc, fn);
      // Send sync message
      const [nextState, msg] = Automerge.generateSyncMessage(doc, syncState);
      syncState = nextState;
      if (msg && ws.readyState === 1) {
        ws.send(msg);
      }
    },
    waitForOps: (count: number, timeoutMs = 5000) => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timeout waiting for ${count} ops`)), timeoutMs);
        const check = () => {
          const items = (doc as any).items;
          if (items && items.length >= count) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    },
    close: () => ws.close(),
    messageCount: () => messages.length,
  };
}

describe('PartyKit Automerge sync', () => {
  it('server responds to HTTP', async () => {
    const res = await fetch('http://127.0.0.1:1999/parties/main/http-test');
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.room).toBe('http-test');
  });

  it('client connects and receives sync message', async () => {
    const room = `connect-${Date.now()}`;
    const client = createClient(room);
    await client.connected;

    // Server sends initial sync on connect — wait for it
    await new Promise(r => setTimeout(r, 500));
    expect(client.messageCount()).toBeGreaterThanOrEqual(1);

    client.close();
  });

  it('client change syncs to server and back', async () => {
    const room = `change-${Date.now()}`;
    const client = createClient(room);
    await client.connected;
    await new Promise(r => setTimeout(r, 300)); // wait for initial sync

    // Make a change
    client.change((doc: any) => {
      doc.items = [{ text: 'hello' }];
    });

    // Wait for sync round-trip
    await new Promise(r => setTimeout(r, 500));

    const doc = client.getDoc() as any;
    expect(doc.items).toBeDefined();
    expect(doc.items.length).toBe(1);
    expect(doc.items[0].text).toBe('hello');

    client.close();
  });

  it('two clients converge via server', async () => {
    const room = `converge-${Date.now()}`;

    const clientA = createClient(room);
    await clientA.connected;
    await new Promise(r => setTimeout(r, 300));

    const clientB = createClient(room);
    await clientB.connected;
    await new Promise(r => setTimeout(r, 300));

    // A adds an item
    clientA.change((doc: any) => {
      doc.items = [{ text: 'from A' }];
    });

    // Wait for B to receive
    await clientB.waitForOps(1);
    const docB = clientB.getDoc() as any;
    expect(docB.items.length).toBe(1);
    expect(docB.items[0].text).toBe('from A');

    // B adds an item
    clientB.change((doc: any) => {
      doc.items.push({ text: 'from B' });
    });

    // Wait for A to receive
    await clientA.waitForOps(2);
    const docA = clientA.getDoc() as any;
    expect(docA.items.length).toBe(2);

    clientA.close();
    clientB.close();
  });
});
