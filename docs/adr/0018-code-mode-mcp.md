# [ADR-018] Code Mode MCP — Schema-Driven Script Execution

We will adopt the "Code Mode" pattern for our Model Context Protocol (MCP) implementation, adding two tools — `cad_search` (schema discovery) and `cad_execute` (code execution) — alongside our existing granular tools. The agent searches for commands on demand, then writes TypeScript code against a dynamically generated SDK, with transactional commit/rollback semantics via Automerge. Execution works in two tiers — **interactive** (browser via SSE) and **headless** (feature-flagged WASM in Worker) — sharing the same Rust crate. This follows the same 2-tool pattern as the [Cloudflare MCP reference implementation](https://github.com/cloudflare/mcp) (`.src/cloudflare-mcp/`).

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

1. **Context consumption**: Listing 29 tool schemas consumes significant agent context window (~3,100 tokens for our full schema). Cloudflare's "Code Mode" pattern shows that 2 tools (`search` + `execute`) can replace thousands of tool schemas — their 2,594 endpoints become ~1,069 tokens.
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

The code-mode tools (`cad_search` + `cad_execute`) are **power tools** that coexist with granular tools. Agents choose based on task complexity.

## Decision: Technical Specification

---

### Stage 1: Browser-Connected Code Mode

This stage delivers the core `cad_execute` capability using only existing infrastructure. Requires a browser with the GUI open.

#### 1a. Two Tools: `cad_search` + `cad_execute`

We will extend `buildMcpTools()` in the Hono Worker to add two code-mode tools, following the same pattern as the [Cloudflare MCP reference](https://github.com/cloudflare/mcp).

**Why two tools, not one?**

The full schema is ~3,100 tokens today (34 commands with nested param types). As we add features (assembly constraints, annotation layers, parametric history), the schema grows. More critically, the headless WASM itself may need to be **modular** — not every deployment needs every feature:

```toml
# Current feature flags in Cargo.toml
[features]
default = ["rendering", "mvt"]
rendering = [...]   # GPU deps — browser only
mvt = [...]         # Map Vector Tiles (geozero, prost)
gltf = [...]        # glTF import/export
# Future:
# ifc = [...]       # BIM/IFC (ifc-lite) — currently always compiled
# sketch = [...]    # 2D parametric sketching (kcl-ezpz)
```

Each Rust feature flag adds commands AND WASM size. The headless WASM is 2.5 MB today — at the 3 MB free limit. As modules are added, we need to choose which features to compile into the Worker build. The `cad_search` tool lets agents discover **what's available in this deployment** without the full schema being inlined.

**`cad_search` — Schema Discovery:**
```typescript
{
  name: "cad_search",
  description: `Search the CAD command schema. Use this to find commands, read param types, and check what's available.

Categories: ${categories.join(', ')}

Types:
${SCHEMA_TYPES}

Examples:
// Find all boolean commands
async () => {
  return Object.entries(schema.commands)
    .filter(([_, cmd]) => cmd.description.includes('boolean'))
    .map(([name, cmd]) => ({ name, description: cmd.description }));
}

// Get full param schema for a command
async () => schema.commands.add_cylinder`,
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'JS async arrow function to search the schema' }
    },
    required: ['code']
  }
}
```

**`cad_execute` — Code Execution:**
```typescript
{
  name: "cad_execute",
  description: `Execute JavaScript code against the CAD engine. Use 'cad_search' first to find the right commands.

Available API:
${generatedSDKTypes}`,
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'JS async arrow function to execute' }
    },
    required: ['code']
  }
}
```

**`TransactionRecord`**: Formalized return object capturing input code, command sequence, timing, and success/failure. The "flight recorder" for debugging and macro recording.

**Token budget comparison:**

| Approach | Tools | Tokens |
|----------|-------|--------|
| Current granular MCP (29 tools) | 29 | ~3,100 |
| Code Mode (2 tools + SDK types) | 2 | ~500 |
| Cloudflare reference (2,594 endpoints) | 2 | ~1,069 |

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
*   **Isomorphic Interface**: `cad_search`, `cad_execute`, SDK, and `TransactionRecord` identical across tiers.
*   **Context Efficiency**: Two code-mode tools (~500 tokens) replace 29 granular tool schemas (~3,100 tokens).
*   **Cloudflare-Native AI** (Stage 2): Workers AI as autonomous agent — no external infrastructure.
*   **Full feature parity**: Headless build has BIM, sketching, assembly, scene management — everything the browser has.

### Challenges
*   **Browser Required** (Stage 1): No browser, no execution. Primary motivation for Stage 2.
*   **Feature-flagging Rust code** (Phase 0.5): Requires careful `#[cfg]` gating of rendering code in truck-webgpu-gui. Moderate Rust refactoring effort.
*   **Headless WASM size**: Currently 2.5 MB — near the 3 MB free limit. As features grow (IFC, glTF, sketching), feature flags must gate heavy deps to keep headless builds lean. The `cad_search` tool mitigates this by letting agents discover what's available in a given deployment.
*   **Durable Objects** (Stage 2): Real infrastructure work for server-side Automerge persistence.
*   **Async Sandboxing**: `AsyncFunction` requires careful scope isolation in both tiers.

## WASM Modularity & Multi-Module Composition

### The Insight: MCP IS the Module Boundary

The same composition pattern works at every level of the stack. Multiple WASM modules in the browser compose through the same `execute(cmd, params_json) → result_json` interface that MCP tools use. MCP flows down into whichever module handles the command. This unifies ADR-0016 (WebMCP in browser) and ADR-0018 (Server MCP in Worker) into a single architecture:

```
┌──────────────────────────────────────────────────────────┐
│  AGENTS (Claude, Gemini, Browser AI via navigator.       │
│          modelContext — ADR-0016)                         │
│  See: cad_search + cad_execute                           │
└────────────────────┬─────────────────────────────────────┘
                     │ MCP (JSON-RPC)
┌────────────────────▼─────────────────────────────────────┐
│  ROUTER (Worker OR Browser Hono — same code)             │
│  • Discovers which modules are loaded                    │
│  • Merges schemas for cad_search                         │
│  • Dispatches execute() to the right module              │
│  • Owns the scene graph (Automerge) — shared state       │
├──────────┬──────────┬──────────┬─────────────────────────┤
│ geometry │   bim    │  sketch  │   export                │
│  .wasm   │  .wasm   │  .wasm   │   .wasm                │
│ (truck)  │ (ifc)    │ (ezpz)  │  (gltf/mvt/step/stl)   │
│          │          │          │                         │
│ execute( │ execute( │ execute( │ execute(                │
│  "add_   │  "import │  "sketch │  "export_              │
│   cube") │   _ifc") │   _add") │   gltf")               │
└──────────┴──────────┴──────────┴─────────────────────────┘
  Each module: own .wasm, own schema, same execute() interface
```

**Key principle**: Objects are referenced by **UUID**, not memory pointers. Module A creates `object abc-123`. Module B can operate on `abc-123` by UUID. The scene graph (Automerge) is the shared state — not raw WASM linear memory. This avoids the fragile shared-memory approach and works identically in browser and Worker.

### Module Interface Contract

Every module exposes the same interface (extending ADR-0006's `execute()` pattern):

```rust
#[wasm_bindgen]
pub fn execute(cmd_type: &str, params_json: &str) -> String;

#[wasm_bindgen]
pub fn schema() -> String;  // Returns JSON schema for this module's commands
```

The router:
1. Loads each module's `.wasm` + glue
2. Calls `schema()` on each → merges into combined schema
3. On `cad_search`: agent queries the combined schema
4. On `cad_execute`: router parses the command name, dispatches to the module that owns it

### How Modules Share Data

| Data Type | Sharing Mechanism | Example |
|-----------|-------------------|---------|
| Object identity | UUID strings | "translate object `abc-123`" |
| Scene state | Automerge CRDT (owned by router) | Object list, metadata, transforms |
| Solid geometry | Serialized at module boundary (JSON/binary) | BIM module creates solid → serialized → geometry module imports it |
| Mesh data | Export format (OBJ/STL/glTF bytes) | Geometry module tessellates → export module converts |

This is **not** zero-copy — data crosses module boundaries via serialization. But our operations are coarse (one `execute()` per user action), so the serialization cost is negligible compared to the geometry computation itself.

### Module Registry

| Module | Crate | Commands | Deps |
|--------|-------|----------|------|
| **Core geometry** | `truck-webgpu-gui` | add_cube, boolean_union, translate, etc. | truck-modeling, truck-shapeops |
| **Rendering** | `truck-webgpu-gui` (rendering feature) | set_camera, select_at, pick_at | wgpu, winit (browser only) |
| **IFC/BIM** | `cad-bim` (planned) | import_ifc, get_bim_metadata, set_bim_metadata | ifc-lite |
| **Sketching** | `cad-sketch` (planned) | sketch_add_point, sketch_extrude, sketch_solve | kcl-ezpz |
| **Export** | `cad-export` (planned) | export_gltf, export_step, export_stl, export_mvt | gltf, geozero, truck-stepio |

### CF Workers: RPC as the Module Bus

On Cloudflare, modules don't live inside one Worker — each module **is its own Worker**, communicating via **Workers RPC** (Service Bindings). This is the same pattern the [Cloudflare MCP reference](https://github.com/cloudflare/mcp) uses for code execution (`WorkerEntrypoint` + `env.LOADER`).

**Each module Worker wraps a WASM binary and exposes RPC methods:**

```typescript
// cad-geometry-worker/src/index.ts
import { WorkerEntrypoint } from "cloudflare:workers";
import { initGeometryWasm } from "./wasm-loader";

export class GeometryModule extends WorkerEntrypoint {
  async execute(cmd: string, params: string): Promise<string> {
    const wasm = await initGeometryWasm();
    const ctrl = new wasm.HeadlessController();
    return ctrl.execute(cmd, params);
  }
  async schema(): Promise<string> {
    const wasm = await initGeometryWasm();
    return wasm.schema();
  }
}
```

**The router Worker calls modules via RPC — zero network overhead, same thread:**

```typescript
// truck-cad (router Worker) — wrangler.toml
// [[services]]
// binding = "GEOMETRY"
// service = "cad-geometry"
//
// [[services]]
// binding = "BIM"
// service = "cad-bim"

// In router code:
async function dispatchCommand(env: Env, cmd: string, params: string) {
  const module = commandToModule(cmd);  // "add_cube" → GEOMETRY, "import_ifc" → BIM
  switch (module) {
    case 'geometry': return await env.GEOMETRY.execute(cmd, params);
    case 'bim':      return await env.BIM.execute(cmd, params);
    case 'sketch':   return await env.SKETCH.execute(cmd, params);
    case 'export':   return await env.EXPORT.execute(cmd, params);
  }
}

// Discovery: merge schemas from all bound modules
async function buildCombinedSchema(env: Env) {
  const schemas = await Promise.all([
    env.GEOMETRY.schema(),
    env.BIM.schema(),
    env.SKETCH.schema(),
    env.EXPORT.schema(),
  ]);
  return mergeSchemas(schemas);  // cad_search queries this
}
```

**Why this works perfectly:**

| Property | Workers RPC | Our `execute()` interface |
|----------|-------------|--------------------------|
| Call style | `await env.MODULE.method(args)` | `execute(cmd, params_json) → result_json` |
| Overhead | Zero — same thread, same colo | Same — direct function call |
| Size budget | Each Worker gets 10 MB (paid) | Each module has its own budget |
| Deployment | Independent — deploy geometry without touching BIM | Independent crates |
| Discovery | Router checks which bindings exist | `schema()` on each module |
| Isolation | Separate V8 isolates | Module crash doesn't kill router |

**This is the same architecture as the Cloudflare MCP reference** — they use `env.LOADER.get()` to dynamically create Workers that run LLM-generated code. We use static Service Bindings to connect module Workers. Same pattern, same RPC.

### Browser: JS Linker as the Module Bus

In the browser, there's no Service Bindings — but there's also no size limit. Each module is a separate `.wasm` file loaded by a JS router:

```typescript
// Browser module router (in Hono, per ADR-0016)
const modules = new Map<string, WasmModule>();

async function loadModule(name: string, wasmUrl: string) {
  const mod = await WebAssembly.instantiate(await fetch(wasmUrl), glueImports);
  const schema = JSON.parse(mod.schema());
  modules.set(name, { instance: mod, schema, commands: Object.keys(schema.commands) });
}

// Same dispatch as Worker — MCP flows into whichever module owns the command
async function dispatchCommand(cmd: string, params: string): Promise<string> {
  for (const [name, mod] of modules) {
    if (mod.commands.includes(cmd)) return mod.instance.execute(cmd, params);
  }
  throw new Error(`Unknown command: ${cmd}`);
}
```

**Same architecture, different bus:**

| | Browser | CF Worker |
|---|---|---|
| Module bus | JS linker (`WebAssembly.instantiate` per module) | CF Workers RPC (Service Bindings) |
| Size budget | Unlimited | 10 MB per module Worker |
| Discovery | `schema()` on each module | `schema()` via RPC on each binding |
| Shared state | Automerge in memory | Automerge in Durable Objects |
| MCP entry | `navigator.modelContext` (ADR-0016) | Server MCP `/mcp` endpoint |
| Dispatch | Same `execute(cmd, params)` | Same `execute(cmd, params)` |

### Connection to ADR-0016 (WebMCP)

ADR-0016 registers MCP tools from the OpenAPI spec into `navigator.modelContext`. With multi-module WASM, each module contributes its commands to the schema. The WebMCP adapter auto-registers all of them — zero maintenance when a new module is added:

```
Browser AI agent → navigator.modelContext → Hono router → geometry.wasm
                                                         → bim.wasm
                                                         → sketch.wasm
```

Server MCP agent → /mcp JSON-RPC → Router Worker → env.GEOMETRY.execute()
                                                  → env.BIM.execute()
                                                  → env.SKETCH.execute()

**Same modules, same schema, same dispatch. Different bus (JS linker vs CF RPC). Different MCP transport (WebMCP vs Server MCP).**

### Scaling Path

| Phase | Browser | Worker | Composition |
|-------|---------|--------|-------------|
| **Now** | One monolith WASM | One headless WASM (feature-flagged) | Direct `execute()` call |
| **Next** | Separate `.wasm` per module | Separate Workers per module | JS linker / CF Workers RPC |
| **Future** | WASM Component Model (WIT) | Same, or CF-native component support | Typed boundaries replace JSON |

### WASM Component Model (Future)

The WASM Component Model (WIT interfaces, `cargo-component`, `jco`) is the "right" long-term solution but is **not yet ready** for browsers or CF Workers (early 2026). Our `execute()` + JSON approach is the practical bridge — same architecture, same module boundaries, upgradeable to WIT when it lands.

### GUI Refactoring: Prerequisite for Multi-Module (Stage 3)

See **[ADR-0019: GUI Unification](0019-gui-unification.md)** for the full plan. In summary: the browser GUI currently mixes 4 WASM access patterns. ADR-0019 unifies them around `cadCommand()` as the single dispatch for all mutations, which is required before multi-module WASM can work (Stage 3). ADR-0019 is NOT needed for Stage 1 or Stage 2.

### Action Items

- [ ] Extract IFC commands from headless.rs into `cad-bim` crate with own `execute()` + `schema()`
- [ ] Extract sketch commands into `cad-sketch` crate
- [ ] Extract export commands into `cad-export` crate
- [ ] Build module router in Worker that discovers + dispatches across modules
- [ ] Make `ifc-lite` and `kcl-ezpz` deps belong to their own crates (not truck-webgpu-gui)
- [ ] Measure per-module WASM size
- [ ] Prototype multi-module loading in browser (JS linker pattern)
- [ ] Update ADR-0006 status: "Superseded" → needs revisiting for multi-module
- [ ] GUI refactoring: See [ADR-0019](0019-gui-unification.md) (R1-R6)

## Out of Scope (Future ADRs)

*   **Macro Editor GUI**: A Lit component for writing, saving, and running scripts.
*   **Multi-model document support**: `modelId` deferred until multi-document support exists.

## Implementation Plan

| Phase | Deliverable | Effort | Dependencies |
|-------|-------------|--------|--------------|
| **0** | **WASM-in-Worker feasibility (truck-js)** | **Done** | **PASSED — PR #2** |
| **0.5** | **Feature-flag truck-webgpu-gui, build headless WASM, deploy to Worker** | **Done** | **PASSED** |
| 1a | `cad_search` + `cad_execute` tools with runtime SDK generation + `TransactionRecord` | Small | Existing `buildMcpTools` |
| 1b | Browser-side sandbox + transaction context via SSE | Medium | Phase 1a |
| 1c | Security (timeout, rate limit, sandbox) | Small | Phase 1b |
| 1d | AI Chat via Workers AI + Datastar GUI (browser-connected) | Medium | Phase 1b |
| 2a | Durable Objects: Automerge persistence server-side | Medium | Independent |
| 2b | Headless `cad_execute` with tier selection | Small | Phase 0.5 + 2a |
| 2c | Workers AI autonomous agent (`/api/chat` headless) | Medium | 2b |
| 2d | Shared test suite: both tiers produce identical `TransactionRecord` | Small | 2b |
| **3-pre** | **GUI unification ([ADR-0019](0019-gui-unification.md))** | Small | Independent |
| **3a** | **Extract IFC/BIM into `cad-bim` crate with own `execute()` + `schema()`** | Medium | Phase 0.5 |
| **3b** | **Extract sketch into `cad-sketch` crate** | Medium | 3-pre, Phase 0.5 |
| **3c** | **Extract export (glTF/MVT/STEP/STL) into `cad-export` crate** | Medium | 3-pre, Phase 0.5 |
| **3d** | **Module router: JS linker (browser) + CF Workers RPC (server)** | Medium | 3a-3c |
| **3e** | **Service Bindings: each module as its own CF Worker** | Small | 3d |

Note: Stage 2a (SDK bridging layer) from the previous version of this ADR is **eliminated**. The headless build uses the same `execute()` dispatch — no bridging needed.

**Stage 3** (WASM Modularity) can proceed in parallel with Stage 2. The module interface (`execute()` + `schema()`) is already proven. The work is extracting commands into separate crates and wiring the router.

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
*   [ADR-019: GUI Unification](./0019-gui-unification.md) — Single dispatch, single pattern. Prerequisite for Stage 3.


### Cloudflare MCP Reference Implementation

Cloned to `.src/cloudflare-mcp/` for study. Key patterns validated against our design:

| Cloudflare Pattern | Our ADR-0018 Equivalent | Notes |
|---|---|---|
| 2 tools: `search` + `execute` | 2 tools: `cad_search` + `cad_execute` | Same pattern — schema discovery + code execution. Needed because WASM modules are feature-flagged; agents must discover what's available |
| LLM writes JS code against `cloudflare.request()` | LLM writes JS code against `cad.addCube()`, etc. | Same code-mode concept |
| TypeScript interfaces as string literals in tool description | Runtime SDK type string generated from `cadSchema` | Same approach — types in description, not per-tool schemas |
| Worker Loader sandbox (isolated Worker per call) | Worker isolate sandbox (Stage 2) | We use same CF Workers isolation |
| Stateless — Cloudflare API is source of truth | Stateful — HeadlessController holds scene state | Key difference: we need rollback, they don't |
| No transaction/rollback | TransactionRecord + Automerge snapshots | Our mutable geometry state requires undo semantics |
| 2,594 endpoints → 2 tools (~1,069 tokens) | 29 tools → 2 tools (~500 tokens) | Same token reduction pattern |
| Dynamic glue import collection | Same pattern in `truck-wasm.ts` | Validated: iterate `Object.entries(bg)`, collect functions |
| `GlobalOutbound` restricts fetch to single domain | No outbound fetch needed — WASM runs locally | Simpler security model for us |
| OAuth token via Worker props (never in user code) | N/A — no user auth yet | Could adopt for multi-tenant |
| Response truncation (6k tokens) | Not yet implemented | Should adopt |
