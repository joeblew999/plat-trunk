// systems/auth/worker/src/index.ts
//
// Auth worker — Hono + base better-auth v1.5
//
// Routes:
//   /auth/health     → health check
//   /auth/migrate    → POST to run DB migrations (call once per deploy)
//   /auth/api/*      → better-auth handler (basePath: /auth/api)
//   /auth/*          → static web UI (sign-in, sign-up, reset, verify, consent)

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getMigrations } from 'better-auth/db/migration';
import { createAuth, type CloudflareBindings } from './auth';

type Bindings = CloudflareBindings & {
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS — allow CAD app origins to call auth API
app.use('/auth/api/*', cors({
  origin: ['https://cad.ubuntusoftware.net', 'http://localhost:8788', 'http://localhost:5174'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Health
app.get('/auth/health', (c) => c.json({ ok: true, service: 'auth-worker' }));

// Programmatic migration — POST /auth/migrate once per new deploy
// Handles environments where the CLI isn't available (CF Workers)
app.post('/auth/migrate', async (c) => {
  try {
    const auth = createAuth(c.env);
    const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);
    if (toBeCreated.length === 0 && toBeAdded.length === 0) {
      return c.json({ ok: true, message: 'No migrations needed' });
    }
    await runMigrations();
    return c.json({ ok: true, created: toBeCreated, added: toBeAdded });
  } catch (err) {
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

// better-auth API — one instance per request (D1 bindings are request-scoped)
app.all('/auth/api/*', async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

// Static web UI
app.all('/auth/*', async (c) => {
  const url = new URL(c.req.url);
  url.pathname = url.pathname.replace(/^\/auth/, '') || '/';
  return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
});

// Root redirect
app.get('/', (c) => c.redirect('/auth/sign-in', 302));

export default app;
