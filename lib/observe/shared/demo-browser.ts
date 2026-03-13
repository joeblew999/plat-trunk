/**
 * Shared browser entry — bundled and served by every demo worker.
 *
 * All demos load this identical file. The only difference between demos
 * is the worker's service name and port. This file proves the observe
 * system works in a real browser against any worker.
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
import { setupIdentity, setupPageLog, setupStatusBar } from './demo-ui'

const { deviceId, sessionId } = setupIdentity()

const { createLogger } = setupBrowserLog({ flushUrl: '/api/debug/logs/ingest', captureErrors: true })

const sync  = createLogger('sync',  { deviceId, sessionId })
const truck = createLogger('truck', { deviceId, sessionId })
const ui    = createLogger('ui',    { deviceId, sessionId })

const modelLog = sync.child({ modelId: 'demo-model-1' })

const w = globalThis as any
const pageLog = setupPageLog()

w.demoInfo = () => {
  ui.info('button-click', { button: 'save', section: 'toolbar' })
  pageLog('info', 'ui:button-click { button: "save" }')
}

w.demoWarn = () => {
  sync.warn('conflict', { modelId: 'demo-model-1', localOps: 5, remoteOps: 3, resolution: 'auto-merge' })
  pageLog('warn', 'sync:conflict { localOps: 5, remoteOps: 3 }')
}

w.demoError = () => {
  truck.error('boolean-failed', new Error('This shell is not oriented and closed'), {
    operation: 'subtract', solidA: 'cube-1', solidB: 'sphere-2',
  })
  pageLog('error', 'truck:boolean-failed + Error + context')
}

w.demoTimedOk = async () => {
  pageLog('info', 'timed: crdt.merge starting...')
  const result = await sync.timed('crdt.merge', async () => {
    await new Promise(r => setTimeout(r, 100 + Math.random() * 200))
    return { merged: true, opsApplied: 7 }
  }, { modelId: 'demo-model-1' })
  pageLog('info', `timed: crdt.merge.ok → ${JSON.stringify(result)}`)
}

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

w.demoChild = () => {
  modelLog.info('op-applied', { opType: 'add_cube', opIndex: 42 })
  modelLog.warn('merge-conflict', { field: 'position', resolution: 'last-write-wins' })
  pageLog('info', 'child: sync (modelId=demo-model-1) → 2 entries')
}

setupStatusBar(deviceId, sessionId)
console.log('[browser] observe demo running — device:', deviceId, 'session:', sessionId.slice(0, 8))
