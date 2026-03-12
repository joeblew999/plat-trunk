// src/observability/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared types for structured logging & trace context.
// All log payloads are plain JSON objects — CF Workers Logs auto-indexes
// every top-level key, enabling zero-cost Query Builder filters.
// ─────────────────────────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface TraceContext {
  /** W3C traceparent header value, propagated from upstream or generated here */
  traceId: string;
  /** Current span within this worker invocation */
  spanId: string;
  /** Request-scoped correlation ID (stable across retries) */
  requestId: string;
}

export interface BaseLogFields {
  level: LogLevel;
  ts: string;             // ISO-8601 — CF Logs indexes this as a timestamp
  traceId: string;
  spanId: string;
  requestId: string;
  service: string;        // Worker name — matches wrangler.toml `name`
  env: string;            // "production" | "staging" | "local"
}

export interface HttpLogFields extends BaseLogFields {
  kind: "http";
  method: string;
  path: string;
  status: number;
  durationMs: number;
  cfRay?: string;
  cfColo?: string;
  ip?: string;
  userAgent?: string;
}

export interface AppLogFields extends BaseLogFields {
  kind: "app";
  msg: string;
  /** Arbitrary extra fields — all get top-level indexed by CF Logs */
  [key: string]: unknown;
}

export interface ErrorLogFields extends BaseLogFields {
  kind: "error";
  msg: string;
  error: string;
  stack?: string;
  /** Route/operation where the error occurred */
  operation?: string;
  [key: string]: unknown;
}

export type LogEntry = HttpLogFields | AppLogFields | ErrorLogFields;
