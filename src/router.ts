// Root router — routes all traffic to sub-workers, serves docs assets.
// Uses Hono for consistency with truck-cad worker.
// Keep this thin. No business logic here.
//
// Dev:  /docs/* → proxy to VitePress dev server (port 5176, live HMR)
// Prod: /docs/* → DOCS_ASSETS binding (static build)

import { Hono } from 'hono';

type Bindings = {
  DOCS_ASSETS: Fetcher;
  TRUCK: Fetcher;
  TEST: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// ── Docs (VitePress) ────────────────────────────────────

app.get('/docs', (c) => c.redirect('/docs/', 301));

app.all('/docs/*', async (c) => {
  // Dev mode: proxy to VitePress dev server for live HMR.
  // VitePress dev serves at /docs/ (matching base config).
  const host = new URL(c.req.url).hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    const devUrl = new URL(c.req.url);
    devUrl.protocol = 'http:';
    devUrl.hostname = 'localhost';
    devUrl.port = '5176';
    try {
      return await fetch(new Request(devUrl.toString(), c.req.raw));
    } catch {
      // VitePress dev not running — fall through to static assets
    }
  }

  // Prod mode: serve from DOCS_ASSETS binding.
  const assetPath = c.req.path.replace(/^\/docs/, '') || '/';
  const assetUrl = new URL(c.req.url);
  assetUrl.pathname = assetPath;

  let response = await c.env.DOCS_ASSETS.fetch(new Request(assetUrl.toString(), c.req.raw));

  // Clean URLs: if 404 and no file extension, try .html
  if (response.status === 404 && !assetPath.match(/\.\w+$/) && assetPath !== '/') {
    const htmlUrl = new URL(c.req.url);
    htmlUrl.pathname = assetPath.replace(/\/$/, '') + '.html';
    response = await c.env.DOCS_ASSETS.fetch(new Request(htmlUrl.toString(), c.req.raw));
  }

  // Rewrite redirect Location to include /docs/ prefix
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (location && location.startsWith('/') && !location.startsWith('/docs/')) {
      const headers = new Headers(response.headers);
      headers.set('location', '/docs' + location);
      return new Response(response.body, { status: response.status, headers });
    }
  }

  return response;
});

// ── Test worker ─────────────────────────────────────────

app.get('/test', (c) => c.redirect('/test/', 301));

app.all('/test/*', async (c) => {
  const stripped = new URL(c.req.url);
  stripped.pathname = stripped.pathname.replace(/^\/test/, '') || '/';
  return c.env.TEST.fetch(new Request(stripped.toString(), c.req.raw));
});

// ── Everything else → truck-cad ─────────────────────────

app.all('*', async (c) => {
  return c.env.TRUCK.fetch(c.req.raw);
});

export default app;
