// src/observability/middleware.ts
// ─────────────────────────────────────────────────────────────────────────────
// Hono middleware that wires CF-native observability into every request:
//
//   observabilityMiddleware   — extracts trace context, emits HTTP log,
//                               injects logger + trace into Hono context
//   errorMiddleware           — catches unhandled errors, logs them, returns
//                               structured JSON error with trace ID for support
//
// Usage:
//   import { observabilityMiddleware, errorMiddleware } from "./observability/middleware"
//   app.use("*", observabilityMiddleware)   // outermost — must be first
//   app.use("*", errorMiddleware)           // second — wraps all route errors
// ─────────────────────────────────────────────────────────────────────────────

import type { Context, MiddlewareHandler } from "hono";
import { extractTraceContext, buildTraceparent } from "./trace";
import { createLogger }                          from "./logger";
import type { HttpLogFields }                    from "./types";

// ── Hono context variable keys ────────────────────────────────────────────────
// Access via: c.get("logger") / c.get("traceCtx")
// Declare in your Hono app type:
//   type AppVariables = { logger: Logger; traceCtx: TraceContext }
//   const app = new Hono<{ Variables: AppVariables }>()

const SERVICE = (globalThis as any).__SERVICE_NAME__ ?? "plat-trunk-api";
const ENV     = (globalThis as any).__ENV__ ?? "local";

// ── Observability middleware ──────────────────────────────────────────────────

export const observabilityMiddleware: MiddlewareHandler = async (c, next) => {
  const t0        = Date.now();
  const traceCtx  = extractTraceContext(c.req.raw);
  const logger    = createLogger(traceCtx);

  // Inject into Hono context so route handlers can access them
  c.set("logger",   logger);
  c.set("traceCtx", traceCtx);

  // Echo trace headers back on every response — allows clients and downstream
  // services to correlate, and shows up in CF invocation logs automatically
  c.header("x-request-id",  traceCtx.requestId);
  c.header("traceparent",   buildTraceparent(traceCtx));

  await next();

  // ── Emit structured HTTP invocation log ──────────────────────────────────
  // CF Workers Logs will pick this up and index every field.
  // The dashboard Query Builder can then filter on `path`, `status`,
  // `durationMs`, `cfColo`, `method` etc. with full cardinality.
  const cf        = c.req.raw.cf as Record<string, string> | undefined;
  const httpLog: HttpLogFields = {
    level:      c.res.status >= 500 ? "error" : c.res.status >= 400 ? "warn" : "info",
    ts:         new Date().toISOString(),
    kind:       "http",
    service:    SERVICE,
    env:        ENV,
    traceId:    traceCtx.traceId,
    spanId:     traceCtx.spanId,
    requestId:  traceCtx.requestId,
    method:     c.req.method,
    path:       new URL(c.req.url).pathname,
    status:     c.res.status,
    durationMs: Date.now() - t0,
    cfRay:      c.req.header("cf-ray")          ?? cf?.["ray"] ?? undefined,
    cfColo:     (cf?.["colo"] as string)         ?? undefined,
    ip:         c.req.header("cf-connecting-ip") ?? undefined,
    userAgent:  c.req.header("user-agent")       ?? undefined,
  };
  console.log(JSON.stringify(httpLog));
};

// ── Error middleware ──────────────────────────────────────────────────────────

export const errorMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    await next();
  } catch (err) {
    const logger   = c.get("logger");
    const traceCtx = c.get("traceCtx");

    const errObj = err instanceof Error ? err : new Error(String(err));

    // Log the error — CF Logs captures this, and the traceId ties it to the
    // automatic trace span for that invocation.
    if (logger) {
      logger.error("Unhandled error", errObj, {
        operation: `${c.req.method} ${new URL(c.req.url).pathname}`,
      });
    } else {
      // Fallback if observabilityMiddleware wasn't mounted first
      console.error(JSON.stringify({
        level:   "error",
        kind:    "error",
        service: SERVICE,
        env:     ENV,
        ts:      new Date().toISOString(),
        msg:     "Unhandled error (no trace context)",
        error:   errObj.message,
        stack:   errObj.stack,
      }));
    }

    // Return structured JSON error — include requestId so users can
    // quote it to support, who can then look it up in CF Logs.
    return c.json(
      {
        error:     "Internal Server Error",
        requestId: traceCtx?.requestId ?? "unknown",
        // Never expose stack traces in production
        ...(ENV !== "production" && { detail: errObj.message }),
      },
      500,
    );
  }
};
