/**
 * Browser entry — bundled and served by bun.ts demo.
 * Runs in a real browser: real localStorage, real online/offline, real flush.
 */
import { setupBrowserLog } from '../browser'

// Stable device ID per browser
let deviceId = localStorage.getItem('plat-device-id')
if (!deviceId) {
  deviceId = crypto.randomUUID()
  localStorage.setItem('plat-device-id', deviceId)
}

const { createLogger } = setupBrowserLog({ flushUrl: '/api/debug/logs/ingest' })

const sync = createLogger('sync', { deviceId })
const truck = createLogger('truck', { deviceId })

// Generate browser-side logs
let tick = 0
setInterval(() => {
  tick++
  sync.info('ui-action', { action: 'click', target: `btn-${tick % 3}` })
  if (tick % 3 === 0) truck.debug('render', { fps: 55 + Math.floor(Math.random() * 10) })
  if (tick % 5 === 0) sync.warn('slow-op', { durationMs: 200 + Math.floor(Math.random() * 300) })
  if (tick % 8 === 0) truck.error('wasm-oom', { heapMb: 128 + Math.floor(Math.random() * 64) })
}, 1500)

// Show status in page
const el = document.getElementById('status')!
setInterval(() => {
  el.textContent = `online: ${navigator.onLine} | tick: ${tick} | device: ${deviceId!.slice(0, 8)}`
}, 500)

console.log('[browser] logger running, deviceId:', deviceId)
