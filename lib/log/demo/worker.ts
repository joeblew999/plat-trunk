/**
 * Minimal CF Worker entry for the log demo.
 *   cd lib/log/demo && bunx wrangler dev worker.ts --port 3335
 */

import { Hono } from 'hono'
import { setupLog } from '../setup'
import type { LogEnv } from '../index'

const app = new Hono<LogEnv>()
const { createLogger } = setupLog(app, 'log-demo')

// Worker-side log generation
let tick = 0
const sync = createLogger('sync')
const truck = createLogger('truck')

app.use('/api/debug/*', async (c, next) => {
  tick++
  sync.info('heartbeat', { tick })
  if (tick % 3 === 0) truck.warn('gc', { evicted: Math.floor(Math.random() * 5) })
  await next()
})

// Test error handler
app.get('/debug/throw', () => { throw new Error('deliberate test error') })

// Browser client page
app.get('/', (c) => c.html(`<!DOCTYPE html>
<html><head><title>log demo (wrangler)</title>
<style>
  body { background: #1a1a2e; color: #e0e0e0; font-family: 'SF Mono', monospace; font-size: 14px; padding: 20px; }
  #status { color: #4ade80; margin: 12px 0; }
  a { color: #60a5fa; }
  .section { margin: 16px 0; padding: 12px; background: #16213e; border-radius: 6px; }
</style>
</head><body>
<h2>log demo (CF Worker via wrangler)</h2>
<div id="status">starting...</div>
<div class="section">
  <a href="/api/debug/logs/viewer" target="_blank">Open log viewer</a>
</div>
<script>
const deviceId = localStorage.getItem('plat-device-id') || (() => {
  const id = crypto.randomUUID()
  localStorage.setItem('plat-device-id', id)
  return id
})()

const queue = []
let tick = 0

function log(system, event, level, data) {
  queue.push({ ts: new Date().toISOString(), source: 'browser', kind: 'app', system, event, level, deviceId, ...data })
}

setInterval(() => {
  tick++
  log('sync', 'ui-action', 'info', { action: 'click', target: 'btn-' + (tick % 3) })
  if (tick % 3 === 0) log('truck', 'render', 'debug', { fps: 55 + Math.floor(Math.random() * 10) })
  if (tick % 5 === 0) log('sync', 'slow-op', 'warn', { durationMs: 200 + Math.floor(Math.random() * 300) })
}, 1500)

setInterval(async () => {
  if (queue.length === 0) return
  const batch = queue.splice(0, queue.length)
  try {
    await fetch('/api/debug/logs/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    })
  } catch {
    queue.unshift(...batch)
  }
}, 2000)

setInterval(() => {
  document.getElementById('status').textContent =
    'online: ' + navigator.onLine + ' | tick: ' + tick + ' | device: ' + deviceId.slice(0, 8)
}, 500)
</script>
</body></html>`))

export default app
