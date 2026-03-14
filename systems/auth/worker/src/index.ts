// systems/auth/worker/src/index.ts
// Auth worker — Hono app wrapping better-auth-cloudflare.
//
// Routes:
//   /auth/api/*   → better-auth handler (sign-in, sign-up, session, etc.)
//   /auth/*       → static web UI (ASSETS binding — systems/auth/web/dist)
//   /auth/health  → health check

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuth, type CloudflareBindings } from './auth';

type Bindings = CloudflareBindings & {
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS — allow requests from the main CAD app origin
app.use('/auth/api/*', cors({
  origin: ['https://cad.ubuntusoftware.net', 'http://localhost:8788'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Health check
app.get('/auth/health', (c) => c.json({ ok: true, service: 'auth-worker' }));

// Session endpoint — used by truck UI to check auth state
app.get('/auth/api/session', async (c) => {
  const auth = createAuth(c.env, c.req.raw.cf as IncomingRequestCfProperties);
  return auth.handler(c.req.raw);
});

// better-auth handles all /auth/api/* routes
// Covers: /sign-in/email, /sign-up/email, /sign-out,
//         /forget-password, /reset-password, /verify-email, /get-session
app.all('/auth/api/*', async (c) => {
  // Strip /auth prefix — better-auth expects routes without it
  const url = new URL(c.req.url);
  url.pathname = url.pathname.replace(/^\/auth/, '');
  const auth = createAuth(c.env, c.req.raw.cf as IncomingRequestCfProperties);
  return auth.handler(new Request(url.toString(), c.req.raw));
});

// Static web UI — sign-in/sign-up/reset pages
app.all('/auth/*', async (c) => {
  const url = new URL(c.req.url);
  url.pathname = url.pathname.replace(/^\/auth/, '') || '/';
  return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
});

// Root redirect → /auth/sign-in
app.get('/', (c) => c.redirect('/auth/sign-in', 302));

export default app;
