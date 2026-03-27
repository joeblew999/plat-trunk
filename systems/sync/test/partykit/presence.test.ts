/**
 * Presence tests — ephemeral message broadcast via Durable Objects.
 *
 * Tests the Presence DO at /parties/presence/:room.
 * Ephemeral messages (cursor position, selection) are broadcast to all
 * peers but NOT persisted.
 *
 * Requires: npx wrangler dev --port 1999 (running)
 */

import { describe, it, expect } from 'vitest';
import WebSocket from 'ws';

const WS_URL = 'ws://127.0.0.1:1999/parties/presence';

function createPresenceClient(room: string) {
  const url = `${WS_URL}/${room}`;
  let ws: WebSocket;
  const received: string[] = [];

  const connected = new Promise<void>((resolve) => {
    ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    ws.on('open', () => resolve());
  });

  ws!.on('message', (raw: ArrayBuffer) => {
    const text = new TextDecoder().decode(raw);
    received.push(text);
  });

  return {
    connected,
    send: (data: string) => ws.send(data),
    received,
    waitForMessage: (timeoutMs = 5000) => {
      return new Promise<string>((resolve, reject) => {
        const startLen = received.length;
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for message')), timeoutMs);
        const check = () => {
          if (received.length > startLen) {
            clearTimeout(timeout);
            resolve(received[received.length - 1]);
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      });
    },
    close: () => ws.close(),
  };
}

describe('Presence DO — ephemeral broadcast (/parties/presence)', () => {
  it('HTTP status check', async () => {
    const res = await fetch(`http://127.0.0.1:1999/parties/presence/status-test`);
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.type).toBe('presence');
  });

  it('message from A broadcasts to B', async () => {
    const room = `presence-${Date.now()}`;

    const clientA = createPresenceClient(room);
    await clientA.connected;

    const clientB = createPresenceClient(room);
    await clientB.connected;
    await new Promise(r => setTimeout(r, 200));

    // A sends cursor position
    const cursor = JSON.stringify({ actorId: 'A', x: 100, y: 200 });
    clientA.send(cursor);

    // B should receive it
    const msg = await clientB.waitForMessage();
    const parsed = JSON.parse(msg);
    expect(parsed.actorId).toBe('A');
    expect(parsed.x).toBe(100);
    expect(parsed.y).toBe(200);

    // A should NOT receive its own message
    expect(clientA.received.length).toBe(0);

    clientA.close();
    clientB.close();
  });

  it('multiple peers receive broadcast', async () => {
    const room = `presence-multi-${Date.now()}`;

    const clientA = createPresenceClient(room);
    const clientB = createPresenceClient(room);
    const clientC = createPresenceClient(room);
    await Promise.all([clientA.connected, clientB.connected, clientC.connected]);
    await new Promise(r => setTimeout(r, 500));

    // Set up waiters before sending
    const waitB = clientB.waitForMessage();
    const waitC = clientC.waitForMessage();

    clientA.send('hello from A');

    const [msgB, msgC] = await Promise.all([waitB, waitC]);
    expect(msgB).toBe('hello from A');
    expect(msgC).toBe('hello from A');

    clientA.close();
    clientB.close();
    clientC.close();
  });
});
