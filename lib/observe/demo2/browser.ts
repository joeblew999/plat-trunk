/**
 * Browser entry for demo-2 — bundled and served by bun.ts.
 * Same reference pattern as demo1/browser.ts, different subsystem names (auth, session).
 */
import { setupBrowserLog } from '../browser'

let deviceId = localStorage.getItem('plat-device-id')
if (!deviceId) {
  deviceId = crypto.randomUUID()
  localStorage.setItem('plat-device-id', deviceId)
}
const sessionId = crypto.randomUUID()

const { createLogger } = setupBrowserLog({ flushUrl: '/api/debug/logs/ingest' })

const auth = createLogger('auth', { deviceId, sessionId })
const session = createLogger('session', { deviceId, sessionId })
const userLog = auth.child({ userId: 'user-abc-123' })

const w = globalThis as any

w.demoInfo = () => {
  auth.info('login-click', { method: 'oauth', provider: 'github' })
  pageLog('info', 'auth:login-click { method: "oauth" }')
}

w.demoWarn = () => {
  session.warn('session-expiring', { userId: 'user-abc', remainingMs: 60000 })
  pageLog('warn', 'session:session-expiring { remainingMs: 60000 }')
}

w.demoError = () => {
  auth.error('token-invalid', new Error('JWT signature mismatch'), {
    userId: 'user-xyz', tokenAge: 7200,
  })
  pageLog('error', 'auth:token-invalid + Error + context')
}

w.demoTimedOk = async () => {
  pageLog('info', 'timed: db.query starting...')
  const result = await session.timed('db.query', async () => {
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100))
    return { userId: 'user-abc', role: 'admin' }
  }, { table: 'users' })
  pageLog('info', `timed: db.query.ok → ${JSON.stringify(result)}`)
}

w.demoTimedFail = async () => {
  pageLog('info', 'timed: db.migrate starting (will fail)...')
  try {
    await auth.timed('db.migrate', async () => {
      await new Promise(r => setTimeout(r, 30 + Math.random() * 50))
      throw new Error('Column "email" already exists')
    }, { migration: '0042_add_email' })
  } catch {
    pageLog('error', 'timed: db.migrate.fail (caught)')
  }
}

w.demoChild = () => {
  userLog.info('permission-granted', { resource: 'model-123', action: 'write' })
  userLog.warn('rate-limit-near', { remaining: 5, limit: 100 })
  pageLog('info', 'child: auth (userId=user-abc-123) → 2 entries')
}

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

console.log('[browser] demo-2 observability running — device:', deviceId, 'session:', sessionId.slice(0, 8))
