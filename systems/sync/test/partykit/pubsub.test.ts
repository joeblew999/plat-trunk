/**
 * partysub tests — topic-based pub/sub via Durable Objects.
 *
 * Route: /parties/pub-sub/:room
 * Clients subscribe to topics via URL params, messages route to matching subscribers.
 *
 * Requires: npx wrangler dev --port 1999 (running)
 */

import { describe, it, expect } from 'vitest';
import WebSocket from 'ws';

const WS_URL = 'ws://127.0.0.1:1999/parties/pub-sub';

function createSubscriber(room: string, topics: string[]) {
  const url = `${WS_URL}/${room}?topics=${topics.join(',')}`;
  let ws: WebSocket;
  const received: Array<{ topic: string; data: any }> = [];

  const connected = new Promise<void>((resolve) => {
    ws = new WebSocket(url);
    ws.on('open', () => resolve());
  });

  ws!.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.topic) received.push(msg);
    } catch { /* ignore */ }
  });

  return {
    connected,
    received,
    publish: (topic: string, data: any) => {
      ws.send(JSON.stringify({ topic, data }));
    },
    waitForMessage: (timeoutMs = 5000) => {
      return new Promise<{ topic: string; data: any }>((resolve, reject) => {
        const startLen = received.length;
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for pubsub message')), timeoutMs);
        const check = () => {
          if (received.length > startLen) {
            clearTimeout(timeout);
            resolve(received[received.length - 1]);
          } else setTimeout(check, 50);
        };
        check();
      });
    },
    close: () => ws.close(),
  };
}

describe('partysub — topic pub/sub (/parties/pub-sub)', () => {
  it('subscriber receives message on matching topic', async () => {
    const room = `pubsub-${Date.now()}`;

    const subA = createSubscriber(room, ['updates']);
    const subB = createSubscriber(room, ['updates']);
    await Promise.all([subA.connected, subB.connected]);
    await new Promise(r => setTimeout(r, 300));

    const waitB = subB.waitForMessage();
    subA.publish('updates', { text: 'hello' });

    const msg = await waitB;
    expect(msg.topic).toBe('updates');
    expect(msg.data.text).toBe('hello');

    subA.close();
    subB.close();
  });

  it('subscriber does NOT receive message on non-matching topic', async () => {
    const room = `pubsub-filter-${Date.now()}`;

    const subA = createSubscriber(room, ['alerts']);
    const subB = createSubscriber(room, ['updates']);
    await Promise.all([subA.connected, subB.connected]);
    await new Promise(r => setTimeout(r, 300));

    subA.publish('alerts', { level: 'critical' });
    await new Promise(r => setTimeout(r, 500));

    // B subscribed to 'updates' only — should NOT receive 'alerts'
    expect(subB.received.length).toBe(0);

    subA.close();
    subB.close();
  });
});
