// src/observability/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Public surface of the observability module.
// Import from here — not from sub-files — so internals can be refactored freely.
// ─────────────────────────────────────────────────────────────────────────────

export type { TraceContext, LogLevel, LogEntry, BaseLogFields } from "./types";
export { createLogger }                                         from "./logger";
export type { Logger }                                          from "./logger";
export {
  generateTraceId,
  generateSpanId,
  generateRequestId,
  extractTraceContext,
  buildTraceparent,
  propagateTrace,
}                                                               from "./trace";
export { observabilityMiddleware, errorMiddleware }             from "./middleware";
