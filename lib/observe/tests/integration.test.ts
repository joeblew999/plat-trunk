/**
 * Integration tests — real CF Worker (wrangler or deployed).
 *
 *   mise run test                                                               # local (auto-starts test-worker)
 *   TEST_WORKER_URL=https://observe-test.gedw99.workers.dev bun tests/integration.test.ts  # remote
 *
 * Runs against test-worker — the minimal lib/observe consumer.
 * See lib/observe/test-worker/worker.ts for the template pattern.
 */

import { spawn, type ChildProcess } from 'child_process'
import { resolve } from 'path'

// ── Config ────────────────────────────────────────────────────────────
// test-worker started by mise run test — port comes from mise [env]

const REMOTE_URL = process.env.TEST_WORKER_URL
const isRemote = !!REMOTE_URL
const ROOT_DIR = resolve(import.meta.dir, '../../..')

const TEST_WORKER_PORT = parseInt(process.env.TEST_WORKER_PORT ?? '3342', 10)
const BASE = isRemote ? REMOTE_URL! : `http://localhost:${TEST_WORKER_PORT}`

// ── Helpers ──────────────────────────────────────────────────────────

let tailProc: ChildProcess | null = null
let passed = 0
let failed = 0

function assert(cond: boolean, msg: string) { if (!cond) throw new Error(msg) }

/** Poll until fn returns true, checking every 50ms. No wasted time. */
async function waitFor(fn: () => Promise<boolean>, ms = 3000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (await fn()) return
    await new Promise(r => setTimeout(r, 50))
  }
  throw new Error(`waitFor timed out after ${ms}ms`)
}

async function t(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  PASS: ${name}`); passed++ }
  catch (e: any) { console.error(`  FAIL: ${name}\n    ${e.message}`); failed++; process.exitCode = 1 }
}

async function ingest(entries: Record<string, unknown>[]) {
  const res = await fetch(`${BASE}/api/debug/logs/ingest`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entries),
  })
  assert(res.ok, `ingest failed: ${res.status}`)
  return res.json() as Promise<{ ingested: number }>
}

async function getLogs(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await fetch(`${BASE}/api/debug/logs${qs}`)
  assert(res.ok, `GET /logs failed: ${res.status}`)
  return res.json() as Promise<{ count: number; entries: Record<string, unknown>[] }>
}

async function clearLogs() {
  await fetch(`${BASE}/api/debug/logs`, { method: 'DELETE' })
}

/** Read SSE entries from /tail until predicate is met or timeout. */
async function readSSE(
  filter: string,
  until: (entries: Record<string, unknown>[]) => boolean,
  timeoutMs = 10000,
): Promise<Record<string, unknown>[]> {
  const controller = new AbortController()
  const entries: Record<string, unknown>[] = []
  const qs = filter ? `?${filter}` : ''

  try {
    const res = await fetch(`${BASE}/api/debug/logs/tail${qs}`, { signal: controller.signal })
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n'); buf = lines.pop()!
      for (const l of lines) {
        if (l.startsWith('data: ')) try { entries.push(JSON.parse(l.slice(6))) } catch {}
      }
      if (until(entries)) break
    }
  } catch {}
  controller.abort()
  return entries
}

// ── Setup / teardown ─────────────────────────────────────────────────

async function setup() {
  if (isRemote) {
    const res = await fetch(`${REMOTE_URL}/api/debug/logs`)
    if (!res.ok) throw new Error(`deployed worker not reachable: ${res.status}`)
  } else {
    const res = await fetch(`${BASE}/api/debug/logs`)
    if (!res.ok) throw new Error(`test worker not reachable on :${TEST_WORKER_PORT} — run via: mise run test`)
  }
}

async function teardown() {
  try { tailProc?.kill() } catch {}
  console.log('[test] cleaned up')
}

// ═════════════════════════════════════════════════════════════════════

async function run() {
  await setup()
  const mode = isRemote ? 'PROD' : 'LOCAL'
  console.log(`\nlog integration tests [${mode}] (${BASE})\n`)

  // ── 1. Ingest + query round-trip ─────────────────────────────────

  await t('ingest → query, filter, clear', async () => {
    await clearLogs()

    // Diverse shapes: levels, nested data, unicode, long strings
    const r = await ingest([
      { ts: new Date().toISOString(), source: 'browser', kind: 'app', system: 'fuzz', event: 'level-debug', level: 'debug' },
      { ts: new Date(Date.now() + 1).toISOString(), source: 'browser', kind: 'app', system: 'fuzz', event: 'level-warn', level: 'warn' },
      { ts: new Date(Date.now() + 2).toISOString(), source: 'worker', kind: 'app', system: 'fuzz', event: 'nested', level: 'info', data: { model: { id: 'm1', ops: [1, 2] } } },
      { ts: new Date(Date.now() + 3).toISOString(), source: 'browser', kind: 'app', system: 'fuzz', event: 'emoji-🔥', level: 'info', msg: '日本語' },
      { ts: new Date(Date.now() + 4).toISOString(), source: 'browser', kind: 'app', system: 'fuzz', event: 'long', level: 'info', payload: 'x'.repeat(10000) },
    ])
    assert(r.ingested === 5, `expected 5, got ${r.ingested}`)

    // Rejects non-array
    const bad = await fetch(`${BASE}/api/debug/logs/ingest`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ single: 'entry' }),
    })
    assert(bad.status === 400, `expected 400, got ${bad.status}`)

    // Filter by source
    const { entries: browserOnly } = await getLogs({ source: 'browser', system: 'fuzz' })
    for (const e of browserOnly) assert(e.source === 'browser', `got ${e.source}`)

    // Filter by level (>= warn)
    const { entries: warnUp } = await getLogs({ level: 'warn', system: 'fuzz' })
    for (const e of warnUp) assert(['warn', 'error'].includes(e.level as string), `got ${e.level}`)

    // Limit
    const { count: limited } = await getLogs({ limit: '2', system: 'fuzz' })
    assert(limited <= 2, `limit not respected: ${limited}`)

    // Long string round-trip
    const { entries: longEntries } = await getLogs({ event: 'long' })
    assert(longEntries.length >= 1 && (longEntries[0].payload as string).length === 10000, 'payload truncated')

    // URLs endpoint
    const urlsRes = await fetch(`${BASE}/api/debug/logs/urls`)
    const urls = await urlsRes.json() as Record<string, unknown>
    assert(urls.workerName === 'observe-test', `bad workerName`)

    // Clear
    await clearLogs()
    await waitFor(async () => (await getLogs({ system: 'fuzz' })).count === 0)
    const { count } = await getLogs({ system: 'fuzz' })
    assert(count === 0, `expected 0 after clear, got ${count}`)
  })

  // ── 2. Browser client end-to-end ─────────────────────────────────
  // Tests that browser entries posted to /ingest flow through to the ring buffer.
  // test-worker has no UI — we drive the browser to POST entries directly.

  if (!isRemote) await t('browser → flush to worker', async () => {
    await clearLogs()

    // Simulate what setupBrowserLog does: POST a batch of entries to ingest
    const deviceId = crypto.randomUUID()
    const sessionId = crypto.randomUUID()
    const r = await ingest([
      { ts: new Date().toISOString(), source: 'browser', kind: 'app', system: 'ui',
        event: 'click', level: 'info', deviceId, sessionId },
    ])
    assert(r.ingested === 1, `expected 1 ingested, got ${r.ingested}`)

    // Entry must appear in ring buffer with correct source
    await waitFor(async () => (await getLogs({ source: 'browser' })).count > 0)
    const { entries } = await getLogs({ source: 'browser' })
    const e = entries.find(x => x.deviceId === deviceId)
    assert(e !== undefined, 'browser entry not in ring buffer')
    assert(e!.sessionId === sessionId, 'sessionId not preserved')
    assert(e!.source === 'browser', `source should be browser, got ${e!.source}`)
  })

  // ── 3. Tracing + middleware ──────────────────────────────────────

  await t('tracing → headers, correlation, propagation', async () => {
    await clearLogs()

    // traceparent + x-request-id on responses
    const r1 = await fetch(`${BASE}/api/debug/logs`)
    const tp1 = r1.headers.get('traceparent')
    assert(tp1 !== null && /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/.test(tp1!), `bad traceparent: ${tp1}`)
    assert(r1.headers.get('x-request-id') !== null, 'no x-request-id')

    // Unique per request
    const r2 = await fetch(`${BASE}/api/debug/logs`)
    assert(r1.headers.get('traceparent') !== r2.headers.get('traceparent'), 'traceparent not unique')

    // Inbound traceparent is honoured
    const inboundTraceId = 'aabbccdd11223344aabbccdd11223344'
    const r3 = await fetch(`${BASE}/api/debug/logs`, {
      headers: { 'traceparent': `00-${inboundTraceId}-1122334455667788-01` },
    })
    assert(r3.headers.get('traceparent')!.includes(inboundTraceId), 'inbound traceId not preserved')

    // HTTP log entries have traceId + requestId
    await fetch(`${BASE}/api/debug/logs/urls`)
    await waitFor(async () => (await getLogs({ kind: 'http' })).entries.some(e => e.path === '/api/debug/logs/urls'))
    const { entries } = await getLogs({ kind: 'http' })
    const httpEntry = entries.find(e => e.path === '/api/debug/logs/urls')
    assert(httpEntry !== undefined, 'no HTTP log entry for /urls')
    assert(typeof httpEntry!.traceId === 'string' && (httpEntry!.traceId as string).length === 32, `bad traceId`)
    assert(typeof httpEntry!.requestId === 'string', `bad requestId`)
    assert(typeof httpEntry!.durationMs === 'number', `bad durationMs`)
  })

  // ── 4. Error handling ────────────────────────────────────────────

  await t('errors → structured 500 with stack', async () => {
    await clearLogs()

    const res = await fetch(`${BASE}/api/test/throw`)
    assert(res.status === 500, `expected 500, got ${res.status}`)
    const body = await res.json() as Record<string, unknown>
    assert(body.error === 'Internal Server Error', `bad error: ${body.error}`)
    assert(typeof body.requestId === 'string', 'no requestId in error response')
    assert(res.headers.get('traceparent') !== null, 'error response missing traceparent')

    await waitFor(async () => (await getLogs({ kind: 'error' })).entries.some(e => e.event === 'unhandled'))
    const { entries } = await getLogs({ kind: 'error' })
    const errEntry = entries.find(e => e.event === 'unhandled')
    assert(errEntry !== undefined, 'no unhandled error entry')
    assert(typeof errEntry!.error === 'string', 'error field missing')
    assert(typeof errEntry!.stack === 'string', 'stack field missing')
  })

  // ── 5. SSE pipeline e2e (same path tail.ts consumes) ─────────────
  //
  // Real pipeline: ingest → LogBuffer.push() (scrub) → SSE /tail → consumer

  // LOCAL ONLY: SSE /tail streams from the ring buffer — local dev debug tool only.
  // On CF production, use `wrangler tail` or Workers Observability dashboard instead.

  if (!isRemote) await t('sse → live stream with scrubbing', async () => {
    await clearLogs()

    // 5a. Scrubbed sensitive data in live SSE
    const scrubSSE = readSSE('system=scrub-e2e', (e) => e.length >= 1)
    await new Promise(r => setTimeout(r, 100))
    await ingest([{
      ts: new Date().toISOString(), source: 'browser', kind: 'app', system: 'scrub-e2e', event: 'login-attempt', level: 'warn',
      password: 'hunter2', token: 'secret-tok-999', userId: 'user-visible',
    }])
    const scrubEntries = await scrubSSE
    const scrubE = scrubEntries.find(x => x.event === 'login-attempt')!
    assert(scrubE !== undefined, 'login-attempt not in SSE')
    assert(scrubE.password === '[REDACTED]', `password not redacted: ${scrubE.password}`)
    assert(scrubE.token === '[REDACTED]', `token not redacted: ${scrubE.token}`)
    assert(scrubE.userId === 'user-visible', `userId should be visible`)

    // 5b. Worker-side entries flow through SSE
    await clearLogs()
    const workerSSE = readSSE('system=sync', (e) => e.length >= 1, 8000)
    await new Promise(r => setTimeout(r, 100))
    await fetch(`${BASE}/api/test/log`)
    const workerEntries = await workerSSE
    const merge = workerEntries.find(x => x.event === 'merge')
    assert(merge !== undefined, `merge not in SSE. Got: ${workerEntries.map(e => e.event).join(', ')}`)
    assert(merge!.source === 'worker', `source should be worker`)

    // 5c. Error entries with stack traces flow through SSE
    await clearLogs()
    const errorSSE = readSSE('', (e) => e.some(x => x.kind === 'error'), 8000)
    await new Promise(r => setTimeout(r, 100))
    await fetch(`${BASE}/api/test/throw`)
    const errorEntries = await errorSSE
    const err = errorEntries.find(x => x.kind === 'error' && x.event === 'unhandled')
    assert(err !== undefined, `error not in SSE. Got: ${errorEntries.map(e => e.event).join(', ')}`)
    assert(typeof err!.stack === 'string', 'stack missing from SSE error')
    assert(typeof err!.traceId === 'string', 'traceId missing from SSE error')
  })

  // ── 6. Tail aggregator — black-box subprocess test ─────────────
  //
  // Spawns tail.ts as an independent process (exactly how a dev runs it),
  // reads its stdout from outside, asserts on what comes out.
  // Uses two instances of test-worker to prove multi-worker aggregation.

  if (!isRemote) {
    const TEST_WORKER_PORT2 = TEST_WORKER_PORT + 1  // second instance on adjacent port
    let proc2: ReturnType<typeof spawn> | null = null

    await t('tail → multi-worker aggregation (black-box)', async () => {
      const STRIP_ANSI = /\x1b\[[0-9;]*m/g
      let tailBuf = ''

      // Start second test-worker instance
      proc2 = spawn('bunx', [
        'wrangler', 'dev', 'worker.ts',
        '--port', String(TEST_WORKER_PORT2),
        '--inspector-port', String(TEST_WORKER_PORT2 + 100),
      ], { cwd: resolve(import.meta.dir, '../test-worker'), stdio: ['ignore', 'pipe', 'pipe'] })

      await waitFor(async () => {
        try { const r = await fetch(`http://localhost:${TEST_WORKER_PORT2}/api/health`); return r.ok } catch { return false }
      }, 20000)

      const BASE2 = `http://localhost:${TEST_WORKER_PORT2}`

      // Spawn tail.ts as a standalone subprocess
      tailProc = spawn('bun', [
        'lib/observe/dev/tail.ts',
        '--port', `worker1:${TEST_WORKER_PORT}`,
        '--port', `worker2:${TEST_WORKER_PORT2}`,
      ], { cwd: ROOT_DIR, stdio: ['ignore', 'pipe', 'pipe'] })

      tailProc.stdout!.on('data', (d: Buffer) => { tailBuf += d.toString() })
      tailProc.stderr!.on('data', (d: Buffer) => { tailBuf += d.toString() })

      // Wait for tail.ts to connect to both workers
      await waitFor(async () => {
        const plain = tailBuf.replace(STRIP_ANSI, '')
        return plain.includes(`connected :${TEST_WORKER_PORT}`) && plain.includes(`connected :${TEST_WORKER_PORT2}`)
      }, 15000)

      // Trigger logs on BOTH workers
      tailBuf = ''
      await fetch(`${BASE}/api/test/log`)
      await fetch(`${BASE2}/api/test/log`)

      // Both should produce test-entry events
      await waitFor(async () => {
        const plain = tailBuf.replace(STRIP_ANSI, '')
        return (plain.match(/test-entry/g) ?? []).length >= 2
      }, 8000)

      const plain = tailBuf.replace(STRIP_ANSI, '')
      assert((plain.match(/test-entry/g) ?? []).length >= 2, 'expected test-entry from both workers')
      assert(plain.includes('worker1'), 'worker1 name not in tail')
      assert(plain.includes('worker2'), 'worker2 name not in tail')

      // Scrubbing: sensitive data redacted end-to-end through the aggregator
      tailBuf = ''
      await ingest([{
        ts: new Date().toISOString(), source: 'browser', kind: 'app',
        system: 'tail-scrub', event: 'login-pw', level: 'warn',
        password: 'hunter2', userId: 'visible-user',
      }])

      await waitFor(async () => tailBuf.replace(STRIP_ANSI, '').includes('login-pw'), 8000)

      const plain2 = tailBuf.replace(STRIP_ANSI, '')
      assert(plain2.includes('[REDACTED]'), `[REDACTED] not in tail`)
      assert(!plain2.includes('hunter2'), `LEAKED: raw password in tail`)
      assert(plain2.includes('visible-user'), `non-sensitive userId missing`)
    })

    try { proc2?.kill() } catch {}
  }

  // ── 7. Prod-only ─────────────────────────────────────────────────

  if (isRemote) {
    await t('prod: structured JSON reaches CF', async () => {
      const marker = `test-${Date.now()}`
      await ingest([{ ts: new Date().toISOString(), source: 'browser', system: 'test', event: marker, level: 'info' }])
      const { count } = await getLogs({ event: marker })
      assert(count === 1, 'marker not found')
    })
  }

  // ── Summary ────────────────────────────────────────────────────────

  console.log(`\n  ${passed} passed, ${failed} failed  [${mode}]\n`)
  await teardown()
  process.exit(failed > 0 ? 1 : 0)
}

run()
