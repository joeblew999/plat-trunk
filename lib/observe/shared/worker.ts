/**
 * Shared Hono worker setup for lib/observe demos.
 *
 * Each demo calls setupDemoWorker(config) and gets a fully wired Hono app
 * with all /api/demo/* routes, browser bundle, and typed loggers.
 * The demo's bun.ts only provides config + starts the server.
 */

import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { setupLog } from '../setup'
import type { LogEnv, Logger } from '../index'
import { createDemoPage, type DemoPageConfig } from './demo-ui'
import { mountWasmRoutes } from './wasm-routes'
import { mountMcpRoutes } from './mcp'

// ── Config types ──────────────────────────────────────────────────────────────

export interface DemoRouteConfig {
  /** /api/demo/timed — simulated async operation */
  timed: {
    op: string
    work: () => Promise<Record<string, unknown>>
    ctx: Record<string, unknown>
  }
  /** /api/demo/timed-fail — operation that always throws */
  timedFail: {
    op: string
    work: () => Promise<never>
    ctx: Record<string, unknown>
    status?: number
  }
  /** /api/demo/child — child() scoped logger */
  child: {
    ctxKey: string
    ctxVal: string
    events: Array<{ level: 'info' | 'warn'; event: string; data: Record<string, unknown> }>
  }
  /** /api/demo/error — manual error logging */
  error: {
    event: string
    msg: string
    ctx: Record<string, unknown>
    status: number
  }
  /** /api/demo/throw — error message for the deliberate throw */
  throwMsg?: string
  /** /api/demo/worker-log — worker-side subsystem loggers */
  workerLog: (loggers: Record<string, Logger>) => void
}

export interface DemoWorkerConfig {
  serviceName: string
  /** Absolute path to the browser entry — pass import.meta.dir + '/browser.ts' */
  browserEntry: string
  page: DemoPageConfig
  /** Subsystem logger names, e.g. ['sync', 'truck'] */
  loggerNames: string[]
  routes: DemoRouteConfig
}

export interface DemoWorker {
  app: Hono<LogEnv>
  loggers: Record<string, Logger>
  urls: ReturnType<typeof setupLog>['urls']
}

// ── Standard demo factory (no config needed) ─────────────────────────────────
//
// All demos are identical — same browser code, same routes, same content.
// Only serviceName differs (used in log entries + health response).
// Adding a new demo = one bun.ts file, 3 lines.

export function createStandardDemoWorker(serviceName: string): Promise<DemoWorker> {
  return setupDemoWorker({
    serviceName,
    browserEntry: new URL('./demo-browser.ts', import.meta.url).pathname,
    page: {
      title: `lib/observe — ${serviceName}`,
      h1: `lib/observe — ${serviceName}`,
      accentColor: '#a78bfa',
      labels: {
        info:      'info: button-click',
        warn:      'warn: sync-conflict',
        error:     'error: boolean-failed',
        timedOk:   'timed: crdt.merge (ok)',
        timedFail: 'timed: wasm.subtract (fail)',
        child:     'child: model-scoped',
      },
      tailCmd: 'bun lib/observe/dev/tail.ts --port demo1:3333 --port demo2:3334',
    },
    loggerNames: ['sync', 'truck'],
    routes: {
      timed: {
        op: 'wasm.addCube',
        work: async () => {
          await new Promise(r => setTimeout(r, 20 + Math.random() * 80))
          return { objectId: 'cube-' + Date.now(), vertices: 24 }
        },
        ctx: { modelId: 'demo-model-1', sceneObjects: 5 },
      },
      timedFail: {
        op: 'wasm.booleanSubtract',
        work: async () => {
          await new Promise(r => setTimeout(r, 10 + Math.random() * 40))
          throw new Error('This shell is not oriented and closed') as never
        },
        ctx: { solidA: 'cube-1', solidB: 'sphere-2' },
      },
      child: {
        ctxKey: 'modelId',
        ctxVal: 'demo-model-1',
        events: [
          { level: 'info', event: 'ops-loaded',  data: { opCount: 42 } },
          { level: 'warn', event: 'stale-ops',   data: { staleSince: '2026-03-10T00:00:00Z' } },
        ],
      },
      error: {
        event: 'validation-failed',
        msg:   'invalid model ID',
        ctx:   { modelId: 'bad-id', reason: 'not a UUID' },
        status: 400,
      },
      workerLog: (loggers) => {
        loggers.sync.info('merge',           { modelId: 'demo-model-1', localOps: 10, remoteOps: 8 })
        loggers.truck.warn('memory-pressure', { heapBytes: 150_000_000, sceneObjects: 200 })
      },
    },
  })
}

// ── Full config factory ───────────────────────────────────────────────────────

export async function setupDemoWorker(config: DemoWorkerConfig): Promise<DemoWorker> {
  const app = new Hono<LogEnv>()
  const { createLogger, urls, buffer } = setupLog(app, config.serviceName)

  // Build + cache browser bundle at startup
  const buildResult = await Bun.build({
    entrypoints: [config.browserEntry],
    target: 'browser',
    minify: false,
  })
  if (!buildResult.success) {
    console.error('Failed to bundle browser entry:', buildResult.logs)
    process.exit(1)
  }
  const browserBundle = await buildResult.outputs[0].text()

  // Worker-side subsystem loggers
  const loggers: Record<string, Logger> = {}
  for (const name of config.loggerNames) {
    loggers[name] = createLogger(name)
  }

  const { routes: r } = config

  // ── Routes (identical structure across all demos) ─────────────────

  app.get('/', (c) => c.html(createDemoPage(config.page)))

  app.get('/bundle.js', (c) => new Response(browserBundle, {
    headers: { 'Content-Type': 'application/javascript' },
  }))

  // Reference pattern: handler using c.var.log (injected by observabilityMiddleware)
  app.get('/api/demo/health', (c) => {
    c.var.log.info('health-check')
    return c.json({ status: 'ok', service: config.serviceName })
  })

  // Reference pattern: timed() wrapping an async operation
  app.get('/api/demo/timed', async (c) => {
    const result = await c.var.log.timed(r.timed.op, r.timed.work, r.timed.ctx)
    return c.json(result)
  })

  // Reference pattern: timed() that fails — produces structured error entry
  app.get('/api/demo/timed-fail', async (c) => {
    try {
      await c.var.log.timed(r.timedFail.op, r.timedFail.work, r.timedFail.ctx)
    } catch { /* error already logged by timed() */ }
    return c.json({ error: 'operation failed' }, (r.timedFail.status ?? 500) as ContentfulStatusCode)
  })

  // Reference pattern: child() logger scoped to a resource
  app.get('/api/demo/child', (c) => {
    const scoped = c.var.log.child({ [r.child.ctxKey]: r.child.ctxVal })
    for (const ev of r.child.events) {
      scoped[ev.level](ev.event, ev.data)
    }
    return c.json({ ok: true })
  })

  // Reference pattern: error handler catches this → structured 500
  app.get('/api/demo/throw', () => {
    throw new Error(r.throwMsg ?? 'deliberate test error')
  })

  // Reference pattern: manual error logging with context
  app.get('/api/demo/error', (c) => {
    c.var.log.error(r.error.event, new Error(r.error.msg), r.error.ctx)
    return c.json({ error: 'operation failed' }, r.error.status as ContentfulStatusCode)
  })

  // Reference pattern: worker-side loggers (outside request context)
  app.get('/api/demo/worker-log', (c) => {
    r.workerLog(loggers)
    return c.json({ logged: true })
  })

  // ── WASM routes — same Rust binary in worker and browser ──────────
  mountWasmRoutes(app)

  // ── MCP server — AI agents can query this worker's log buffer ─────
  mountMcpRoutes(app, buffer)

  return { app, loggers, urls }
}
