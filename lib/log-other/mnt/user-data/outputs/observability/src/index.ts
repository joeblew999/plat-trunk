// src/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// plat-trunk Hono gateway — CF Workers entry point.
//
// Observability layers (outermost → innermost):
//   1. observabilityMiddleware  extracts/creates W3C trace context, injects
//                               logger + traceCtx into every Hono `c`
//   2. errorMiddleware          catches unhandled throws, logs them with the
//                               trace context, returns structured JSON 500
//   3. Route handlers           call c.get("logger") for app-level structured
//                               logs that appear alongside auto-traces in the
//                               CF Workers Observability dashboard
// ─────────────────────────────────────────────────────────────────────────────

import { Hono }                            from "hono";
import { zValidator }                      from "@hono/zod-validator";
import { z }                               from "zod";
import {
  observabilityMiddleware,
  errorMiddleware,
  propagateTrace,
}                                          from "./observability";
import type { Logger, TraceContext }       from "./observability";

// ── Hono app with typed variables ────────────────────────────────────────────

type AppVariables = {
  logger:   Logger;
  traceCtx: TraceContext;
};

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  AI: Ai;
};

const app = new Hono<{ Variables: AppVariables; Bindings: Bindings }>();

// ── Observability — must be outermost ─────────────────────────────────────────
app.use("*", observabilityMiddleware);
app.use("*", errorMiddleware);

// ── Health / readiness ────────────────────────────────────────────────────────

app.get("/health", (c) => {
  const logger = c.get("logger");
  logger.debug("health check");
  return c.json({ ok: true, ts: new Date().toISOString() });
});

// ── Example: geometry tool route ─────────────────────────────────────────────
// Demonstrates how to use the logger and propagate trace context to downstream
// fetch calls (e.g., calling a CF Worker running the Truck WASM kernel).

const CreateSolidSchema = z.object({
  operation: z.enum(["box", "sphere", "cylinder"]),
  params:    z.record(z.number()),
});

app.post(
  "/api/geometry/create",
  zValidator("json", CreateSolidSchema),
  async (c) => {
    const logger   = c.get("logger");
    const traceCtx = c.get("traceCtx");
    const body     = c.req.valid("json");

    logger.info("geometry.create started", {
      operation: body.operation,
      paramKeys: Object.keys(body.params),
    });

    // ── Call downstream WASM worker — propagate trace context ─────────────
    // `propagateTrace` adds `traceparent` + `x-request-id` headers so the
    // downstream worker's automatic trace spans are parented to this span.
    const result = await logger.timed(
      "geometry.wasm.invoke",
      async () => {
        const res = await fetch(
          "https://truck-wasm.plat-trunk.workers.dev/invoke",
          propagateTrace(traceCtx, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(body),
          }),
        );
        if (!res.ok) {
          throw new Error(`WASM worker returned ${res.status}`);
        }
        return res.json();
      },
      { operation: body.operation }, // extra fields logged on the timed entry
    );

    logger.info("geometry.create done", { operation: body.operation });
    return c.json({ ok: true, result });
  },
);

// ── Example: D1 query with timed logging ─────────────────────────────────────

app.get("/api/projects/:id", async (c) => {
  const logger = c.get("logger");
  const id     = c.req.param("id");

  const project = await logger.timed(
    "d1.projects.get",
    () =>
      c.env.DB
        .prepare("SELECT * FROM projects WHERE id = ?")
        .bind(id)
        .first(),
    { projectId: id },
  );

  if (!project) {
    logger.warn("project not found", { projectId: id });
    return c.json({ error: "Not found" }, 404);
  }

  return c.json(project);
});

// ── Example: deliberately throwing to test errorMiddleware ───────────────────

app.get("/debug/throw", () => {
  throw new Error("deliberate test error — check CF Logs");
});

// ── CF Workers export ─────────────────────────────────────────────────────────

export default app;
