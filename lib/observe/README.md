# lib/observe — Platform Observability

Structured logging, tracing, and scrubbing for all Cloudflare Workers.
Browser logs flush through the worker so CF captures everything in one pipeline.

## Structure

```
lib/observe/
  index.ts            ← LogBuffer, Logger, types, scrubbing
  setup.ts            ← setupLog() one-liner for Hono workers
  browser.ts          ← setupBrowserLog() for browser-side
  middleware.ts       ← request tracing + error handler
  endpoint.ts         ← debug routes: /logs, /logs/tail, /logs/ingest
  crate/              ← Rust source of truth → types + codegen (NOT runtime logic)
  shared/             ← generated outputs: TS types, Zod, OpenAPI, MCP tools
  test-worker/        ← minimal lib/observe consumer — CI target + system worker template
  demo1/              ← interactive demo (sync/truck patterns)
  demo2/              ← interactive demo (auth/session patterns)
  demo-main/          ← router worker — proxies demo1 + demo2 + federated MCP
  demo-line/          ← WASM demo
  demo-tauri/         ← Tauri shell proof of concept (see ADR-0020)
  dev/                ← dev tooling: tail.ts, orchestrate.ts, gen-*.ts
  tests/              ← integration.test.ts (runs against test-worker)
                         e2e.spec.ts (runs against demo1 + demo2)
```

## Ports (single source of truth: mise.toml)

| Worker | Dev port | Test port | Inspector |
|--------|----------|-----------|-----------|
| observe-router (demo-main) | 8686 | — | 9250 |
| log-demo (demo1) | 3335 | — | 9240 |
| log-demo-2 (demo2) | 3336 | — | 9241 |
| observe-test (test-worker) | — | 3342 | 9253 |
| demo-line | 3337 | — | — |
| demo1 bun | 3333 | — | — |
| demo2 bun | 3334 | — | — |

## Local commands

```bash
# Start router + all demos (wrangler multi-config)
mise run dev

# Stream logs from running workers
mise run tail

# Integration tests (runs test-worker, 6 tests)
mise run test

# Playwright e2e (runs demo1 + demo2, 7 tests)
mise run test:e2e

# Full CI gate
mise run ci
```

## Remote commands

Same commands with env overrides — always identical to local.

```bash
# Deploy all 4 workers to CF
mise run deploy

# Stream logs from deployed workers
ROUTER_URL=https://observe-router.gedw99.workers.dev mise run tail

# Integration tests against deployed test-worker
TEST_WORKER_URL=https://observe-test.gedw99.workers.dev mise run test
```

## 4 Workers

| Worker | Purpose |
|--------|---------|
| `observe-test` | CI target + system worker template. No UI, minimal, just setupLog() wiring. |
| `log-demo` (demo1) | Interactive demo — sync/truck logging patterns. |
| `log-demo-2` (demo2) | Interactive demo — auth/session logging patterns. |
| `observe-router` | Router — proxies demo1 + demo2, federated MCP endpoint. |

Service bindings show **"not connected"** on startup — normal. Wrangler connects lazily on first request.

## Add to a system worker

```ts
import { setupLog, type LogEnv } from '../../lib/observe'

const app = new Hono<LogEnv>()
const { createLogger } = setupLog(app, 'truck-cad')

// In request handlers — auto-gets traceId, requestId
app.get('/api/health', (c) => {
  c.var.log.info('health-check')
  return c.json({ ok: true })
})

// Outside requests — standalone logger
const sync = createLogger('sync')
sync.info('merge', { modelId, opCount })
```

See `test-worker/worker.ts` for the full template pattern.

## Add to the browser

```ts
import { setupBrowserLog } from '../../lib/observe/browser'

const { createLogger } = setupBrowserLog({
  flushUrl: '/api/debug/logs/ingest',
  captureErrors: true,
})
const ui = createLogger('ui')
ui.info('click', { button: 'save' })
```

Browser logs queue in localStorage and flush to the worker every 2s.
The worker `console.log`s them as structured JSON — CF captures from there.

## Import generated types (no codegen needed in consumers)

```ts
import type { LogEntry, LogLevel } from '../../lib/observe/shared/log-entry.generated'
import { LogEntrySchema } from '../../lib/observe/shared/schemas.zod'
```

Consumers never run codegen. Codegen runs once in `lib/observe` via `mise run gen`.
The outputs in `shared/` are committed and consumed directly by import.

## How data flows

```
Browser (local or user device)
  → POST /api/debug/logs/ingest
  → Worker console.log(JSON)
  → CF captures → Workers Observability (production pipeline)

Worker also writes to:
  ring buffer → GET /logs (local dev debug only)
             → SSE /tail → tail.ts (local aggregator)
```

- **Production**: `console.log(JSON.stringify(entry))` → CF Workers Observability + `wrangler tail`
- **Local dev only**: ring buffer + `/api/debug/logs` + SSE `/tail`
- **Ring buffer is NOT available in production** — CF runs distributed isolates

## wrangler.toml (every worker needs this)

```toml
[observability]
enabled = true
head_sampling_rate = 1

[observability.logs]
invocation_logs = true

[observability.traces]
enabled = true
head_sampling_rate = 1
```
