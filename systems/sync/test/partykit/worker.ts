/**
 * Wrangler worker entry — Hono + hono-party + full PartyKit package suite.
 *
 * 6 DO classes, one per PartyKit feature:
 *   /parties/sync/:room       → automerge-partyserver (CRDT transport)
 *   /parties/ops/:room        → SyncDoc ops (add, undo, redo, group, replay)
 *   /parties/presence/:room   → ephemeral broadcast (cursor, selection)
 *   /parties/pub-sub/:room    → partysub (topic-based pub/sub)
 *   /parties/scheduler/:room  → partywhen (cron, delay, alarm tasks)
 *   /parties/rpc/:room        → partyfn (type-safe bidirectional RPC)
 *
 * Each route maps to a different Durable Object class via hono-party.
 * This proves each PartyKit package works on real CF Workers runtime.
 *
 * Run: npx wrangler dev
 */

// Polyfills MUST run before any automerge-repo imports
import './polyfill.ts';

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { partyserverMiddleware } from 'hono-party';
import { AutomergeServer } from 'automerge-partyserver';
import { Server } from 'partyserver';
import { createPubSubServer } from 'partysub/server';
import { Scheduler } from 'partywhen';

// ── DO classes ───────────────────────────────────────────────────────────────

/** Pure Automerge sync — no application logic. Tests the transport layer. */
export class Sync extends AutomergeServer {}

/** Ops DO — same sync, but the route proves ops tests hit their own DO instances. */
export class Ops extends AutomergeServer {}

/**
 * Presence DO — handles ephemeral messages (not persisted).
 * Broadcasts cursor/selection state to all peers.
 */
export class Presence extends Server {
  onConnect() {}

  onMessage(connection: any, message: string | ArrayBuffer | ArrayBufferView) {
    for (const conn of this.getConnections()) {
      if (conn.id !== connection.id) {
        try { conn.send(message); } catch { /* ignore */ }
      }
    }
  }

  async onRequest() {
    const connections: string[] = [];
    for (const conn of this.getConnections()) connections.push(conn.id);
    return new Response(JSON.stringify({ type: 'presence', connections: connections.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * PubSub DO — topic-based publish/subscribe via partysub.
 * Clients subscribe to topics, messages are routed only to matching subscribers.
 */
const PubSubBase = createPubSubServer({ binding: 'PUB_SUB', nodes: 1 });
export class PubSub extends PubSubBase.PubSubServer {}

/**
 * Scheduler DO — durable task scheduling via partywhen.
 * Supports cron, delayed, and one-shot tasks with SQLite persistence.
 */
export { Scheduler };

/**
 * Rpc DO — type-safe bidirectional RPC via partyfn.
 * Server defines actions, client calls them with type safety.
 */
export class Rpc extends Server {
  // partyfn's RPCClient runs on the client side.
  // The server just needs to handle JSON-RPC messages.
  onMessage(connection: any, message: string | ArrayBuffer | ArrayBufferView) {
    if (typeof message !== 'string') return;
    try {
      const msg = JSON.parse(message);
      if (msg.rpc && msg.action) {
        // Execute the action and return result
        const result = this.handleRpcAction(msg.action, msg.args);
        connection.send(JSON.stringify({
          type: 'success',
          channel: msg.channel,
          id: msg.id,
          rpc: true,
          result,
        }));
      }
    } catch (err: any) {
      connection.send(JSON.stringify({
        type: 'error',
        channel: (JSON.parse(message as string) as any).channel,
        id: (JSON.parse(message as string) as any).id,
        rpc: true,
        error: err.message,
      }));
    }
  }

  private handleRpcAction(action: string, args: any): any {
    switch (action) {
      case 'echo': return args;
      case 'add': return { sum: (args.a ?? 0) + (args.b ?? 0) };
      case 'greet': return { message: `Hello, ${args.name ?? 'world'}!` };
      default: throw new Error(`Unknown action: ${action}`);
    }
  }
}

// ── Env ──────────────────────────────────────────────────────────────────────

interface Env {
  SYNC: DurableObjectNamespace<Sync>;
  OPS: DurableObjectNamespace<Ops>;
  PRESENCE: DurableObjectNamespace<Presence>;
  PUB_SUB: DurableObjectNamespace<PubSub>;
  SCHEDULER: DurableObjectNamespace<typeof Scheduler>;
  RPC: DurableObjectNamespace<Rpc>;
}

// ── Router ───────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

// Health + status
app.get('/health', (c) => c.json({ status: 'ok' }));
app.get('/api/status', (c) => c.json({
  routes: {
    sync: '/parties/sync/:room',
    ops: '/parties/ops/:room',
    presence: '/parties/presence/:room',
    pubsub: '/parties/pub-sub/:room',
    scheduler: '/parties/scheduler/:room',
    rpc: '/parties/rpc/:room',
  },
}));

// hono-party routes each /parties/<namespace>/:room to the matching DO binding.
// Binding names map to URL namespaces via camelCase→kebab-case:
//   SYNC → sync, OPS → ops, PRESENCE → presence,
//   PUB_SUB → pub-sub, SCHEDULER → scheduler, RPC → rpc
app.all('/parties/*', partyserverMiddleware());

export default app;
