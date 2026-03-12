/**
 * Unit + endpoint tests for lib/log — no wrangler needed.
 *   bun test lib/log/tests/test.test.ts
 */

import { describe, test, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { LogBuffer, type LogEntry, type LogEnv } from '../index'
import { createLogRoutes } from '../endpoint'
import { observabilityMiddleware, errorHandler } from '../middleware'
import { setupLog } from '../setup'

// ── Helpers ───────────────────────────────────────────────────────────

let buf: LogBuffer
let app: Hono

function freshSetup() {
  buf = new LogBuffer({ source: 'worker', minLevel: 'debug', service: 'test' })
  app = new Hono()
  app.route('/api/debug', createLogRoutes(buf))
}

async function api(path: string, init?: RequestInit): Promise<Response> {
  return app.request(`http://localhost/api/debug${path}`, init)
}

async function json<T = any>(path: string, init?: RequestInit): Promise<T> {
  return (await api(path, init)).json() as Promise<T>
}

interface LogsResponse { count: number; entries: LogEntry[] }

beforeEach(() => freshSetup())

// ── Core ──────────────────────────────────────────────────────────────

describe('LogBuffer', () => {
  test('logger emits all levels with correct kind + service', () => {
    const log = buf.createLogger('sync')
    log.debug('a'); log.info('b', { x: 1 }); log.warn('c'); log.error('d', new Error('boom'), { extra: 1 })

    const entries = buf.getEntries()
    expect(entries).toHaveLength(4)
    expect(entries.map(e => e.level)).toEqual(['debug', 'info', 'warn', 'error'])
    expect(entries[1]).toMatchObject({ kind: 'app', system: 'sync', event: 'b', x: 1, service: 'test' })
    expect(entries[3]).toMatchObject({ kind: 'error', error: 'boom', extra: 1 })
    expect(entries[3].stack).toBeDefined()
  })

  test('child inherits context, timed logs duration, ring buffer drops oldest', async () => {
    const child = buf.createLogger('sync').child({ modelId: 'm1' })
    child.info('a')
    child.info('b', { modelId: 'm2' })
    expect(buf.getEntries()[0].modelId).toBe('m1')
    expect(buf.getEntries()[1].modelId).toBe('m2')

    // timed success
    const result = await buf.createLogger('sync').timed('d1.query', async () => 42)
    expect(result).toBe(42)
    expect(buf.getEntries().find(e => e.event === 'd1.query.ok')!.durationMs).toBeGreaterThanOrEqual(0)

    // timed failure
    await expect(buf.createLogger('sync').timed('wasm', async () => { throw new Error('oom') })).rejects.toThrow('oom')
    const fail = buf.getEntries().find(e => e.event === 'wasm.fail')!
    expect(fail.kind).toBe('error')
    expect(fail.error).toBe('oom')

    // ring buffer
    buf.clear()
    buf.configure({ maxSize: 3 })
    const log = buf.createLogger('x')
    for (let i = 0; i < 6; i++) log.info(`e-${i}`)
    const all = buf.getEntries()
    expect(all).toHaveLength(3)
    expect(all[0].event).toBe('e-3')
  })

  test('filtering: system, level, kind, event, since, limit', () => {
    buf.createLogger('sync').debug('tick')
    buf.createLogger('sync').info('merge')
    buf.createLogger('sync').warn('conflict')
    buf.createLogger('truck').error('crash', new Error('x'))

    expect(buf.getEntries({ system: 'sync' })).toHaveLength(3)
    expect(buf.getEntries({ level: 'warn' })).toHaveLength(2)
    expect(buf.getEntries({ kind: 'error' })).toHaveLength(1)
    expect(buf.getEntries({ event: 'merge' })).toHaveLength(1)
    expect(buf.getEntries({ limit: 2 }).map(e => e.event)).toEqual(['conflict', 'crash'])
    expect(buf.getEntries({ system: 'sync', level: 'warn' })).toHaveLength(1)

    const all = buf.getEntries()
    expect(buf.getEntries({ since: all[2].ts }).length).toBeGreaterThanOrEqual(2)
  })

  test('minLevel, enabled, subscribe, ingest, clear', () => {
    buf.configure({ minLevel: 'warn' })
    const log = buf.createLogger('sync')
    log.debug('no'); log.info('no'); log.warn('yes'); log.error('yes', new Error('x'))
    expect(buf.getEntries()).toHaveLength(2)

    buf.clear()
    buf.configure({ minLevel: 'debug', enabled: false })
    buf.createLogger('sync').info('x')
    expect(buf.getEntries()).toHaveLength(0)

    buf.configure({ enabled: true })
    const got: LogEntry[] = []
    const unsub = buf.subscribe(e => got.push(e))
    buf.createLogger('sync').info('a')
    expect(got).toHaveLength(1)
    unsub()
    buf.createLogger('sync').info('b')
    expect(got).toHaveLength(1)

    buf.clear()
    buf.ingest([
      { ts: '1970-01-01T00:00:01.000Z', source: 'browser', kind: 'app', system: 'sync', event: 'a', level: 'info' },
      { ts: '1970-01-01T00:00:02.000Z', source: 'browser', kind: 'app', system: 'sync', event: 'b', level: 'info' },
    ])
    expect(buf.getEntries()).toHaveLength(2)
  })

  test('readonly identity — source/service/env set at construction only', () => {
    const b = new LogBuffer({ source: 'worker', service: 'my-svc', env: 'staging' })
    expect(b.source).toBe('worker')
    expect(b.service).toBe('my-svc')
    expect(b.env).toBe('staging')
  })
})

// ── Middleware ─────────────────────────────────────────────────────────

describe('middleware', () => {
  test('observability injects logger + emits HTTP log with trace headers', async () => {
    const mwApp = new Hono()
    mwApp.use('*', observabilityMiddleware(buf, 'test'))
    mwApp.get('/health', (c) => { c.get('log').info('check'); return c.json({ ok: true }) })

    const res = await mwApp.request('http://localhost/health')
    expect(res.status).toBe(200)
    expect(res.headers.get('x-request-id')).toBeTruthy()
    expect(res.headers.get('traceparent')).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/)

    expect(buf.getEntries().find(e => e.kind === 'app' && e.event === 'check')!.traceId).toBeTruthy()
    const http = buf.getEntries().find(e => e.kind === 'http')!
    expect(http).toMatchObject({ method: 'GET', path: '/health', status: 200, service: 'test' })
    expect(http.durationMs).toBeGreaterThanOrEqual(0)
  })

  test('errorHandler catches errors + returns structured JSON 500', async () => {
    const mwApp = new Hono()
    mwApp.use('*', observabilityMiddleware(buf, 'test'))
    mwApp.onError(errorHandler(buf))
    mwApp.get('/boom', () => { throw new Error('test crash') })

    const res = await mwApp.request('http://localhost/boom')
    expect(res.status).toBe(500)
    const body = JSON.parse(await res.text())
    expect(body.error).toBe('Internal Server Error')
    expect(body.requestId).toBeTruthy()
    expect(body.detail).toBe('test crash') // non-production includes detail

    const err = buf.getEntries().find(e => e.kind === 'error')!
    expect(err.error).toBe('test crash')
    expect(err.stack).toBeDefined()
  })
})

// ── Endpoints ─────────────────────────────────────────────────────────

describe('endpoints', () => {
  test('GET /logs with filters + POST ingest + DELETE clear', async () => {
    expect(await json<LogsResponse>('/logs')).toEqual({ count: 0, entries: [] })

    buf.createLogger('sync').info('merge', { modelId: 'abc' })
    buf.createLogger('sync').warn('conflict')
    buf.createLogger('truck').error('crash', new Error('x'))

    expect((await json<LogsResponse>('/logs')).count).toBe(3)
    expect((await json<LogsResponse>('/logs?system=sync')).count).toBe(2)
    expect((await json<LogsResponse>('/logs?level=warn')).count).toBe(2)
    expect((await json<LogsResponse>('/logs?kind=error')).count).toBe(1)
    expect((await json<LogsResponse>('/logs?event=merge')).count).toBe(1)
    expect((await json<LogsResponse>('/logs?limit=1')).entries[0].event).toBe('crash')
    expect((await json<LogsResponse>('/logs?system=sync&level=warn')).count).toBe(1)

    // Ingest
    const r = await json('/logs/ingest', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ ts: '1970-01-01T00:00:01.000Z', source: 'browser', kind: 'app', system: 'sync', event: 'x', level: 'info' }]),
    })
    expect(r.ingested).toBe(1)
    expect((await json<LogsResponse>('/logs?source=browser')).count).toBe(1)

    // Reject non-array
    expect((await api('/logs/ingest', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ not: 'array' }),
    })).status).toBe(400)

    // Clear
    await api('/logs', { method: 'DELETE' })
    expect((await json<LogsResponse>('/logs')).count).toBe(0)
  })

  test('SSE tail + viewer', async () => {
    buf.createLogger('sync').info('p1')
    buf.createLogger('sync').info('p2')
    buf.createLogger('truck').info('no')

    const res = await api('/logs/tail?system=sync')
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    const reader = res.body!.getReader()
    const entries: LogEntry[] = []
    const deadline = Date.now() + 500
    try {
      while (entries.length < 2 && Date.now() < deadline) {
        const { value, done } = await Promise.race([
          reader.read(),
          new Promise<{ value: undefined; done: true }>(r =>
            setTimeout(() => r({ value: undefined, done: true }), Math.max(1, deadline - Date.now()))),
        ])
        if (done || !value) break
        for (const line of new TextDecoder().decode(value).split('\n\n').filter(l => l.startsWith('data: ')))
          entries.push(JSON.parse(line.slice(6)))
      }
    } finally { reader.cancel() }
    expect(entries.length).toBeGreaterThanOrEqual(2)
    expect(entries.every(e => e.system === 'sync')).toBe(true)

    const viewerRes = await api('/logs/viewer')
    expect(viewerRes.status).toBe(200)
    expect(await viewerRes.text()).toContain('plat-trunk log viewer')
  })
})

// ── setupLog integration ──────────────────────────────────────────────

describe('setupLog', () => {
  test('returns createLogger + urls + buffer', () => {
    const testApp = new Hono<LogEnv>()
    const result = setupLog(testApp, 'test-svc')

    // createLogger is a function, not the raw buffer
    expect(typeof result.createLogger).toBe('function')
    const log = result.createLogger('sync')
    expect(typeof log.info).toBe('function')
    expect(typeof log.timed).toBe('function')
    expect(typeof log.child).toBe('function')

    // urls are pre-built
    expect(result.urls.local.viewer).toBe('/api/debug/logs/viewer')
    expect(result.urls.local.tail).toBe('/api/debug/logs/tail')
    expect(result.urls.local.api).toBe('/api/debug/logs')
    expect(result.urls.workerName).toBe('test-svc')

    // buffer is the escape hatch
    expect(result.buffer).toBeInstanceOf(LogBuffer)
    expect(result.buffer.service).toBe('test-svc')
  })

  test('createLogger produces entries in the buffer', () => {
    const testApp = new Hono<LogEnv>()
    const { createLogger, buffer } = setupLog(testApp, 'test-svc')

    createLogger('sync').info('merge', { modelId: 'abc' })
    const entries = buffer.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ system: 'sync', event: 'merge', modelId: 'abc', service: 'test-svc' })
  })

  test('wired middleware works end-to-end', async () => {
    const testApp = new Hono<LogEnv>()
    const { buffer } = setupLog(testApp, 'test-svc')

    testApp.get('/health', (c) => {
      c.var.log.info('alive')
      return c.json({ ok: true })
    })
    testApp.get('/boom', () => { throw new Error('kaboom') })

    // Health check — middleware injects logger
    const res = await testApp.request('http://localhost/health')
    expect(res.status).toBe(200)
    expect(buffer.getEntries().find(e => e.event === 'alive')).toBeTruthy()
    expect(buffer.getEntries().find(e => e.kind === 'http')).toBeTruthy()

    // Error — errorHandler catches + logs
    const errRes = await testApp.request('http://localhost/boom')
    expect(errRes.status).toBe(500)
    const body = (await errRes.json()) as { error: string; detail: string }
    expect(body.error).toBe('Internal Server Error')
    expect(body.detail).toBe('kaboom')
    expect(buffer.getEntries().find(e => e.kind === 'error' && e.error === 'kaboom')).toBeTruthy()
  })
})
