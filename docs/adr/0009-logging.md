# ADR 0009 — Structured Logging: Two-Layer Architecture

**Status:** Proposed
**Date:** 2026-03-12
**Deciders:** Gerard Webb

-----

## Context

The sync system is hard to debug when it goes wrong. We need to see what's happening across browser, worker, and Rust WASM — all in one place — using the full Cloudflare observability stack (Workers Logs, Logpush, Automatic Traces, OTLP export).

### What exists today

**TypeScript transport layer** (`lib/log/`) — built, tested, isolated, not yet wired into any system worker:

- `LogBuffer` emits structured JSON via `console.log(JSON.stringify({...}))` — CF Workers Logs auto-indexes every top-level field
- Browser logger with localStorage offline queue, periodic flush to worker via POST `/api/debug/logs/ingest`
- Hono middleware: W3C traceparent extraction, per-request Logger injection, structured HTTP log on completion
- Debug routes: JSON API, SSE tail stream, browser ingest endpoint, built-in web viewer
- `setupLog(app, 'service-name')` — one-liner to wire everything into any Hono worker
- `buildLogConfig()` reads `cf-deploy.json` for CF dashboard URL generation
- 30 unit tests + 24 integration tests (Playwright + wrangler)
- Demo: `bun run log demo` (Bun :3333) and `bun run log demo:cf` (wrangler :3335)

**Rust crates** — use `log` + `console_log` crate for basic unstructured output:

```rust
// Current: plain text, CF can't query individual fields
log::info!("merge complete for model {}", id);
// → console.log: "merge complete for model m1"
```

### The gap

Rust logs are **unstructured text**. When sync goes wrong, you can't filter by `model_id`, `actor_id`, or `op_count` in CF Query Builder. The TypeScript layer emits rich structured JSON that CF indexes — the Rust layer emits flat strings that disappear into noise.

Additionally, `cargo test` on native silently drops all log output because `console_log` is a WASM-only backend. Debugging pure Rust logic (CRDT, geometry) means adding temporary `println!` calls and removing them later.

-----

## Decision Drivers

- Rust logs must be **structured JSON** so CF Workers Logs can index fields like `model_id`, `op_count`, `actor_id`
- `cargo test` on native must produce readable, filterable log output — no silent drops
- Zero call-site changes in consuming crates — all dispatch inside the logging crate
- The 3 MB CF Workers bundle size limit must not be breached
- Don't duplicate what CF already does natively (Automatic Traces, OTLP export, Logpush) — those are wrangler.toml config, not code
- Don't duplicate what the TypeScript lib already does (transport, viewer, browser flush, middleware)

-----

## Decision

### Two-layer architecture

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Rust structured emission (NEW — pt-log crate)  │
│                                                         │
│  tracing::info!(model_id = %id, op_count = 3, "merge")  │
│       │                                                 │
│       ├── WASM: structured JSON → console.log()         │
│       └── Native: tracing-subscriber → stderr           │
└─────────┬───────────────────────────────────────────────┘
          │ console.log(JSON.stringify({...}))
          ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 2: TypeScript transport + UI (EXISTS — lib/log/)   │
│                                                         │
│  Worker: setupLog() → middleware, trace context, viewer  │
│  Browser: setupBrowserLog() → localStorage queue, flush  │
│  CF: Workers Logs auto-indexes all JSON fields           │
└─────────────────────────────────────────────────────────┘
```

**Layer 1 (Rust)** makes Rust logs structured. It configures `tracing` to emit JSON via `console.log` on WASM, and via `tracing-subscriber` on native. ~50-80 lines of Rust. No transport, no viewer, no HTTP — just structured emission.

**Layer 2 (TypeScript)** handles everything else: Hono middleware, W3C trace context, browser offline queue, debug routes, viewer, SSE tail, CF dashboard links. Already built and tested.

### Rust crate: `pt-log`

Location: `lib/log/crate/` (co-located with the TypeScript lib — both are the logging system)

```
lib/log/crate/
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
    model_id = %id,
    op_count = 3,
    "merge complete"
);
```

#### Initialisation

Each entrypoint calls `pt_log::init()` once. No feature flags needed — `cfg(target_arch)` handles everything:

```rust
pub fn init() {
    #[cfg(target_arch = "wasm32")]
    crate::wasm::init();      // JSON subscriber → console.log

    #[cfg(not(target_arch = "wasm32"))]
    crate::native::init();    // tracing-subscriber + EnvFilter → stderr
}
```

#### WASM backend (`wasm.rs`)

A minimal `tracing` subscriber that serialises each event to JSON and calls `web_sys::console::log_1()`. Output format matches the TypeScript `LogEntry` schema so CF indexes the same fields:

```json
{"ts":"...","level":"info","system":"sync","operation":"merge","model_id":"m1","op_count":3}
```

Because the worker calls `console.log(JSON.stringify({...}))`, CF Workers Logs auto-indexes every field. No Logpush code, no OTLP code — that's CF config in `wrangler.toml`.

#### Native backend (`native.rs`)

- `tracing-subscriber` with `EnvFilter` driven by `RUST_LOG` env var
- `fmt::TestWriter` so output is captured per-test and only shown on failure
- ANSI colour for interactive sessions
- No WASM dependencies compiled in — `tracing-subscriber` is `cfg(not(wasm32))` gated

```bash
# See all sync logs during cargo test:
RUST_LOG=sync=debug cargo test -p truck-sync
```

#### Panic hook

`init()` also sets the panic hook:
- WASM: `console_error_panic_hook` (already used by both crates)
- Native: `std::panic::set_hook` that emits `tracing::error!`

### Target matrix

| Target | `cfg` condition | Backend | Output |
|---|---|---|---|
| Native | `not(target_arch = "wasm32")` | `tracing-subscriber` + `EnvFilter` | stderr (per-test captured) |
| WASM (browser + worker) | `target_arch = "wasm32"` | JSON → `console.log()` | CF Workers Logs indexes all fields |

No browser vs worker distinction needed in Rust. Both are `wasm32`, both emit to `console.log`. The TypeScript layer handles the difference (browser flushes via HTTP, worker is captured directly by CF).

### How the layers connect

```
Rust WASM tracing::info!(system="sync", model_id="m1", ...)
    → pt-log wasm.rs serialises to JSON
    → console.log('{"system":"sync","model_id":"m1",...}')
    → CF Workers Logs auto-indexes every field ✓
    → wrangler tail shows it ✓
    → CF Query Builder can filter by model_id ✓

TypeScript setupLog(app, 'truck-cad')
    → observabilityMiddleware adds traceId, spanId, requestId
    → HTTP logs with method, path, status, durationMs
    → Browser logs flush via /api/debug/logs/ingest
    → Same CF Workers Logs pipeline ✓

Both layers' entries merge in:
    → CF Workers Logs (Query Builder)
    → wrangler tail --format json
    → /api/debug/logs/viewer (custom viewer)
    → OTLP export to Grafana/Axiom/Honeycomb (CF config only)
```

### CF observability config (no code — wrangler.toml only)

```toml
# Already in lib/log/demo/wrangler.toml — copy to each system worker:
[observability]
enabled = true
head_sampling_rate = 1

[observability.logs]
invocation_logs = true

[observability.traces]
enabled = true
head_sampling_rate = 1
```

OTLP export is configured in CF Dashboard → Observability → Destinations. Zero code.

### `lib/log-other/` disposition

`lib/log-other/` is an earlier alternative implementation. Delete it — `lib/log/` supersedes it entirely.

-----

## Demo-first validation

All changes are validated in the demo before touching any system worker:

1. Add `pt-log` Rust crate with WASM + native backends
2. Create a small Rust WASM module in `lib/log/demo/` that emits structured `tracing` events
3. Load that WASM in the demo worker — verify structured JSON appears in:
   - `bun run log demo` viewer
   - `bun run log demo:cf` + `wrangler tail`
   - CF Query Builder (after deploy)
4. Verify `cargo test` on the demo crate produces readable output with `RUST_LOG=debug`
5. Only then wire into `truck-cad` and `truck-sync`

-----

## Consequences

**Positive:**

- Rust logs become queryable in CF — filter sync issues by `model_id`, `actor_id`, `op_count` instantly
- `cargo test --workspace` produces readable, filterable output via `RUST_LOG`
- Single unified pipeline: browser JS + worker TS + Rust WASM all merge in CF Workers Logs
- Bundle size impact is minimal — the Rust crate adds a thin JSON serialiser, not a full tracing stack
- No duplication — Rust handles emission, TypeScript handles transport/UI, CF handles storage/query/export

**Negative:**

- Consuming Rust crates switch from `log::info!()` to `tracing::info!()` — a one-time migration (search-and-replace, same macro names)
- Two logging systems to maintain (Rust crate + TypeScript lib) — but they have zero overlap in responsibility

**Risks:**

- The WASM JSON subscriber must be lightweight — no `serde_json` (too heavy for WASM). Use manual JSON string building or `miniserde`
- `tracing` subscriber setup must be idempotent — `init()` may be called from multiple WASM entry points in the same runtime

-----

## Implementation Tasks

### Phase 1 — Crate (tasks 1–4)

Gate: nothing lands until all four tasks compile on both `wasm32` and native.

1. **Create `lib/log/crate/`** with `Cargo.toml`, `src/lib.rs`, `src/wasm.rs`, `src/native.rs`
2. **Implement WASM backend (`src/wasm.rs`)**: minimal `tracing` subscriber → JSON → `web_sys::console::log_1()`. **No `serde_json`** — use manual JSON string building (or `miniserde` if formatting gets complex). Every byte matters for the 3 MB worker limit.
3. **Implement native backend (`src/native.rs`)**: `tracing-subscriber` + `EnvFilter` + `fmt::TestWriter`. Gated behind `cfg(not(target_arch = "wasm32"))` in `Cargo.toml` so none of its deps enter the WASM build.
4. **`init()` must be idempotent** (`src/lib.rs`): use `std::sync::OnceLock` (or check `tracing::dispatcher::has_been_set()`) before calling `set_global_default()`. Must not panic if called twice — multiple WASM entry points (`WasmApp::new`, `HeadlessController::new`) may both call `pt_log::init()`. Also sets panic hook (WASM: `console_error_panic_hook`, native: `std::panic::set_hook` → `tracing::error!`).

### Phase 2 — Demo validation (tasks 5–6)

Gate: **do not proceed to Phase 3 until all three checks pass.** This is the whole point of the demo-first strategy.

5. **Create demo Rust WASM module** in `lib/log/demo/` that emits structured `tracing` events (a few `info!`, `warn!`, `error!` with realistic fields like `system`, `modelId`, `opCount`). Load it in the demo worker alongside the existing TypeScript logging. **Critical: field names must match the TypeScript `LogEntry` schema exactly** — camelCase (`modelId`, `opCount`, `actorId`), not snake_case. The WASM JSON subscriber in `wasm.rs` must emit the same field names the TypeScript layer uses, so both merge cleanly in CF Query Builder. Reference: `LogEntry` type in `lib/log/index.ts`.
6. **Verify all three outputs:**
   - `bun run log demo` → open viewer → structured Rust JSON entries appear with queryable fields (`system`, `modelId`, etc.) merged alongside TypeScript entries
   - `bun run log demo:cf` → `wrangler tail --format json` → same structured entries visible
   - `RUST_LOG=debug cargo test -p pt-log` → readable, coloured output on stderr, captured per-test

### Phase 3 — Cleanup (task 7)

7. **Delete `lib/log-other/`** — only after Phase 2 passes. It is fully superseded by `lib/log/`.

### Phase 4 — System wiring (tasks 8–11)

Gate: do not start until Phase 2 is confirmed working.

8. **Wire `pt-log` into `truck-sync` crate.** This is not a mechanical search-and-replace of `log::info!` → `tracing::info!`. At each call site, **add the relevant structured fields** (`model_id`, `actor_id`, `op_count`, `group_id`, etc.) so they become queryable in CF. Review every log statement and decide which fields matter for debugging sync issues.
9. **Wire `pt-log` into `truck-cad` crate.** Same approach — add structured fields per call site (`solid_id`, `operation`, `mesh_vertices`, etc.).
10. **Wire `setupLog()` into truck-cad worker and plat-router** — one-liner each.
11. **Wire `setupBrowserLog()` into browser frontend** (`systems/truck/web/`).

### Phase 5 — Size check (task 12)

12. **Run `wasm-opt` and measure bundle size** before declaring done. Compare before/after for **both targets**:
    - **CF Worker WASM**: must stay under 3 MB. Hard limit.
    - **Browser WASM**: no hard limit, but this is a CAD app — initial load time matters. `tracing` spans add code size overhead. Measure the delta and flag if it exceeds ~50 KB.

    If `tracing` + the JSON subscriber push either target over acceptable limits, investigate: drop `tracing` spans (use events only), slim deps, or gate `tracing` behind a feature flag in the consuming crate.

-----

## References

- `lib/log/` TypeScript library (this repo)
- `lib/log/demo/` working demo (Bun + wrangler)
- Cloudflare Workers Logs: https://developers.cloudflare.com/workers/observability/logs/
- Cloudflare Automatic Traces: https://developers.cloudflare.com/workers/observability/traces/
- Cloudflare OTLP Export: https://developers.cloudflare.com/workers/observability/export/
- `tracing` crate: https://docs.rs/tracing/
- `tracing-subscriber` TestWriter: https://docs.rs/tracing-subscriber/latest/tracing_subscriber/fmt/struct.TestWriter.html
- `console_error_panic_hook`: https://github.com/rustwasm/console_error_panic_hook
