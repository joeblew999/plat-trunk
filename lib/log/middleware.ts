/**
 * Hono middleware for CF-native observability.
 *
 *   app.use('*', observabilityMiddleware(buffer))   // trace context + logger + HTTP log
 *   app.onError(errorHandler(buffer))               // structured error handling
 *
 * In handlers:
 *   const log = c.var.log                           // per-request Logger with traceId
 *   const ctx = c.var.traceCtx                      // for propagateTrace() to downstream
 *   const result = await log.timed('d1.query', () => db.query(...))
 */

import { createMiddleware } from 'hono/factory'
import type { ErrorHandler, MiddlewareHandler } from 'hono'
import { LogBuffer, type LogEntry } from './index'
import { extractTraceContext, buildTraceparent } from './trace'

// ── Observability middleware ──────────────────────────────────────────
// Extracts/creates W3C trace context, injects logger + traceCtx into Hono context,
// echoes trace headers on response, emits structured HTTP log on completion.

export function observabilityMiddleware(buffer: LogBuffer, system = 'http'): MiddlewareHandler {
  return createMiddleware(async (c, next) => {
    const t0 = Date.now()
    const traceCtx = extractTraceContext(c.req.raw)
    const log = buffer.createLogger(system, {
      traceId: traceCtx.traceId,
      spanId: traceCtx.spanId,
      requestId: traceCtx.requestId,
    })

    c.set('log', log)
    c.set('traceCtx', traceCtx)

    // Echo trace headers — allows clients and downstream services to correlate
    c.header('x-request-id', traceCtx.requestId)
    c.header('traceparent', buildTraceparent(traceCtx))

    await next()

    // Structured HTTP invocation log — CF Workers Logs auto-indexes every field
    const cf = c.req.raw.cf as Record<string, string> | undefined
    const httpEntry: LogEntry = {
      ts: new Date().toISOString(),
      level: c.res.status >= 500 ? 'error' : c.res.status >= 400 ? 'warn' : 'info',
      kind: 'http',
      source: 'worker',
      system,
      event: 'http',
      service: buffer.service,
      env: buffer.env,
      traceId: traceCtx.traceId,
      spanId: traceCtx.spanId,
      requestId: traceCtx.requestId,
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      durationMs: Date.now() - t0,
      cfRay: c.req.header('cf-ray') ?? cf?.['ray'] ?? undefined,
      cfColo: cf?.['colo'] ?? undefined,
      ip: c.req.header('cf-connecting-ip') ?? undefined,
      userAgent: c.req.header('user-agent') ?? undefined,
    }
    buffer.push(httpEntry)
  })
}

// ── Error handler ────────────────────────────────────────────────────
// Use with app.onError(errorHandler(buffer)) — Hono's native error hook.
// Logs structured error with trace context, returns JSON with requestId.

export function errorHandler(buffer: LogBuffer): ErrorHandler {
  return (err, c) => {
    const log = c.get('log')
    const traceCtx = c.get('traceCtx')
    const errObj = err instanceof Error ? err : new Error(String(err))

    if (log) {
      log.error('unhandled', errObj, {
        operation: `${c.req.method} ${new URL(c.req.url).pathname}`,
      })
    } else {
      // Fallback if observabilityMiddleware wasn't mounted
      const entry: LogEntry = {
        ts: new Date().toISOString(), level: 'error', kind: 'error', source: 'worker',
        system: 'http', event: 'unhandled',
        error: errObj.message, stack: errObj.stack,
      }
      buffer.push(entry)
    }

    return c.json({
      error: 'Internal Server Error',
      requestId: traceCtx?.requestId ?? 'unknown',
      // Expose error detail in non-production for easier debugging
      ...(buffer.env !== 'production' && { detail: errObj.message }),
    }, 500)
  }
}
