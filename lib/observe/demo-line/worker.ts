/**
 * CF Worker — LINE MINI App demo.
 *
 * Serves a fullscreen LIFF page + the same /api/demo/* observe routes as demo1/demo2.
 * Adds two LINE-specific bindings:
 *
 *   1. Context enrichment  — browser injects liff.getContext() fields into every log entry
 *   2. Chat transport      — POST /api/demo/line-push sends Flex Messages via Messaging API
 *   3. Webhook             — POST /webhook receives LINE events and logs them
 *
 * Env vars (set in wrangler.toml or via `wrangler secret put`):
 *   LIFF_ID              — from LINE Developers Console (safe to commit as [vars])
 *   CHANNEL_ACCESS_TOKEN — Messaging API token  (secret)
 *   CHANNEL_SECRET       — webhook signature key (secret)
 */

import { Hono } from 'hono'
import { setupLog } from '../setup'
import type { LogEnv } from '../index'
import { mountWasmRoutes } from '../shared/wasm-routes'

// ── Env ───────────────────────────────────────────────────────────────────────

interface LineBindings {
  LIFF_ID: string
  CHANNEL_ACCESS_TOKEN: string
  CHANNEL_SECRET: string
}

type LineEnv = LogEnv & { Bindings: LineBindings }

// ── App ───────────────────────────────────────────────────────────────────────

const app = new Hono<LineEnv>()
const { createLogger } = setupLog(app, 'log-demo-line')

const line = createLogger('line')
const obs  = createLogger('observe')

// ── Demo routes (same patterns as demo1/demo2) ────────────────────────────────

app.get('/api/demo/health', (c) => {
  c.var.log.info('health-check')
  return c.json({ status: 'ok', service: 'log-demo-line' })
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
  obs.info('observe-event',  { modelId: 'demo-model-1', localOps: 10, remoteOps: 8 })
  line.warn('quota-warning', { heapBytes: 150_000_000, sceneObjects: 200 })
  return c.json({ logged: true })
})

// ── WASM routes — Rust binary running in the CF Worker ───────────────────────
mountWasmRoutes(app)

// ── LINE binding: push Flex Message to a user via Messaging API ───────────────
//
// The browser calls this after capturing log entries, passing the LINE userId
// obtained from liff.getProfile(). The worker formats and pushes the message.
//
// Requires CHANNEL_ACCESS_TOKEN secret.

app.post('/api/demo/line-push', async (c) => {
  const token = c.env.CHANNEL_ACCESS_TOKEN
  if (!token) return c.json({ error: 'CHANNEL_ACCESS_TOKEN not configured' }, 503)

  const { to, entries } = await c.req.json<{ to: string; entries: unknown[] }>()
  if (!to || !Array.isArray(entries)) return c.json({ error: 'missing to or entries' }, 400)

  const message = buildFlexMessage(entries)

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, messages: [message] }),
  })

  const body = await res.text()
  line.info('push-sent', { to: to.slice(0, 8) + '…', status: res.status })
  return c.json({ ok: res.ok, status: res.status, body })
})

// ── LINE binding: webhook — receives LINE events, logs them ──────────────────
//
// LINE sends POST to /webhook with X-Line-Signature header.
// Register this URL in LINE Developers Console → Messaging API → Webhook URL.
//
// Requires CHANNEL_SECRET secret for signature validation.

app.post('/webhook', async (c) => {
  const sig    = c.req.header('x-line-signature') ?? ''
  const raw    = await c.req.text()
  const secret = c.env.CHANNEL_SECRET

  if (secret) {
    const valid = await verifySignature(secret, raw, sig)
    if (!valid) {
      line.warn('webhook-invalid-sig', { sig: sig.slice(0, 8) + '…' })
      return c.json({ error: 'invalid signature' }, 401)
    }
  }

  const { events = [] } = JSON.parse(raw) as { events: LineEvent[] }

  for (const ev of events) {
    line.info('webhook-event', {
      type:     ev.type,
      userId:   ev.source?.userId?.slice(0, 8) + '…',
      sourceType: ev.source?.type,
    })
  }

  return c.json({ ok: true, received: events.length })
})

// ── MINI App HTML ─────────────────────────────────────────────────────────────
//
// Fullscreen LIFF page, mobile-first. Loaded by LINE's webview.
// Gracefully degrades when opened outside LINE (dev browser).
//
// LIFF SDK loaded from LINE CDN — no bundler needed.

app.get('/', (c) => {
  const liffId = c.env.LIFF_ID ?? ''
  return c.html(miniAppHtml(liffId))
})

export default app

// ── Helpers ───────────────────────────────────────────────────────────────────

interface LineEvent {
  type: string
  source?: { type?: string; userId?: string; roomId?: string; groupId?: string }
}

async function verifySignature(secret: string, body: string, sig: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const mac      = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
    const expected = btoa(String.fromCharCode(...new Uint8Array(mac)))
    return sig === expected
  } catch {
    return false
  }
}

interface LogEntryLike {
  ts?: string
  level?: string
  system?: string
  event?: string
  [k: string]: unknown
}

function buildFlexMessage(entries: unknown[]) {
  const rows = (entries as LogEntryLike[]).slice(-5).map(e => ({
    type: 'box', layout: 'horizontal', spacing: 'sm',
    contents: [
      { type: 'text', text: levelIcon(e.level), size: 'sm', flex: 0 },
      { type: 'text', text: `${e.system ?? '?'}:${e.event ?? '?'}`, size: 'sm', flex: 1, color: levelColor(e.level), wrap: true },
      { type: 'text', text: shortTs(e.ts), size: 'xs', color: '#aaaaaa', flex: 0, align: 'end' },
    ],
  }))

  return {
    type: 'flex',
    altText: `observe: ${entries.length} log ${entries.length === 1 ? 'entry' : 'entries'}`,
    contents: {
      type: 'bubble', size: 'kilo',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#06C755', paddingAll: 'md',
        contents: [{ type: 'text', text: 'plat-observe', color: '#ffffff', weight: 'bold', size: 'sm' }],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: 'md',
        contents: rows.length ? rows : [{ type: 'text', text: 'no entries', color: '#aaaaaa', size: 'sm' } as object],
      },
    },
  }
}

function levelIcon(level?: string) {
  return level === 'error' ? '✗' : level === 'warn' ? '!' : '✓'
}
function levelColor(level?: string) {
  return level === 'error' ? '#f87171' : level === 'warn' ? '#fbbf24' : '#4ade80'
}
function shortTs(ts?: string) {
  if (!ts) return ''
  try { return new Date(ts).toLocaleTimeString('en', { hour12: false }) } catch { return '' }
}

// ── MINI App HTML template ────────────────────────────────────────────────────

function miniAppHtml(liffId: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>plat-observe · LINE MINI App</title>
<script charset="utf-8" src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --green: #06C755; --green-dark: #059A42; --bg: #0f0f0f; --surface: #1a1a1a; --border: #2a2a2a; --text: #e5e5e5; --muted: #888; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, 'LINE Seed Sans', sans-serif; font-size: 14px; min-height: 100dvh; display: flex; flex-direction: column; }
  header { background: var(--green); padding: 12px 16px env(safe-area-inset-top); display: flex; align-items: center; gap: 10px; }
  .avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,.3); object-fit: cover; }
  .header-info { flex: 1; }
  .header-name { font-weight: 700; color: #fff; font-size: 13px; }
  .header-ctx  { font-size: 11px; color: rgba(255,255,255,.8); }
  main { flex: 1; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 12px; }
  section { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
  h2 { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .grid.wide { grid-template-columns: 1fr 1fr 1fr; }
  button { background: #222; color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 8px 6px; font: inherit; font-size: 12px; cursor: pointer; text-align: center; }
  button:active { background: #2a2a2a; }
  .btn-warn  { border-color: #fbbf24; color: #fbbf24; }
  .btn-error { border-color: #f87171; color: #f87171; }
  .btn-line  { background: var(--green); border-color: var(--green-dark); color: #fff; font-weight: 600; }
  .btn-line:active { background: var(--green-dark); }
  #log { background: #0a0a0a; border-radius: 8px; padding: 8px; max-height: 180px; overflow-y: auto; font-size: 11px; font-family: 'SF Mono', 'Cascadia Code', monospace; min-height: 44px; }
  .le { padding: 1px 0; }
  .le-ts { color: var(--muted); }
  footer { padding: 8px 16px env(safe-area-inset-bottom); text-align: center; font-size: 10px; color: var(--muted); }
  #not-in-line { display: none; background: #1a1200; border: 1px solid #fbbf24; border-radius: 8px; padding: 10px 12px; color: #fbbf24; font-size: 12px; line-height: 1.5; }
</style>
</head><body>

<header>
  <img id="avatar" class="avatar" src="" alt="">
  <div class="header-info">
    <div class="header-name" id="display-name">plat-observe</div>
    <div class="header-ctx"  id="line-ctx">LINE MINI App</div>
  </div>
  <div id="status-dot" style="width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.4)"></div>
</header>

<main>
  <div id="not-in-line">
    Open this URL inside LINE to use the full MINI App experience.<br>
    Running in dev mode — LINE APIs unavailable.
  </div>

  <section>
    <h2>Browser logs → worker</h2>
    <div class="grid">
      <button data-testid="browser-info"  onclick="bl('info','ui','click')">info</button>
      <button data-testid="browser-warn"  class="btn-warn"  onclick="bl('warn','sync','conflict')">warn</button>
      <button data-testid="browser-error" class="btn-error" onclick="bl('error','wasm','bool-fail')">error</button>
      <button data-testid="line-push"     class="btn-line"  onclick="linePush()">push to LINE</button>
    </div>
  </section>

  <section>
    <h2>Rust WASM — browser <span id="wasm-status" style="font-size:10px;color:#888">(loading…)</span></h2>
    <div class="grid wide">
      <button data-testid="wasm-version-browser" onclick="wasmVersion()">version</button>
      <button data-testid="wasm-sample-browser"  onclick="wasmSample()">sample</button>
      <button data-testid="wasm-scrub-browser"   onclick="wasmScrubBrowser()">scrub</button>
    </div>
  </section>

  <section>
    <h2>Rust WASM — server</h2>
    <div class="grid wide">
      <button data-testid="wasm-version" onclick="wf('api/demo/wasm/version')">version</button>
      <button data-testid="wasm-sample"  onclick="wf('api/demo/wasm/sample?rate=0.5')">sample</button>
      <button data-testid="wasm-scrub"   onclick="wasmScrub()">scrub</button>
    </div>
  </section>

  <section>
    <h2>Worker API calls</h2>
    <div class="grid wide">
      <button data-testid="worker-health"     onclick="wf('api/demo/health')">health</button>
      <button data-testid="worker-timed"      onclick="wf('api/demo/timed')">timed ok</button>
      <button data-testid="worker-timed-fail" class="btn-error" onclick="wf('api/demo/timed-fail')">timed-fail</button>
      <button data-testid="worker-child"      onclick="wf('api/demo/child')">child</button>
      <button data-testid="worker-throw"      class="btn-error" onclick="wf('api/demo/throw')">throw</button>
      <button data-testid="worker-log"        onclick="wf('api/demo/worker-log')">worker-log</button>
    </div>
  </section>

  <section>
    <h2>Log</h2>
    <div id="log" data-testid="log"></div>
  </section>
</main>

<footer id="footer">device: <span id="device-id-short">…</span></footer>

<script>
// ── State ──────────────────────────────────────────────────────────────
const LIFF_ID = ${JSON.stringify(liffId)}
const logEl   = document.getElementById('log')
let lineProfile = null   // { userId, displayName, pictureUrl }
let lineCtxFields = {}   // injected into every log entry flush
let queue = []

const deviceId = localStorage.getItem('plat-device-id') || (() => {
  const id = crypto.randomUUID(); localStorage.setItem('plat-device-id', id); return id
})()
document.getElementById('device-id-short').textContent = deviceId.slice(0, 8)

// ── LIFF init ──────────────────────────────────────────────────────────
async function initLiff() {
  if (!LIFF_ID) {
    document.getElementById('not-in-line').style.display = 'block'
    document.getElementById('line-ctx').textContent = 'LIFF_ID not configured'
    return
  }
  try {
    await liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: true })

    if (!liff.isInClient()) {
      document.getElementById('not-in-line').style.display = 'block'
    }

    if (liff.isLoggedIn()) {
      lineProfile = await liff.getProfile()
      const ctx   = liff.getContext()

      // Enrich every log entry with LINE identity
      lineCtxFields = {
        lineUserId:   lineProfile.userId,
        lineRoomType: ctx?.type,
        ...(ctx?.roomId  ? { lineRoomId:  ctx.roomId  } : {}),
        ...(ctx?.groupId ? { lineGroupId: ctx.groupId } : {}),
      }

      // Update header UI
      const av = document.getElementById('avatar')
      if (lineProfile.pictureUrl) { av.src = lineProfile.pictureUrl; av.style.display = 'block' }
      document.getElementById('display-name').textContent = lineProfile.displayName
      document.getElementById('line-ctx').textContent =
        (ctx?.type ?? 'unknown') + (ctx?.roomId ? ' · ' + ctx.roomId.slice(0,8) + '…' : '')
      document.getElementById('status-dot').style.background = '#fff'

      plog('info', 'liff: logged in as ' + lineProfile.displayName)
    } else {
      liff.login()
    }
  } catch (err) {
    document.getElementById('not-in-line').style.display = 'block'
    document.getElementById('line-ctx').textContent = 'LIFF unavailable (dev mode)'
    plog('warn', 'liff init failed: ' + err.message)
  }
}

// ── Browser log queue → worker flush ──────────────────────────────────
function bl(level, system, event) {
  const entry = {
    ts: new Date().toISOString(), source: 'browser',
    kind: level === 'error' ? 'error' : 'app',
    system, event, level, deviceId,
    ...lineCtxFields,   // LINE context enrichment
  }
  queue.push(entry)
  plog(level, system + ':' + event)
}

setInterval(async () => {
  if (!queue.length) return
  const batch = queue.splice(0, queue.length)
  try {
    await fetch('api/debug/logs/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    })
  } catch { queue.unshift(...batch) }
}, 2000)

// ── LINE chat transport — push recent log entries as Flex Message ─────
async function linePush() {
  const userId = lineProfile?.userId
  if (!userId) { plog('warn', 'not logged in to LINE'); return }

  // Grab last 5 entries from the worker buffer
  let entries = []
  try {
    const r = await fetch('api/debug/logs?limit=5')
    if (r.ok) { const d = await r.json(); entries = d.entries ?? [] }
  } catch {}

  try {
    const r = await fetch('api/demo/line-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: userId, entries }),
    })
    plog(r.ok ? 'info' : 'error', 'line-push: ' + r.status)
  } catch { plog('error', 'line-push: FAILED') }
}

// ── WASM scrub — sends a sample log entry through the Rust scrubber ──
async function wasmScrub() {
  const entry = JSON.stringify({ ts: new Date().toISOString(), level: 'info', system: 'ui',
    event: 'click', password: 'secret123', token: 'bearer-abc', deviceId })
  try {
    const r = await fetch('api/demo/wasm/scrub', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: entry,
    })
    const scrubbed = await r.json()
    plog(r.ok ? 'info' : 'error', 'wasm.scrub → ' + JSON.stringify(scrubbed).slice(0, 60))
  } catch { plog('error', 'wasm.scrub: FAILED') }
}

// ── Worker fetch helper ───────────────────────────────────────────────
async function wf(path) {
  try {
    const r = await fetch(path)
    plog(r.ok ? 'info' : 'error', path.split('/').pop() + ': ' + r.status)
  } catch { plog('error', path.split('/').pop() + ': FAILED') }
}

// ── Log display ───────────────────────────────────────────────────────
function plog(level, msg) {
  const c = { info: '#4ade80', warn: '#fbbf24', error: '#f87171' }
  const d = document.createElement('div')
  d.className = 'le'
  d.dataset.testid  = 'log-entry'
  d.dataset.level   = level
  d.innerHTML =
    '<span class="le-ts">' + new Date().toLocaleTimeString('en', { hour12: false }) + '</span> ' +
    '<span style="color:' + (c[level] || '#ccc') + '">' + msg + '</span>'
  logEl.appendChild(d)
  logEl.scrollTop = logEl.scrollHeight
  while (logEl.children.length > 40) logEl.removeChild(logEl.firstChild)
}

// ── Browser WASM (web target, loaded from /wasm/) ────────────────────
// Runs entirely in the LINE webview — works offline once loaded.
let wasmBrowser = null
async function initBrowserWasm() {
  try {
    const mod = await import('/wasm/plat_observe.js')
    await mod.default('/wasm/plat_observe_bg.wasm')
    wasmBrowser = mod
    document.getElementById('wasm-status').textContent = '✓ ready'
    document.getElementById('wasm-status').style.color = '#4ade80'
    plog('info', 'browser wasm: loaded v' + mod.observe_version())
  } catch (e) {
    document.getElementById('wasm-status').textContent = '✗ unavailable'
    plog('warn', 'browser wasm: ' + e.message)
  }
}

function wasmVersion() {
  if (!wasmBrowser) { plog('warn', 'browser wasm not loaded'); return }
  plog('info', 'browser wasm version: ' + wasmBrowser.observe_version())
}

function wasmSample() {
  if (!wasmBrowser) { plog('warn', 'browser wasm not loaded'); return }
  const keep = wasmBrowser.sample_keep(0.5, Date.now() & 0xffffffff)
  plog('info', 'browser wasm sample(0.5): ' + keep)
}

function wasmScrubBrowser() {
  if (!wasmBrowser) { plog('warn', 'browser wasm not loaded'); return }
  const input = JSON.stringify({ level: 'info', password: 'secret123', token: 'bearer-abc', deviceId })
  const out = wasmBrowser.scrub_entry(input)
  plog('info', 'browser wasm scrub: ' + out.slice(0, 60))
}

initBrowserWasm()
initLiff()
</script>
</body></html>`
}
