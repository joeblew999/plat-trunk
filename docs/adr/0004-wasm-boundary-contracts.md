# ADR-0004: WASM Boundary Contracts via Schema-Driven Codegen

- **Status:** Phase 0 Implemented
- **Date:** 2026-03-07
- **Supersedes:** None
- **Related:** ADR-0002 (Headless as Core Engine), ADR-0003 (Format Workers)

## Context

plat-trunk compiles Rust crates to WASM for two runtime targets today, with a third target planned:

**Browser** — Two WASM modules loaded on the main thread via `wasm-bindgen --target web`:
- `truck-webgpu-gui` (geometry engine + WebGPU rendering) from `systems/truck/crate`
- `truck-sync` (Automerge CRDT op log) from `systems/sync/crate`

Both run on the main thread — no Web Workers yet. `history-domain.ts` imports directly from `pkg-sync/truck_sync.js`; `boot.ts` imports from `pkg-browser-renderer/truck_webgpu_gui.js`.

**Cloudflare Workers** — The same two WASM modules loaded in a single worker isolate via `WebAssembly.instantiate`:
- `truck-webgpu-gui` (headless, `rendering` feature disabled) with hand-written loader `truck-wasm.ts`
- `truck-sync` with hand-written loader `sync-wasm.ts`

Both use an identical lazy-init pattern but the loader code is duplicated by hand.

**Native Rust** (planned) — desirable for CLI tooling, testing at native speed, desktop apps (Tauri/wgpu), and heavyweight server-side processing (booleans, tessellation, STEP generation) that exceeds edge CPU limits.

The same Truck geometry kernel and Automerge CRDT logic must run on all three targets. Today there are 2 WASM modules × 2 targets = 4 hand-written loader paths. As format workers (IFC, STEP, MVT, glTF) are added, this grows combinatorially.

### Platform constraints that drive splitting

Beyond code organisation, hard platform limits make multi-module splitting a requirement, not a preference:

- **CF Worker CPU time limits.** Free-tier workers get 10ms CPU time per request; paid-tier gets 30ms. Complex boolean operations, large tessellation, and STEP generation routinely exceed these budgets. Splitting stateless format handlers (IFC, STEP, MVT, glTF) into separate workers via CF service bindings gives each handler its own CPU budget — the calling worker's clock stops while waiting for the RPC response.
- **CF Worker cold start.** Larger WASM modules have slower cold starts. Splitting into smaller, focused workers (each well under 3MB) means each worker initialises faster and stays warm independently.
- **CF service binding subrequest isolation.** When worker A calls worker B via a service binding, B gets its own CPU time budget. This is the key mechanism: a 50ms boolean operation that would timeout in a single worker succeeds when the geometry engine delegates to a format worker, because each worker's clock runs independently.
- **Browser Web Workers.** The browser main thread must never block on geometry computation — it owns the render loop and UI events. WASM modules running in Web Workers via `postMessage` keep the main thread responsive. Multiple Web Workers enable parallel computation (e.g. tessellation in one worker while sync runs in another).
- **Native target.** The same crate boundaries that define worker splits also define Cargo workspace members for native compilation. This enables: Rust-level testing at native speed (no WASM compile, full debugger), desktop apps via Tauri/wgpu, mobile deployment via FFI, native MCP servers for heavy compute that exceeds edge CPU limits, and CI validation without browser or miniflare overhead.

### What already works — the existing codegen chain

The current system already solves the "single source of truth" problem for command contracts. Understanding it is essential because ADR-0004 extends this pattern, not replaces it.

**The chain:**

```
Rust #[derive(JsonSchema)] param structs
  → cargo run --bin generate-schema   → cad-schema.json   [committed]
  → scripts/gen-openapi.ts            → openapi.json      [gitignored]
  → openapi-typescript                → api-types.ts       [committed]
```

**How it works:**

1. **Rust structs are the source of truth.** Each command's param struct (e.g. `AddCubeParams`) uses `#[derive(JsonSchema)]` with serde attributes for field names, types, ranges, and defaults. No separate schema file to maintain.

2. **Domain modules are self-describing.** Each domain (`commands/geometry.rs`, `booleans.rs`, `sketch.rs`, `scene.rs`, `style.rs`) owns its param structs AND a `schema_entries()` function returning tuples of `(name, description, params_schema, returns, ephemeral, readonly, domain)`. Adding a new command = add the struct + one tuple entry.

3. **The schema binary is trivial.** `generate_schema.rs` is 3 lines — calls `build_schema()`, prints JSON. No framework, no extra dependencies. Runs natively (not in WASM).

4. **gen-openapi.ts is pure transformation.** Reads `cad-schema.json` statically (no running server needed), iterates commands, emits OpenAPI paths for both `/async/{name}` and `/sync/{name}` routes. The OpenAPI spec is derived, not authored.

5. **The chain is atomic.** `bun run build:truck` = WASM build + schema generation. `bun run build:truck-web` = type generation + Vite build. No manual steps.

**What the chain already feeds:**

| Consumer | How it uses cad-schema.json |
|----------|---------------------------|
| MCP tools (29) | Worker reads schema, exposes as MCP tool list |
| Hono/Zod routes | Worker mounts `/async/{name}` and `/sync/{name}` per command |
| Browser `cadCommand()` | Dispatches by command name |
| HeadlessController | Dispatches by command name in headless WASM |
| OpenAPI spec | Generated from schema commands |
| TypeScript types | Generated from OpenAPI via openapi-typescript |
| check-alignment.mjs | Validates schema ↔ worker ↔ wrangler consistency |

**Generation pipeline files:**

| File | What it does |
|------|-------------|
| `systems/truck/crate/src/bin/generate_schema.rs` | 3-line Rust binary — calls `build_schema()`, prints JSON to stdout |
| `scripts/gen-openapi.ts` | Reads `cad-schema.json` → emits `openapi.json` + `api-types.ts` |
| `systems/truck/worker/src/truck-wasm.ts` | Hand-written WASM loader glue for truck geometry on CF |
| `systems/truck/worker/src/sync-wasm.ts` | Hand-written WASM loader glue for truck-sync on CF |

**Generated outputs:**

| Output | Generated by | Committed? |
|--------|-------------|-----------|
| `systems/truck/cad-schema.json` | `generate_schema.rs` | Yes |
| `systems/truck/web/openapi.json` | `gen-openapi.ts` | No (gitignored) |
| `systems/truck/web/api-types.ts` | `openapi-typescript` | Yes |

ADR-0004 adds one new script — `scripts/gen-adapters.ts` — that reads the schema and emits CF adapter, browser worker scripts, and native dispatcher. The two hand-written WASM loaders (`truck-wasm.ts`, `sync-wasm.ts`) become generated outputs. When crates split, each emits its own schema fragment; `scripts/` merges and generates everything. Crates stay dumb.

**The `domain` field is the ADR-0004 seed.** Every command already carries a domain tag — `"geometry"`, `"booleans"`, `"sketch"`, `"scene"`, `"style"`. When crates split into separate workers, this field becomes the routing key. The `commandWorker` routing table in the browser dispatcher (described below) is a codegen'd version of what's already in the schema.

**What's missing** is the boundary layer: which WASM modules exist, which functions they export, what types cross the boundary, and how each target loads them. That's what this ADR adds.

### Relationship to ADR-0002 (GeometryStore)

ADR-0002 eliminates the code duplication between `headless.rs` (CF) and `wasm_app.rs` (browser) by extracting a shared `GeometryStore` — one engine, two thin wrappers. ADR-0004 generates the loader/adapter code that wires those wrappers to their targets.

**ADR-0004 does not require ADR-0002 first.** The boundary contracts work with the current architecture — they describe which WASM modules exist and how to load them, regardless of whether the internal code is deduplicated. The `generate_schema.rs` binary and `cad-schema.json` already exist and work today.

However, **ADR-0002 makes ADR-0004 more valuable.** Once GeometryStore exists as a clean shared engine, the boundary between "geometry logic" and "target-specific adapter" becomes crisp. The generated adapters get simpler because there's one consistent API surface to wrap, not two diverged implementations.

**Recommended order:** Either can land first. ADR-0002 is a Rust refactor (internal, no new files). ADR-0004 is a build tooling addition (`scripts/gen-adapters.ts`, schema extensions). They don't conflict.

### Problems with the current approach

The hand-written, per-target loader pattern creates three problems today:

1. **Different instantiation paths.** The browser loads WASM via `wasm-bindgen --target web` (dynamic `import()` of JS glue). CF Workers load the same WASM via `WebAssembly.instantiate` with manually-collected glue imports. Each target requires distinct hand-written loader code — today `truck-wasm.ts` and `sync-wasm.ts` for CF, and direct imports in `boot.ts` and `history-domain.ts` for the browser.
1. **Duplicated loader pattern.** The two CF loaders (`truck-wasm.ts`, `sync-wasm.ts`) are nearly identical — same lazy-init, same glue import collection, same `__wbg_set_wasm` call. Each new WASM module would require copying this pattern again. The browser side has a different but equally manual loading pattern per module.
1. **No shared contract.** There is no single source of truth that describes which WASM modules exist, which functions they export, what types cross the boundary, or how modules should be loaded on each target. Changes to a Rust crate’s public API can silently break one target while the other continues to work.

### Why Not WIT / WASM Component Model?

The WASM Component Model with WIT (WebAssembly Interface Types) is designed to solve exactly this problem. However, as of March 2026:

- **Browsers do not natively support WASM components.** The `jco` transpiler can convert components to JS + `.wasm`, but adds a build step and increases bundle size — directly conflicting with the 3 MiB CF Workers free-tier limit.
- **Cloudflare Workers do not support the Component Model.** Their WASI support remains experimental, limited to `wasi_snapshot_preview1` (Preview 1). No WASIp2 or component model runtime exists in production.
- **WASI 0.3.0** shipped in February 2026 with async support, but runtime adoption (Wasmtime, jco) is still prototyping. Production-ready support on CF Workers and in browsers is not available.
- **Safari** lacks JavaScript Promise Integration (JSPI), adding further browser-side constraints.

WIT is the correct long-term direction, but adopting it today would add complexity (transpilation layers, experimental shims, bundle size inflation) rather than removing it.

## Decision

Extend the existing schemars-based schema system (`commands/mod.rs`, `generate-schema` binary) with **boundary annotations** that capture WASM module topology. A build-time codegen step consumes the extended schema and generates **per-target adapter code** — one for the browser, one for CF Workers, and one for native Rust — from the same source of truth.

### Design Principles

1. **Schema is the contract.** The `cad-schema.json` output (already the source of truth for MCP tools, Hono/Zod routes, and browser `cadCommand()`) gains boundary metadata describing module exports, imports, and inter-module calls.
1. **Adapters are generated, not written.** No hand-written JS glue or Rust dispatch boilerplate per target. The codegen script reads the schema and emits target-specific adapter files. Runtime abstraction layers and shims are replaced by build-time code generation.
1. **Annotations live in Rust.** Boundary metadata is declared alongside the code it describes, using a lightweight attribute macro. The `generate-schema` binary (which runs natively, not in WASM) collects these annotations at build time.
1. **WIT-compatible contracts.** The annotation vocabulary mirrors WIT concepts (module, export, import, function signature, type crossing) so that migration to native WIT is a build-flag change, not a rewrite.
1. **Web Worker topology is data, not code.** Which WASM modules share a Web Worker is declared in the annotations and captured in the schema, not hard-coded in scripts. Changing the topology (e.g. moving a module to its own worker for parallelism, or colocating modules to avoid `postMessage` overhead) is a one-line annotation change that triggers codegen regeneration.

### Boundary Annotation

A new proc macro `#[cad_boundary]` annotates functions or modules that cross the WASM boundary:

```rust
use cad_boundary::cad_boundary;

#[cad_boundary(
    module = "truck-geometry",
    direction = "export",
    targets = ["browser", "cf-worker", "native"],
    worker = "geometry",  // browser Web Worker assignment
)]
pub fn add_cube(params: AddCubeParams) -> CommandResult {
    // ...
}
```

For inter-module calls (WASM module A calling WASM module B):

```rust
#[cad_boundary(
    module = "truck-geometry",
    direction = "import",
    from_module = "automerge-sync",
    targets = ["browser", "cf-worker", "native"],
    worker = "geometry",  // caller's Web Worker
)]
fn sync_state(doc: &[u8]) -> Vec<u8>;
```

The `worker` field is only meaningful for the browser target — it declares which Web Worker hosts this module. When the caller and callee share the same Web Worker, the codegen emits a direct WASM-to-WASM call within that worker. When they are in different Web Workers, it emits `postMessage` routing with serialisation/deserialisation matching the schemars types.

The macro is inert at compile time for WASM targets — it adds no runtime overhead. For native targets, inter-module imports are resolved by Cargo’s normal crate dependency system; the annotation serves only as a contract declaration. The `generate-schema` binary (native host target) extracts the annotations and includes them in `cad-schema.json`.

### Extended Schema Format

`cad-schema.json` gains a `boundaries` section:

```json
{
  "module": "cad",
  "version": "0.4.0",
  "commands": { "..." },
  "controlPlane": { "..." },
  "boundaries": {
    "modules": {
      "truck-geometry": {
        "worker": "geometry",
        "exports": [
          {
            "function": "add_cube",
            "params": { "$ref": "#/commands/add_cube/params" },
            "returns": "CommandResult",
            "targets": ["browser", "cf-worker", "native"]
          }
        ],
        "imports": [
          {
            "function": "sync_state",
            "from_module": "automerge-sync",
            "params": { "type": "array", "items": { "type": "integer" } },
            "returns": { "type": "array", "items": { "type": "integer" } },
            "targets": ["browser", "cf-worker", "native"]
          }
        ]
      },
      "automerge-sync": {
        "worker": "sync",
        "exports": [
          {
            "function": "sync_state",
            "params": { "type": "array", "items": { "type": "integer" } },
            "returns": { "type": "array", "items": { "type": "integer" } },
            "targets": ["browser", "cf-worker", "native"]
          }
        ],
        "imports": []
      },
      "coord-transform": {
        "worker": "geometry",
        "exports": [
          {
            "function": "to_ecef",
            "params": { "$ref": "#/definitions/ModelPoint" },
            "returns": { "$ref": "#/definitions/EcefPoint" },
            "targets": ["browser", "cf-worker", "native"]
          }
        ],
        "imports": []
      }
    },
    "workers": {
      "geometry": ["truck-geometry", "coord-transform"],
      "sync": ["automerge-sync"]
    },
    "topology": {
      "truck-geometry -> automerge-sync": {
        "functions": ["sync_state"],
        "cross_worker": true
      },
      "truck-geometry -> coord-transform": {
        "functions": ["to_ecef"],
        "cross_worker": false
      }
    }
  }
}
```

The `workers` section maps Web Worker names to the WASM modules they host. The `topology` section now indicates whether a call crosses Web Worker boundaries (`cross_worker`), which determines whether the codegen emits a direct WASM import or a `postMessage` bridge.

### Codegen Output

The codegen script (a `system.mjs` step) reads the extended schema and emits:

**Browser — per-worker scripts and main-thread dispatcher:**

> **Current state:** Both WASM modules (`truck-webgpu-gui` and `truck-sync`) run on the main thread via direct `import()` calls in `boot.ts` and `history-domain.ts`. There are no Web Workers.
>
> **Proposed:** The codegen moves WASM execution into Web Workers, keeping the main thread free for rendering and UI. The `commandWorker` routing table replaces today's direct `cadCommand()` calls with `postMessage`-based dispatch.

The browser target generates multiple files reflecting the Web Worker topology:

*Worker script (`workers/geometry-worker.ts`):*

```typescript
// Generated — do not edit. Source: cad-schema.json
// Web Worker: "geometry" — hosts: truck-geometry, coord-transform
import type { AddCubeParams, CommandResult, ModelPoint, EcefPoint } from '../types.ts';

let truckGeometry: WebAssembly.Instance;
let coordTransform: WebAssembly.Instance;

async function init() {
  const coord = await WebAssembly.instantiateStreaming(
    fetch('/coord-transform.wasm'), {}
  );
  coordTransform = coord.instance;

  const truck = await WebAssembly.instantiateStreaming(
    fetch('/truck-geometry.wasm'),
    { 'coord-transform': { to_ecef: coordTransform.exports.to_ecef } }
  );
  truckGeometry = truck.instance;
}

// Dispatch commands hosted by this worker
async function dispatch(cmd: string, params: unknown): Promise<unknown> {
  switch (cmd) {
    case 'add_cube': return truckGeometry.exports.add_cube(params);
    case 'to_ecef':  return coordTransform.exports.to_ecef(params);
    // ... generated for all functions in this worker
    default: throw new Error(`Unknown command in geometry worker: ${cmd}`);
  }
}

self.onmessage = async (e) => {
  const { id, cmd, params } = e.data;
  try {
    const result = await dispatch(cmd, params);
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};

init();
```

*Worker script (`workers/sync-worker.ts`):*

```typescript
// Generated — do not edit. Source: cad-schema.json
// Web Worker: "sync" — hosts: automerge-sync
let automergeSync: WebAssembly.Instance;

async function init() {
  const mod = await WebAssembly.instantiateStreaming(
    fetch('/automerge-sync.wasm'), {}
  );
  automergeSync = mod.instance;
}

async function dispatch(cmd: string, params: unknown): Promise<unknown> {
  switch (cmd) {
    case 'sync_state': return automergeSync.exports.sync_state(params);
    default: throw new Error(`Unknown command in sync worker: ${cmd}`);
  }
}

self.onmessage = async (e) => {
  const { id, cmd, params } = e.data;
  try {
    const result = await dispatch(cmd, params);
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};

init();
```

*Main-thread dispatcher (`browser-dispatcher.ts`):*

```typescript
// Generated — do not edit. Source: cad-schema.json
// Routes commands to the correct Web Worker based on schema topology.

const workers = {
  geometry: new Worker('/workers/geometry-worker.js', { type: 'module' }),
  sync:     new Worker('/workers/sync-worker.js',     { type: 'module' }),
} as const;

// Command → worker routing (generated from boundaries.workers)
const commandWorker: Record<string, keyof typeof workers> = {
  add_cube:       'geometry',
  add_sphere:     'geometry',
  boolean_union:  'geometry',
  to_ecef:        'geometry',
  sync_state:     'sync',
  // ... generated for all commands
};

let nextId = 0;
const pending = new Map<number, { resolve: Function; reject: Function }>();

// Wire up response handlers for each worker
for (const worker of Object.values(workers)) {
  worker.onmessage = (e) => {
    const { id, result, error } = e.data;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    error ? p.reject(new Error(error)) : p.resolve(result);
  };
}

export function cadCommand(cmd: string, params: unknown): Promise<unknown> {
  const target = commandWorker[cmd];
  if (!target) throw new Error(`Unknown command: ${cmd}`);
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    workers[target].postMessage({ id, cmd, params });
  });
}
```

This gives three levels of dispatch in the browser: main thread → correct Web Worker (via `postMessage`) → correct WASM module → correct function. The `postMessage` serialisation uses JSON, which matches the schemars types exactly — no custom serialisation format needed.

When two modules share the same Web Worker (e.g. `truck-geometry` and `coord-transform` both in `"geometry"`), the codegen wires them via direct WASM imports within the worker script — no `postMessage` overhead. Cross-worker calls (e.g. `truck-geometry` calling `automerge-sync`) route through the main thread’s `postMessage` bridge.

**CF Worker adapter (`cf-adapter.ts`):**

> **Current state:** Two hand-written loaders (`truck-wasm.ts` and `sync-wasm.ts`) use an identical lazy-init pattern — collect glue imports, `WebAssembly.instantiate`, `__wbg_set_wasm`. Both live in the same worker isolate.
>
> **Proposed:** The codegen replaces these with a single generated adapter. Each new crate/worker gets its adapter generated automatically — no more copying the lazy-init boilerplate.

```typescript
// Generated — do not edit. Source: cad-schema.json
import truckWasm from './truck-geometry.wasm';
import automergeWasm from './automerge-sync.wasm';
import type { AddCubeParams, CommandResult } from './types.ts';

const automergeSync = new WebAssembly.Instance(automergeWasm, {});
const truckGeometry = new WebAssembly.Instance(truckWasm, {
  'automerge-sync': { sync_state: automergeSync.exports.sync_state }
});

export const addCube = (p: AddCubeParams): CommandResult =>
  truckGeometry.exports.add_cube(p);
```

**Shared types (`types.ts`):** Generated from schemars JSON Schema, identical on both WASM targets.

**Native dispatcher (`native-dispatcher.rs`):**

> **Current state:** `headless.rs` has a hand-written dispatch chain (`dispatch_geometry → dispatch_booleans → dispatch_sketch → dispatch_scene → dispatch_style`). This works but must be manually updated when commands are added.
>
> **Proposed:** The codegen generates the dispatch match arms from `cad-schema.json`, keeping it in sync automatically.

The native target is fundamentally different from the WASM targets. Cargo handles crate linking — there is no WASM instantiation, no JS glue, no linear memory bridging. Inter-module imports resolve to direct function calls at compile time.

What the native target *does* need is a **command dispatcher** — the same string-to-function routing that `cadCommand()` provides in the browser and Hono routes provide on CF Workers. The codegen generates this as a Rust match statement:

```rust
// Generated — do not edit. Source: cad-schema.json
use serde_json::Value;
use crate::commands::*;

pub fn dispatch(cmd: &str, params: Value) -> Result<Value, DispatchError> {
    match cmd {
        // geometry
        "add_cube" => {
            let p: AddCubeParams = serde_json::from_value(params)?;
            Ok(serde_json::to_value(truck_geometry::add_cube(p))?)
        }
        "add_sphere" => {
            let p: AddSphereParams = serde_json::from_value(params)?;
            Ok(serde_json::to_value(truck_geometry::add_sphere(p))?)
        }
        // booleans
        "boolean_union" => {
            let p: BooleanParams = serde_json::from_value(params)?;
            Ok(serde_json::to_value(booleans::boolean_union(p))?)
        }
        // ... generated for all commands from cad-schema.json
        _ => Err(DispatchError::UnknownCommand(cmd.into()))
    }
}
```

This dispatcher is zero-overhead at runtime — each arm is a direct function call, no WASM boundary crossing, no serialisation except at the JSON ingress/egress edges. It enables:

- **CLI tooling.** Batch STEP import/export, headless scene manipulation, CI geometry validation — all at native speed without a browser or miniflare.
- **Native MCP server.** Serve MCP tools over stdio or HTTP with the full Truck kernel, no WASM. Boolean operations that would exceed CF Worker CPU limits run in milliseconds.
- **Desktop app.** Tauri or similar, using wgpu for native WebGPU rendering. The dispatcher provides the same command interface the browser uses, but without the WASM layer.
- **Server-side heavy compute.** An axum/actix server that the CF Worker delegates to for operations exceeding edge CPU time limits (complex booleans, large tessellation, batch STEP generation).
- **Testing at native speed.** Rust contract tests call the dispatcher directly — no browser, no WASM compile, full debug tooling.

**Hono routes:** Import from the target-appropriate adapter; route handlers are the same on both WASM targets.

### Build Pipeline

```
┌─────────────────────┐
│  Rust crates with   │
│  #[cad_boundary]    │
│  + #[derive(        │
│    JsonSchema)]      │
└──────────┬──────────┘
           │ cargo run --bin generate-schema
           ▼
┌─────────────────────┐
│  cad-schema.json    │
│  (commands +        │
│   controlPlane +    │
│   boundaries +      │
│   workers +         │
│   topology)         │
└──────────┬──────────┘
           │ codegen (system.mjs)
           ▼
┌───────────────────────────────────────────────────────────┐
│                                                           │
│  BROWSER                CF WORKER         NATIVE          │
│  ┌────────────────┐     ┌──────────┐     ┌────────────┐  │
│  │ workers/       │     │ cf-      │     │ native-    │  │
│  │  geometry-     │     │ adapter  │     │ dispatcher │  │
│  │  worker.ts     │     │ .ts      │     │ .rs        │  │
│  │  sync-         │     │          │     │            │  │
│  │  worker.ts     │     │          │     │            │  │
│  ├────────────────┤     └──────────┘     └────────────┘  │
│  │ browser-       │                                      │
│  │ dispatcher.ts  │     SHARED                           │
│  │ (main thread   │     ┌──────────────────────────────┐ │
│  │  postMessage   │     │ types.ts    hono-routes.ts   │ │
│  │  routing)      │     │ mcp-tools.ts  zod schemas    │ │
│  └────────────────┘     └──────────────────────────────┘ │
│                                                           │
│  ┌───────────────────────────────────────────────────────┐│
│  │ contract-tests (Rust) — validate all 3 targets        ││
│  └───────────────────────────────────────────────────────┘│
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Alignment Verification

`check-alignment.mjs` gains boundary checks:

- Every `#[cad_boundary(direction = "export")]` function has a corresponding entry in `cad-schema.json` boundaries.
- Every inter-module import has a matching export in the source module.
- Every module has a `worker` assignment; every worker has at least one module.
- Cross-worker imports are flagged in the topology so the codegen emits `postMessage` bridges rather than direct WASM imports.
- Generated adapters and worker scripts are not stale (hash of schema matches hash embedded in generated files).
- Rust contract tests (generated from schema) verify that WASM exports match the declared signatures.

### Single-Module Escape Hatch

When inter-module complexity exceeds the codegen benefit (or the bundle fits), all pure-logic crates can be compiled into a single WASM module. The boundary annotations with `from_module` become internal calls within one linear memory — no glue needed. The codegen detects this mode and emits a simplified adapter.

This is particularly relevant for the CF Workers 3 MiB free-tier constraint, where a single optimised WASM module may be more practical than multiple modules with glue overhead.

The native target is the natural extreme of this pattern: Cargo links all crates into one binary, all inter-module calls are direct function calls, and the only generated code is the command dispatcher.

## Migration Path to WIT

When CF Workers and browsers gain native component model support:

1. A build flag (`--features wit-native`) switches the codegen from emitting JS adapters to emitting WIT interface files.
1. The `#[cad_boundary]` annotations map directly to WIT `interface` and `world` declarations.
1. `cargo component build` replaces `cargo build --target wasm32-unknown-unknown` + `wasm-bindgen`.
1. The `cad-schema.json` boundaries section becomes a verification tool rather than the primary contract — WIT takes over that role.

The annotation vocabulary is intentionally aligned with WIT concepts (`module` ≈ `world`, `export`/`import` ≈ WIT exports/imports, typed params ≈ WIT function signatures) to minimise migration friction.

## Consequences

### Positive

- **Single source of truth** for all boundary contracts across three targets (browser, CF Worker, native), extending the existing `cad-schema.json` pattern.
- **No runtime abstraction layer** — adapters are generated, not executed. Zero overhead on all targets.
- **Works today** on browser, CF Workers, and native Rust without WIT, WASI shims, or `jco` transpilation.
- **Native target unlocks new deployment modes** — CLI tooling, desktop apps (Tauri/wgpu), native MCP servers, and server-side heavy compute for operations that exceed edge CPU limits.
- **Native testing at full speed** — contract tests run without WASM compilation, browser, or miniflare, with full Rust debug tooling.
- **Alignment verification** catches contract drift at CI time, not at runtime.
- **Clear migration path** to WIT/Component Model when runtimes mature.
- **Ecosystem contribution** — a novel approach to multi-target WASM contracts that the Truck/monstertruck community and RICOS can adopt.

### Negative

- **Custom tooling.** The `#[cad_boundary]` macro and codegen are bespoke. They must be maintained until WIT migration occurs.
- **Not a standard.** Other projects cannot interoperate with the boundary schema without adopting the same tooling.
- **Annotation discipline.** Developers must remember to annotate boundary-crossing functions. Lint rules in `check-alignment.mjs` mitigate but do not eliminate this risk.

### Neutral

- Bundle size impact depends on single-module vs multi-module strategy, which is an independent decision per WASM target. The native target has no bundle size constraint.
- The `generate-schema` binary grows in scope but remains a native-only build tool with no WASM dependencies.
- The native dispatcher adds a Rust codegen output alongside the existing TypeScript outputs. The codegen script (`system.mjs`) or a Rust `build.rs` can emit it.

## Implementation Plan

### Phase 0: Minimum viable proof (all 3 targets)

Prove the codegen chain works end-to-end before building the proc macro or Web Workers. No new abstractions — just replace hand-written code with generated equivalents and verify nothing breaks.

**Step 1 — Extend schema with `boundaries`.**
Hardcode boundary metadata directly in `build_schema()` (`commands/mod.rs`). No proc macro needed — just a static `"boundaries"` key listing each WASM module and the functions it exports. This is enough for the codegen to work.

**Step 2 — Write `scripts/gen-adapters.ts`.**
One script, reads `cad-schema.json`, emits 3 files:

| Target | Generated file | Replaces |
|--------|---------------|----------|
| CF Worker | `worker/src/truck-wasm.generated.ts` | hand-written `truck-wasm.ts` (identical lazy-init pattern) |
| Browser | `web/cad-dispatch.generated.ts` | nothing yet (new typed dispatcher, still main thread) |
| Native | `crate/src/dispatch_generated.rs` | hand-written dispatch chain in `headless.rs` |

**Step 3 — Swap in and verify each target.**
- **CF Worker**: Import from `.generated.ts`. Run `bun run dev`, call MCP `add_cube` — same result as before.
- **Browser**: Import generated dispatcher. Load page, add a cube — same result.
- **Native**: `include!()` the generated Rust. Run `cargo test` — same result.

**What Phase 0 deliberately skips:**
- No `#[cad_boundary]` proc macro — boundaries are hardcoded in `build_schema()`
- No Web Workers in browser — dispatcher still runs on main thread
- No topology / cross-worker routing — single module per target

**What Phase 0 proves:**
- The schema carries enough information to generate correct loader code
- The codegen chain (`cad-schema.json` → `gen-adapters.ts` → per-target files) works
- Adding a new crate = add its exports to `boundaries` → regenerate → done

**Phase 0 implementation status (2026-03-07):**

All three steps completed and verified:

| Deliverable | File | Status |
|-------------|------|--------|
| Schema boundaries | `commands/mod.rs` → `cad-schema.json` | Done — 42 geometry + 10 sync exports |
| CF Worker truck loader | `worker/src/truck-wasm.generated.ts` | Done — replaces hand-written `truck-wasm.ts` (deleted) |
| CF Worker sync loader | `worker/src/sync-wasm.generated.ts` | Done — replaces hand-written `sync-wasm.ts` (deleted) |
| Browser command routing | `web/cad-dispatch.generated.ts` | Done — typed `commandDomain` map, 5 domains |
| Native Rust command list | `crate/src/commands_generated.rs` | Done — `COMMAND_NAMES`, `CadDomain` enum, `command_domain()` |
| Alignment check | `check-alignment.mjs` [7] | Done — verifies generated adapters aren't stale |
| Module router wiring | `web/core/module-router.ts` | Done — imports generated `commandDomain` for multi-module routing |
| Boundary contract tests | `tests/boundary_dispatch.rs` | Done — 3 native tests (dispatch coverage, codegen sync, sync exports) |
| Missing dispatch fix | `headless.rs` | Done — `quick_rect_extrude` was missing, caught by contract test |
| Build chain | `package.json` `gen:adapters` | Done — wired into `build:truck` |

Verification: 30/30 API tests, 3/3 boundary contract tests, typecheck clean, alignment check passes.

### Phase 1+: Incremental additions

Once Phase 0 is verified, each of these can land independently:

1. **Proc macro:** `#[cad_boundary]` replaces the hardcoded boundaries in `build_schema()`. Inert on `wasm32`, emits metadata on native.
1. **Browser Web Workers:** `gen-adapters.ts` gains a Web Worker codegen path — `geometry-worker.ts`, `sync-worker.ts`, `browser-dispatcher.ts` with `postMessage` routing.
1. **Native dispatcher binary:** Thin CLI that links pure logic crates, uses the generated dispatcher. Validates `add_cube` works identically via browser WASM, CF Worker WASM, and native function call.
1. ~~**Alignment checks:** `check-alignment.mjs` gains boundary verification — exported functions match schema, generated files aren't stale.~~ **Done in Phase 0** — `check-alignment.mjs` [7] + `boundary_dispatch.rs` contract tests.
1. **Topology:** `workers` and `topology` sections in schema, cross-worker `postMessage` bridges.
1. **Native MCP server:** Generated dispatcher serves MCP tools over stdio — full Truck kernel at native speed, no WASM.
1. **Documentation:** `llms.txt` and `llms-full.txt` updated with boundary contract docs for AI agent consumption.