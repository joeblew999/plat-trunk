/**
 * Browser entry — bundled and served by bun.ts demo.
 * Runs in a real browser: real localStorage, real online/offline, real flush.
 *
 * THIS IS THE REFERENCE PATTERN for browser observability.
 * When wiring setupBrowserLog into truck's browser frontend, copy this structure.
 *
 * Demonstrates:
 *   - setupBrowserLog with localStorage queue + auto-flush
 *   - deviceId (persists across sessions) + sessionId (per-tab)
 *   - child() loggers with inherited context
 *   - timed() for async operation measurement
 *   - Error logging with structured context
 *   - Offline resilience (queue → flush on reconnect)
 */
import { setupBrowserLog } from '../browser'

// ── Identity — reference pattern for any browser app ─────────────────
// deviceId persists across tabs/sessions. sessionId is per-tab.
// Both propagate into every log entry via createLogger context.

let deviceId = localStorage.getItem('plat-device-id')
if (!deviceId) {
  deviceId = crypto.randomUUID()
  localStorage.setItem('plat-device-id', deviceId)
}
const sessionId = crypto.randomUUID()

// ── Setup — one-liner, same as truck browser would use ───────────────

const { createLogger } = setupBrowserLog({ flushUrl: '/api/debug/logs/ingest' })

// System loggers — each maps to a subsystem (sync, truck, ui)
const ui = createLogger('ui', { deviceId, sessionId })
const sync = createLogger('sync', { deviceId, sessionId })
const truck = createLogger('truck', { deviceId, sessionId })

// ── child() — scoped logger that inherits context ────────────────────
// Real usage: sync.child({ modelId }) when working on a specific model

const modelLog = sync.child({ modelId: 'demo-model-1' })

// ── Interactive controls — each demonstrates a real API pattern ──────
// Exposed on window so the HTML page buttons can call them.

const w = globalThis as any

// Pattern: simple structured event
w.demoInfo = () => {
  ui.info('button-click', { button: 'save', section: 'toolbar' })
  pageLog('info', 'ui:button-click { button: "save" }')
}

// Pattern: warning with business context
w.demoWarn = () => {
  sync.warn('conflict', { modelId: 'demo-model-1', localOps: 5, remoteOps: 3, resolution: 'auto-merge' })
  pageLog('warn', 'sync:conflict { localOps: 5, remoteOps: 3 }')
}

// Pattern: error with Error object + structured context
w.demoError = () => {
  truck.error('boolean-failed', new Error('This shell is not oriented and closed'), {
    operation: 'subtract', solidA: 'cube-1', solidB: 'sphere-2',
  })
  pageLog('error', 'truck:boolean-failed + Error + context')
}

// Pattern: timed() for async operations — produces .ok or .fail entry with durationMs
w.demoTimedOk = async () => {
  pageLog('info', 'timed: crdt.merge starting...')
  const result = await sync.timed('crdt.merge', async () => {
    await new Promise(r => setTimeout(r, 100 + Math.random() * 200))
    return { merged: true, opsApplied: 7 }
  }, { modelId: 'demo-model-1' })
  pageLog('info', `timed: crdt.merge.ok → ${JSON.stringify(result)}`)
}

// Pattern: timed() failure — auto-logs error with durationMs + error message
w.demoTimedFail = async () => {
  pageLog('info', 'timed: wasm.subtract starting (will fail)...')
  try {
    await truck.timed('wasm.subtract', async () => {
      await new Promise(r => setTimeout(r, 50 + Math.random() * 100))
      throw new Error('RuntimeError: unreachable')
    }, { solidA: 'cube-1', solidB: 'sphere-2' })
  } catch {
    pageLog('error', 'timed: wasm.subtract.fail (caught)')
  }
}

// Pattern: child() logger — inherits session + model context
w.demoChild = () => {
  modelLog.info('op-applied', { opType: 'add_cube', opIndex: 42 })
  modelLog.warn('merge-conflict', { field: 'position', resolution: 'last-write-wins' })
  pageLog('info', 'child: sync (modelId=demo-model-1) → 2 entries')
}

// ── In-page log display (demo UI only — not part of the pattern) ─────

function pageLog(level: string, msg: string) {
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

// ── Status bar ───────────────────────────────────────────────────────

setInterval(() => {
  const el = document.getElementById('status')
  if (!el) return
  const queueLen = (() => { try { return JSON.parse(localStorage.getItem('plat-log-queue') || '[]').length } catch { return 0 } })()
  el.innerHTML = [
    `<span style="color:${navigator.onLine ? '#4ade80' : '#f87171'}">${navigator.onLine ? 'online' : 'OFFLINE'}</span>`,
    `queue: ${queueLen}`,
    `device: ${deviceId!.slice(0, 8)}`,
    `session: ${sessionId.slice(0, 8)}`,
  ].join(' &middot; ')
}, 500)

console.log('[browser] observability demo running — device:', deviceId, 'session:', sessionId.slice(0, 8))
