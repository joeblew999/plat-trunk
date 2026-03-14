// systems/auth/worker/src/index.ts
// Auth worker — Hono app wrapping better-auth-cloudflare.
//
// Routes:
//   /auth/health  → health check
//   /auth/api/*   → better-auth handler (basePath: /auth/api)
//   /auth/*       → static web UI (ASSETS binding — systems/auth/web/dist)
//   /             → redirect → /auth/sign-in

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuth, type CloudflareBindings } from './auth';

type Bindings = CloudflareBindings & {
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS — allow the main CAD app to call auth API
app.use('/auth/api/*', cors({
  origin: ['https://cad.ubuntusoftware.net', 'http://localhost:8788', 'http://localhost:5174'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Health check
app.get('/auth/health', (c) => c.json({ ok: true, service: 'auth-worker' }));

// better-auth API — forward full request URL, basePath is configured in auth.ts as /auth/api
app.all('/auth/api/*', async (c) => {
  const auth = createAuth(c.env, c.req.raw.cf as IncomingRequestCfProperties);
  return auth.handler(c.req.raw);
});

// Static web UI — sign-in/sign-up/reset/verify pages
app.all('/auth/*', async (c) => {
  const url = new URL(c.req.url);
  url.pathname = url.pathname.replace(/^\/auth/, '') || '/';
  return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
});

// Root redirect
app.get('/', (c) => c.redirect('/auth/sign-in', 302));

export default app;
