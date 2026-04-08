// auth-better/worker/src/index.ts
//
// Routes:
//   GET  /health         — health check
//   POST /auth/migrate   — run better-auth DB migrations (first boot)
//   ALL  /auth/api/*     — better-auth handler (sign-in, sign-up, sessions, plugins)
//   *                    — fall through to ASSETS (built React SPA)
//
// Dev:  Vite runs separately on :5174 with a proxy — ASSETS binding unused.
// Prod: wrangler serves web/dist/ via ASSETS for all non-API routes.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getMigrations } from 'better-auth/db/migration';
import { createAuth } from './auth';
import type { Bindings } from './auth';

const app = new Hono<{ Bindings: Bindings & { ASSETS: Fetcher } }>();

// ── CORS (dev only — in prod everything is same-origin) ───────────────────────

app.use('/auth/api/*', cors({
  origin: (origin) => origin, // reflect origin — BETTER_AUTH_URL handles validation
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ ok: true, service: 'auth-better-worker' }));

// ── Migrate — run once on first boot ─────────────────────────────────────────

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

// ── better-auth handler ───────────────────────────────────────────────────────

app.all('/auth/api/*', async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

// ── Static assets — React SPA (production) ───────────────────────────────────
// In dev, Vite serves the frontend on :5174 — this route is never hit.
// In production, wrangler serves web/dist/ via the ASSETS binding.

app.get('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
