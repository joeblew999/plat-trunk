/**
 * partyfn tests — type-safe bidirectional RPC via Durable Objects.
 *
 * Route: /parties/rpc/:room
 * Client sends JSON-RPC actions, server executes and returns results.
 *
 * Requires: npx wrangler dev --port 1999 (running)
 */

import { describe, it, expect } from 'vitest';
import WebSocket from 'ws';

const WS_URL = 'ws://127.0.0.1:1999/parties/rpc';

function createRpcClient(room: string) {
  const url = `${WS_URL}/${room}`;
  let ws: WebSocket;
  const responses = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void }>();

  const connected = new Promise<void>((resolve) => {
    ws = new WebSocket(url);
    ws.on('open', () => resolve());
  });

  ws!.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.rpc && msg.id) {
        const pending = responses.get(msg.id);
        if (pending) {
          responses.delete(msg.id);
          if (msg.type === 'success') pending.resolve(msg.result);
          else pending.reject(new Error(msg.error));
        }
      }
    } catch { /* ignore */ }
  });

  return {
    connected,
    call: (action: string, args: any = {}, channel = 'default'): Promise<any> => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      return new Promise((resolve, reject) => {
        responses.set(id, { resolve, reject });
        setTimeout(() => {
          responses.delete(id);
          reject(new Error(`RPC timeout: ${action}`));
        }, 5000);
        ws.send(JSON.stringify({ rpc: true, action, args, id, channel }));
      });
    },
    close: () => ws.close(),
  };
}

describe('partyfn — RPC (/parties/rpc)', () => {
  it('echo action returns args', async () => {
    const room = `rpc-echo-${Date.now()}`;
    const client = createRpcClient(room);
    await client.connected;

    const result = await client.call('echo', { hello: 'world' });
    expect(result.hello).toBe('world');

    client.close();
  });

  it('add action returns sum', async () => {
    const room = `rpc-add-${Date.now()}`;
    const client = createRpcClient(room);
    await client.connected;

    const result = await client.call('add', { a: 3, b: 7 });
    expect(result.sum).toBe(10);

    client.close();
  });

  it('greet action returns message', async () => {
    const room = `rpc-greet-${Date.now()}`;
    const client = createRpcClient(room);
    await client.connected;

    const result = await client.call('greet', { name: 'PartyKit' });
    expect(result.message).toBe('Hello, PartyKit!');

    client.close();
  });

  it('unknown action returns error', async () => {
    const room = `rpc-error-${Date.now()}`;
    const client = createRpcClient(room);
    await client.connected;

    await expect(client.call('nonexistent')).rejects.toThrow('Unknown action');

    client.close();
  });
});
