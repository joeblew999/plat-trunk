# [ADR-018] Code Mode MCP — Schema-Driven Script Execution

We will adopt the "Code Mode" pattern for our Model Context Protocol (MCP) implementation, adding a single `cad_execute` tool that accepts TypeScript code alongside our existing granular tools. The code runs against a dynamically generated SDK, with transactional commit/rollback semantics via Automerge. Execution works in two tiers — **interactive** (browser via SSE) and **headless** (feature-flagged WASM in Worker) — sharing the same Rust crate.

## Status

**Proposed** — Phase 0 **PASSED**, Phase 0.5 **PASSED**.

## Key Architectural Insight: One Crate, Two Targets

All geometry computation in `truck-webgpu-gui` is **CPU-only**. The GPU is used exclusively for rendering (truck-platform + truck-rendimpl: PBR shaders, instance buffers, depth buffer). This means we can compile our existing crate without rendering dependencies to get a headless geometry WASM — no separate crate needed.

```toml
# crates/truck-webgpu-gui/Cargo.toml
[features]
default = ["rendering"]
rendering = ["truck-platform", "truck-rendimpl", "wgpu", "winit", "web-sys"]
```

- **Browser**: `cargo build` (default features) → geometry + rendering → full GUI WASM
- **Worker**: `cargo build --no-default-features` → geometry only → headless WASM

Same Rust code. Same `execute()` dispatch. Same command params. Same `SceneController` logic (minus the rendering methods behind `#[cfg(feature = "rendering")]`). **True DRY — one source of truth.**

### Why Not truck-js?

The upstream truck author provides `truck-js` (`.src/truck/truck-js/`) — a separate WASM crate with low-level geometry primitives (`vertex`, `tsweep`, `and`). Phase 0 validated WASM-in-Worker using truck-js. However:

- **truck-js has a different API** — low-level primitives, not our schema commands (`add_cube`, `boolean_union`, etc.)
- **Would require an SDK bridging layer** — mapping 34 schema commands to truck-js primitives, duplicating dispatch logic
- **Misses our extensions** — BIM (ifc-lite), sketching (kcl-ezpz), assembly, scene management, undo/redo
- **Two WASM binaries with overlapping geometry code** — compiled from same Rust libs but separately

Feature-flagging our own crate eliminates all of these problems. The headless build IS the browser build, minus rendering.

---

## Phase 0: WASM-in-Worker Feasibility — PASSED

We validated that WASM loads and executes geometry inside a Cloudflare Worker using truck-js as a proof-of-concept. ([PR #2](https://github.com/joeblew999/plat-trunk/pull/2))

### Results

| Metric | Result | Pass Criteria | Status |
|--------|--------|---------------|--------|
| Bundle size | **2.6 MB** | Under 3 MB (free) / 10 MB (paid) | **PASS** |
| Cold init | **1ms** | Under 500ms | **PASS** |
| Warm request | **0ms** | Under 50ms | **PASS** |
| Geometry works | **192 verts, 36 idx, 12 tri** | Valid mesh data | **PASS** |
| wasm-bindgen compat | Manual `WebAssembly.instantiate()` needed | No runtime errors | **PASS** |

### Key Finding

wasm-bindgen `--target bundler` output needs a manual `WebAssembly.instantiate()` wrapper for Workers — the bundler-style WASM import doesn't auto-instantiate. Solved with `truck-wasm.ts` (lazy init, ~40 lines). This same pattern applies to the headless truck-webgpu-gui build.

### What's Deployed

- `/api/test-wasm` — REST endpoint returning geometry timing data
- `cad_wasm_health` — MCP tool for agent verification
- `truck-wasm.ts` — Lazy WASM init wrapper for CF Workers

---

## Phase 0.5: Headless Build of truck-webgpu-gui — PASSED

Our own crate compiled without rendering deps, deployed to Worker, geometry verified.

### What We Did

1. **Added `rendering` feature flag** to `crates/truck-webgpu-gui/Cargo.toml`:
   ```toml
   [features]
   default = ["rendering", "mvt"]
   rendering = ["dep:truck-platform", "dep:truck-rendimpl", "dep:wgpu", "dep:winit", "dep:web-sys"]
   ```

2. **Gated rendering code** — `mod wasm_app` compiled only with `rendering` feature. Created `mod headless` (compiled without) containing `HeadlessController` with same `execute()` dispatch, same command params, no rendering deps. Both modules in `lib.rs`:
   ```rust
   #[cfg(all(target_arch = "wasm32", feature = "rendering"))]
   mod wasm_app;
   #[cfg(all(target_arch = "wasm32", not(feature = "rendering")))]
   mod headless;
   ```

3. **Built headless WASM**:
   ```sh
   wasm-pack build --target bundler --no-default-features  # from crate dir
   ```

4. **Replaced truck-js** in Worker with headless build. Updated `truck-wasm.ts` to dynamically collect glue imports (no fragile manual listing).

5. **Validated** via `/api/test-wasm` calling `execute("add_cube", {"size": 1.0})`.

### Results

| Metric | Result | Status |
|--------|--------|--------|
| Headless WASM size | **2.5 MB** | **PASS** (under 3 MB free limit) |
| Cold init | **1ms** | **PASS** |
| Warm init | **0ms** | **PASS** |
| `execute("add_cube", ...)` | Valid objectId + objectCount=1 | **PASS** |
| Rendering build (default features) | Still compiles | **PASS** |
| MCP `cad_wasm_health` tool | Works via JSON-RPC | **PASS** |

### What This Gives Us

| Capability | truck-js (Phase 0) | Headless build (Phase 0.5) |
|------------|---------------------|----------------------------|
| API | Low-level (`vertex`, `tsweep`) | Schema-level (`add_cube`, `boolean_union`) |
| Commands | ~15 primitives | All 34 commands |
| BIM/IFC | No | Yes |
| Sketching | No | Yes |
| Assembly | No | Yes |
| Scene management | No | Yes (objects, selection, undo) |
| SDK bridging needed? | **Yes** (big effort) | **No** (same dispatch) |
| Code shared with browser? | Different crate | **Same crate** |

---

## Context

Our current MCP implementation exposes 29 granular tools (ADR-010). This works well for simple operations but has three limitations:

1. **Context consumption**: Listing 29 tool schemas consumes significant agent context window. Cloudflare's "Code Mode" pattern shows that a single `execute` tool + a typed SDK can represent an entire API in ~1,000 tokens.
2. **No atomicity**: If an agent calls 5 tools sequentially and tool #3 fails, the scene is left in a partial state. There is no way to roll back.
3. **No composability**: Agents cannot express conditional logic, loops, or variables across tool calls. Each call is independent.

### Current Architecture Reality

| Capability | Status | Notes |
|------------|--------|-------|
| WASM kernel in browser | **Working** | `truck-webgpu-gui`: geometry (CPU) + WebGPU rendering (GPU) |
| WASM in CF Worker | **Proven** | Phase 0 (truck-js) + Phase 0.5 (headless truck-webgpu-gui) both passed |
| Worker (Hono/Zod) | **Working** | Stateless proxy, SSE command relay, 29 MCP tools |
| MCP bridge | **Working** | stdio ↔ HTTP proxy with retry + hot-reload |
| Feature-flagged headless build | **Done** | Phase 0.5 — HeadlessController with execute() dispatch |
| Server-side state (Durable Objects) | **Not started** | Automerge state lives in browser only |
| Workers AI integration | **Not started** | No `/api/chat` route, no model calls |

### Why not just replace granular tools?

Granular tools remain valuable:
- Simple operations ("add a cube") don't need a script wrapper.
- Tool discovery — agents can see available operations without reading SDK docs.
- Backward compatibility with existing agent integrations.

The `execute` tool is a **power tool** that coexists with granular tools. Agents choose based on task complexity.

## Decision: Technical Specification

---

### Stage 1: Browser-Connected Code Mode

This stage delivers the core `cad_execute` capability using only existing infrastructure. Requires a browser with the GUI open.

#### 1a. Runtime SDK & `cad_execute` Tool

We will extend `buildMcpTools()` in the Hono Worker to dynamically generate the SDK and the `cad_execute` tool.

*   **Runtime SDK Generation**: The Worker iterates over `cadSchema` and generates a concise TypeScript type string, included in the `description` of `cad_execute`.
*   **The `cad_execute` Tool**:
    ```typescript
    {
      name: "cad_execute",
      description: `Execute TypeScript code against the Truck SDK.\n\nAvailable API:\n${generatedTypeString}`,
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'TypeScript/JS code to execute.' }
        },
        required: ['code']
      }
    }
    ```
*   **TransactionRecord**: Formalized return object capturing input code, command sequence, timing, and success/failure. The "flight recorder" for debugging and macro recording.

#### 1b. Browser-Side Execution via SSE

1.  **Request Arrival**: Worker receives `cad_execute` MCP request.
2.  **Code Dispatch**: Worker sends code to browser via existing SSE command channel.
3.  **Browser Sandbox**: Browser creates a **transaction context**:
    *   Snapshots Automerge document state.
    *   Injects `truck` namespace — each `truck.cad.*` call triggers `cadCommand()` and appends to `TransactionRecord`.
    *   Executes code via restricted `AsyncFunction` constructor.
4.  **Commit or Rollback**:
    *   **Success**: Automerge committed. Scene updates live. `TransactionRecord` returned.
    *   **Failure**: Automerge rolled back. Error + partial log returned to agent.

```
Agent → MCP Bridge → Worker /mcp → SSE → Browser (truck-webgpu-gui + Automerge + render)
                                      ←  SSE  ← TransactionRecord
```

#### 1c. Security

*   **Sandboxed scope**: Only `truck` namespace. No `window`, `document`, `fetch`, `eval`, `import`.
*   **Execution timeout**: 10 seconds (configurable).
*   **Rate limiting**: 10 `execute` calls per minute per session.
*   **Audit logging**: Every call produces a `TransactionRecord`.

#### 1d. AI Chat (Browser-Connected)

*   A new Hono route `/api/chat` using **Workers AI** (Llama 3/Mistral) with the runtime SDK string as system prompt.
*   Datastar chat panel in the browser streams AI-generated code via SSE.
*   **Constraint**: Browser must be open — execution routes through browser WASM.

```
User prompt → Worker → Workers AI → generates code
  → Worker dispatches via SSE → Browser executes against truck-webgpu-gui WASM
  → Scene renders live → TransactionRecord returned
```

---

### Stage 2: Headless Execution (Headless WASM in Worker)

Stage 2 enables the Worker to execute CAD code **without a browser**. Workers AI becomes an autonomous agent — generates code, executes it, persists results. The browser is a lazy renderer that catches up on connect.

**Gated by Phase 0.5** (headless build of truck-webgpu-gui).

#### How It Works

The headless WASM is the same `truck-webgpu-gui` crate compiled without the `rendering` feature. It has the same `execute()` method, the same command dispatch, the same param types. The Worker calls it directly — no SSE, no browser, no SDK bridging layer.

```typescript
async function executeInWorker(code: string) {
  const wasm = await initHeadlessWasm();
  // Same execute() as browser — same commands, same params
  const snapshot = automergeDoc.clone();
  try {
    const record = wasm.execute_script(code, snapshot);
    automergeDoc.merge(record.doc);
    return { ok: true, record };
  } catch (err) {
    // snapshot discarded — automatic rollback
    return { ok: false, error: err.message };
  }
}
```

#### Prerequisites

**1. Phase 0.5: Headless build** (described above)

*   Feature-flag rendering deps in Cargo.toml
*   Gate rendering code with `#[cfg(feature = "rendering")]`
*   Build and deploy headless WASM to Worker

**2. Server-side state (Durable Objects)**

*   Automerge documents persisted in Durable Objects or R2.
*   Worker loads, modifies, saves Automerge docs without a browser.
*   Browser syncs from server-side state on connect — same CRDT mechanism as cross-tab sync (ADR-003).

#### End-to-End Flow: Workers AI as Autonomous Agent

```
┌─────────────────────────────────────────────────────────────────┐
│  CLOUDFLARE EDGE (Worker)                                       │
│                                                                 │
│  1. User prompt arrives                                         │
│     POST /api/chat  { "prompt": "make a table with 4 legs" }   │
│                              │                                  │
│  2. Workers AI generates code                                   │
│     ┌────────────────────────▼─────────────────────────┐        │
│     │  Workers AI (Llama 3 / Mistral)                  │        │
│     │  System prompt includes runtime SDK type string  │        │
│     │  Output: TypeScript code against truck.cad.*     │        │
│     └────────────────────────┬─────────────────────────┘        │
│                              │                                  │
│  3. Worker executes code against HEADLESS WASM                  │
│     ┌────────────────────────▼─────────────────────────┐        │
│     │  truck-webgpu-gui (--no-default-features)        │        │
│     │  SAME execute() as browser — no bridging layer   │        │
│     │  • add_cube(), boolean_union(), etc. — all work  │        │
│     │  • Automerge snapshot → execute → commit/rollback│        │
│     │  • Each call appends to TransactionRecord        │        │
│     └────────────────────────┬─────────────────────────┘        │
│                              │                                  │
│  4. Commit or rollback                                          │
│     Success → Automerge doc saved to Durable Objects            │
│     Failure → Rollback, return error + partial log              │
│                              │                                  │
│  5. Return TransactionRecord to caller                          │
└──────────────────────────────┼──────────────────────────────────┘
                               │
        ┌──────────────────────┴──────────────────────────┐
        │ LATER: Browser connects                         │
        │  6. Automerge CRDT sync (Browser ←→ DO)        │
        │  7. reconcile() → WebGPU renders                │
        │  8. User sees the table with 4 legs             │
        └─────────────────────────────────────────────────┘
```

Steps 1–5: zero GPU, zero browser, same Rust code as browser. Steps 6–8: lazy rendering on connect.

#### Stage 1 vs Stage 2

| | Stage 1 (Browser) | Stage 2 (Headless) |
|---|---|---|
| WASM crate | truck-webgpu-gui (full) | truck-webgpu-gui (**--no-default-features**) |
| Command dispatch | `execute()` | **Same** `execute()` |
| Rendering | Immediate (Rust WebGPU) | Lazy (on browser connect) |
| State | Browser Automerge (in-memory) | **Durable Objects** |
| Browser required? | **Yes** | **No** |
| Same SDK? | Yes | Yes |
| Same TransactionRecord? | Yes | Yes |
| SDK bridging needed? | No | **No** |

#### Tier Selection

```typescript
if (hasActiveSSESession()) {
  return executeViaBrowser(code);  // Stage 1: live rendering
} else {
  return executeInWorker(code);    // Stage 2: headless, same execute()
}
```

---

## DRY Analysis

| Layer | Browser | Worker | DRY? |
|-------|---------|--------|------|
| **Rust source** | `crates/truck-webgpu-gui/` | Same crate, feature-flagged | **Yes** — one source |
| **Command dispatch** | `execute()` | Same `execute()` | **Yes** — one implementation |
| **Schema** | `cad-schema.json` (from Rust types) | Same file | **Yes** — generated from same types |
| **WASM binary** | Full build (~3 MB) | Headless build (smaller) | Two binaries, same source |
| **JS glue** | `truck-wasm.ts` init pattern | Same pattern | **Yes** |

The only non-DRY artifact is two WASM binaries compiled from the same source. This is inherent to having two deployment targets (browser vs Worker). The source code, API surface, command dispatch, and schema are all shared.

## Mitigating System Instability

1.  **The "Undo-by-Default" Transaction**: No geometry committed unless the script completes 100% successfully.
2.  **Schema-Driven Stability**: SDK generated from Rust source at runtime. Prevents AI from calling deprecated functions.
3.  **Perfect Reproducibility**: Every `execute()` produces a `TransactionRecord` — a perfect "repro script" for debugging Rust panics.
4.  **Isolation**: Stage 1 — browser sandbox. Stage 2 — Worker isolate (per-request). Neither crashes the server or other users.
5.  **Identical behavior**: Both tiers run the same `execute()` — if it works in browser, it works headless.

## Consequences

### Benefits
*   **Phase 0 validated**: WASM runs in Workers. Bundle fits free plan (2.6 MB). Sub-millisecond warm latency.
*   **True DRY**: One Rust crate, feature-flagged. No SDK bridging layer. No command dispatch duplication.
*   **Atomic Transactions**: All-or-nothing execution. No partial geometry corruption.
*   **Isomorphic Interface**: `cad_execute`, SDK, and `TransactionRecord` identical across tiers.
*   **Context Efficiency**: One `execute` tool + SDK replaces 29 tool schemas.
*   **Cloudflare-Native AI** (Stage 2): Workers AI as autonomous agent — no external infrastructure.
*   **Full feature parity**: Headless build has BIM, sketching, assembly, scene management — everything the browser has.

### Challenges
*   **Browser Required** (Stage 1): No browser, no execution. Primary motivation for Stage 2.
*   **Feature-flagging Rust code** (Phase 0.5): Requires careful `#[cfg]` gating of rendering code in truck-webgpu-gui. Moderate Rust refactoring effort.
*   **Headless WASM size**: Unknown until built. May be larger or smaller than truck-js (1.9 MB) depending on how much non-rendering code (BIM, sketching) adds.
*   **Durable Objects** (Stage 2): Real infrastructure work for server-side Automerge persistence.
*   **Async Sandboxing**: `AsyncFunction` requires careful scope isolation in both tiers.

## Out of Scope (Future ADRs)

*   **Macro Editor GUI**: A Lit component for writing, saving, and running scripts.
*   **Multi-model document support**: `modelId` deferred until multi-document support exists.

## Implementation Plan

| Phase | Deliverable | Effort | Dependencies |
|-------|-------------|--------|--------------|
| **0** | **WASM-in-Worker feasibility (truck-js)** | **Done** | **PASSED — PR #2** |
| **0.5** | **Feature-flag truck-webgpu-gui, build headless WASM, deploy to Worker** | **Done** | **PASSED** |
| 1a | `cad_execute` tool with runtime SDK generation + `TransactionRecord` | Small | Existing `buildMcpTools` |
| 1b | Browser-side sandbox + transaction context via SSE | Medium | Phase 1a |
| 1c | Security (timeout, rate limit, sandbox) | Small | Phase 1b |
| 1d | AI Chat via Workers AI + Datastar GUI (browser-connected) | Medium | Phase 1b |
| 2a | Durable Objects: Automerge persistence server-side | Medium | Independent |
| 2b | Headless `cad_execute` with tier selection | Small | Phase 0.5 + 2a |
| 2c | Workers AI autonomous agent (`/api/chat` headless) | Medium | 2b |
| 2d | Shared test suite: both tiers produce identical `TransactionRecord` | Small | 2b |

Note: Stage 2a (SDK bridging layer) from the previous version of this ADR is **eliminated**. The headless build uses the same `execute()` dispatch — no bridging needed.

## References & External Context

### External
*   [Cloudflare: Code Mode — Give agents an entire API in 1,000 tokens](https://blog.cloudflare.com/code-mode-mcp/) — Primary inspiration.
*   [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) — Protocol standard.
*   [Cloudflare Workers: WASM Bindings](https://developers.cloudflare.com/workers/runtime-apis/webassembly/) — WASM in Workers.
*   [Cloudflare Workers: Limits](https://developers.cloudflare.com/workers/platform/limits/) — 3 MB free / 10 MB paid.
*   [Automerge](https://automerge.org/) — CRDT for state and transactions.
*   [Datastar](https://data-star.dev/) — Hypermedia framework for reactive GUI.

### Internal ADRs
*   [ADR-010: MCP & OpenAPI Stack](./done/0010-mcp-openapi-stack.md) — Granular tool implementation this extends.
*   [ADR-003: Automerge Collaboration](./done/0003-automerge-collaboration.md) — State management and transaction model.
*   [ADR-005: Schema-Driven Unified API](./done/0005-schema-driven-unified-api.md) — Rust → JSON schema pipeline.
*   [ADR-013: Lit + Three.js Integration](./0013-lit-threejs.md) — Passive WASM, JS-owned camera.


EXTRA !! 

I REALLY THINK YOU NEED to git clone  https://github.com/cloudflare/mcp its a reference for what we are doing ? 


truck_webgpu_gui_bg.js is huge . is this generated ? i hope so .. 