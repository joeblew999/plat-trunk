# ADR 0009 — Platform Observability: Unified Rust + TypeScript System

**Status:** Proposed
**Date:** 2026-03-12
**Deciders:** Gerard Webb

-----

## Context

The sync and other systems are hard to debug when they go wrong. We need to see what's happening across browser, worker, and Rust WASM — all in one place.

This is not just "logging" — it's a **full observability system** covering logs, traces, metrics, errors, and performance across four targets (browser JS, worker TS, Rust WASM, Rust native). Every system in the platform (truck, sync, future N systems) must be observable with the same patterns and tools.

### What Cloudflare gives you for free (zero code)

Before writing any code, understand what CF already handles. **Most observability is configuration, not code.**

| CF Feature | What it gives you | How to enable | Cost |
|---|---|---|---|
| **Workers Logs** | Every `console.log` auto-indexed as structured JSON. Query by any field. 72h retention. | `[observability] enabled = true` | Free on Workers Paid ($5/mo) |
| **Invocation Logs** | Automatic envelope: method, status, duration, CPU time, memory — on every request. No code. | `[observability.logs] invocation_logs = true` | Free |
| **Automatic Traces** | Distributed traces across service bindings, D1, R2, KV — automatic span creation. No code. | `[observability.traces] enabled = true` | Free (beta) |
| **Analytics Engine** | Per-worker request metrics: p50/p95/p99, requests/sec, error rates. | Automatic with Workers Paid | Free |
| **Query Builder** | SQL-like queries over structured logs: `SELECT percentile(durationMs, 95) WHERE system = 'sync'` | CF Dashboard | Free |
| **Sampling control** | `head_sampling_rate` per environment — 100% dev, 10% prod. | wrangler.toml config | Free |
| **OTLP Export** | Send logs + traces to Grafana, Axiom, Honeycomb, Datadog — one-click in CF Dashboard. | CF Dashboard → Destinations | Free export, destination may charge |
| **Logpush** | Stream logs to R2/S3/GCS for long-term retention beyond 72h. | CF Dashboard config | R2 storage cost only |
| **wrangler tail** | Real-time log stream during development. `--format json` for structured view. | Built into wrangler | Free |
| **Alerting** | Webhook alerts on error rate spikes, latency thresholds — in CF Dashboard. | CF Dashboard → Notifications | Free |

**Key insight: CF already provides all four golden signals for HTTP traffic:**

| Golden Signal | CF feature | Coverage |
|---|---|---|
| **Latency** | Invocation logs (duration) + Analytics Engine (p50/p95/p99) | All HTTP requests, automatic |
| **Traffic** | Analytics Engine (requests/sec per worker) | All workers, automatic |
| **Errors** | Invocation logs (status codes) + Analytics Engine (error %) | All HTTP errors, automatic |
| **Saturation** | Invocation logs (CPU time, memory) | Per-invocation, automatic |

### What CF does NOT give you (gaps we must build)

CF covers the HTTP layer perfectly. It knows nothing about what happens **inside** your code.

| Gap | Why CF can't help | What we build |
|---|---|---|
| **Business context in logs** | CF sees `console.log("merge complete")` as flat text. It can't query by `modelId`, `actorId`, `opCount`. | Structured JSON logging in both Rust and TS with queryable fields |
| **Rust structured logs** | Rust `log::info!()` emits flat strings. CF auto-indexes JSON, not text. | `pt-log` crate: `tracing` → JSON → `console.log` on WASM, `tracing-subscriber` on native |
| **WASM call timing** | CF sees one HTTP request. It doesn't know that inside it, 3 WASM calls took 12ms, 45ms, 3ms. | `log.timed('wasm.addCube', () => ...)` wrappers |
| **WASM memory tracking** | CF reports Worker memory, not WASM linear memory. A WASM heap at 200MB inside a 256MB Worker is invisible. | `heap_bytes()` WASM export |
| **WASM panic context** | CF sees a JS TypeError. It doesn't know which Rust function panicked, with what inputs. | Structured panic hook + `timed()` context |
| **Browser log shipping** | CF has no browser SDK. Browser errors stay in `console.error` — invisible to CF. | `setupBrowserLog()` with localStorage queue + flush to worker |
| **Browser session/device tracking** | CF sees the worker request, not the browser context (which device, which tab, which user action). | `deviceId` + `sessionId` in browser logger context |
| **Local dev unified view** | Each `wrangler dev` instance shows only its own worker. Need a merged view across all workers. | `tail.ts` aggregator connects to all workers' SSE endpoints → one terminal |
| **Per-request logger with trace context** | CF Automatic Traces creates spans, but your application code doesn't have access to them for correlation. | `observabilityMiddleware` injects `c.var.log` with `traceId` |

### What we should NOT build (CF handles it)

These are things the ADR previously considered building that CF already does:

| Don't build | CF already provides | Notes |
|---|---|---|
| **Cross-worker distributed traces** | Automatic Traces follows service bindings, D1, R2 automatically | Keep `propagateTrace()` only for local dev viewer where CF traces aren't available |
| **D1/R2 operation timing** | Automatic Traces creates spans for D1 queries and R2 ops | No need for `log.timed('d1.query', ...)` — CF does this |
| **Metrics aggregation (p50/p95/p99)** | Analytics Engine + Query Builder | Don't build histogram data structures — emit structured logs, CF aggregates |
| **Request/sec counters** | Analytics Engine | Automatic per-worker |
| **Alerting system** | CF Dashboard notifications | Webhook alerts on error rate, latency, etc. |
| **OTLP export plumbing** | CF Dashboard one-click destinations | Zero code |
| **Log retention system** | Logpush to R2 | CF Dashboard config |
| **Production log query UI** | CF Dashboard Query Builder (SQL-like, filter by any field) | No public API for browser JS — CF auth tokens can't be exposed. Use CF Dashboard directly, or OTLP export to Grafana/Axiom for richer UI. |

### What exists today

**TypeScript transport layer** (`lib/observe/`) — built, tested, isolated, not yet wired into any system worker:

- **Worker API** — `setupLog(app, 'service-name')` one-liner returns `{ createLogger, urls, buffer }`:
  - `createLogger(system)` → `Logger` with `.info()`, `.warn()`, `.error()`, `.timed()`, `.child()` — the primary consumer API
  - `urls` → pre-built local/production/CF dashboard links
  - `buffer` → escape hatch for subscribers, getEntries, direct push
  - `LogEnv` type → `new Hono<LogEnv>()` gives typed `c.var.log` and `c.var.traceCtx`
- **Browser API** — `setupBrowserLog({ flushUrl })` one-liner returns `{ createLogger, stop }`:
  - Same `Logger` interface as worker — entries merge seamlessly
  - localStorage offline queue, automatic flush when back online
  - Separate module (`lib/observe/browser.ts`) — no worker dependencies leak into browser bundle
- **LogBuffer** — worker-only ring buffer with readonly identity (`source`, `service`, `env` set at construction):
  - `configure()` only accepts runtime tuning (`maxSize`, `minLevel`, `enabled`)
  - `LogBufferTuning` type enforces this at compile time
- **Middleware** — `observabilityMiddleware` (W3C traceparent + per-request Logger) + `errorHandler` (structured JSON 500 with `detail` in non-production)
- **Debug routes (local dev only)** — JSON API, SSE tail stream with dedup, browser ingest endpoint, CF dashboard links. **No web viewer** — all local dev observability goes through the terminal aggregator (`tail.ts`). Production observability is CF Dashboard or OTLP export to Grafana/Axiom.
- **Dev tooling** (`lib/observe/dev/`) — generic orchestration and task runner:
  - `run.mjs` — single entry point: `bun run observe <cmd>` (typecheck, test, test:e2e, test:all, demo, demo:both, deploy, tail, etc.)
  - `orchestrate.ts` — generic `WorkerTarget` interface + `startWorkers()` function that starts wrangler dev for any worker targets with optional tail aggregator. Demo-specific `DEMO_TARGETS` constants separated from generic code.
  - `tail.ts` — terminal log aggregator that auto-discovers all system workers from `workers.mjs`. Merges SSE tail streams from multiple workers into one color-coded terminal. Zero config for new systems.
- **Two test tiers** — integration (6 tests, real wrangler, ~8s) + e2e (7 tests, playwright-cli browser automation, ~45s). No unit tests — every test exercises the real pipeline through wrangler.
- Demo: `bun run observe demo` (Bun :3333) and `bun run observe demo:cf` (wrangler :3335)

**Production workers** — zero observability:

- **Router** (`src/router.ts`): no logging, no error tracking
- **truck-cad worker**: has `/api/health` and MCP health tools — but no structured logging, no request tracing, no WASM timing
- **truck-sync crate**: pure Rust, returns `Result<T, String>` — no structured logging
- **Browser frontend**: scattered `console.error` — no structured capture

**Rust crates** — use `log` + `console_log` for unstructured text:

```rust
// Current: flat text, CF can't query fields
log::info!("merge complete for model {}", id);
// → console.log: "merge complete for model m1"
```

-----

## Decision Drivers

- Rust logs must be **structured JSON** so CF Workers Logs can index fields like `modelId`, `opCount`, `actorId`
- `cargo test` on native must produce readable, filterable log output — no silent drops
- Zero call-site changes in consuming crates — all dispatch inside the logging crate
- The 3 MB CF Workers bundle size limit must not be breached
- **Don't build what CF already does** — if it's wrangler.toml config, it's not code work
- Every system in the platform must be observable with the same patterns — this scales to N systems

-----

## Decision

### Engineering discipline

1. **Idempotency is mandatory.** All dev automation (orchestrate.ts, run.mjs, integration tests) must guarantee idempotent cleanup — stale processes killed on entry, signal handlers for crash cleanup, re-runnable regardless of prior state. A developer must be able to run any command twice in a row with identical results.

2. **Lean code, no tech debt.** Every test must exercise the real pipeline — no mocking internal APIs, no faking entries. If a test doesn't catch a real regression, delete it. Refactor as you go: shared logic goes in shared modules (e.g. `orchestrate.ts`), not copy-pasted across files. No dead code, no unused abstractions.

3. **Refactor intelligently.** When two files duplicate the same logic, extract it immediately — don't leave it for later. DRY applies to automation and test infrastructure, not just application code.

4. **Generic code first, demo-specific second.** All dev tooling, test infrastructure, and orchestration must be generic — usable by any system worker in the platform. Demo-specific constants (ports, paths) are isolated from generic interfaces (`WorkerTarget`, `startWorkers()`, `tail.ts`). This ensures Phase 4 system wiring requires zero changes to dev tooling.

### Principle: configure CF first, code only for gaps

The implementation has two distinct types of work:

1. **Turn on CF** — copy a config block into wrangler.toml files. Zero code. Unlocks: invocation logs, automatic traces, analytics engine, sampling control.
2. **Fill the gaps** — write code only for things CF can't do: business context logging, Rust structured emission, WASM instrumentation, browser shipping.

### Two-layer architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Rust structured emission (NEW — pt-log crate)          │
│                                                                 │
│  tracing::info!(modelId = %id, opCount = 3, "merge")           │
│       │                                                         │
│       ├── WASM: structured JSON → console.log()                 │
│       └── Native: tracing-subscriber → stderr                   │
└─────────┬───────────────────────────────────────────────────────┘
          │ console.log(JSON.stringify({...}))
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: TypeScript transport + observability (EXISTS — lib/observe/) │
│                                                                 │
│  Worker: setupLog() → middleware, trace context, viewer          │
│  Browser: setupBrowserLog() → localStorage queue, flush          │
│  CF: Workers Logs indexes every field automatically              │
└─────────────────────────────────────────────────────────────────┘
```

**Layer 1 (Rust)** makes Rust logs structured. It configures `tracing` to emit JSON via `console.log` on WASM, and via `tracing-subscriber` on native. ~50-80 lines of Rust. No transport, no viewer, no HTTP — just structured emission.

**Layer 2 (TypeScript)** handles everything else: Hono middleware, W3C trace context, browser offline queue, debug routes, viewer, SSE tail, health endpoints, WASM timing wrappers. Already built and tested.

**CF** handles everything after emission: storage, indexing, querying, aggregation, alerting, export, retention.

### Rust crate: `pt-log`

Location: `lib/observe/crate/` (co-located with the TypeScript lib — both are the observability system)

```
lib/observe/crate/
  Cargo.toml
  src/
    lib.rs       ← init() + cfg dispatch
    wasm.rs      ← cfg(wasm32): JSON → console.log
    native.rs    ← cfg(not(wasm32)): tracing-subscriber → stderr
```

#### Public API

```rust
// Consuming crates — the only API surface:
use tracing::{info, warn, error, debug, instrument};

info!(
    system = "sync",
    operation = "merge",
    modelId = %id,
    opCount = 3,
    "merge complete"
);
```

#### Initialisation

Each entrypoint calls `pt_log::init()` once. No feature flags needed — `cfg(target_arch)` handles everything:

```rust
pub fn init() {
    // Guard: tracing's global dispatcher panics if set twice.
    // OnceLock won't work — must check tracing's own state.
    if tracing::dispatcher::has_been_set() {
        return;
    }

    #[cfg(target_arch = "wasm32")]
    crate::wasm::init();      // JSON subscriber → console.log

    #[cfg(not(target_arch = "wasm32"))]
    crate::native::init();    // tracing-subscriber + EnvFilter → stderr
}
```

**Why `has_been_set()` not `OnceLock`:** `tracing` has its own global dispatcher. Calling `.init()` twice panics with "a global default trace dispatcher has already been set". The idempotency guard must check tracing's own state, not a separate static. This matters because `WasmApp::new` and `HeadlessController::new` may both call `pt_log::init()`.

#### WASM backend (`wasm.rs`) — use `tracing-web` + `tracing-subscriber` json

**Do not hand-roll a JSON subscriber.** Use `tracing-web` (the crate Cloudflare recommends and uses in their own `workers-rs` examples) combined with `tracing-subscriber`'s built-in `.json()` formatter:

```rust
use tracing_subscriber::fmt;
use tracing_web::MakeConsoleWriter;

pub fn init() {
    fmt()
        .json()
        .with_writer(MakeConsoleWriter::default())
        .with_ansi(false)
        .without_time()  // see note below
        .init();
}
```

**Why `without_time()`:** The `time` crate requires `time = { features = ["wasm-bindgen"] }` for WASM timestamps. If that feature is omitted (easy to miss — it's not a compile error), `tracing-subscriber` **silently hangs at runtime** in CF Workers. Using `without_time()` sidesteps this entirely. CF Workers Logs timestamps every entry at ingestion, which is effectively instantaneous — so Rust-side timestamps add no value. Add a comment in `Cargo.toml`:

```toml
# time/wasm-bindgen deliberately omitted — causes silent runtime hang in CF Workers.
# CF ingestion timestamp is sufficient for log ordering.
```

This emits structured JSON via `console.log` / `console.warn` / `console.error` (level-mapped). CF Workers Logs auto-indexes every field. No Logpush code, no OTLP code — that's CF config in `wrangler.toml`.

```json
{"level":"INFO","system":"sync","operation":"merge","modelId":"m1","opCount":3,"message":"merge complete"}
```

**Bundle size note:** this pulls `serde_json` + `tracing-subscriber` fmt into the WASM build. Phase 5 measures the impact. If it exceeds the 3 MB worker limit, fall back to a lighter approach — but don't optimise before measuring.

**Crates evaluated and rejected:**
- `tracing-wasm` / `wasm-tracing` — no JSON output, browser-only (no Workers support)
- `tracing-worker` — abandoned (1 star, 2023), no JSON
- `tracing-subscriber-wasm` — writer only, no JSON formatting, unmaintained
- Hand-rolled JSON subscriber — unnecessary complexity when a CF-recommended solution exists

#### Native backend (`native.rs`)

- `tracing-subscriber` with `EnvFilter` driven by `RUST_LOG` env var
- `fmt::TestWriter` so output is captured per-test and only shown on failure
- ANSI colour for interactive sessions
- No WASM-specific dependencies compiled in — `tracing-web` is `cfg(wasm32)` gated

```bash
# See all sync logs during cargo test:
RUST_LOG=sync=debug cargo test -p truck-sync
```

#### Field name alignment: camelCase everywhere

**Problem:** `tracing` macros use Rust's snake_case convention (`model_id`, `op_count`), but the TypeScript `LogEntry` schema uses camelCase (`modelId`, `opCount`). CF Query Builder treats `model_id` and `modelId` as different fields — if they don't match, you can't correlate Rust and TS logs in a single query.

**Strategy:** Use camelCase field names at every `tracing` call site. `tracing` field names are arbitrary strings — they don't follow Rust naming conventions:

```rust
// DO: camelCase field names in tracing macros
tracing::info!(
    system = "sync",
    modelId = %id,
    opCount = 3,
    actorId = %actor,
    "merge complete"
);

// DON'T: snake_case field names (won't match TypeScript LogEntry)
tracing::info!(
    system = "sync",
    model_id = %id,    // ✗ CF sees this as a different field than TS's modelId
    op_count = 3,
    "merge complete"
);
```

For `#[instrument]`, use explicit field names to override the default snake_case:

```rust
#[tracing::instrument(fields(modelId = %model_id, opCount = %op_count))]
fn merge(model_id: &str, op_count: u32) { ... }
```

**Canonical field names** (must match `LogEntry` in `lib/observe/index.ts`):

| Field | Type | Used by |
|---|---|---|
| `system` | string | both layers — subsystem name (sync, truck, router) |
| `modelId` | string | sync ops, scene queries |
| `actorId` | string | sync CRDT operations |
| `opCount` | number | sync merge/replay |
| `groupId` | string | sync group operations |
| `solidId` | string | truck geometry operations |
| `operation` | string | both layers — what's being done |
| `durationMs` | number | both layers — timing |
| `traceId` | string | TS middleware — W3C trace ID |
| `spanId` | string | TS middleware — span within invocation |
| `requestId` | string | TS middleware — stable correlation ID |
| `deviceId` | string | browser — stable device ID |
| `sessionId` | string | browser — per-tab session |
| `heapBytes` | number | WASM — current heap usage |
| `sceneObjects` | number | truck — scene complexity metric |

### Target matrix

| Target | `cfg` condition | Backend | Output |
|---|---|---|---|
| Native | `not(target_arch = "wasm32")` | `tracing-subscriber` + `EnvFilter` | stderr (per-test captured) |
| WASM (browser + worker) | `target_arch = "wasm32"` | JSON → `console.log()` | CF Workers Logs indexes all fields |

No browser vs worker distinction needed in Rust. Both are `wasm32`, both emit to `console.log`. The TypeScript layer handles the difference (browser flushes via HTTP, worker is captured directly by CF).

### Panic & error capture

All panics and unhandled errors — Rust and TypeScript — must produce **structured entries** with queryable fields, not raw text.

**Rust WASM panics** — `pt_log::init()` sets a custom panic hook that:
1. Emits a structured `tracing::error!` with `system = "panic"`, `message`, `location` (file + line) — CF indexes these fields
2. Then delegates to `console_error_panic_hook` for the standard stack trace

```rust
// What CF Query Builder sees after a boolean op panic:
{"level":"error","system":"panic","message":"This shell is not oriented and closed","location":"truck-shapeops/src/integrate/mod.rs:142"}
```

**Rust native panics** — same structured `tracing::error!` then delegates to the default hook. `cargo test` captures it per-test.

**TypeScript worker errors** — already handled by `errorHandler(buffer)` in `lib/observe/middleware.ts`. Unhandled throws produce structured entries with `kind: "error"`, `error`, `stack`, `traceId`, `requestId`. CF indexes all fields.

**TypeScript browser errors** — `setupBrowserLog({ captureErrors: true })` installs `window.onerror` and `window.onunhandledrejection` handlers that emit structured entries via the browser logger. These flush to the worker via the existing offline queue, so CF captures browser crashes too.

### WASM observability

WASM is a black box from the TypeScript side — you call a function and either get a result or a JS TypeError from a panic. CF Automatic Traces doesn't see inside WASM calls. This is a gap we must fill.

#### TS→WASM call timing

Every WASM call from TypeScript goes through `log.timed()`:

```typescript
// In truck-cad worker — wrapping WASM geometry calls:
const scene = await log.timed('wasm.addCube', async () => {
  return controller.add_cube(x, y, z, size)
}, { modelId, sceneObjects: currentCount })
```

This automatically produces:
```json
{"level":"info","system":"truck","event":"wasm.addCube.ok","durationMs":12,"modelId":"m1","sceneObjects":5}
// or on failure:
{"level":"error","system":"truck","event":"wasm.addCube.fail","durationMs":3,"error":"This shell is not oriented and closed","modelId":"m1"}
```

CF Query Builder can then aggregate these: `SELECT percentile(durationMs, 95) WHERE event LIKE 'wasm.%.ok'`

#### WASM memory tracking

Export a `heap_bytes()` function from each WASM crate that returns the current WASM linear memory usage:

```rust
// In wasm_app.rs:
#[wasm_bindgen]
pub fn heap_bytes() -> usize {
    core::arch::wasm32::memory_size(0) * 65536  // pages * 64KB
}
```

```typescript
// In worker — periodic health check:
const heapBytes = controller.heap_bytes()
if (heapBytes > 100_000_000) {  // >100MB
  log.warn('wasm.memory-pressure', { heapBytes, sceneObjects: count })
}
```

### Browser observability

CF has no browser SDK. Everything the user does in the browser is invisible to CF unless we ship it. This is our biggest gap.

#### Session tracking

```typescript
const { createLogger } = setupBrowserLog({
  flushUrl: '/api/debug/logs/ingest',
  captureErrors: true,
})

// Per-device (persists across sessions):
const deviceId = localStorage.getItem('plat-device-id') || (() => {
  const id = crypto.randomUUID()
  localStorage.setItem('plat-device-id', id)
  return id
})()

// Per-tab (new each page load):
const sessionId = crypto.randomUUID()

const log = createLogger('ui', { deviceId, sessionId })
```

Now every browser log entry carries `deviceId` + `sessionId`. CF Query Builder can:
- Filter by `deviceId` to see everything from one user's machine
- Filter by `sessionId` to see one tab's journey
- Correlate browser errors with worker requests via `traceId` in fetch headers

#### Global error capture

`setupBrowserLog({ captureErrors: true })` installs:

```typescript
window.onerror = (message, source, line, col, error) => {
  panicLogger.error('uncaught', error ?? message, { source, line, col })
}

window.onunhandledrejection = (event) => {
  const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
  panicLogger.error('unhandled-rejection', err)
}
```

These entries flush to the worker → CF like any other browser log. Filter by `system = "panic"` in CF Query Builder to see all crashes across all users.

### How the layers connect

```
Rust WASM tracing::info!(system="sync", modelId="m1", ...)
    → pt-log wasm.rs serialises to JSON
    → console.log('{"system":"sync","modelId":"m1",...}')
    → CF Workers Logs auto-indexes every field ✓
    → CF Automatic Traces shows the span (unverified for WASM workers — Phase 3 checks)
    → CF Query Builder can filter by modelId ✓

TypeScript setupLog(app, 'truck-cad')
    → observabilityMiddleware adds traceId, spanId, requestId
    → HTTP logs with method, path, status, durationMs
    → log.timed('wasm.addCube', ...) wraps WASM calls
    → CF invocation logs add method, status, CPU time ✓
    → CF Automatic Traces show service binding spans ✓

Browser setupBrowserLog({ captureErrors: true })
    → Structured entries with deviceId, sessionId
    → Global error/rejection handlers → structured panics
    → localStorage queue → periodic flush to worker
    → Worker ingests → CF Workers Logs pipeline ✓
```

### Where you look at observability data

**CF is the master.** All observability data — logs, traces, invocation metadata — flows into CF. Our viewer sees none of it. The question is how you query CF.

| Environment | How you view data | Data source | Latency |
|---|---|---|---|
| **Local dev** | `wrangler dev` terminal output + `tail.ts` aggregator | All `console.log` JSON from all workers (browser + worker logs) | Real-time |
| **Local dev (API)** | `/api/debug/logs` JSON + `/api/debug/logs/tail` SSE | In-memory LogBuffer (500 entries, lost on restart) | Instant |
| **Production** | CF Dashboard (Query Builder + Traces + Analytics) | CF Workers Logs (72h) | ~1-2 min indexing |
| **Production (no CF login)** | Grafana Cloud / Axiom (OTLP export) | CF → OTLP destination | ~1-2 min |
| **Production (self-hosted)** | Future: R2 query worker | Logpush → R2 archive | ~1 min to R2 |
| **Historical (>72h)** | R2 bucket (download + query) | Logpush → R2 archive | Already stored |

**`wrangler dev` is the unified local view.** Every `console.log(JSON.stringify(...))` — from worker handlers, Rust WASM, and browser logs re-emitted via `/api/debug/logs/ingest` — appears in wrangler's terminal output. `tail.ts` aggregates multiple wrangler instances into one terminal. The `/api/debug/logs` JSON API and `/api/debug/logs/tail` SSE endpoint exist as programmatic escape hatches (e.g. for integration tests), not as the primary dev view.

**Why no production query UI in our code:**
- CF's query APIs require account-level API tokens — can't expose in browser JS
- CF Dashboard Query Builder already supports `SELECT * FROM logs WHERE modelId = 'abc' AND level = 'error'`
- CF Dashboard Traces UI shows service binding spans with waterfall visualization
- Grafana/Axiom give embeddable dashboards, custom alerts, team sharing without CF login
- Building a CF API proxy adds security surface + maintenance for a solved problem

**The browser ingest path is the key design:**
```
Browser → POST /api/debug/logs/ingest → Worker console.log(entry) → CF captures it
```
Browser logs don't stay in the browser or in our viewer. They flow through the worker into CF, where they become queryable alongside worker and WASM logs. CF is the single pane of glass.

### Data lifecycle and retention

All observability data has a limited lifespan in CF. Without Logpush, **everything disappears after 72 hours.**

**Key insight: logs, traces, and invocation metadata are the SAME Logpush dataset** (`workers_trace_events`). One toggle in CF Dashboard exports all three to R2.

| Data type | Source | Logpush dataset | CF retention | R2 retention | Latency to R2 |
|---|---|---|---|---|---|
| **Structured logs** (`console.log` JSON) | Our code (both layers) | `workers_trace_events` | 72h | 90 days (lifecycle rule) | ~1 min |
| **Invocation metadata** (method, status, duration, CPU time) | CF automatic | `workers_trace_events` | 72h | Same stream | ~1 min |
| **Trace spans** (service binding, D1, R2 operations) | CF Automatic Traces | `workers_trace_events` | 72h | Same stream | ~1 min |
| **Analytics Engine** (p50/p95/p99, error %, requests/sec) | CF automatic | No Logpush — own SQL API | 90 days | Re-computable from raw logs in R2 | N/A |

**Logpush delivery:** CF processes batches approximately once per minute. No minimum batch size — files may arrive more than once per minute. No guaranteed SLA, but ~1 minute is typical. If the destination is temporarily unavailable, CF retries ~5 times over 5 minutes.

**Cost:**
- **Logpush:** $0.05 per million requests (10M/mo included free on Workers Paid plan)
- **R2 storage:** $0.015/GB/mo, zero egress. Structured JSON logs compress ~10:1.
- **R2 lifecycle rule:** Set 90-day expiry on the `plat-logs` bucket. Adjust when needed.
- At low-to-moderate traffic, total cost is negligible — the Workers Paid $5/mo base is the floor.

**What happens without Logpush:**
- Logs, traces, and invocation data vanish after 72h
- Analytics Engine aggregates survive 90 days (but you lose the raw data they came from)
- No way to investigate incidents older than 3 days
- No historical baselines for performance comparison

**Logpush is Phase 0 work — CF Dashboard config, zero code.** There's no reason to defer it.

### Rate limiting

High-frequency subsystems (sync CRDT merge, geometry tessellation) can emit thousands of log entries per second during bursts. Without rate limiting:
- Ring buffer thrashing (500 entries overwritten in <1s, history lost)
- Browser flush queue memory growth
- CF log volume cost (mainly a concern at scale)

**Strategy: token-bucket rate limiter on `LogBuffer.push()`**

```typescript
const buffer = new LogBuffer({
  service: 'truck-cad',
  rateLimit: { maxPerSecond: 100, burstSize: 50 },  // optional, off by default
})
```

Behaviour:
- Token bucket refills at `maxPerSecond` rate, allows bursts up to `burstSize`
- When rate exceeded, entries are **dropped** (not queued)
- A periodic `rate-limit.dropped` meta-entry is emitted with `{ droppedCount, windowMs }`
- Error/warn entries **always pass through** (never drop errors)
- Rate limiting is **off by default** — only enable for high-frequency systems

### Per-environment log level policy

| Environment | `minLevel` | CF sampling | Rationale |
|---|---|---|---|
| local / dev | `debug` | n/a | Full visibility during development |
| staging | `debug` | 100% | Full visibility for pre-production testing |
| production | `info` | 10% | Cost control — debug entries are high-volume, low-value |
| production (incident) | `debug` | 100% | Temporarily override via wrangler.toml |

```typescript
// In worker entry — read from wrangler.toml [vars]:
const { createLogger } = setupLog(app, 'truck-cad', {
  minLevel: (env.LOG_LEVEL as LogLevel) ?? 'info',
})
```

```toml
# wrangler.toml
[vars]
LOG_LEVEL = "info"

[env.staging.vars]
LOG_LEVEL = "debug"
```

For Rust, `RUST_LOG` env var controls the level:
```toml
[env.production.vars]
RUST_LOG = "info"

[env.staging.vars]
RUST_LOG = "debug"
```

### Sensitive data scrubbing

**Strategy: deny-list scrubbing on `LogBuffer.push()`**

```typescript
const REDACTED_FIELDS = new Set([
  'password', 'secret', 'token', 'authorization', 'cookie',
  'apiKey', 'api_key', 'accessToken', 'access_token',
  'refreshToken', 'refresh_token', 'sessionToken', 'session_token',
])

// In push(), before storing:
for (const key of Object.keys(entry)) {
  if (REDACTED_FIELDS.has(key.toLowerCase())) entry[key] = '[REDACTED]'
}
```

- Field **names** checked (case-insensitive) — values not inspected
- Top-level only — no nested traversal
- Scrubbing happens **before** `console.log` and ring buffer — redacted data never reaches CF

### CF observability config (copy to every worker's wrangler.toml)

This is the **single most impactful task** — zero code, unlocks all of CF's built-in observability:

```toml
# === Copy this block into every system worker's wrangler.toml ===

[observability]
enabled = true
head_sampling_rate = 1

[observability.logs]
invocation_logs = true

[observability.traces]
enabled = true
head_sampling_rate = 1

# Per-environment overrides:
[env.staging.observability]
enabled = true
head_sampling_rate = 1
[env.staging.observability.traces]
enabled = true
head_sampling_rate = 1

[env.production.observability]
enabled = true
head_sampling_rate = 0.1
[env.production.observability.traces]
enabled = true
head_sampling_rate = 0.05
```

### `lib/log-other/` disposition

Deleted. All useful patterns (OTLP export docs, Query Builder examples, `wrangler tail | jq` patterns, PII warning, `invocation_logs` config, compatibility date requirement) were absorbed into `lib/observe/` before removal.

-----

## Demo-first development model

**The demos are the reference implementation.** Every observability pattern is built, tested, and validated in `lib/observe/demo1/` and `lib/observe/demo2/` first. System workers (truck-cad, plat-router, etc.) copy patterns from the demo — they never invent new ones.

### Generic-first design principle

**All dev tooling and test infrastructure is generic — it must work for any system worker, not just observe demos.** The demo-specific constants (`DEMO_TARGETS`) are isolated from the generic code (`WorkerTarget`, `startWorkers()`, `tail.ts`). When Phase 4 wires observability into system workers (truck-cad, plat-router, test-worker), zero changes are needed in the dev tooling — just pass different `WorkerTarget` definitions.

- `orchestrate.ts` exports a generic `WorkerTarget` interface and `startWorkers()` function. Demo-specific `DEMO_TARGETS` are in a separate section.
- `tail.ts` auto-discovers all system workers from `workers.mjs`. Adding a new system = zero tail config.
- `run.mjs` dispatches commands via a flat map — adding a command is one line.
- Integration tests use `startWorkers()` with test-specific ports — they don't depend on demo constants.

### What the demo already covers (TypeScript)

The demo (`bun run observe demo`) is a full working observability testbed:

- **Worker patterns** (`demo1/bun.ts` + `demo1/worker.ts`):
  - `setupLog(app, 'service')` one-liner wiring
  - `c.var.log` typed access in handlers (via `LogEnv`)
  - `createLogger('system')` for worker-side loggers outside requests
  - `c.var.log.timed('wasm.op', fn, context)` — success + failure paths
  - `c.var.log.child({ modelId })` — scoped loggers
  - `c.var.log.error('event', Error, context)` — structured error logging
  - `errorHandler(buffer)` — automatic catch for unhandled throws
  - Demo endpoints exercising each pattern individually

- **Browser patterns** (`demo1/browser.ts`):
  - `setupBrowserLog({ flushUrl, captureErrors: true })` one-liner
  - `deviceId` (persists) + `sessionId` (per-tab) in every entry
  - `child()` scoped to a model
  - `timed()` for async operations (ok + fail)
  - `error()` with Error object + structured context
  - `captureErrors: true` — global `window.onerror` + `window.onunhandledrejection` handlers
  - Interactive buttons that trigger each pattern
  - Status bar showing online/offline, queue depth, identity

- **Hardening patterns** (Phase 1 — implemented):
  - **Sensitive data scrubbing** — deny-list on `LogBuffer.push()` before `console.log` and ring buffer. Fields: `password`, `secret`, `token`, `authorization`, `cookie`, `apiKey`, `accessToken`, `refreshToken`, `sessionToken` (case-insensitive)
  - **Rate limiter** — token-bucket on `LogBuffer.push()` via `rateLimit: { maxPerSecond, burstSize }`. Error/warn always pass. Off by default. `drainDropped()` returns count.
  - **Browser error capture** — `captureErrors: true` installs `window.onerror` + `window.onunhandledrejection`. Entries go through `system: "panic"`. Cleaned up on `stop()`.

### What the demo doesn't cover yet (future phases)

- Rust `pt-log` crate WASM emission (Phase 2–3)
- `heap_bytes()` WASM export (Phase 3)

### Verification model

**Two test tiers, both required. No unit tests — every test exercises the real pipeline through wrangler.**

Why no unit tests: Unit tests that mock LogBuffer, middleware, or endpoints duplicate what the integration tests already prove against real wrangler. They add maintenance cost without catching real regressions. If a test doesn't exercise the actual CF Worker pipeline, delete it.

#### Tier 1: Integration tests (`bun run observe test`)

6 tests against a real wrangler dev worker (auto-started by `orchestrate.ts`). ~8 seconds. Uses Playwright browser for browser-side tests.

| Test | What it proves |
|---|---|
| `ingest → query, filter, clear` | Full round-trip: POST entries → GET with filters (source, level, limit, event) → DELETE. Rejects bad input, long string round-trip, URLs endpoint. |
| `browser → flush to worker` | Real browser page loads, setupBrowserLog initialises deviceId/sessionId, entries flush to worker. |
| `tracing → headers, correlation, propagation` | W3C traceparent + x-request-id on responses, unique per request, inbound trace ID preserved, HTTP log entries carry traceId + requestId + durationMs. |
| `errors → structured 500 with stack` | Thrown error → 500 JSON response with requestId + traceparent → error log entry with event=unhandled, error, stack. |
| `sse → live stream with scrubbing` | SSE /tail endpoint streams real-time entries. Sensitive fields show `[REDACTED]`, worker-side and error entries flow through SSE. |
| `tail → multi-worker aggregation` | Two wrangler workers + tail.ts aggregator. Both workers' entries in captured tail output. Scrubbing works in aggregator. |

#### Tier 2: E2E tests (`bun run observe test:e2e`)

7 tests using `@playwright/cli` to drive both demo workers through a real browser. Requires `bun run observe demo:both` running. ~45 seconds.

| Test | What it proves |
|---|---|
| `worker → button clicks produce logs` | Browser button clicks trigger worker endpoints → structured log entries with correct system/event. |
| `browser → flush to worker` | Browser-generated entries flush to worker (polls, no fixed sleep). |
| `worker → throw produces error with stack` | Thrown error → error entry with event=unhandled and stack trace. |
| `scrubbing → sensitive fields redacted` | Ingested entries with password/token → `[REDACTED]` in query results. |
| `cross-worker → demo2 auth entries` | Second demo worker produces auth:login entries with correct system. |
| `cross-worker → both demos produce logs` | Both demos running simultaneously, both produce queryable entries. |
| `tracing → traceparent on responses` | W3C traceparent header on HTTP responses matches expected format. |

#### Wrangler aggregator (`bun run observe demo:both`)

Not a test tier — a manual verification tool. Both demos via `wrangler dev` (:3335 + :3336). `tail.ts` aggregator merges both workers into one color-coded terminal.

```
[demo1]  info  log-demo:health-check  traceId=... requestId=...
[demo1]  info  sync:merge  modelId=demo-model-1 localOps=10 remoteOps=8
[demo1]  warn  truck:memory-pressure  heapBytes=150000000 sceneObjects=200
[demo2]  info  auth:login  userId=user-abc method=oauth provider=github
[demo2]  warn  session:session-stale  userId=user-xyz idleMinutes=45
```

**Production equivalent:** `wrangler tail --format=json | jq` gives the same view against deployed workers.

### When to run each tier

| Event | Tier 1 (integration) | Tier 2 (e2e) | Wrangler aggregator |
|---|---|---|---|
| Editing lib/observe code | Always | Before merge | Manual spot-check |
| New feature landed | Always | Always | Always — verify visually |
| Phase gate (before next phase) | Must pass | Must pass | Must pass — screenshot or terminal output |
| CI / pre-commit | Always | Not in CI (needs running demos) | Not in CI |

### Demo → system workflow

1. **Build the pattern in demo** — new feature, bug fix, or API change
2. **Validate in demo** — `bun run observe demo:both` (wrangler dev + tail aggregator) — see it in the terminal
3. **Run tests** — `bun run observe test` (integration) + `bun run observe test:e2e` (browser e2e)
4. **Copy to system worker** — exact same patterns, just different `service` name and real WASM calls
5. **Never invent patterns in system code** — if the pattern isn't in the demo, add it to the demo first

-----

## Consequences

**Positive:**

- Rust logs become queryable in CF — filter sync issues by `modelId`, `actorId`, `opCount` instantly
- `cargo test --workspace` produces readable, filterable output via `RUST_LOG`
- Single unified pipeline: browser JS + worker TS + Rust WASM all merge in CF Workers Logs
- WASM calls are fully instrumented — timing, error context, memory tracking
- Browser crashes are captured and queryable — global error handlers + session tracking
- User journeys are traceable — `deviceId` + `sessionId` + `traceId` across browser→worker→WASM
- **No metrics system needed** — structured logs + CF Query Builder = metrics
- **No distributed tracing code needed** — CF Automatic Traces handles service binding spans
- **No alerting code needed** — CF Dashboard notifications
- Bundle size impact is minimal — the Rust crate adds a thin JSON serialiser
- Rate limiter prevents cost explosions during sync bursts
- Sensitive data never reaches CF — deny-list scrubbing on push

**Negative:**

- Consuming Rust crates switch from `log::info!()` to `tracing::info!()` — a one-time migration
- Two logging systems to maintain (Rust crate + TypeScript lib) — but they have zero overlap in responsibility
- camelCase in Rust tracing macros is unconventional — but necessary for CF field correlation
- Every WASM call in TS needs a `timed()` wrapper — discipline required, but the pattern is simple

**Risks:**

- The WASM backend uses `tracing-web` + `tracing-subscriber` json, which pulls `serde_json` into the WASM build. Phase 5 measures the impact — if it breaches the 3 MB worker limit, fall back to a lighter approach
- `tracing` subscriber setup must be idempotent — `init()` may be called from multiple WASM entry points. Mitigated by `has_been_set()` guard
- camelCase field names in Rust require discipline — a wrong field name silently creates an unqueryable field. Mitigated by canonical field name table and code review

-----

## Verification Model

**Every phase must pass both test tiers before it's done.** This is not optional — if you can't see it through the real wrangler pipeline, it doesn't work.

See "Verification model" in the Demo-first section above for the full test matrix (Tier 1: 6 integration tests, Tier 2: 7 e2e tests, plus manual wrangler aggregator).

-----

## Implementation Tasks

### Phase 0 — Turn on CF (tasks 0a–0b)

**Zero code. Single most impactful change.** All CF Dashboard config.

0a. ✅ **Add `[observability]` config to all wrangler.toml files** — plat-router, truck-cad, test-worker, sync-tests, demo1, demo2. 100% dev sampling, 10% prod logs, 5% prod traces. Deploy and verify with `wrangler tail --format json`. Instantly get:
    - Invocation logs (method, status, duration, CPU time) for every request
    - Automatic distributed traces across service bindings
    - Analytics Engine metrics (p50/p95/p99, error rates, requests/sec)
    - Query Builder access to all structured `console.log` output

0b. **Enable Logpush → R2 in CF Dashboard.** Steps:
    1. Create R2 bucket `plat-logs` in the same account
    2. Set lifecycle rule: delete objects after 90 days
    3. CF Dashboard → Analytics & Logs → Logpush → Create job
    4. Dataset: `workers_trace_events` (this one dataset captures logs + traces + invocation metadata)
    5. Destination: R2 bucket `plat-logs`
    6. Verify: wait ~2 minutes, check R2 bucket has files appearing

    Without this, all observability data disappears after 72 hours.

### Phase 1 — TypeScript hardening (tasks 1a–1c) ✅ DONE

Gate: both test tiers pass. Complete before Phase 4 system wiring.

1a. ✅ **Rate limiter on LogBuffer** — token-bucket on `push()`, `rateLimit: { maxPerSecond, burstSize }`. Error/warn always pass. `drainDropped()` returns count. Off by default.

1b. ✅ **Sensitive data scrubbing on LogBuffer** — deny-list field name check (case-insensitive) on `push()` before `console.log` and ring buffer.

1c. ✅ **`captureErrors` option on `setupBrowserLog()`** — installs `window.onerror` + `window.onunhandledrejection`. Both demos use it.

**Verified:** integration tests (6/6 pass), e2e tests (7/7 pass), wrangler aggregator (both demos visible, scrubbed fields show `[REDACTED]`, browser ingest flows through).

### Phase 2 — Rust crate (tasks 2–5)

Gate: nothing lands until all four tasks compile on both `wasm32` and native.

2. **Create `lib/observe/crate/`** with `Cargo.toml`, `src/lib.rs`, `src/wasm.rs`, `src/native.rs`
3. **Implement WASM backend (`src/wasm.rs`)**: `tracing-web` (`MakeConsoleWriter`) + `tracing-subscriber` `.json()` formatter.
4. **Implement native backend (`src/native.rs`)**: `tracing-subscriber` + `EnvFilter` + `fmt::TestWriter`. Gated behind `cfg(not(target_arch = "wasm32"))`.
5. **`init()` must be idempotent** (`src/lib.rs`): use `tracing::dispatcher::has_been_set()` guard (NOT `OnceLock` — must check tracing's own global state). Structured panic hook: `tracing::error!(system = "panic", message, location)` then delegate to default hook.

### Phase 3 — Demo validation (tasks 6–7)

Gate: **both test tiers must pass before proceeding to Phase 4.**

6. **Create demo Rust WASM module** in `lib/observe/demo1/` that emits structured `tracing` events with camelCase field names. Add `heap_bytes()` export.
7. **Verify all outputs using the verification model:**
   - **Tier 1 (integration):** `bun run observe test` + `RUST_LOG=debug cargo test -p pt-log` — all pass
   - **Tier 2 (e2e):** `bun run observe test:e2e` — all pass, Rust + TS entries visible via browser
   - **Wrangler aggregator:** `bun run observe demo:both` — Rust structured JSON entries alongside TS entries. Both `system`, `modelId`, `opCount` fields visible and queryable. `heap_bytes` visible in health output.
   - **CF Automatic Traces check:** deploy demo worker, verify CF creates a trace span for the WASM worker. If yes: note it works. If no: document as known gap.

### Phase 4 — System wiring (tasks 8–13)

Gate: do not start until Phase 3 is confirmed working. **Every pattern below already works in the demo — this phase is copy-paste + real WASM calls, not invention.**

8. **Wire `pt-log` into `truck-sync` crate.** Add `pt_log::init()` call. Add structured `tracing` fields at each call site: `modelId`, `actorId`, `opCount`, `groupId`. Reference: demo Rust WASM module from Phase 3.
9. **Wire `pt-log` into `truck-cad` crate.** Add `pt_log::init()` call. Add structured fields: `solidId`, `operation`, `meshVertices`. Reference: same demo crate.
10. **Wire `setupLog()` into truck-cad worker.** Copy from `demo1/bun.ts`: `setupLog(app, 'truck-cad')`, replace simulated `timed()` calls with real WASM calls (`controller.add_cube`, `controller.boolean_subtract`, etc.). Add `heapBytes` from `controller.heap_bytes()` to health endpoint. Pass `minLevel` from `env.LOG_LEVEL`.
11. **Wire `setupLog()` into plat-router.** Copy from `demo1/bun.ts`: one-liner `setupLog(app, 'plat-router')`.
12. **Wire `setupBrowserLog()` into browser frontend.** Copy from `demo1/browser.ts`: `setupBrowserLog({ flushUrl, captureErrors: true })`, `deviceId` + `sessionId` context, wrap WASM calls with `timed()`.
13. **Add `heap_bytes()` export** to truck-cad and truck-sync WASM crates. One line of Rust per crate — same as demo export from Phase 3.

### Phase 5 — Size check + validation (tasks 14–15)

14. **Measure bundle size** before/after:
    - CF Worker WASM: must stay under 3 MB
    - Browser WASM: flag if delta exceeds ~50 KB

15. **End-to-end validation (both test tiers):**
    - **Tier 1 (integration):** `bun run observe test` — all pass
    - **Tier 2 (e2e):** `bun run observe test:e2e` — all pass
    - **Wrangler aggregator:** `bun run observe demo:both` + hit all endpoints — shows:
      - Browser click → structured browser log with `sessionId` → flush to worker → visible in tail
      - Worker request → WASM call → `timed()` log + Rust `tracing` log → visible in tail
      - WASM panic → structured panic entry (Rust + TS) → `system = "panic"` visible in tail
      - Sensitive fields show `[REDACTED]`
    - **Production:** deploy, `wrangler tail --format json` shows all of the above in real-time
    - **CF Dashboard:** Query Builder can filter by `modelId`, `system`, `level`, `deviceId`

### Phase 6 — Auth-aware debugging (tasks 16–18)

Once auth is wired into the platform, observability becomes per-user debugging.

16. **Wire `userId` into log context.** Auth middleware sets `userId` on the per-request logger so every structured log entry — worker, browser, WASM — carries the authenticated user. CF Query Builder: `SELECT * WHERE userId = 'user-xyz'`.

17. **Automerge op-log as replay tape.** The Automerge doc records every user operation (add cube, move, boolean, undo). When a bug is reported, the op sequence that led to it is already captured — and it syncs from offline to online automatically. Wire `modelId` + `opCount` into log context so logs and ops correlate.

18. **Per-user incident reconstruction.** Given a `userId` and time range:
    - `wrangler tail --format json` filtered by `userId` → real-time session view
    - CF Query Builder → all structured logs for that user's session
    - Automerge doc → exact op sequence they performed on the 3D model
    - Together: full reproduction path from "user clicked X" → "WASM panicked at Y" → "here's the model state"

### Cleanup

19. **Delete `lib/log-other/`** — fully superseded. Can happen any time.

-----

## Future considerations

- **R2 query worker** — a small worker that reads the Logpush archive from R2 and serves it as a JSON API. This is the only path to a self-hosted production log UI that doesn't require CF Dashboard login. Deferred until we need team access without CF credentials.
- **Grafana Cloud embed** — OTLP export to Grafana Cloud (free tier: 50GB logs/mo) gives embeddable dashboards and alerting. Simpler than the R2 query worker if the goal is team sharing. One-click setup in CF Dashboard → Observability → Destinations.
- **CF Automatic Tracing maturity** — currently beta. If it covers our full topology, `lib/observe/trace.ts` becomes local-dev-only.
- **Viewport rendering metrics** (FPS, draw calls, GPU memory) — deferred until rate limiter is in place. High-frequency data needs aggregation before emission.
- **@sentry/cloudflare** — complementary error tracking with grouping/dedup. Worth adding as an overlay.
- **CF Analytics Engine bindings** — for pre-aggregated metrics if Query Builder becomes insufficient.

-----

## References

**This repo:**
- `lib/observe/` TypeScript library (index.ts, browser.ts, setup.ts, middleware.ts, endpoint.ts, config.ts, trace.ts)
- `lib/observe/demo1/` + `lib/observe/demo2/` working demos (Bun + wrangler)
- `lib/observe/dev/` dev tooling (run.mjs, orchestrate.ts, tail.ts)
- `lib/observe/tests/` integration + e2e tests

**Cloudflare:**
- Workers Logs: https://developers.cloudflare.com/workers/observability/logs/
- Automatic Traces: https://developers.cloudflare.com/workers/observability/traces/
- OTLP Export: https://developers.cloudflare.com/workers/observability/export/
- Analytics Engine: https://developers.cloudflare.com/analytics/analytics-engine/
- Logpush: https://developers.cloudflare.com/logs/about/
- Recommended Rust crates: https://developers.cloudflare.com/workers/languages/rust/crates/

**Rust crates (used):**
- `tracing`: https://docs.rs/tracing/
- `tracing-subscriber` (json + fmt): https://docs.rs/tracing-subscriber/
- `tracing-web` (CF-recommended WASM writer): https://github.com/WorldSEnder/tracing-web
- `console_error_panic_hook`: https://github.com/rustwasm/console_error_panic_hook

**Rust crates (evaluated, rejected):**
- `tracing-wasm` — unmaintained (2021), no JSON, browser-only
- `wasm-tracing` — no JSON, browser-only (no Workers support)
- `tracing-worker` — abandoned (1 star), no JSON
- `tracing-subscriber-wasm` — writer only, no JSON, unmaintained
- `tracing-json` — heavy deps (`chrono`, `serde`), no WASM support, 2020

**TypeScript libraries (evaluated, not needed):**
- `workers-tagged-logger` — AsyncLocalStorage tags, narrower than lib/log
- `LogTape` — mature structured logging, but doesn't cover browser shipping or viewer
- `hono-pino` — pino transports don't work in CF Workers runtime
- `@microlabs/otel-cf-workers` — good OTLP, but CF Automatic Tracing may obsolete it
