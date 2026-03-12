// src/observability/trace.ts
// ─────────────────────────────────────────────────────────────────────────────
// W3C Trace Context (traceparent) helpers.
//
// CF Workers automatic tracing (open beta, Nov 2025) instruments every I/O
// call automatically. These helpers ensure:
//
//   1. Inbound W3C `traceparent` headers are honoured so upstream traces
//      correctly parent our spans.
//   2. Every outbound subrequest carries a `traceparent` header so downstream
//      Workers / external services can join the same trace.
//   3. `x-request-id` is propagated as a stable correlation ID for log joins.
//
// Spec: https://www.w3.org/TR/trace-context/
// ─────────────────────────────────────────────────────────────────────────────

import type { TraceContext } from "./types";

// ── Crypto helpers ────────────────────────────────────────────────────────────

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateTraceId(): string { return randomHex(16); }  // 128-bit
export function generateSpanId():  string { return randomHex(8);  }  // 64-bit
export function generateRequestId(): string { return randomHex(16); }

// ── traceparent parsing ───────────────────────────────────────────────────────

/**
 * Parse a W3C traceparent header.
 * Format: `00-<traceId>-<parentSpanId>-<flags>`
 */
export function parseTraceparent(header: string | null): {
  traceId: string;
  parentSpanId: string;
} | null {
  if (!header) return null;
  const parts = header.split("-");
  if (parts.length < 4 || parts[0] !== "00") return null;
  const [, traceId, parentSpanId] = parts;
  if (traceId.length !== 32 || parentSpanId.length !== 16) return null;
  return { traceId, parentSpanId };
}

/**
 * Build a W3C traceparent header value from a TraceContext.
 * Flags = 01 (sampled).
 */
export function buildTraceparent(ctx: TraceContext): string {
  return `00-${ctx.traceId}-${ctx.spanId}-01`;
}

// ── Context extraction from request ──────────────────────────────────────────

/**
 * Extract or create a TraceContext from an incoming Request.
 *
 * Priority:
 *   1. Inbound `traceparent` (upstream distributed trace)
 *   2. Inbound `x-request-id` (stable correlation ID from gateway/LB)
 *   3. CF-Ray header as a fallback request ID
 *   4. Generate fresh IDs
 */
export function extractTraceContext(req: Request): TraceContext {
  const traceparent = parseTraceparent(req.headers.get("traceparent"));

  const traceId   = traceparent?.traceId   ?? generateTraceId();
  const spanId    = generateSpanId();        // Always a fresh span for this invocation
  const requestId =
    req.headers.get("x-request-id") ??
    req.headers.get("cf-ray") ??
    generateRequestId();

  return { traceId, spanId, requestId };
}

// ── Outbound propagation ──────────────────────────────────────────────────────

/**
 * Add W3C trace headers to an outbound fetch init.
 * Use this when calling downstream Workers or external APIs so traces link up.
 *
 * @example
 * const res = await fetch(url, propagateTrace(ctx, { method: "POST", body }));
 */
export function propagateTrace(
  ctx: TraceContext,
  init: RequestInit = {},
): RequestInit {
  const headers = new Headers(init.headers);
  headers.set("traceparent", buildTraceparent(ctx));
  headers.set("x-request-id", ctx.requestId);
  return { ...init, headers };
}
