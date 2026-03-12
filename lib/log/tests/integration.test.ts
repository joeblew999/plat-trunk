/**
 * Integration + fuzz tests — real CF Worker (wrangler or deployed) + optional Playwright browser.
 *
 *   bun lib/log/tests/integration.test.ts                                   # local
 *   LOG_URL=https://log-demo.gedw99.workers.dev bun lib/log/tests/integration.test.ts  # prod
 *
 * Requires: playwright browsers (bunx playwright install chromium)
 */

import { chromium, type Browser, type Page } from '../../../systems/truck/e2e/node_modules/playwright'
import { spawn, type ChildProcess } from 'child_process'

// ── Config ────────────────────────────────────────────────────────────

const REMOTE_URL = process.env.LOG_URL
const isRemote = !!REMOTE_URL
const PORT = 3336
const BASE = isRemote ? REMOTE_URL! : `http://localhost:${PORT}`

// ── Shared infra ──────────────────────────────────────────────────────

let wrangler: ChildProcess
let browser: Browser
let clientPage: Page
let viewerPage: Page
let passed = 0
let failed = 0

function assert(cond: boolean, msg: string) { if (!cond) throw new Error(msg) }

async function t(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  PASS: ${name}`); passed++ }
  catch (e: any) { console.error(`  FAIL: ${name}\n    ${e.message}`); failed++; process.exitCode = 1 }
}

async function ingest(entries: Record<string, unknown>[]) {
  const res = await fetch(`${BASE}/api/debug/logs/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

// ── Setup / teardown ──────────────────────────────────────────────────

async function startWrangler(): Promise<void> {
  return new Promise((resolve, reject) => {
    wrangler = spawn('bunx', ['wrangler', 'dev', 'worker.ts', '--port', String(PORT)], {
      cwd: import.meta.dir + '/../demo',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const timer = setTimeout(() => reject(new Error('wrangler did not start in 15s')), 15000)
    const onData = (data: Buffer) => {
      if (data.toString().includes('Ready on')) { clearTimeout(timer); resolve() }
    }
    wrangler.stdout?.on('data', onData)
    wrangler.stderr?.on('data', onData)
    wrangler.on('error', (e) => { clearTimeout(timer); reject(e) })
    wrangler.on('exit', (code) => {
      if (code !== null && code !== 0) { clearTimeout(timer); reject(new Error(`wrangler exited: ${code}`)) }
    })
  })
}

async function setup() {
  if (isRemote) {
    console.log(`[test] remote: ${REMOTE_URL}`)
    const res = await fetch(`${REMOTE_URL}/api/debug/logs`)
    if (!res.ok) throw new Error(`deployed worker not reachable: ${res.status}`)
  } else {
    console.log('[test] starting wrangler dev...')
    await startWrangler()
    console.log(`[test] wrangler ready on :${PORT}`)
  }
  browser = await chromium.launch()
  clientPage = await browser.newPage()
  viewerPage = await browser.newPage()
}

async function teardown() {
  await clientPage?.close()
  await viewerPage?.close()
  await browser?.close()
  if (!isRemote) wrangler?.kill()
  console.log('[test] cleaned up')
}

// ═══════════════════════════════════════════════════════════════════════

async function run() {
  await setup()
  const mode = isRemote ? 'PROD' : 'LOCAL'
  console.log(`\nlog integration tests [${mode}] (${BASE})\n`)

  // ── API endpoints ─────────────────────────────────────────────────

  await t('GET /logs responds', async () => {
    const json = await getLogs()
    assert(typeof json.count === 'number', 'bad shape')
  })

  await t('POST /logs/ingest works', async () => {
    const r = await ingest([{ ts: new Date().toISOString(), source: 'test', system: 'sync', event: 'manual', level: 'info' }])
    assert(r.ingested === 1, `expected 1, got ${r.ingested}`)
  })

  await t('rejects non-array ingest', async () => {
    const res = await fetch(`${BASE}/api/debug/logs/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ single: 'entry' }),
    })
    assert(res.status === 400, `expected 400, got ${res.status}`)
  })

  // ── Browser client ────────────────────────────────────────────────

  await t('browser page loads', async () => {
    const res = await clientPage.goto(`${BASE}/`)
    assert(res?.status() === 200, `expected 200`)
    assert((await clientPage.title()).includes('log demo'), 'bad title')
  })

  await t('browser generates logs (tick > 0)', async () => {
    await clientPage.waitForFunction(() => {
      const el = document.getElementById('status')
      return el?.textContent?.includes('tick:') && !el.textContent.includes('tick: 0')
    }, { timeout: 8000 })
  })

  await t('browser has deviceId in localStorage', async () => {
    const id = await clientPage.evaluate(() => localStorage.getItem('plat-device-id'))
    assert(id !== null && id.length === 36, `bad deviceId: ${id}`)
  })

  // ── Browser → Worker flush ────────────────────────────────────────

  await t('browser entries flush to worker', async () => {
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000))
      const { count } = await getLogs({ source: 'browser' })
      if (count > 0) return
    }
    throw new Error('no browser entries flushed after 15s')
  })

  await t('merged stream has both sources', async () => {
    const { entries } = await getLogs()
    const sources = new Set(entries.map(e => e.source))
    assert(sources.has('browser'), 'no browser entries')
    assert(sources.has('worker'), 'no worker entries')
  })

  // ── Viewer ────────────────────────────────────────────────────────

  await t('viewer loads', async () => {
    const res = await viewerPage.goto(`${BASE}/api/debug/logs/viewer`)
    assert(res?.status() === 200, `expected 200`)
    assert(await viewerPage.title() === 'plat-trunk log viewer', 'bad title')
  })

  await t('viewer SSE streams entries', async () => {
    await viewerPage.waitForFunction(() => document.querySelectorAll('.entry').length >= 2, { timeout: 15000 })
  })

  await t('viewer source filter works', async () => {
    await viewerPage.selectOption('#fSource', 'browser')
    await viewerPage.waitForFunction(() => document.querySelectorAll('.entry').length > 0, { timeout: 15000 })
    const sources = await viewerPage.locator('.entry .src').allTextContents()
    for (const s of sources) assert(s === 'browser', `expected browser, got ${s}`)
  })

  // ── /urls endpoint ────────────────────────────────────────────────

  await t('/urls returns valid config', async () => {
    const res = await fetch(`${BASE}/api/debug/logs/urls`)
    const urls = await res.json() as Record<string, unknown>
    assert(urls.workerName === 'log-demo', `bad workerName`)
    assert((urls.local as any)?.viewer === '/api/debug/logs/viewer', 'bad local viewer')
    assert((urls.cf as any)?.logs?.includes('cloudflare.com'), 'bad cf logs')
  })

  // ── Fuzz: varied entry shapes ─────────────────────────────────────

  await clearLogs()

  await t('fuzz: all log levels', async () => {
    const entries = ['debug', 'info', 'warn', 'error'].map((level, i) => ({
      ts: new Date(Date.now() + i).toISOString(), source: 'browser', system: 'fuzz', event: `level-${level}`, level,
    }))
    assert((await ingest(entries)).ingested === 4, 'expected 4')
  })

  await t('fuzz: nested data', async () => {
    assert((await ingest([{
      ts: new Date().toISOString(), source: 'worker', system: 'fuzz', event: 'nested', level: 'info',
      data: { model: { id: 'm1', ops: [1, 2, 3] } }, count: 42,
    }])).ingested === 1, 'expected 1')
  })

  await t('fuzz: unicode + special chars', async () => {
    assert((await ingest([
      { ts: new Date().toISOString(), source: 'browser', system: 'fuzz', event: 'emoji-🔥', level: 'info', msg: '日本語' },
      { ts: new Date(Date.now() + 1).toISOString(), source: 'browser', system: 'fuzz', event: 'special<>&', level: 'warn' },
    ])).ingested === 2, 'expected 2')
  })

  await t('fuzz: long string round-trip', async () => {
    const longStr = 'x'.repeat(10000)
    await ingest([{ ts: new Date().toISOString(), source: 'browser', system: 'fuzz', event: 'long', level: 'info', payload: longStr }])
    const { entries } = await getLogs({ event: 'long' })
    assert(entries.length >= 1 && (entries[0].payload as string).length === 10000, 'payload truncated')
  })

  // ── Fuzz: filtering ───────────────────────────────────────────────

  await t('fuzz: filter by source', async () => {
    const { entries } = await getLogs({ source: 'browser', system: 'fuzz' })
    for (const e of entries) assert(e.source === 'browser', `got ${e.source}`)
  })

  await t('fuzz: filter by level', async () => {
    const { entries } = await getLogs({ level: 'warn', system: 'fuzz' })
    for (const e of entries) assert(['warn', 'error'].includes(e.level as string), `got ${e.level}`)
  })

  await t('fuzz: limit works', async () => {
    const { count } = await getLogs({ limit: '2', system: 'fuzz' })
    assert(count <= 2, `expected <= 2, got ${count}`)
  })

  // ── Fuzz: SSE ─────────────────────────────────────────────────────

  await t('fuzz: SSE streams history', async () => {
    const controller = new AbortController()
    const entries: Record<string, unknown>[] = []
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const res = await fetch(`${BASE}/api/debug/logs/tail?system=fuzz`, { signal: controller.signal })
      assert(res.headers.get('content-type') === 'text/event-stream', 'bad content-type')
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      const deadline = Date.now() + 6000
      while (Date.now() < deadline) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()!
        for (const l of lines) if (l.startsWith('data: ')) try { entries.push(JSON.parse(l.slice(6))) } catch {}
        if (entries.length >= 2) break
      }
    } catch {}
    clearTimeout(timeout); controller.abort()
    assert(entries.length >= 2, `expected >= 2 SSE entries, got ${entries.length}`)
  })

  // ── Fuzz: stress ──────────────────────────────────────────────────

  await clearLogs()

  await t('fuzz: burst 100 entries', async () => {
    const entries = Array.from({ length: 100 }, (_, i) => ({
      ts: new Date(Date.now() + i).toISOString(), source: i % 2 === 0 ? 'browser' : 'worker',
      system: 'fuzz', event: `burst-${i}`, level: ['debug', 'info', 'warn', 'error'][i % 4],
    }))
    assert((await ingest(entries)).ingested === 100, 'expected 100')
  })

  await t('fuzz: concurrent reads', async () => {
    const [all, , , limited] = await Promise.all([
      getLogs({ system: 'fuzz' }),
      getLogs({ system: 'fuzz', source: 'browser' }),
      getLogs({ system: 'fuzz', level: 'error' }),
      getLogs({ system: 'fuzz', limit: '10' }),
    ])
    assert(all.count >= 50, `total too low: ${all.count}`)
    assert(limited.count <= 10, `limit not respected: ${limited.count}`)
  })

  // ── Tracing + middleware ─────────────────────────────────────────

  await clearLogs()

  await t('trace: responses have traceparent header', async () => {
    const res = await fetch(`${BASE}/api/debug/logs`)
    const tp = res.headers.get('traceparent')
    assert(tp !== null, 'no traceparent header')
    assert(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/.test(tp!), `bad traceparent format: ${tp}`)
  })

  await t('trace: responses have x-request-id header', async () => {
    const res = await fetch(`${BASE}/api/debug/logs`)
    const rid = res.headers.get('x-request-id')
    assert(rid !== null, 'no x-request-id header')
    assert(rid!.length > 0, 'empty x-request-id')
  })

  await t('trace: each request gets unique traceId', async () => {
    const r1 = await fetch(`${BASE}/api/debug/logs`)
    const r2 = await fetch(`${BASE}/api/debug/logs`)
    const tp1 = r1.headers.get('traceparent')!
    const tp2 = r2.headers.get('traceparent')!
    assert(tp1 !== tp2, 'traceparent should be unique per request')
  })

  await t('trace: inbound traceparent is honoured', async () => {
    const inboundTraceId = 'aabbccdd11223344aabbccdd11223344'
    const res = await fetch(`${BASE}/api/debug/logs`, {
      headers: { 'traceparent': `00-${inboundTraceId}-1122334455667788-01` },
    })
    const tp = res.headers.get('traceparent')!
    assert(tp.includes(inboundTraceId), `response should preserve inbound traceId, got: ${tp}`)
  })

  await t('trace: HTTP logs have traceId + requestId', async () => {
    await clearLogs()
    // Make a specific request to generate an HTTP log entry
    await fetch(`${BASE}/api/debug/logs/urls`)
    await new Promise(r => setTimeout(r, 200))
    const { entries } = await getLogs({ kind: 'http' })
    const httpEntries = entries.filter(e => e.kind === 'http' && e.path === '/api/debug/logs/urls')
    assert(httpEntries.length >= 1, `expected HTTP log entries for /urls, got ${httpEntries.length}`)
    const e = httpEntries[0]
    assert(typeof e.traceId === 'string' && (e.traceId as string).length === 32, `bad traceId: ${e.traceId}`)
    assert(typeof e.requestId === 'string' && (e.requestId as string).length > 0, `bad requestId: ${e.requestId}`)
    assert(e.method === 'GET', `bad method: ${e.method}`)
    assert(typeof e.durationMs === 'number', `bad durationMs: ${e.durationMs}`)
    assert(typeof e.status === 'number', `bad status: ${e.status}`)
  })

  await t('error: /debug/throw returns structured JSON 500', async () => {
    const res = await fetch(`${BASE}/debug/throw`)
    assert(res.status === 500, `expected 500, got ${res.status}`)
    const ct = res.headers.get('content-type')
    assert(ct?.includes('application/json') === true, `expected JSON, got ${ct}`)
    const body = await res.json() as Record<string, unknown>
    assert(body.error === 'Internal Server Error', `bad error field: ${body.error}`)
    assert(typeof body.requestId === 'string', `no requestId in error response`)
    // Should also have trace headers
    assert(res.headers.get('traceparent') !== null, 'error response missing traceparent')
    assert(res.headers.get('x-request-id') !== null, 'error response missing x-request-id')
  })

  await t('error: error is logged in buffer with kind:error', async () => {
    await clearLogs()
    await fetch(`${BASE}/debug/throw`)
    await new Promise(r => setTimeout(r, 100))
    const { entries } = await getLogs({ kind: 'error' })
    assert(entries.length >= 1, `expected error entries, got ${entries.length}`)
    const errEntry = entries.find(e => e.event === 'unhandled')
    assert(errEntry !== undefined, 'no unhandled error entry')
    assert(typeof errEntry!.error === 'string', 'error field missing')
    assert(typeof errEntry!.stack === 'string', 'stack field missing')
  })

  // ── Fuzz: kind filtering ───────────────────────────────────────────

  await clearLogs()

  await t('fuzz: kind filtering — app vs http vs error', async () => {
    // Generate app entries via ingest
    await ingest([
      { ts: new Date().toISOString(), source: 'browser', kind: 'app', system: 'fuzz', event: 'click', level: 'info' },
      { ts: new Date(Date.now() + 1).toISOString(), source: 'browser', kind: 'app', system: 'fuzz', event: 'scroll', level: 'debug' },
    ])
    // Generate an HTTP entry by making a request
    await getLogs()
    // Generate an error entry
    await fetch(`${BASE}/debug/throw`)
    await new Promise(r => setTimeout(r, 200))

    const appLogs = await getLogs({ kind: 'app' })
    assert(appLogs.count >= 2, `expected >= 2 app entries, got ${appLogs.count}`)
    for (const e of appLogs.entries) assert(e.kind === 'app', `expected app, got ${e.kind}`)

    const httpLogs = await getLogs({ kind: 'http' })
    assert(httpLogs.count >= 1, `expected >= 1 http entries, got ${httpLogs.count}`)
    for (const e of httpLogs.entries) assert(e.kind === 'http', `expected http, got ${e.kind}`)

    const errorLogs = await getLogs({ kind: 'error' })
    assert(errorLogs.count >= 1, `expected >= 1 error entries, got ${errorLogs.count}`)
    for (const e of errorLogs.entries) assert(e.kind === 'error', `expected error, got ${e.kind}`)
  })

  await t('fuzz: entries have service field', async () => {
    const { entries } = await getLogs({ kind: 'http' })
    assert(entries.length >= 1, 'no HTTP entries')
    // HTTP entries from middleware should have service
    const withService = entries.filter(e => typeof e.service === 'string')
    assert(withService.length >= 1, 'no entries with service field')
  })

  await t('fuzz: combined kind + level filter', async () => {
    const { entries } = await getLogs({ kind: 'app', level: 'info' })
    for (const e of entries) {
      assert(e.kind === 'app', `expected app kind, got ${e.kind}`)
      assert(['info', 'warn', 'error'].includes(e.level as string), `expected >= info, got ${e.level}`)
    }
  })

  // ── Cleanup ───────────────────────────────────────────────────────

  await t('DELETE clears buffer', async () => {
    await clearLogs()
    await new Promise(r => setTimeout(r, 200))
    const { count } = await getLogs({ system: 'fuzz' })
    assert(count === 0, `expected 0 after clear, got ${count}`)
  })

  await t('viewer clear button', async () => {
    await viewerPage.selectOption('#fSource', '')
    await viewerPage.waitForFunction(() => document.querySelectorAll('.entry').length > 0, { timeout: 10000 })
    await viewerPage.click('button:text("clear")')
    assert(await viewerPage.locator('#count').textContent() === '0', 'count not 0')
  })

  // ── Prod-only: CF observability ───────────────────────────────────

  if (isRemote) {
    await t('structured JSON reaches CF', async () => {
      const marker = `test-${Date.now()}`
      await ingest([{ ts: new Date().toISOString(), source: 'browser', system: 'test', event: marker, level: 'info' }])
      const { count } = await getLogs({ event: marker })
      assert(count === 1, `marker not found`)
    })
  }

  // ── Summary ───────────────────────────────────────────────────────

  console.log(`\n  ${passed} passed, ${failed} failed  [${mode}]\n`)
  await teardown()
  process.exit(failed > 0 ? 1 : 0)
}

run()
