/**
 * Shared UI utilities for lib/observe demos.
 *
 * Each demo imports from here — same code, different config per worker.
 * Covers: browser identity, in-page log display, status bar, and HTML page generation.
 */

// ── Identity ──────────────────────────────────────────────────────────────────

export interface Identity {
  deviceId: string
  sessionId: string
}

/** Get or create persistent deviceId (localStorage) + per-tab sessionId. */
export function setupIdentity(): Identity {
  let deviceId = localStorage.getItem('plat-device-id')
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem('plat-device-id', deviceId)
  }
  const sessionId = crypto.randomUUID()
  return { deviceId, sessionId }
}

// ── In-page log display ───────────────────────────────────────────────────────

/** Returns a pageLog(level, msg) function that appends to #page-log. */
export function setupPageLog(): (level: string, msg: string) => void {
  return function pageLog(level: string, msg: string) {
    const el = document.getElementById('page-log')
    if (!el) return
    const colors: Record<string, string> = { info: '#4ade80', warn: '#fbbf24', error: '#f87171' }
    const ts = new Date().toLocaleTimeString('en', { hour12: false })
    const line = document.createElement('div')
    line.style.cssText = `color:${colors[level] ?? '#e0e0e0'};padding:1px 0`
    line.textContent = `${ts}  [${level}] ${msg}`
    el.appendChild(line)
    el.scrollTop = el.scrollHeight
    while (el.children.length > 40) el.removeChild(el.firstChild!)
  }
}

// ── Status bar ────────────────────────────────────────────────────────────────

/** Poll and update #status every 500ms: online state, queue length, device/session. */
export function setupStatusBar(deviceId: string, sessionId: string): void {
  setInterval(() => {
    const el = document.getElementById('status')
    if (!el) return
    const queueLen = (() => {
      try { return JSON.parse(localStorage.getItem('plat-log-queue') || '[]').length } catch { return 0 }
    })()
    el.innerHTML = [
      `<span style="color:${navigator.onLine ? '#4ade80' : '#f87171'}">${navigator.onLine ? 'online' : 'OFFLINE'}</span>`,
      `queue: ${queueLen}`,
      `device: ${deviceId.slice(0, 8)}`,
      `session: ${sessionId.slice(0, 8)}`,
    ].join(' &middot; ')
  }, 500)
}

// ── Demo page HTML ────────────────────────────────────────────────────────────

/** Labels for the 6 browser-side demo buttons (row 1: info/warn/error, row 2: timed/fail/child). */
export interface DemoBrowserLabels {
  info: string
  warn: string
  error: string
  timedOk: string
  timedFail: string
  child: string
}

export interface DemoPageConfig {
  /** Browser tab title. */
  title: string
  /** Page h1 text. */
  h1: string
  /** h2 and label accent colour (hex). */
  accentColor: string
  /** Button labels for the browser-side section (worker-side buttons are always the same). */
  labels: DemoBrowserLabels
  /** Tail command shown in footer, e.g. "bun lib/observe/dev/tail.ts" */
  tailCmd: string
  /** Optional extra note in the footer (raw HTML). */
  footerNote?: string
}

/** Generate the full demo HTML page. Worker-side buttons are hardcoded (identical across demos). */
export function createDemoPage(cfg: DemoPageConfig): string {
  const btn = (label: string, fn: string, cls = '') =>
    `<button${cls ? ` class="${cls}"` : ''} onclick="${fn}()">${label}</button>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${cfg.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a2e; color: #e0e0e0; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; padding: 20px; max-width: 900px; }
  h1 { font-size: 16px; margin-bottom: 4px; color: #e0e0e0; }
  h2 { font-size: 13px; color: ${cfg.accentColor}; margin: 16px 0 8px; }
  #status { font-size: 12px; margin-bottom: 16px; color: #94a3b8; }
  a { color: #60a5fa; }
  .section { margin: 0 0 12px; padding: 10px 12px; background: #16213e; border-radius: 6px; }
  .btn-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
  button { background: #0f3460; color: #e0e0e0; border: 1px solid #1a4080; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 12px; }
  button:hover { background: #1a4080; }
  button.warn { border-color: #fbbf24; color: #fbbf24; }
  button.error { border-color: #f87171; color: #f87171; }
  #page-log { background: #0a0a1a; border-radius: 4px; padding: 8px; max-height: 250px; overflow-y: auto; font-size: 11px; line-height: 1.5; min-height: 60px; }
  .links { font-size: 12px; line-height: 1.8; }
  .links a { margin-right: 12px; }
  .label { color: ${cfg.accentColor}; font-size: 11px; }
</style>
</head>
<body>
  <h1>${cfg.h1}</h1>
  <div id="status">starting...</div>

  <div class="section">
    <h2>Browser → Worker (setupBrowserLog patterns)</h2>
    <div class="btn-row">
      ${btn(cfg.labels.info, 'demoInfo')}
      ${btn(cfg.labels.warn, 'demoWarn', 'warn')}
      ${btn(cfg.labels.error, 'demoError', 'error')}
    </div>
    <div class="btn-row">
      ${btn(cfg.labels.timedOk, 'demoTimedOk')}
      ${btn(cfg.labels.timedFail, 'demoTimedFail', 'error')}
      ${btn(cfg.labels.child, 'demoChild')}
    </div>
  </div>

  <div class="section">
    <h2>Worker-side (setupLog patterns via fetch)</h2>
    <div class="btn-row">
      <button onclick="wf('/api/demo/health')">c.var.log in handler</button>
      <button onclick="wf('/api/demo/timed')">timed() success</button>
      <button class="error" onclick="wf('/api/demo/timed-fail')">timed() failure</button>
      <button onclick="wf('/api/demo/child')">child() scoped</button>
      <button class="error" onclick="wf('/api/demo/throw')">errorHandler catch</button>
      <button onclick="wf('/api/demo/error')">manual error log</button>
      <button onclick="wf('/api/demo/worker-log')">worker-side logger</button>
    </div>
  </div>

  <div class="section">
    <h2>Rust WASM (plat-observe crate — same binary in worker &amp; browser)</h2>
    <div class="btn-row">
      <button onclick="wf('/api/demo/wasm/version')">wasm: version</button>
      <button onclick="wasmScrub()">wasm: scrub entry</button>
      <button onclick="wf('/api/demo/wasm/sample?rate=0.5')">wasm: sample(0.5)</button>
      <button onclick="wf('/api/demo/wasm/sample?rate=0.1')">wasm: sample(0.1)</button>
    </div>
  </div>

  <div class="section">
    <h2>Activity log</h2>
    <div id="page-log"></div>
  </div>

  <div class="section links">
    <span class="label">tail</span> <code>${cfg.tailCmd}</code>${cfg.footerNote ? `\n    ${cfg.footerNote}` : ''}
  </div>

  <script>
    async function wf(path) {
      const el = document.getElementById('page-log')
      const ts = new Date().toLocaleTimeString('en', { hour12: false })
      try {
        const r = await fetch(path)
        const body = await r.text()
        const line = document.createElement('div')
        line.style.color = r.ok ? '#4ade80' : '#f87171'
        line.textContent = ts + '  [worker] ' + path + ' \u2192 ' + r.status + '  ' + body.slice(0, 120)
        el.appendChild(line)
      } catch {
        const line = document.createElement('div')
        line.style.color = '#f87171'
        line.textContent = ts + '  [worker] ' + path + ' \u2192 FAILED'
        el.appendChild(line)
      }
      el.scrollTop = el.scrollHeight
      while (el.children.length > 40) el.removeChild(el.firstChild)
    }

    async function wasmScrub() {
      const el = document.getElementById('page-log')
      const ts = new Date().toLocaleTimeString('en', { hour12: false })
      const entry = { event: 'login', password: 'hunter2', token: 'secret-tok', userId: 'u1' }
      try {
        const r = await fetch('/api/demo/wasm/scrub', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        })
        const scrubbed = await r.json()
        const line = document.createElement('div')
        line.style.color = r.ok ? '#4ade80' : '#f87171'
        line.textContent = ts + '  [wasm] scrub \u2192 ' + JSON.stringify(scrubbed)
        el.appendChild(line)
      } catch {
        const line = document.createElement('div')
        line.style.color = '#f87171'
        line.textContent = ts + '  [wasm] scrub \u2192 FAILED'
        el.appendChild(line)
      }
      el.scrollTop = el.scrollHeight
      while (el.children.length > 40) el.removeChild(el.firstChild)
    }
  </script>
  <script src="/bundle.js"></script>
</body>
</html>`
}
