/**
 * E2E tests using playwright-cli to drive demos.
 *
 * Requires playwright-cli: npm i -g @playwright/cli
 *
 * Run modes:
 *   bun tests/e2e.spec.ts                                             # local wrangler.sh (:8686)
 *   ROUTER_URL=https://observe-router.gedw99.workers.dev bun tests/e2e.spec.ts  # remote
 */

import { execSync } from 'child_process'
import { readFileSync } from 'fs'

// ROUTER_URL → use router /demo1 and /demo2 prefixes
// Default: local wrangler.sh on :8686
const ROUTER = process.env.ROUTER_URL ?? 'http://localhost:8686'
const DEMO1 = `${ROUTER}/demo1`
const DEMO2 = `${ROUTER}/demo2`
const isRemote = !!process.env.ROUTER_URL
const SESSION = isRemote ? 'observe-e2e-remote' : 'observe-e2e-local'
const CLI = `npx @playwright/cli -s=${SESSION}`

// ── Helpers ──────────────────────────────────────────────────────────

function pw(command: string): string {
  try {
    return execSync(`${CLI} ${command}`, { encoding: 'utf-8', timeout: 15000 }).trim()
  } catch (e: any) {
    return e.stdout?.toString()?.trim() || e.message
  }
}

/** Take snapshot, read the yml file, find ref for a button by its text label. */
function findButtonRef(label: string): string | null {
  const output = pw('snapshot')
  const ymlMatch = output.match(/\((.playwright-cli\/page-[^)]+\.yml)\)/)
  if (!ymlMatch) return null
  const ymlContent = readFileSync(ymlMatch[1], 'utf-8')
  const re = new RegExp(`button "${label}" \\[ref=(e\\d+)\\]`)
  const m = ymlContent.match(re)
  return m ? m[1] : null
}

/** Click a button by its label text. Snapshots first to get the ref. */
function clickButton(label: string): void {
  const ref = findButtonRef(label)
  if (!ref) throw new Error(`button "${label}" not found in snapshot`)
  pw(`click ${ref}`)
}

async function clearLogs(base: string) {
  await fetch(`${base}/api/debug/logs`, { method: 'DELETE' })
}

async function getLogs(base: string, params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await fetch(`${base}/api/debug/logs${qs}`)
  return res.json() as Promise<{ count: number; entries: Record<string, unknown>[] }>
}

function assert(cond: boolean, msg: string) { if (!cond) throw new Error(msg) }

/** Poll until fn returns true, checking every 50ms. */
async function waitFor(fn: () => Promise<boolean>, ms = 5000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (await fn()) return
    await new Promise(r => setTimeout(r, 50))
  }
  throw new Error(`waitFor timed out after ${ms}ms`)
}

/** Open or navigate, then wait until page has a clickable button. */
function navigateAndWait(url: string, open = false) {
  pw(open ? `open ${url}` : `goto ${url}`)
  // Snapshot polls until a button ref is found (page loaded)
  const deadline = Date.now() + 10000
  while (Date.now() < deadline) {
    const output = pw('snapshot')
    const ymlMatch = output.match(/\((.playwright-cli\/page-[^)]+\.yml)\)/)
    if (ymlMatch) {
      const yml = readFileSync(ymlMatch[1], 'utf-8')
      if (/button .* \[ref=e\d+\]/.test(yml)) return
    }
  }
  throw new Error(`page at ${url} never loaded buttons`)
}

let passed = 0
let failed = 0

async function t(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  PASS: ${name}`); passed++ }
  catch (e: any) { console.error(`  FAIL: ${name}\n    ${e.message}`); failed++; process.exitCode = 1 }
}

// ── Preflight ────────────────────────────────────────────────────────

async function preflight() {
  for (const [name, base] of [['demo1', DEMO1], ['demo2', DEMO2]]) {
    try {
      const r = await fetch(`${base}/api/demo/health`)
      if (!r.ok) throw new Error(`${r.status}`)
    } catch {
      const hint = isRemote
        ? `check deployed worker at ${base}`
        : `start local server: ./dev/wrangler.sh`
      console.error(`ERROR: ${name} not reachable at ${base}. ${hint}`)
      process.exit(1)
    }
  }
}

// ── Tests ────────────────────────────────────────────────────────────

async function run() {
  await preflight()
  const mode = isRemote ? 'REMOTE' : 'LOCAL'
  console.log(`\nobserve e2e (playwright-cli) [${mode}] — ${ROUTER}\n`)

  // Clean slate
  pw('close')

  // ── Demo 1: worker button clicks → structured logs ────────────────

  // LOCAL ONLY: Tests below use the ring buffer (/api/debug/logs) — local dev debug tool only.
  // On CF production, logs go: console.log(JSON) → CF Workers Observability.
  // Verify production delivery via CF dashboard or `ROUTER_URL=... bun run tail`.

  if (!isRemote) await t('worker → button clicks produce logs', async () => {
    await clearLogs(DEMO1)
    navigateAndWait(DEMO1, true)

    clickButton('health')
    clickButton('timed ok')
    clickButton('child')
    clickButton('worker-log')

    await waitFor(async () => {
      const { entries } = await getLogs(DEMO1, { source: 'worker' })
      return entries.length >= 3 && entries.some(e => e.event === 'merge')
    })

    const { entries } = await getLogs(DEMO1, { source: 'worker' })
    const merge = entries.find(e => e.event === 'merge')
    assert(merge !== undefined, 'sync:merge entry missing')
    assert(merge!.system === 'sync', `expected system=sync, got ${merge!.system}`)
  })

  if (!isRemote) await t('browser → flush to worker', async () => {
    await clearLogs(DEMO1)

    clickButton('info')
    clickButton('warn')

    // Browser queue flushes every 2s — poll instead of fixed sleep
    await waitFor(async () => (await getLogs(DEMO1, { source: 'browser' })).count >= 1, 10000)
  })

  if (!isRemote) await t('worker → throw produces error with stack', async () => {
    await clearLogs(DEMO1)
    clickButton('throw')

    await waitFor(async () => (await getLogs(DEMO1, { kind: 'error' })).entries.some(e => e.event === 'unhandled'))

    const { entries } = await getLogs(DEMO1, { kind: 'error' })
    const err = entries.find(e => e.event === 'unhandled')
    assert(err !== undefined, 'no unhandled error entry')
    assert(typeof err!.stack === 'string', 'stack missing')
  })

  await t('scrubbing → sensitive fields redacted', async () => {
    await clearLogs(DEMO1)

    await fetch(`${DEMO1}/api/debug/logs/ingest`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        ts: new Date().toISOString(), source: 'browser', kind: 'app',
        system: 'pw-scrub', event: 'login', level: 'info',
        password: 'hunter2', token: 'secret', userId: 'visible',
      }]),
    })

    const { entries } = await getLogs(DEMO1, { system: 'pw-scrub' })
    const e = entries.find(x => x.event === 'login')!
    assert(e.password === '[REDACTED]', `password not redacted: ${e.password}`)
    assert(e.userId === 'visible', `userId scrubbed: ${e.userId}`)
  })

  // ── Demo 2: second worker ─────────────────────────────────────────

  if (!isRemote) await t('cross-worker → demo2 auth entries', async () => {
    await clearLogs(DEMO2)
    navigateAndWait(DEMO2)

    clickButton('worker-log')

    await waitFor(async () => (await getLogs(DEMO2, { source: 'worker' })).entries.some(e => e.event === 'login'))

    const { entries } = await getLogs(DEMO2, { source: 'worker' })
    const login = entries.find(e => e.event === 'login')
    assert(login !== undefined, 'auth:login entry missing from demo2')
    assert(login!.system === 'auth', `expected system=auth, got ${login!.system}`)
  })

  // ── Cross-worker ──────────────────────────────────────────────────

  if (!isRemote) await t('cross-worker → both demos produce logs', async () => {
    await clearLogs(DEMO1)
    await clearLogs(DEMO2)

    navigateAndWait(DEMO1)
    clickButton('worker-log')

    navigateAndWait(DEMO2)
    clickButton('worker-log')

    await waitFor(async () => {
      const d1 = await getLogs(DEMO1, { source: 'worker' })
      const d2 = await getLogs(DEMO2, { source: 'worker' })
      return d1.entries.some(e => e.event === 'merge') && d2.entries.some(e => e.event === 'login')
    })
  })

  await t('tracing → traceparent on responses', async () => {
    const res = await fetch(`${DEMO1}/api/debug/logs`)
    const tp = res.headers.get('traceparent')
    assert(tp !== null && /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/.test(tp!), `bad traceparent: ${tp}`)
  })

  // ── Cleanup ────────────────────────────────────────────────────────

  pw('close')

  console.log(`\n  ${passed} passed, ${failed} failed\n`)
  process.exit(failed > 0 ? 1 : 0)
}

run()
