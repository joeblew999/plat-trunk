/**
 * Wrangler worker entry — Hono + hono-party + automerge-partyserver.
 *
 * Uses the REAL stack:
 *   - Hono for HTTP routing
 *   - hono-party middleware for PartyKit-style WebSocket routing
 *   - automerge-partyserver for Automerge CRDT sync in Durable Objects
 *
 * Run: npx wrangler dev
 */

// Polyfills MUST run before any automerge-repo imports
import './polyfill.ts';

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { partyserverMiddleware } from 'hono-party';
import { AutomergeServer } from 'automerge-partyserver';

// Export the DO class — wrangler binds it via wrangler.toml as MAIN
export class Main extends AutomergeServer {}

interface Env {
  MAIN: DurableObjectNamespace<Main>;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Room info
app.get('/api/rooms/:room', async (c) => {
  const room = c.req.param('room');
  return c.json({ room, status: 'active' });
});

// hono-party middleware handles /parties/main/:room
// Routes WebSocket upgrades + HTTP to the Main DO
app.all('/parties/*', partyserverMiddleware());

export default app;
