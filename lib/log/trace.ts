/**
 * W3C Trace Context (traceparent) helpers for distributed tracing.
 *
 * CF Workers automatic tracing instruments every I/O call automatically.
 * These helpers ensure:
 *   1. Inbound traceparent headers are honoured (upstream traces parent our spans)
 *   2. Outbound subrequests carry traceparent (downstream workers join the trace)
 *   3. x-request-id is propagated as a stable correlation ID for log joins
 *
 * Spec: https://www.w3.org/TR/trace-context/
 */

// ── Types ─────────────────────────────────────────────────────────────

export interface TraceContext {
  traceId: string    // 128-bit hex — W3C trace ID
  spanId: string     // 64-bit hex — current span within this invocation
  requestId: string  // stable correlation ID across retries
}

// ── Crypto helpers ────────────────────────────────────────────────────

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('')
}

export function generateTraceId(): string { return randomHex(16) }
export function generateSpanId(): string { return randomHex(8) }

// ── traceparent parsing ───────────────────────────────────────────────

/** Parse W3C traceparent: `00-<traceId>-<parentSpanId>-<flags>` */
export function parseTraceparent(header: string | null): { traceId: string; parentSpanId: string } | null {
  if (!header) return null
  const parts = header.split('-')
  if (parts.length < 4 || parts[0] !== '00') return null
  const [, traceId, parentSpanId] = parts
  if (traceId.length !== 32 || parentSpanId.length !== 16) return null
  return { traceId, parentSpanId }
}

/** Build W3C traceparent header value. Flags = 01 (sampled). */
export function buildTraceparent(ctx: TraceContext): string {
  return `00-${ctx.traceId}-${ctx.spanId}-01`
}

// ── Context extraction from request ───────────────────────────────────

/**
 * Extract or create TraceContext from an incoming Request.
 *
 * Priority:
 *   1. Inbound `traceparent` (upstream distributed trace)
 *   2. Inbound `x-request-id` (stable correlation ID from gateway/LB)
 *   3. CF-Ray header as fallback request ID
 *   4. Generate fresh IDs
 */
export function extractTraceContext(req: Request): TraceContext {
  const traceparent = parseTraceparent(req.headers.get('traceparent'))
  return {
    traceId: traceparent?.traceId ?? generateTraceId(),
    spanId: generateSpanId(),
    requestId: req.headers.get('x-request-id') ?? req.headers.get('cf-ray') ?? randomHex(16),
  }
}

// ── Outbound propagation ──────────────────────────────────────────────

/**
 * Add W3C trace headers to an outbound fetch init.
 * Use when calling downstream Workers so traces link up in CF dashboard.
 *
 * @example
 * const res = await fetch(url, propagateTrace(ctx, { method: 'POST', body }))
 */
export function propagateTrace(ctx: TraceContext, init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers)
  headers.set('traceparent', buildTraceparent(ctx))
  headers.set('x-request-id', ctx.requestId)
  return { ...init, headers }
}
