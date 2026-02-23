# [ADR-018] Code Mode MCP — Schema-Driven Script Execution

We will adopt the "Code Mode" pattern for our Model Context Protocol (MCP) implementation, adding a single `cad_execute` tool that accepts TypeScript code alongside our existing granular tools. The code runs against a dynamically generated SDK, with transactional commit/rollback semantics via Automerge. Execution works in two tiers — **interactive** (browser via SSE) and **headless** (truck-js WASM in Worker) — sharing the same geometry engine.

## Status

**Proposed**

## Phase 0: Feasibility Gate (Do This First)

Before committing to any implementation, we validate that the truck-js WASM module loads and runs inside a Cloudflare Worker. This is a **tiny test** that answers the go/no-go question for headless execution.

### The Test

Add one import and one endpoint to the existing Worker:

```typescript
// systems/truck/worker/src/index.ts
import * as truck from '../pkg/truck_js.js';

app.get('/api/test-wasm', (c) => {
  const start = Date.now();
  const v = truck.vertex(0, 0, 0);
  const e = truck.tsweep(v.upcast(), [1.0, 0.0, 0.0]);
  const f = truck.tsweep(e, [0.0, 1.0, 0.0]);
  const solid = truck.tsweep(f, [0.0, 0.0, 1.0]);
  const polygon = solid.to_polygon(0.01);
  const buffer = polygon.to_buffer();
  return c.json({
    ok: true,
    vertices: buffer.vertex_buffer().length,
    indices: buffer.index_buffer().length,
    ms: Date.now() - start
  });
});
```

### What We Measure

| Question | How | Pass Criteria |
|----------|-----|---------------|
| Does it deploy? | `wrangler deploy` | No bundle size errors |
| Bundle size? | Check wrangler output | Under 10 MB (paid plan) |
| Cold-start latency? | First request timing | Under 500ms |
| Warm request latency? | Subsequent request timing | Under 50ms |
| Does geometry work? | Vertex count > 0 | Returns valid mesh data |
| Does `wasm-bindgen` work in Workers? | No runtime errors | `truck.vertex()` succeeds |

### How We Surface It

- **MCP**: Add `cad_wasm_health` tool that returns the same data — agents can verify headless is working.
- **GUI**: Health badge in the header showing "Headless: OK" or "Headless: Unavailable."
- **CI**: Playwright test that hits `/api/test-wasm` and asserts valid geometry output.

### Outcomes

- **Pass**: Proceed with Stage 2 (headless execution). We know truck-js runs in Workers.
- **Fail (size)**: Need `wasm-opt -Oz` or paid plan. Retry after optimization.
- **Fail (runtime)**: `wasm-bindgen --target bundler` may not be compatible with Workers. Try `--target nodejs` or manual WASM instantiation.

---

## Context

Our current MCP implementation exposes 29 granular tools (ADR-010). This works well for simple operations but has three limitations:

1. **Context consumption**: Listing 29 tool schemas consumes significant agent context window. Cloudflare's "Code Mode" pattern shows that a single `execute` tool + a typed SDK can represent an entire API in ~1,000 tokens.
2. **No atomicity**: If an agent calls 5 tools sequentially and tool #3 fails, the scene is left in a partial state. There is no way to roll back.
3. **No composability**: Agents cannot express conditional logic, loops, or variables across tool calls. Each call is independent.

### The truck-js Discovery

The Rust codebase contains **two separate WASM crates** that share the same geometry engine:

| Crate | Purpose | GPU? | Location | Status |
|-------|---------|------|----------|--------|
| **truck-js** | Headless geometry kernel | **No** | `.src/truck/truck-js/` | Compiled to `worker/pkg/` (1.9 MB) |
| **truck-webgpu-gui** | Browser renderer + SceneController | **Yes** | `crates/truck-webgpu-gui/` | Running in browser |

Both depend on the same underlying Rust libraries (`truck-modeling`, `truck-shapeops`, `truck-meshalgo`, `truck-stepio`). The geometry math is written once — **DRY at the Rust level**.

**truck-js** is the truck author's intended JavaScript API. It exports:
- Primitives: `vertex()`, `line()`, `circle_arc()`, `bezier()`
- Sweeps: `tsweep()`, `rsweep()` (extrude, revolve)
- Transforms: `translated()`, `rotated()`, `scaled()`
- Booleans: `and()`, `or()`, `not()`
- Mesh: `solid.to_polygon()`, `mesh.to_buffer()`, `mesh.to_obj()`, `mesh.to_stl()`
- STEP I/O: `Table.from_step()`, `solid.to_step()`
- Serialization: `Solid.to_json()`, `Solid.from_json()`

**truck-js has zero GPU dependencies.** Its `Cargo.toml` contains no `wgpu`, `winit`, `web-sys`, or rendering crates. It is already compiled and sitting in `systems/truck/worker/pkg/` — just not imported.

### Current Architecture Reality

| Capability | Status | Notes |
|------------|--------|-------|
| WASM kernel in browser | **Working** | `truck-webgpu-gui`: geometry + WebGPU rendering |
| Headless WASM kernel | **Compiled, not wired** | `truck-js`: pure geometry, in `worker/pkg/` |
| Worker (Hono/Zod) | **Working** | Stateless proxy, SSE command relay, 29 MCP tools |
| MCP bridge | **Working** | stdio ↔ HTTP proxy with retry + hot-reload |
| truck-js imported in Worker | **Not started** | WASM sits in `worker/pkg/`, not imported |
| Server-side state (Durable Objects) | **Not started** | Automerge state lives in browser only |
| Workers AI integration | **Not started** | No `/api/chat` route, no model calls |

### Relationship to ADR-0013 (Passive WASM)

ADR-0013 made WASM passive: JS/Lit owns the camera, Rust just renders what it's told. But **rendering still happens in Rust WebGPU** (truck-rendimpl PBR shaders). Three.js is only used for camera controls.

A future ADR could complete ADR-0013's trajectory by replacing truck-webgpu-gui's rendering with truck-js geometry + Three.js/WebGPU rendering in JS. This would give true "truck-js everywhere" — one WASM module for both browser and Worker. But that is a **major rendering rebuild** beyond Code Mode's scope. ADR-0018 does not require it.

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

### Stage 2: Headless Execution (truck-js WASM in Worker)

Stage 2 enables the Worker to execute CAD code **without a browser**. Workers AI becomes an autonomous agent — generates code, executes it, persists results. The browser is a lazy renderer that catches up on connect.

**Gated by Phase 0 feasibility test.** If truck-js WASM can't run in Workers, Stage 2 needs a different approach.

#### What Already Exists

The headless WASM is compiled and sitting in the Worker directory:

```
systems/truck/worker/pkg/
├── truck_js.js           # ES module wrapper
├── truck_js.d.ts         # TypeScript definitions (full API)
├── truck_js_bg.js        # Bindings glue
└── truck_js_bg.wasm      # Headless geometry kernel (1.9 MB, zero GPU)
```

#### Prerequisites

**1. WASM-in-Worker validation** (Phase 0 — described above)

*   Bundle size: 1.9 MB WASM + JS bundle. Free plan (3 MB) likely too small. **Paid plan (10 MB) required.**
*   Adding `wasm-opt -Oz` could reduce the 1.9 MB significantly (not currently in the build).
*   Cold-start and `wasm-bindgen` runtime compatibility must be measured.

**2. Server-side state (Durable Objects)**

*   Automerge documents persisted in Durable Objects or R2.
*   Worker loads, modifies, saves Automerge docs without a browser.
*   Browser syncs from server-side state on connect — same CRDT mechanism as cross-tab sync (ADR-003).

**3. SDK bridging layer**

truck-js exposes low-level primitives (`vertex`, `tsweep`, `and`), while the schema SDK uses higher-level commands (`add_cube`, `boolean_union`). A TypeScript mapping layer in the Worker bridges between them. This is small, JS-only work.

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
│  3. Worker executes code against truck-js WASM                  │
│     ┌────────────────────────▼─────────────────────────┐        │
│     │  truck-js WASM (pure geometry, no GPU)           │        │
│     │  • Snapshot Automerge doc from Durable Objects   │        │
│     │  • truck.cad.add_cube() → truck-js calls         │        │
│     │  • truck.cad.boolean_union() → truck.and()       │        │
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
        │  7. reconcile() → Three.js/WebGPU renders       │
        │  8. User sees the table with 4 legs             │
        └─────────────────────────────────────────────────┘
```

Steps 1–5: zero GPU, zero browser. Steps 6–8: lazy, whenever a human opens the GUI.

#### Stage 1 vs Stage 2

| | Stage 1 (Browser) | Stage 2 (Headless) |
|---|---|---|
| Geometry WASM | truck-webgpu-gui | **truck-js** |
| Rendering | Immediate (Rust WebGPU) | Lazy (on browser connect) |
| State | Browser Automerge (in-memory) | **Durable Objects** |
| Browser required? | **Yes** | **No** |
| Same SDK? | Yes | Yes |
| Same TransactionRecord? | Yes | Yes |

#### Tier Selection

```typescript
if (hasActiveSSESession()) {
  return executeViaBrowser(code);  // Stage 1: live rendering
} else {
  return executeInWorker(code);    // Stage 2: headless via truck-js
}
```

---

## Smart Modularity: Construction vs. Rendering

The Rust codebase enforces separation at the **crate level**:

1.  **truck-js** (Construction): Pure math. `truck-modeling`, `truck-shapeops`, `truck-meshalgo`. Compiles to WASM without GPU. Runs in browser or Worker.
2.  **truck-webgpu-gui** (Construction + Rendering): Uses the same geometry libraries plus `truck-platform` + `truck-rendimpl` for WebGPU PBR rendering. Browser-only.
3.  **Shared libraries**: Both crates call `truck_modeling::builder::*` directly. The geometry math is written once.

### Future: truck-js Everywhere (Beyond ADR-0018)

ADR-0013 made WASM passive (JS owns the camera). The logical conclusion is to move rendering to JS entirely — use truck-js for geometry everywhere, Three.js/WebGPU in JS for rendering. This would give one WASM module for both browser and Worker, completing the DRY vision. But it requires rebuilding the rendering pipeline (PBR materials, depth buffer sharing with MVT/glTF layers) and is a separate ADR.

## Mitigating System Instability

1.  **The "Undo-by-Default" Transaction**: No geometry committed unless the script completes 100% successfully.
2.  **Schema-Driven Stability**: SDK generated from Rust source at runtime. Prevents AI from calling deprecated functions.
3.  **Perfect Reproducibility**: Every `execute()` produces a `TransactionRecord` — a perfect "repro script" for debugging Rust panics.
4.  **Isolation**: Stage 1 — browser sandbox. Stage 2 — Worker isolate (per-request). Neither crashes the server or other users.

## Consequences

### Benefits
*   **Phase 0 validates fast**: One endpoint, one deploy, immediate go/no-go for headless.
*   **DRY geometry**: Both tiers use the same Rust geometry libraries (via different WASM crates).
*   **Atomic Transactions**: All-or-nothing execution. No partial geometry corruption.
*   **Isomorphic Interface**: `cad_execute`, SDK, and `TransactionRecord` identical across tiers.
*   **Context Efficiency**: One `execute` tool + SDK replaces 29 tool schemas.
*   **Cloudflare-Native AI** (Stage 2): Workers AI as autonomous agent — no external infrastructure.

### Challenges
*   **Browser Required** (Stage 1): No browser, no execution. Primary motivation for Stage 2.
*   **Worker bundle size** (Stage 2): 1.9 MB WASM + JS. Paid plan likely required.
*   **Cold-start latency** (Stage 2): Must be measured in Phase 0.
*   **SDK bridging** (Stage 2): truck-js low-level API (`vertex`, `tsweep`) vs schema-level API (`add_cube`). TypeScript mapping needed.
*   **Durable Objects** (Stage 2): Real infrastructure work for server-side Automerge persistence.
*   **Async Sandboxing**: `AsyncFunction` requires careful scope isolation in both tiers.

## Out of Scope (Future ADRs)

*   **truck-js in browser (replacing truck-webgpu-gui rendering)**: Use truck-js for geometry + Three.js for rendering in browser. Completes ADR-0013 trajectory. Major rendering rebuild.
*   **Macro Editor GUI**: A Lit component for writing, saving, and running scripts.
*   **Multi-model document support**: `modelId` deferred until multi-document support exists.

## Implementation Plan

| Phase | Deliverable | Effort | Dependencies |
|-------|-------------|--------|--------------|
| **0** | **Feasibility gate: import truck-js in Worker, deploy, measure** | **Tiny** | **None — do first** |
| 1a | `cad_execute` tool with runtime SDK generation + `TransactionRecord` | Small | Existing `buildMcpTools` |
| 1b | Browser-side sandbox + transaction context via SSE | Medium | Phase 1a |
| 1c | Security (timeout, rate limit, sandbox) | Small | Phase 1b |
| 1d | AI Chat via Workers AI + Datastar GUI (browser-connected) | Medium | Phase 1b |
| 2a | SDK bridging layer: schema commands → truck-js API | Small | Phase 0 pass |
| 2b | Durable Objects: Automerge persistence server-side | Medium | Independent |
| 2c | Headless `cad_execute` with tier selection | Small | 2a + 2b |
| 2d | Workers AI autonomous agent (`/api/chat` headless) | Medium | 2c |
| 2e | Shared test suite: both tiers produce identical `TransactionRecord` | Small | 2c |

## References & External Context

### External
*   [Cloudflare: Code Mode — Give agents an entire API in 1,000 tokens](https://blog.cloudflare.com/code-mode-mcp/) — Primary inspiration.
*   [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) — Protocol standard.
*   [Cloudflare Workers: WASM Bindings](https://developers.cloudflare.com/workers/runtime-apis/webassembly/) — WASM in Workers (Stage 2).
*   [Cloudflare Workers: Limits](https://developers.cloudflare.com/workers/platform/limits/) — 3 MB free / 10 MB paid.
*   [Automerge](https://automerge.org/) — CRDT for state and transactions.
*   [Datastar](https://data-star.dev/) — Hypermedia framework for reactive GUI.

### Internal ADRs
*   [ADR-010: MCP & OpenAPI Stack](./done/0010-mcp-openapi-stack.md) — Granular tool implementation this extends.
*   [ADR-003: Automerge Collaboration](./done/0003-automerge-collaboration.md) — State management and transaction model.
*   [ADR-005: Schema-Driven Unified API](./done/0005-schema-driven-unified-api.md) — Rust → JSON schema pipeline.
*   [ADR-013: Lit + Three.js Integration](./0013-lit-threejs.md) — Passive WASM, JS-owned camera. Precursor to truck-js-everywhere vision.
