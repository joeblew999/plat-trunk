/**
 * Platform structured logger — CF-native observability + local dev tools.
 *
 * Production: structured JSON → console.log → CF Workers Logs auto-indexes all fields.
 * Local dev:  ring buffer + SSE tail + terminal aggregator (bun lib/observe/tail.ts).
 *
 * Worker setup (one-liner):
 *   import { setupLog, type LogEnv } from '../../lib/observe'
 *   const app = new Hono<LogEnv>()
 *   const { createLogger } = setupLog(app, 'truck-cad')
 *   // In handlers: c.var.log.info('merge', { modelId })
 *
 * Browser setup (one-liner):
 *   import { setupBrowserLog } from '../../lib/observe/browser'
 *   const { createLogger } = setupBrowserLog({ flushUrl: '/api/debug/logs/ingest' })
 *   const sync = createLogger('sync')
 *
 * Direct usage (advanced):
 *   const buffer = new LogBuffer({ source: 'worker', service: 'truck-cad' })
 *   const log = buffer.createLogger('sync')
 *   log.info('merge', { modelId, opCount })
 */

import type { TraceContext } from './trace'

// ── Types ─────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogSource = 'browser' | 'worker' | string
export type LogKind = 'http' | 'app' | 'error'

export interface LogEntry {
  ts: string
  level: LogLevel
  kind: LogKind
  source: LogSource
  system: string
  event: string
  // CF-native fields (auto-indexed by Workers Logs Query Builder)
  service?: string
  env?: string
  traceId?: string
  spanId?: string
  requestId?: string
  // Error fields
  error?: string
  stack?: string
  // HTTP fields (kind: 'http')
  method?: string
  path?: string
  status?: number
  durationMs?: number
  cfRay?: string
  cfColo?: string
  ip?: string
  userAgent?: string
  [key: string]: unknown
}

export interface Logger {
  debug(event: string, data?: Record<string, unknown>): void
  info(event: string, data?: Record<string, unknown>): void
  warn(event: string, data?: Record<string, unknown>): void
  error(event: string, err?: unknown, data?: Record<string, unknown>): void
  /** Time an async operation — logs success/failure with durationMs automatically */
  timed<T>(operation: string, fn: () => Promise<T>, data?: Record<string, unknown>): Promise<T>
  child(context: Record<string, unknown>): Logger
}

export interface EntryFilter {
  source?: LogSource
  system?: string
  kind?: LogKind
  level?: LogLevel
  event?: string
  since?: string
  limit?: number
}

export interface RateLimitOptions {
  /** Max entries per second */
  maxPerSecond: number
  /** Burst capacity (default: same as maxPerSecond) */
  burstSize?: number
}

export interface LogBufferOptions {
  maxSize?: number
  minLevel?: LogLevel
  enabled?: boolean
  source?: LogSource
  service?: string
  env?: string
  /** Token-bucket rate limiter on push(). Off by default. Error/warn always pass. */
  rateLimit?: RateLimitOptions
}

/** Runtime-tunable settings (identity fields are set at construction) */
export interface LogBufferTuning {
  maxSize?: number
  minLevel?: LogLevel
  enabled?: boolean
}

/** Hono variables set by middleware — use with Hono<{ Variables: LogVariables }> */
export interface LogVariables {
  log: Logger
  traceCtx: TraceContext
}

/** Ready-to-use Hono env type — `new Hono<LogEnv>()` gives typed c.var.log */
export interface LogEnv {
  Variables: LogVariables
}

// ── Constants ─────────────────────────────────────────────────────────

export const LEVEL_NUM: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }
const CONSOLE_FN: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: console.debug, info: console.log, warn: console.warn, error: console.error,
}

// ── Sensitive data scrubbing ──────────────────────────────────────────

const REDACTED_FIELDS = new Set([
  'password', 'secret', 'token', 'authorization', 'cookie',
  'apikey', 'api_key', 'accesstoken', 'access_token',
  'refreshtoken', 'refresh_token', 'sessiontoken', 'session_token',
])

function scrubEntry(entry: LogEntry): void {
  for (const key of Object.keys(entry)) {
    if (REDACTED_FIELDS.has(key.toLowerCase())) {
      ;(entry as Record<string, unknown>)[key] = '[REDACTED]'
    }
  }
}

// ── LogBuffer ─────────────────────────────────────────────────────────

export class LogBuffer {
  private entries: LogEntry[] = []
  private subscribers = new Set<(entry: LogEntry) => void>()
  private maxSize: number
  private minLevel: LogLevel
  private enabled: boolean
  readonly source: LogSource
  readonly service: string
  readonly env: string

  // Rate limiter state (token bucket)
  private rlTokens: number
  private rlMax: number
  private rlRefillRate: number // tokens per ms
  private rlLastRefill: number
  private rlDropped = 0

  constructor(opts: LogBufferOptions = {}) {
    this.maxSize = opts.maxSize ?? 500
    this.minLevel = opts.minLevel ?? 'debug'
    this.enabled = opts.enabled ?? true
    this.source = opts.source ?? 'worker'
    this.service = opts.service ?? 'plat-trunk'
    this.env = opts.env ?? 'local'

    // Rate limiter: off by default (rlRefillRate = 0 means disabled)
    if (opts.rateLimit) {
      this.rlMax = opts.rateLimit.burstSize ?? opts.rateLimit.maxPerSecond
      this.rlTokens = this.rlMax
      this.rlRefillRate = opts.rateLimit.maxPerSecond / 1000
    } else {
      this.rlMax = 0
      this.rlTokens = 0
      this.rlRefillRate = 0
    }
    this.rlLastRefill = Date.now()
  }

  // ── Core ──────────────────────────────────────────────────────────

  push(entry: LogEntry): void {
    // Scrub sensitive fields before anything else
    scrubEntry(entry)

    // Rate limit (error/warn always pass through)
    if (this.rlRefillRate > 0 && LEVEL_NUM[entry.level as LogLevel] < LEVEL_NUM.warn) {
      const now = Date.now()
      this.rlTokens = Math.min(this.rlMax, this.rlTokens + (now - this.rlLastRefill) * this.rlRefillRate)
      this.rlLastRefill = now
      if (this.rlTokens < 1) {
        this.rlDropped++
        return
      }
      this.rlTokens--
    }

    if (this.entries.length >= this.maxSize) this.entries.shift()
    this.entries.push(entry)
    for (const cb of this.subscribers) { try { cb(entry) } catch {} }
    CONSOLE_FN[entry.level as LogLevel]?.(JSON.stringify(entry))
  }

  /** Number of entries dropped by rate limiter since last check. Resets on read. */
  drainDropped(): number {
    const n = this.rlDropped
    this.rlDropped = 0
    return n
  }

  getEntries(f?: EntryFilter): LogEntry[] {
    let result = this.entries.slice().sort((a, b) => a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0)
    if (f?.source) result = result.filter(e => e.source === f.source)
    if (f?.system) result = result.filter(e => e.system === f.system)
    if (f?.kind) result = result.filter(e => e.kind === f.kind)
    if (f?.level) result = result.filter(e => LEVEL_NUM[e.level as LogLevel] >= LEVEL_NUM[f.level!])
    if (f?.event) result = result.filter(e => e.event === f.event)
    if (f?.since) result = result.filter(e => e.ts >= f.since!)
    if (f?.limit) result = result.slice(-f.limit)
    return result
  }

  ingest(entries: LogEntry[]): void {
    for (const e of entries) this.push(e)
  }

  subscribe(cb: (entry: LogEntry) => void): () => void {
    this.subscribers.add(cb)
    return () => this.subscribers.delete(cb)
  }

  clear(): void {
    this.entries.length = 0
  }

  /** Tune runtime behaviour — identity (source/service/env) is set at construction only */
  configure(opts: LogBufferTuning): void {
    if (opts.maxSize !== undefined) this.maxSize = opts.maxSize
    if (opts.minLevel !== undefined) this.minLevel = opts.minLevel
    if (opts.enabled !== undefined) this.enabled = opts.enabled
  }

  // ── Logger factory ────────────────────────────────────────────────

  createLogger(system: string, baseContext?: Record<string, unknown>): Logger {
    const base = { service: this.service, env: this.env, ...baseContext }

    const emit = (level: LogLevel, kind: LogKind, event: string, data?: Record<string, unknown>) => {
      if (!this.enabled || LEVEL_NUM[level] < LEVEL_NUM[this.minLevel]) return
      const entry: LogEntry = { ts: new Date().toISOString(), level, kind, source: this.source, system, event, ...base, ...data }
      this.push(entry)
    }

    const logger: Logger = {
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

      child: (ctx) => this.createLogger(system, { ...base, ...ctx }),
    }

    return logger
  }
}

// ── Re-exports (single import path for consumers) ────────────────────

export type { TraceContext } from './trace'
export { extractTraceContext, buildTraceparent, propagateTrace } from './trace'
export { observabilityMiddleware, errorHandler } from './middleware'
export { setupLog, type SetupLogOptions, type SetupLogResult } from './setup'
export { createLogRoutes } from './endpoint'
export { buildLogConfig, type LogRoutesConfig } from './config'
