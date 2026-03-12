// src/observability/logger.ts
// ─────────────────────────────────────────────────────────────────────────────
// Structured JSON logger.
//
// CF Workers Logs captures every console.log() call as a log event.
// By logging plain JSON objects (not template strings), CF auto-indexes
// every key — enabling the Query Builder to filter on `userId`, `toolId`,
// `durationMs`, etc. with full cardinality.
//
// Rules:
//   • Always call console.log(JSON.stringify(payload)) — NOT console.log(msg, obj)
//   • Keep every field at the top level (no nesting of hot query fields)
//   • Never put PII in log fields — put it in a separate `pii.*` envelope if needed
// ─────────────────────────────────────────────────────────────────────────────

import type { TraceContext, LogLevel, AppLogFields, ErrorLogFields } from "./types";

const SERVICE = (globalThis as any).__SERVICE_NAME__ ?? "plat-trunk-api";
const ENV     = (globalThis as any).__ENV__ ?? "local";

// ── Internal emit ─────────────────────────────────────────────────────────────

function emit(payload: Record<string, unknown>): void {
  // console.log with a single JSON string — CF Workers Logs picks up the raw
  // JSON and indexes every top-level key automatically.
  console.log(JSON.stringify(payload));
}

// ── Logger factory ────────────────────────────────────────────────────────────

export function createLogger(ctx: TraceContext) {
  const base = {
    service: SERVICE,
    env: ENV,
    traceId: ctx.traceId,
    spanId: ctx.spanId,
    requestId: ctx.requestId,
  };

  function log(level: LogLevel, msg: string, extra?: Record<string, unknown>): void {
    const payload: AppLogFields = {
      ...base,
      level,
      ts: new Date().toISOString(),
      kind: "app",
      msg,
      ...extra,
    };
    emit(payload);
  }

  return {
    debug: (msg: string, extra?: Record<string, unknown>) => log("debug", msg, extra),
    info:  (msg: string, extra?: Record<string, unknown>) => log("info",  msg, extra),
    warn:  (msg: string, extra?: Record<string, unknown>) => log("warn",  msg, extra),

    error: (msg: string, err?: unknown, extra?: Record<string, unknown>) => {
      const errObj = err instanceof Error ? err : new Error(String(err));
      const payload: ErrorLogFields = {
        ...base,
        level: "error",
        ts: new Date().toISOString(),
        kind: "error",
        msg,
        error: errObj.message,
        stack: errObj.stack,
        ...extra,
      };
      emit(payload);
    },

    /** Emit a timed sub-operation span into the log stream */
    timed: async <T>(
      operation: string,
      fn: () => Promise<T>,
      extra?: Record<string, unknown>,
    ): Promise<T> => {
      const t0 = Date.now();
      try {
        const result = await fn();
        log("info", `${operation} ok`, { operation, durationMs: Date.now() - t0, ...extra });
        return result;
      } catch (err) {
        const errObj = err instanceof Error ? err : new Error(String(err));
        const payload: ErrorLogFields = {
          ...base,
          level: "error",
          ts: new Date().toISOString(),
          kind: "error",
          msg: `${operation} failed`,
          error: errObj.message,
          stack: errObj.stack,
          operation,
          durationMs: Date.now() - t0,
          ...extra,
        };
        emit(payload);
        throw err;
      }
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
