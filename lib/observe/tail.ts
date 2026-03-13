#!/usr/bin/env bun
/**
 * Terminal log aggregator — merges SSE tail streams from all local workers.
 *
 *   bun lib/log/tail.ts                        # all workers (from workers.mjs)
 *   bun lib/log/tail.ts truck-cad              # specific worker(s)
 *   bun lib/log/tail.ts --port demo1:3333      # ad-hoc target (not in workers.mjs)
 *   bun lib/log/tail.ts --port demo1:3333 --port demo2:3334
 *   bun lib/log/tail.ts --level warn           # filter by level
 *   bun lib/log/tail.ts --system sync          # filter by system
 *
 * Each worker must be running (`bun run dev`) with setupLog() wired in.
 * Browser logs appear automatically — they flush to the worker via /api/debug/logs/ingest.
 *
 * THIS REPLACES THE WEB VIEWER. One terminal, all workers, all sources.
 */

import { workers as allWorkers } from '../../workers.mjs'
import type { LogEntry } from './index'

// ── Config ───────────────────────────────────────────────────────────

const TAIL_PATH = '/api/debug/logs/tail'
const RETRY_INTERVAL = 3000

// ── Types ────────────────────────────────────────────────────────────

interface WorkerTarget { name: string; port: number }

// ── CLI args ─────────────────────────────────────────────────────────

const args = process.argv.slice(2)
let filterLevel: string | null = null
let filterSystem: string | null = null
const filterWorkers: string[] = []
const adhocTargets: WorkerTarget[] = []

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--level' && args[i + 1]) { filterLevel = args[++i]; continue }
  if (args[i] === '--system' && args[i + 1]) { filterSystem = args[++i]; continue }
  if (args[i] === '--port' && args[i + 1]) {
    const val = args[++i]
    const [name, portStr] = val.includes(':') ? val.split(':') : ['worker', val]
    adhocTargets.push({ name, port: Number(portStr) })
    continue
  }
  if (args[i] === '--help' || args[i] === '-h') { usage(); process.exit(0) }
  filterWorkers.push(args[i])
}

function usage() {
  console.log(`Usage: bun lib/log/tail.ts [worker-names...] [--port name:port ...] [--level LEVEL] [--system SYSTEM]

  Merges live log streams from all running local workers into one terminal view.
  Browser logs appear automatically (they flush through the worker).

  Options:
    --port name:port    Add ad-hoc target (not in workers.mjs). Repeatable.
    --level LEVEL       Filter: only show entries >= LEVEL (debug|info|warn|error)
    --system SYSTEM     Filter: only show entries from SYSTEM

  Examples:
    bun lib/log/tail.ts                                    # all workers
    bun lib/log/tail.ts truck-cad                          # just truck-cad
    bun lib/log/tail.ts --port demo1:3333 --port demo2:3334  # ad-hoc demos
    bun lib/log/tail.ts --level warn                       # warn + error only
    bun lib/log/tail.ts --system sync                      # sync subsystem only`)
}

// ── Resolve workers ──────────────────────────────────────────────────

const targets: WorkerTarget[] = adhocTargets.length > 0
  ? adhocTargets  // --port overrides workers.mjs entirely
  : (allWorkers as Array<{ name: string; port: number }>)
      .filter(w => filterWorkers.length === 0 || filterWorkers.includes(w.name))
      .map(w => ({ name: w.name, port: w.port }))

if (targets.length === 0) {
  console.error('No matching workers found. Available:', allWorkers.map((w: any) => w.name).join(', '))
  process.exit(1)
}

// ── Colors ───────────────────────────────────────────────────────────

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'

const LEVEL_COLORS: Record<string, string> = {
  debug: '\x1b[2m',       // dim
  info:  '\x1b[32m',      // green
  warn:  '\x1b[33m',      // yellow
  error: '\x1b[31m\x1b[1m', // bold red
}

// Distinct colors for each worker
const WORKER_COLORS = [
  '\x1b[36m', // cyan
  '\x1b[35m', // magenta
  '\x1b[34m', // blue
  '\x1b[33m', // yellow
  '\x1b[32m', // green
]

const LEVEL_ORDER: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 }
const minLevel = filterLevel ? (LEVEL_ORDER[filterLevel] ?? 0) : 0

// ── Format ───────────────────────────────────────────────────────────

function padRight(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length)
}

function formatEntry(workerName: string, workerColor: string, entry: LogEntry): string | null {
  const level = entry.level || 'info'
  if ((LEVEL_ORDER[level] ?? 0) < minLevel) return null
  if (filterSystem && entry.system !== filterSystem) return null

  const levelColor = LEVEL_COLORS[level] || ''
  const ts = entry.ts ? new Date(entry.ts).toLocaleTimeString('en', { hour12: false }) + '.' +
    String(new Date(entry.ts).getMilliseconds()).padStart(3, '0') : '??:??:??.???'

  const source = entry.source === 'browser' ? 'browser' : ''
  const tag = `${entry.system || '?'}:${entry.event || '?'}`

  // Extra fields (exclude standard ones)
  const skip = new Set(['ts', 'level', 'kind', 'source', 'system', 'event', 'service', 'env'])
  const extra = Object.entries(entry)
    .filter(([k]) => !skip.has(k) && entry[k] !== undefined)
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(' ')

  const wName = padRight(workerName, 12)
  const sourceTag = source ? ` ${DIM}[browser]${RESET}` : ''

  return `${DIM}${ts}${RESET} ${workerColor}${wName}${RESET} ${levelColor}${padRight(level, 5)}${RESET} ${BOLD}${tag}${RESET}${sourceTag} ${DIM}${extra}${RESET}`
}

// ── SSE stream reader ────────────────────────────────────────────────

async function connectWorker(target: WorkerTarget, color: string): Promise<void> {
  const params = new URLSearchParams()
  if (filterSystem) params.set('system', filterSystem)
  if (filterLevel) params.set('level', filterLevel)
  const qs = params.toString()
  const url = `http://localhost:${target.port}${TAIL_PATH}${qs ? '?' + qs : ''}`

  while (true) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
      if (!res.ok || !res.body) {
        console.error(`${DIM}[${target.name}] HTTP ${res.status} — retrying in ${RETRY_INTERVAL / 1000}s${RESET}`)
        await Bun.sleep(RETRY_INTERVAL)
        continue
      }

      console.error(`${color}[${target.name}]${RESET} ${DIM}connected :${target.port}${RESET}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const entry = JSON.parse(line.slice(6)) as LogEntry
            const formatted = formatEntry(target.name, color, entry)
            if (formatted) console.log(formatted)
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('ECONNREFUSED')) {
        console.error(`${DIM}[${target.name}] ${msg} — retrying${RESET}`)
      }
    }

    await Bun.sleep(RETRY_INTERVAL)
  }
}

// ── Main ─────────────────────────────────────────────────────────────

console.error('')
console.error(`${BOLD}lib/log tail${RESET} — streaming from ${targets.length} worker(s)`)
console.error('')
for (const [i, t] of targets.entries()) {
  const color = WORKER_COLORS[i % WORKER_COLORS.length]
  console.error(`  ${color}${t.name}${RESET} → http://localhost:${t.port}${TAIL_PATH}`)
}
if (filterLevel) console.error(`  filter: level >= ${filterLevel}`)
if (filterSystem) console.error(`  filter: system = ${filterSystem}`)
console.error('')
console.error(`${DIM}Waiting for workers... (start them with: bun run dev)${RESET}`)
console.error('')

// Connect to all workers in parallel — each reconnects independently
await Promise.all(
  targets.map((t, i) => connectWorker(t, WORKER_COLORS[i % WORKER_COLORS.length]))
)
