/**
 * CF Worker demo — same patterns as bun.ts but runs under wrangler.
 *   cd lib/observe/demo1 && bunx wrangler dev worker.ts --port 3335
 *
 * Tests CF-specific behaviour: invocation logs, automatic traces, wrangler tail.
 * Uses identical setupLog() wiring as bun.ts — if it works here, it works in truck-cad.
 */

import { Hono } from 'hono'
import { setupLog } from '../setup'
import type { LogEnv } from '../index'

const app = new Hono<LogEnv>()
const { createLogger } = setupLog(app, 'log-demo')

const sync = createLogger('sync')
const truck = createLogger('truck')

// ── Same demo routes as bun.ts — validate patterns under CF runtime ──

app.get('/api/demo/health', (c) => {
  c.var.log.info('health-check')
  return c.json({ status: 'ok', service: 'log-demo' })
})

app.get('/api/demo/timed', async (c) => {
  const result = await c.var.log.timed('wasm.addCube', async () => {
    await new Promise(r => setTimeout(r, 20 + Math.random() * 80))
    return { objectId: 'cube-' + Date.now(), vertices: 24 }
  }, { modelId: 'demo-model-1', sceneObjects: 5 })
  return c.json(result)
})

app.get('/api/demo/timed-fail', async (c) => {
  try {
    await c.var.log.timed('wasm.booleanSubtract', async () => {
      await new Promise(r => setTimeout(r, 10 + Math.random() * 40))
      throw new Error('This shell is not oriented and closed')
    }, { solidA: 'cube-1', solidB: 'sphere-2' })
  } catch { /* error already logged by timed() */ }
  return c.json({ error: 'boolean operation failed' }, 500)
})

app.get('/api/demo/child', (c) => {
  const modelLog = c.var.log.child({ modelId: 'demo-model-1' })
  modelLog.info('ops-loaded', { opCount: 42 })
  modelLog.warn('stale-ops', { staleSince: '2026-03-10T00:00:00Z' })
  return c.json({ ok: true })
})

app.get('/api/demo/throw', () => { throw new Error('deliberate test error') })

app.get('/api/demo/error', (c) => {
  c.var.log.error('validation-failed', new Error('invalid model ID'), {
    modelId: 'bad-id', reason: 'not a UUID',
  })
  return c.json({ error: 'validation failed' }, 400)
})

app.get('/api/demo/worker-log', (c) => {
  sync.info('merge', { modelId: 'demo-model-1', localOps: 10, remoteOps: 8 })
  truck.warn('memory-pressure', { heapBytes: 150_000_000, sceneObjects: 200 })
  return c.json({ logged: true })
})

// ── Minimal browser page — same buttons, no bundler needed ───────────

app.get('/', (c) => c.html(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>demo1 — log-demo</title>
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
</head><body data-testid="demo1">
<h1>demo1 — log-demo</h1>
<div id="status" data-testid="status"></div>

<h2>Browser logs (queued, flushed to worker)</h2>
<div class="btns">
  <button data-testid="browser-info"  onclick="bl('info','ui','click')">info</button>
  <button data-testid="browser-warn"  class="w" onclick="bl('warn','sync','conflict')">warn</button>
  <button data-testid="browser-error" class="e" onclick="bl('error','truck','bool-fail')">error</button>
</div>

<h2>Worker calls (fetch to worker API)</h2>
<div class="btns">
  <button data-testid="worker-health"     onclick="wf('api/demo/health')">health</button>
  <button data-testid="worker-timed"      onclick="wf('api/demo/timed')">timed ok</button>
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
