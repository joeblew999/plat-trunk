/**
 * Browser-side structured logger with offline-safe localStorage queue.
 *
 * One-liner setup:
 *   import { setupBrowserLog } from '../../lib/observe/browser'
 *   const { createLogger, stop } = setupBrowserLog({ flushUrl: '/api/debug/logs/ingest' })
 *   const sync = createLogger('sync')
 *   sync.info('click', { target: 'save-btn' })
 *
 * Entries queue in localStorage when offline, flush automatically when back online.
 * Uses the same LogEntry / Logger types as the worker — entries flow through to the terminal aggregator.
 */

import { LEVEL_NUM, type LogEntry, type LogLevel, type Logger } from './index'

// ── Types ─────────────────────────────────────────────────────────────

export interface BrowserLogOptions {
  /** POST endpoint for flushing entries to worker (e.g. '/api/debug/logs/ingest') */
  flushUrl: string
  /** Flush interval in ms (default 2000) */
  flushIntervalMs?: number
  /** Source tag (default 'browser') */
  source?: string
  /** Minimum log level (default 'debug') */
  minLevel?: LogLevel
  /** Max entries held in localStorage queue before oldest are dropped (default 500) */
  maxQueueSize?: number
  /** Install window.onerror + window.onunhandledrejection handlers (default false) */
  captureErrors?: boolean
}

export interface BrowserLogSetup {
  /** Create a logger for a subsystem — same Logger interface as worker-side */
  createLogger: (system: string, ctx?: Record<string, unknown>) => Logger
  /** Stop flush timer and online listener */
  stop: () => void
}

// ── Constants ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'plat-log-queue'

const CONSOLE_FN: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: console.debug, info: console.log, warn: console.warn, error: console.error,
}

// ── Setup ─────────────────────────────────────────────────────────────

export function setupBrowserLog(opts: BrowserLogOptions): BrowserLogSetup {
  const source = opts.source ?? 'browser'
  const minLevel = opts.minLevel ?? 'debug'
  const flushIntervalMs = opts.flushIntervalMs ?? 2000
  const maxQueueSize = opts.maxQueueSize ?? 500

  // ── Queue (persisted in localStorage for offline resilience) ──────
  let queue: LogEntry[] = loadQueue()
  let flushing = false
  let timer: ReturnType<typeof setTimeout> | null = null

  function loadQueue(): LogEntry[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
    catch { return [] }
  }

  function saveQueue(): void {
    try {
      if (queue.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  function enqueue(entry: LogEntry): void {
    if (queue.length >= maxQueueSize) queue.shift()
    queue.push(entry)
    saveQueue()
  }

  async function flush(): Promise<void> {
    if (flushing || queue.length === 0 || !navigator.onLine) return
    flushing = true
    const batch = queue.splice(0, queue.length)
    try {
      const res = await fetch(opts.flushUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      })
      if (!res.ok) queue.unshift(...batch)
    } catch {
      queue.unshift(...batch)
    } finally {
      saveQueue()
      flushing = false
    }
  }

  function scheduleFlush(): void {
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      flush().then(() => scheduleFlush())
    }, flushIntervalMs)
  }

  const onOnline = () => flush()
  globalThis.addEventListener('online', onOnline)

  // Kick off initial flush + schedule loop
  flush().then(() => scheduleFlush())

  // ── Global error capture ───────────────────────────────────────────

  let onError: ((event: ErrorEvent) => void) | null = null
  let onRejection: ((event: PromiseRejectionEvent) => void) | null = null

  if (opts.captureErrors) {
    const panicLogger = createLoggerInternal('panic')

    onError = (event: ErrorEvent) => {
      const err = event.error instanceof Error ? event.error : new Error(String(event.message))
      panicLogger.error('uncaught', err, {
        source: event.filename, line: event.lineno, col: event.colno,
      })
    }

    onRejection = (event: PromiseRejectionEvent) => {
      const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
      panicLogger.error('unhandled-rejection', err)
    }

    globalThis.addEventListener('error', onError as EventListener)
    globalThis.addEventListener('unhandledrejection', onRejection as EventListener)
  }

  // ── Logger factory ────────────────────────────────────────────────

  function createLoggerInternal(system: string, baseContext?: Record<string, unknown>): Logger {
    const base = { ...baseContext }

    const emit = (level: LogLevel, kind: 'app' | 'error', event: string, data?: Record<string, unknown>) => {
      if (LEVEL_NUM[level] < LEVEL_NUM[minLevel]) return
      const entry: LogEntry = { ts: new Date().toISOString(), level, kind, source, system, event, ...base, ...data }
      CONSOLE_FN[level]?.(JSON.stringify(entry))
      enqueue(entry)
    }

    return {
      debug: (event, data) => emit('debug', 'app', event, data),
      info: (event, data) => emit('info', 'app', event, data),
      warn: (event, data) => emit('warn', 'app', event, data),

      error: (event, err?, data?) => {
        const errObj = err instanceof Error ? err : err ? new Error(String(err)) : undefined
        emit('error', 'error', event, {
          ...data,
          ...(errObj && { error: errObj.message, stack: errObj.stack }),
        })
      },

      timed: async <T>(operation: string, fn: () => Promise<T>, data?: Record<string, unknown>): Promise<T> => {
        const t0 = Date.now()
        try {
          const result = await fn()
          emit('info', 'app', `${operation}.ok`, { operation, durationMs: Date.now() - t0, ...data })
          return result
        } catch (err) {
          const errObj = err instanceof Error ? err : new Error(String(err))
          emit('error', 'error', `${operation}.fail`, {
            operation, durationMs: Date.now() - t0,
            error: errObj.message, stack: errObj.stack,
            ...data,
          })
          throw err
        }
      },

      child: (ctx) => createLoggerInternal(system, { ...base, ...ctx }),
    }
  }

  function createLogger(system: string, ctx?: Record<string, unknown>): Logger {
    return createLoggerInternal(system, ctx)
  }

  // ── Teardown ──────────────────────────────────────────────────────

  function stop(): void {
    if (timer) { clearTimeout(timer); timer = null }
    globalThis.removeEventListener('online', onOnline)
    if (onError) globalThis.removeEventListener('error', onError as EventListener)
    if (onRejection) globalThis.removeEventListener('unhandledrejection', onRejection as EventListener)
  }

  return { createLogger, stop }
}
