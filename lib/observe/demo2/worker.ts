/**
 * CF Worker demo-2 — same patterns as bun.ts but runs under wrangler.
 *   cd lib/observe/demo2 && bunx wrangler dev worker.ts --port 3336
 *
 * Second demo worker (simulates "auth" service) — validates setupLog()
 * works across multiple independent CF Workers.
 */

import { Hono } from 'hono'
import { setupLog } from '../setup'
import type { LogEnv } from '../index'

const app = new Hono<LogEnv>()
const { createLogger } = setupLog(app, 'log-demo-2')

const auth = createLogger('auth')
const session = createLogger('session')

// ── Same demo routes as bun.ts — validate patterns under CF runtime ──

app.get('/api/demo/health', (c) => {
  c.var.log.info('health-check')
  return c.json({ status: 'ok', service: 'log-demo-2' })
})

app.get('/api/demo/timed', async (c) => {
  const result = await c.var.log.timed('db.query', async () => {
    await new Promise(r => setTimeout(r, 10 + Math.random() * 50))
    return { userId: 'user-' + Date.now(), role: 'admin' }
  }, { table: 'users', queryType: 'select' })
  return c.json(result)
})

app.get('/api/demo/timed-fail', async (c) => {
  try {
    await c.var.log.timed('db.migrate', async () => {
      await new Promise(r => setTimeout(r, 5 + Math.random() * 20))
      throw new Error('Column "email" already exists')
    }, { migration: '0042_add_email' })
  } catch { /* error already logged by timed() */ }
  return c.json({ error: 'migration failed' }, 500)
})

app.get('/api/demo/child', (c) => {
  const userLog = c.var.log.child({ userId: 'user-abc-123' })
  userLog.info('session-created', { ttl: 3600 })
  userLog.warn('rate-limit-near', { remaining: 5, limit: 100 })
  return c.json({ ok: true })
})

app.get('/api/demo/throw', () => { throw new Error('deliberate test error from demo-2') })

app.get('/api/demo/error', (c) => {
  c.var.log.error('token-expired', new Error('JWT signature mismatch'), {
    userId: 'user-xyz', tokenAge: 7200,
  })
  return c.json({ error: 'authentication failed' }, 401)
})

app.get('/api/demo/worker-log', (c) => {
  auth.info('login', { userId: 'user-abc', method: 'oauth', provider: 'github' })
  session.warn('session-stale', { userId: 'user-xyz', idleMinutes: 45 })
  return c.json({ logged: true })
})

// ── Minimal browser page — same buttons, no bundler needed ───────────

app.get('/', (c) => c.html(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>demo2 — log-demo-2</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #111; color: #ccc; font-family: system-ui, sans-serif; font-size: 13px; padding: 1.5rem; max-width: 480px; }
  h1 { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
  #status { font-size: 11px; color: #666; margin-bottom: 1rem; }
  h2 { font-size: 12px; color: #888; font-weight: 400; margin: 1rem 0 6px; }
  .btns { display: flex; flex-wrap: wrap; gap: 4px; }
  button { background: #222; color: #ccc; border: 1px solid #333; padding: 4px 10px; border-radius: 3px; cursor: pointer; font: inherit; font-size: 12px; }
  button:hover { background: #333; }
  button.w { color: #fbbf24; border-color: #fbbf24; }
  button.e { color: #f87171; border-color: #f87171; }
  #log { background: #0a0a0a; border-radius: 3px; padding: 6px; margin-top: 1rem; max-height: 200px; overflow-y: auto; font-size: 11px; font-family: 'SF Mono', monospace; min-height: 40px; }
</style>
</head><body data-testid="demo2">
<h1>demo2 — log-demo-2</h1>
<div id="status" data-testid="status"></div>

<h2>Browser logs (queued, flushed to worker)</h2>
<div class="btns">
  <button data-testid="browser-info"  onclick="bl('info','auth','login')">info</button>
  <button data-testid="browser-warn"  class="w" onclick="bl('warn','session','stale')">warn</button>
  <button data-testid="browser-error" class="e" onclick="bl('error','auth','failed')">error</button>
</div>

<h2>Worker calls (fetch to worker API)</h2>
<div class="btns">
  <button data-testid="worker-health"     onclick="wf('api/demo/health')">health</button>
  <button data-testid="worker-timed"      onclick="wf('api/demo/timed')">timed</button>
  <button data-testid="worker-timed-fail" class="e" onclick="wf('api/demo/timed-fail')">timed-fail</button>
  <button data-testid="worker-child"      onclick="wf('api/demo/child')">child</button>
  <button data-testid="worker-throw"      class="e" onclick="wf('api/demo/throw')">throw</button>
  <button data-testid="worker-error"      class="e" onclick="wf('api/demo/error')">error</button>
  <button data-testid="worker-log"        onclick="wf('api/demo/worker-log')">worker-log</button>
</div>

<div id="log" data-testid="log"></div>

<script>
const logEl = document.getElementById('log')
const deviceId = localStorage.getItem('plat-device-id') || (() => {
  const id = crypto.randomUUID(); localStorage.setItem('plat-device-id', id); return id
})()
const queue = []

function bl(level, system, event) {
  queue.push({ ts: new Date().toISOString(), source: 'browser', kind: level === 'error' ? 'error' : 'app', system, event, level, deviceId })
  plog(level, system + ':' + event)
}

setInterval(async () => {
  if (!queue.length) return
  const batch = queue.splice(0, queue.length)
  try { await fetch('api/debug/logs/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(batch) }) }
  catch { queue.unshift(...batch) }
}, 2000)

async function wf(path) {
  try { const r = await fetch(path); plog(r.ok ? 'info' : 'error', path + ' ' + r.status) }
  catch { plog('error', path + ' FAILED') }
}

function plog(level, msg) {
  const c = { info: '#4ade80', warn: '#fbbf24', error: '#f87171' }
  const d = document.createElement('div')
  d.style.color = c[level] || '#ccc'
  d.dataset.testid = 'log-entry'
  d.dataset.level = level
  d.textContent = new Date().toLocaleTimeString('en', { hour12: false }) + ' ' + msg
  logEl.appendChild(d)
  logEl.scrollTop = logEl.scrollHeight
  while (logEl.children.length > 30) logEl.removeChild(logEl.firstChild)
}

setInterval(() => {
  const on = navigator.onLine
  document.getElementById('status').innerHTML =
    '<span style="color:' + (on ? '#4ade80' : '#f87171') + '">' + (on ? 'online' : 'offline') + '</span> · ' + deviceId.slice(0, 8)
}, 1000)
</script>
</body></html>`))

export default app
