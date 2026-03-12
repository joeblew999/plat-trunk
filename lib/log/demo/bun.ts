/**
 * Full standalone demo — real worker + real browser.
 *
 *   bun lib/log/demo/bun.ts
 *   open http://localhost:3333
 */

import { Hono } from 'hono'
import { setupLog } from '../setup'
import type { LogEnv } from '../index'

const app = new Hono<LogEnv>()
const { createLogger, urls } = setupLog(app, 'log-demo')

// ── Bundle browser entry ────────────────────────────────────────────

const buildResult = await Bun.build({
  entrypoints: [import.meta.dir + '/browser.ts'],
  target: 'browser',
  minify: false,
})

if (!buildResult.success) {
  console.error('Failed to bundle browser entry:', buildResult.logs)
  process.exit(1)
}

const browserBundle = await buildResult.outputs[0].text()

// ── Routes ──────────────────────────────────────────────────────────

app.get('/', (c) => c.html(TEST_PAGE))
app.get('/bundle.js', (c) => new Response(browserBundle, {
  headers: { 'Content-Type': 'application/javascript' },
}))

// Test error handler
app.get('/debug/throw', () => { throw new Error('deliberate test error') })

// ── Worker-side logs (simulated) ────────────────────────────────────

const sync = createLogger('sync')
const truck = createLogger('truck')
const router = createLogger('router')

let tick = 0
setInterval(() => {
  tick++
  sync.info('heartbeat', { tick })
  if (tick % 3 === 0) truck.warn('gc', { evicted: Math.floor(Math.random() * 5) })
  if (tick % 5 === 0) sync.info('merge', { modelId: 'model-1', localOps: tick, remoteOps: tick - 2 })
  if (tick % 7 === 0) router.error('timeout', new Error('upstream timeout'), { path: '/api/models/m1/scene', ms: 5000 + Math.random() * 2000 })
  if (tick % 4 === 0) sync.debug('ping', { latencyMs: Math.floor(Math.random() * 100) })
}, 1000)

// ── Startup output ──────────────────────────────────────────────────

console.log('Log demo running on http://localhost:3333')
console.log('')
console.log('  Local:')
console.log(`    Demo page:   http://localhost:3333`)
console.log(`    Log viewer:  http://localhost:3333${urls.local.viewer}`)
console.log(`    SSE tail:    curl -N http://localhost:3333${urls.local.tail}`)
console.log(`    JSON API:    curl http://localhost:3333${urls.local.api}`)
console.log('')
if (urls.production) {
  console.log('  Deployed:')
  console.log(`    Log viewer:  ${urls.production.viewer}`)
  console.log(`    SSE tail:    ${urls.production.tail}`)
  console.log('')
}
if (urls.cf) {
  console.log('  CF Native Dashboards:')
  console.log(`    Live Logs:   ${urls.cf.logs}`)
  console.log(`    Traces:      ${urls.cf.traces}`)
  console.log(`    Analytics:   ${urls.cf.analytics}`)
  console.log('')
}
console.log('  Browser logs flush to worker every 2s.')
console.log('  Go offline (DevTools > Network > Offline) to test localStorage queue.')
console.log('')

export default { port: 3333, fetch: app.fetch }

// ── Test page HTML ──────────────────────────────────────────────────

const TEST_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>log demo — browser client</title>
<style>
  body { background: #1a1a2e; color: #e0e0e0; font-family: 'SF Mono', monospace; font-size: 14px; padding: 20px; }
  h1 { font-size: 18px; margin-bottom: 12px; }
  #status { color: #4ade80; margin-bottom: 16px; }
  a { color: #60a5fa; }
  .section { margin: 16px 0; padding: 12px; background: #16213e; border-radius: 6px; }
  code { color: #fbbf24; }
</style>
</head>
<body>
  <h1>lib/log — browser client running</h1>
  <div id="status">starting...</div>
  <div class="section">
    This page loads <code>browser.ts</code> (bundled).<br>
    It runs <code>setupBrowserLog</code> in a real browser.<br>
    Entries queue in <code>localStorage</code> when offline, flush when back online.
  </div>
  <div class="section">
    <a href="/api/debug/logs/viewer" target="_blank">Open log viewer</a> — see browser + worker entries merged live.
  </div>
  <div class="section">
    Test offline: DevTools → Network → check "Offline".<br>
    Entries queue locally. Uncheck "Offline" → they flush.
  </div>
  <script src="/bundle.js"></script>
</body>
</html>`
