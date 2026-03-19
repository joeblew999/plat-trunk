/**
 * observe test-worker — CI integration target and template for system workers.
 *
 * This is NOT a demo. It has no UI, no simulated business logic, no fake data.
 * It is the minimal correct wiring of lib/observe into a CF Worker.
 *
 * Two purposes:
 *   1. CI target — integration tests run against this worker (not the demos)
 *   2. Template — copy this pattern into truck-cad, sync, auth when wiring observability
 *
 * Local:  bunx wrangler dev worker.ts --port $TEST_WORKER_PORT
 * Deploy: bunx wrangler deploy --config wrangler.toml
 * Remote: TEST_WORKER_URL=https://observe-test.gedw99.workers.dev bun run test
 */

import { Hono } from 'hono'
import { setupLog } from '../setup'
import type { LogEnv } from '../index'

const app = new Hono<LogEnv>()
const { createLogger } = setupLog(app, 'observe-test')

// ── Subsystem loggers — same pattern system workers will use ──────────────────

const system = createLogger('system')

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/api/health', (c) => {
  c.var.log.info('health-check')
  return c.json({ status: 'ok', service: 'observe-test' })
})

// ── Log API contract — endpoints the integration tests exercise ───────────────
//
// All exposed via setupLog() automatically:
//   GET    /api/debug/logs           — query ring buffer
//   DELETE /api/debug/logs           — clear ring buffer
//   POST   /api/debug/logs/ingest    — ingest browser entries
//   GET    /api/debug/logs/tail      — SSE live stream
//   GET    /api/debug/logs/urls      — CF dashboard links

// ── Deliberate trigger endpoints — integration tests hit these ────────────────

// Triggers a structured log entry with all common fields
app.get('/api/test/log', (c) => {
  system.info('test-entry', { modelId: 'test-model', opCount: 1 })
  return c.json({ ok: true })
})

// Triggers child logger context propagation
app.get('/api/test/child', (c) => {
  const child = c.var.log.child({ requestModelId: 'child-model' })
  child.info('child-entry', { from: 'child-logger' })
  return c.json({ ok: true })
})

// Triggers timed() — success path
app.get('/api/test/timed', async (c) => {
  const result = await c.var.log.timed('test.operation', async () => {
    await new Promise(r => setTimeout(r, 10))
    return { done: true }
  }, { modelId: 'test-model' })
  return c.json(result)
})

// Triggers timed() — failure path
app.get('/api/test/timed-fail', async (c) => {
  try {
    await c.var.log.timed('test.operation-fail', async () => {
      throw new Error('deliberate test failure')
    }, { modelId: 'test-model' })
  } catch { /* already logged by timed() */ }
  return c.json({ error: 'deliberate test failure' }, 500)
})

// Triggers errorHandler() — unhandled throw → structured 500
app.get('/api/test/throw', () => {
  throw new Error('deliberate unhandled throw')
})

// Triggers error() logger — structured error entry, does not throw
app.get('/api/test/error', (c) => {
  c.var.log.error('test-error', new Error('deliberate error entry'), {
    modelId: 'test-model',
    reason: 'integration test',
  })
  return c.json({ ok: true })
})

// Triggers warn + scrubbing — POSTed entries with sensitive fields get redacted
// (scrubbing is exercised via /api/debug/logs/ingest — no dedicated endpoint needed)

export default app
