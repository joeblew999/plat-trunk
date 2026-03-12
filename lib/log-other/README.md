# CF-Native Observability for Hono Workers

Complete integration of Cloudflare Workers' native logging, automatic tracing,
and OTLP export into a Hono application. Zero third-party SDKs required for
the core path.

---

## Architecture

```
Request
  │
  ▼
observabilityMiddleware        ← extracts W3C traceparent, injects logger
  │
  ▼
errorMiddleware                ← catches throws, logs w/ trace context
  │
  ▼
Route handler                  ← c.get("logger").info(...)
  │
  ├─→ logger.timed("d1.query", ...) ─→ structured log entry emitted
  │
  └─→ fetch(url, propagateTrace(traceCtx, init))
           │
           └─→ downstream Worker
                  traceparent header auto-links spans in CF dashboard
```

All `console.log(JSON.stringify({...}))` calls are captured by **Workers Logs**,
which auto-indexes every top-level JSON key. CF **Automatic Tracing** instruments
every I/O call (fetch, D1, KV, R2, AI) without any code changes.

---

## wrangler.toml config

```toml
[observability]
enabled = true
head_sampling_rate = 1          # 100% logs

[observability.traces]
enabled = true                  # Automatic tracing (Nov 2025 open beta)
head_sampling_rate = 1          # 100% traces (reduce in high-volume prod)

[env.production.observability]
enabled = true
head_sampling_rate = 0.1        # 10% log sampling

[env.production.observability.traces]
enabled = true
head_sampling_rate = 0.05       # 5% trace sampling
```

> **Compatibility date:** Must be `2025-11-01` or later for automatic tracing.

---

## What you get — zero extra config

| Capability | How |
|---|---|
| Structured logs | JSON `console.log` → CF Logs auto-indexes every key |
| Invocation logs | `invocation_logs = true` in wrangler → per-request envelope |
| Automatic traces | `observability.traces.enabled = true` → CF instruments all I/O |
| Real-time tail | `wrangler tail --format=json \| jq` |
| Query Builder | Workers & Pages → Observability → filter on any log field |
| Trace viewer | Workers Observability dashboard → Traces tab |

---

## Log fields indexed by CF

Every log emits these fields at the top level (all queryable in Query Builder):

| Field | Example | Use |
|---|---|---|
| `level` | `"info"` | Filter errors/warns |
| `kind` | `"http"` \| `"app"` \| `"error"` | Log type |
| `traceId` | `"abc123..."` | Join logs ↔ traces |
| `requestId` | `"cf-ray-..."` | Correlate across services |
| `method` | `"POST"` | HTTP method filter |
| `path` | `"/api/geometry/create"` | Route-level metrics |
| `status` | `200` | Error rate queries |
| `durationMs` | `42` | P90/P99 latency |
| `cfColo` | `"SIN"` | Regional analysis |
| `operation` | `"d1.query"` | Sub-operation timing |

Example Query Builder query to find P90 latency per route:
```
visualize: p90(durationMs)
group by: path
filter: kind = "http"
```

---

## Outbound trace propagation

When calling downstream Workers or external services, use `propagateTrace` so
spans are parented correctly:

```typescript
const res = await fetch(
  "https://other-worker.example.workers.dev/api",
  propagateTrace(traceCtx, {
    method: "POST",
    body: JSON.stringify(payload),
  }),
);
```

This adds:
- `traceparent: 00-<traceId>-<spanId>-01` (W3C spec)
- `x-request-id: <requestId>` (stable correlation ID)

---

## Exporting to OTLP providers (Grafana, Axiom, Honeycomb, Sentry)

CF Workers exports traces and logs natively — no code changes needed.

1. **Cloudflare Dashboard** → Workers & Pages → Observability → Destinations
2. Add destination:
   - **Traces:** `https://otlp-gateway-prod-us-east-2.grafana.net/otlp/v1/traces`
   - **Logs:**   `https://otlp-gateway-prod-us-east-2.grafana.net/otlp/v1/logs`
3. Set `Authorization: Basic <base64-token>` header

Traces and logs share the same `traceId`, so Grafana/Tempo/Loki can
automatically correlate them.

---

## Real-time tailing during development

```bash
wrangler tail --format=json | jq '
  .logs[]
  | select(.message[0] | type == "object")
  | .message[0]
  | {level, path, status, durationMs, traceId}
'
```

---

## File structure

```
src/
├── index.ts                    ← Hono app, middleware wiring
└── observability/
    ├── index.ts                ← Public barrel export
    ├── types.ts                ← Shared log field types
    ├── logger.ts               ← createLogger() — structured JSON emitter
    ├── trace.ts                ← W3C traceparent helpers
    └── middleware.ts           ← observabilityMiddleware + errorMiddleware
wrangler.toml                   ← observability + traces config
```
