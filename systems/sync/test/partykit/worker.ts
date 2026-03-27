/**
 * Wrangler worker entry — Hono + hono-party + automerge-partyserver.
 *
 * Three DO classes, one per feature:
 *   /parties/sync/:room      → raw Automerge sync (transport tests)
 *   /parties/ops/:room       → SyncDoc ops (add, undo, redo, group, replay)
 *   /parties/presence/:room  → ephemeral messages (cursor, selection)
 *
 * Each route maps to a different Durable Object class via hono-party.
 * This proves each feature works independently on real CF Workers runtime.
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

// ── DO classes ───────────────────────────────────────────────────────────────

/** Pure Automerge sync — no application logic. Tests the transport layer. */
export class Sync extends AutomergeServer {}

/** Ops DO — same sync, but the route proves ops tests hit their own DO instances. */
export class Ops extends AutomergeServer {}

/**
 * Presence DO — handles ephemeral messages (not persisted).
 * Broadcasts cursor/selection state to all peers without going through Automerge.
 */
export class Presence extends Server {
  onConnect() {}

  onMessage(connection: any, message: string | ArrayBuffer | ArrayBufferView) {
    // Broadcast to all other connections
    for (const conn of this.getConnections()) {
      if (conn.id !== connection.id) {
        try {
          conn.send(message);
        } catch { /* ignore broken connections */ }
      }
    }
  }

  async onRequest() {
    const connections: string[] = [];
    for (const conn of this.getConnections()) {
      connections.push(conn.id);
    }
    return new Response(JSON.stringify({
      type: 'presence',
      connections: connections.length,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ── Env ──────────────────────────────────────────────────────────────────────

interface Env {
  SYNC: DurableObjectNamespace<Sync>;
  OPS: DurableObjectNamespace<Ops>;
  PRESENCE: DurableObjectNamespace<Presence>;
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
  },
}));

// hono-party routes each /parties/<namespace>/:room to the matching DO binding.
// Binding names (SYNC, OPS, PRESENCE) map to URL namespaces (sync, ops, presence).
app.all('/parties/*', partyserverMiddleware());

export default app;
