/**
 * Primary router for multi-config wrangler dev.
 * Routes /demo1/* → log-demo, /demo2/* → log-demo-2.
 * Injects a nav bar into HTML responses.
 *
 * /mcp — federated MCP server: queries DEMO1 + DEMO2 via service bindings.
 * AI agents point here for a single observability endpoint across all workers.
 *
 * Tools: list_sources, query_all_logs, query_logs_demo1/demo2,
 *        get_trace_demo1/demo2, get_stats_all
 */

import { Hono } from 'hono'
import { mountFederatedMcpRoutes } from '../shared/mcp'

interface Env {
  DEMO1: { fetch(request: Request): Promise<Response> }
  DEMO2: { fetch(request: Request): Promise<Response> }
}

const NAV = `<nav data-testid="nav" style="font-family:system-ui,sans-serif;font-size:12px;padding:6px 12px;background:#1a1a1a;border-bottom:1px solid #333;display:flex;gap:12px;align-items:center;">
<a href="/" data-testid="nav-home" style="color:#888;text-decoration:none;">observe</a>
<a href="/demo1/" data-testid="nav-demo1" style="color:#7dd3fc;text-decoration:none;">demo1</a>
<a href="/demo2/" data-testid="nav-demo2" style="color:#7dd3fc;text-decoration:none;">demo2</a>
<a href="/mcp" data-testid="nav-mcp" style="color:#a78bfa;text-decoration:none;">mcp</a>
</nav>`

async function forward(binding: Env['DEMO1'], request: Request, path: string, prefix: string): Promise<Response> {
  const target = new URL(request.url)
  target.pathname = path.replace(new RegExp(`^/${prefix}`), '') || '/'
  const resp = await binding.fetch(new Request(target, request))

  // Inject nav into HTML responses
  if (resp.headers.get('content-type')?.includes('text/html')) {
    const html = await resp.text()
    return new Response(html.replace('<body', NAV + '<body'), {
      status: resp.status,
      headers: resp.headers,
    })
  }
  return resp
}

const HOME_HTML = (nav: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>observe</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #111; color: #ccc; font-family: system-ui, sans-serif; padding: 0; }
  main { padding: 1.5rem; }
  h1 { font-size: 14px; font-weight: 600; margin-bottom: 1rem; }
  ul { list-style: none; }
  li { margin-bottom: 0.5rem; }
  a { color: #7dd3fc; text-decoration: none; }
  a:hover { color: #fff; }
  small { color: #666; }
  .mcp { color: #a78bfa; }
</style>
</head><body>
${nav}
<main>
<h1>lib/observe</h1>
<ul>
  <li><a href="/demo1/" data-testid="link-demo1">demo1</a> <small>log-demo (sync/truck)</small></li>
  <li><a href="/demo2/" data-testid="link-demo2">demo2</a> <small>log-demo-2 (auth/session)</small></li>
  <li><a href="/mcp" class="mcp" data-testid="link-mcp">mcp</a> <small>federated MCP — all worker logs via service bindings</small></li>
</ul>
</main>
</body></html>`

// ── Hono app with federated MCP ───────────────────────────────────────────────

function buildApp(env: Env) {
  const app = new Hono<{ Bindings: Env }>()

  // Federated MCP: queries DEMO1 + DEMO2 via CF service bindings
  mountFederatedMcpRoutes(app, [
    { name: 'demo1', binding: env.DEMO1 },
    { name: 'demo2', binding: env.DEMO2 },
  ])

  // Home
  app.get('/', (c) => c.html(HOME_HTML(NAV)))

  // Proxy routes
  app.get('/demo1', (c) => c.redirect('/demo1/'))
  app.all('/demo1/*', async (c) => forward(env.DEMO1, c.req.raw, c.req.path, 'demo1'))
  app.get('/demo2', (c) => c.redirect('/demo2/'))
  app.all('/demo2/*', async (c) => forward(env.DEMO2, c.req.raw, c.req.path, 'demo2'))

  app.notFound((c) => c.text('Not Found', 404))

  return app
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return buildApp(env).fetch(request)
  },
}
