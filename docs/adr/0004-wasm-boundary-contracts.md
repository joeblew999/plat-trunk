# ADR-0004: WASM Boundary Contracts via Schema-Driven Codegen

- **Status:** Proposed
- **Date:** 2026-03-07
- **Supersedes:** None
- **Related:** ADR-0019 (Module Router), ADR-0038 (Versioning Model)

## Context

plat-trunk compiles Rust crates to WASM for two runtime targets: the browser (Web Worker via `wasm-bindgen` + `WebAssembly.instantiateStreaming`) and Cloudflare Workers (bound via `wasm_modules` in `wrangler.toml`). A third target — native Rust — is desirable for CLI tooling, testing at native speed, desktop apps (Tauri/wgpu), and heavyweight server-side processing (booleans, tessellation, STEP generation) that exceeds edge CPU limits. The same Truck geometry kernel, Automerge CRDT logic, and coordinate transform pipeline must run on all three.

Today this creates three problems:

1. **Different instantiation paths.** The browser distributes WASM modules across multiple Web Workers (e.g. a geometry worker running Truck, a sync worker running Automerge), with the main thread orchestrating via `postMessage`. CF Workers receive pre-bound modules as globals in a single isolate. Each target requires distinct JS glue code, currently hand-written.
1. **WASM-to-WASM calling.** When module A (e.g. Truck geometry) needs to call module B (e.g. Automerge), both targets require glue that bridges separate linear memories. In the browser, these modules may also live in different Web Workers, adding a `postMessage` serialisation boundary on top of the WASM boundary. The binding mechanism differs per target, and the glue grows combinatorially as modules increase.
1. **No shared contract.** There is no single source of truth that describes which functions cross WASM boundaries, what types they exchange, which modules export or import them, or which Web Worker hosts them in the browser. Changes to a Rust crate’s public API can silently break one target while the other continues to work.

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

1. **Prototype:** Annotate Truck geometry exports (`add_cube`) with `#[cad_boundary]`. Extend `generate-schema` to emit a minimal `boundaries` section. Hand-write one browser adapter, one CF adapter, and one native dispatcher to validate the codegen shape.
1. **Macro:** Implement `#[cad_boundary]` as a proc macro crate. Inert on `wasm32` targets, emits metadata on native.
1. **Codegen:** Add boundary adapter generation to truck `system.mjs`. Browser adapter + CF adapter + native dispatcher + shared types from one pass.
1. **Native dispatcher binary:** Create a thin CLI binary that links the pure logic crates and uses the generated dispatcher. Validate that `add_cube` works identically via browser WASM, CF Worker WASM, and native function call.
1. **Alignment:** Extend `check-alignment.mjs` with boundary verification rules across all three targets.
1. **Scale:** Annotate remaining boundary-crossing functions (Automerge sync, coordinate transforms). Add inter-module topology.
1. **Native MCP server:** Use the generated dispatcher to serve MCP tools over stdio — full Truck kernel at native speed, no WASM.
1. **Document:** Update `llms.txt` and `llms-full.txt` with boundary contract documentation for AI agent consumption.