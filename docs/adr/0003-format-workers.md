# ADR-0003: Format Workers — Stateless Format Handlers via Cloudflare RPC Service Bindings

## Status

**Superseded by [ADR-0004](0004-wasm-boundary-contracts.md)** — 2026-03-07

> The format worker splitting pattern described here is a specific application of ADR-0004's
> general WASM boundary contract system. ADR-0004 Phase 1+ covers the codegen, routing,
> and topology that would drive format worker splitting. This ADR is retained as a reference
> for the format-specific details (ParsedObject contract, directory structure, splitting seams)
> that ADR-0004 will consume when the 3MB limit approaches.

## Principle

**One Rust crate = one WASM = one Cloudflare Worker.** This is the 1:1 rule. A crate IS a worker's brain. The worker is just the thin JS entry that loads the WASM and wires up CF service binding RPC. When you ask "should this be a separate crate?" you're also answering "should this be a separate worker?" — same question.

Format handlers (IFC, STEP, MVT, glTF, etc.) are stateless transformations — bytes in, parsed objects out. They don't need the geometry engine. Split them into separate crates/workers connected via RPC service bindings when the 3MB worker size limit approaches.

## Context

### The 3MB problem

Each Cloudflare Worker has a 3MB compressed size limit. As we add more import/export formats, the truck-core WASM grows because each format brings its own dependency tree:

| Format | Deps | Purpose |
|--------|------|---------|
| IFC | ifc-lite-core, ifc-lite-geometry, nalgebra | Building Information Modeling |
| STEP | monstertruck-step | CAD interchange |
| MVT | geozero, prost, earcutr, bytes | Mapbox Vector Tiles (GIS) |
| glTF | gltf crate | 3D scene interchange |
| OBJ | (minimal) | Mesh export |
| STL | (minimal) | 3D printing export |

Today all formats compile into one WASM. This works while the total is under 3MB. When it isn't, we split.

### Why server-only

**Browser: no splitting.** The browser WASM stays as one blob. Reasons:

- No equivalent of CF service bindings in-browser
- Web Workers require serializing all geometry data across `postMessage` — massive overhead for real-time CAD operations
- Rendering sync functions need direct access to both GeometryStore AND GPU state simultaneously — can't split that across a thread boundary
- Tested and confirmed impractical

**Server: natural split via CF RPC.** Cloudflare Workers service bindings provide zero-overhead RPC between workers in the same account. Each format handler becomes its own worker with its own WASM and its own 3MB budget.

**Rust native (tests, CLI):** Same crate splitting benefits — each format as an optional dependency or separate crate. Composed at the binary level via Cargo features or workspace members.

## Decision

### Architecture

```
truck-core worker (stateful — owns GeometryStore)
  ├── GeometryStore: primitives, transforms, booleans, sketch, export
  ├── Core deps: monstertruck-modeling, monstertruck-meshing
  ├── HeadlessController dispatch (routes to local or RPC)
  └── Service bindings to format workers

truck-ifc worker (stateless)
  ├── Deps: ifc-lite-core, ifc-lite-geometry, nalgebra
  ├── Import: IFC bytes → ParsedObject[]
  └── Export: (future) GeometryObject[] → IFC bytes

truck-step worker (stateless)
  ├── Deps: monstertruck-step
  ├── Import: STEP bytes → ParsedObject[]
  └── Export: GeometryObject[] → STEP bytes

truck-mvt worker (stateless)
  ├── Deps: geozero, prost, earcutr, bytes
  └── Import: MVT protobuf bytes → ParsedObject[]

truck-gltf worker (stateless)
  ├── Deps: gltf crate
  ├── Import: glTF bytes → ParsedObject[]
  └── Export: (future) GeometryObject[] → glTF bytes
```

### Shared contract

Every format handler speaks the same interface — parsed objects in, parsed objects out:

```typescript
interface ParsedObject {
  solid_json?: string;       // serialized truck Solid (if B-rep geometry)
  mesh_json?: string;        // serialized PolygonMesh (if mesh-only)
  name: string;
  bim?: BimMetadata;         // IFC-specific
  layer?: string;            // MVT-specific
}

interface FormatImportResult {
  objects: ParsedObject[];
  warnings?: string[];
}

interface FormatExportRequest {
  objects: Array<{
    solid_json?: string;
    mesh_json?: string;
    name: string;
  }>;
  options?: Record<string, unknown>;  // format-specific options
}
```

### Import flow

```
1. MCP/HTTP calls: import_ifc(data)
2. truck-core worker receives the command
3. HeadlessController dispatch checks: is IFC handler local or RPC?
4. If RPC: forwards raw bytes to truck-ifc worker via service binding
5. truck-ifc parses → returns FormatImportResult
6. truck-core calls store.add_solid() / store.add_mesh() for each object
7. Returns summary to caller
```

### Export flow

```
1. MCP/HTTP calls: export_step()
2. truck-core serializes relevant objects from GeometryStore
3. Forwards FormatExportRequest to truck-step worker via service binding
4. truck-step converts to STEP format → returns file bytes
5. truck-core returns bytes to caller
```

### Dispatch routing in HeadlessController

The dispatch table decides local vs RPC. Before splitting, all formats run locally. After splitting one format, only that format goes over RPC:

```rust
// headless.rs — dispatch routes to local or RPC
"import_ifc" => {
    // Phase 1 (before split): local
    self.store.import_ifc(data)

    // Phase 2 (after split): RPC
    // let parsed = self.ifc_service.parse(data).await;
    // self.store.add_parsed_objects(parsed)
}
```

Callers (MCP, HTTP API, replay) never know which path is used.

### Wrangler configuration

Each format worker has its own `wrangler.toml`. The core worker binds to them:

```toml
# systems/truck/worker/wrangler.toml
[[services]]
binding = "IFC_FORMAT"
service = "truck-ifc"

[[services]]
binding = "STEP_FORMAT"
service = "truck-step"

[[services]]
binding = "MVT_FORMAT"
service = "truck-mvt"
```

### Directory structure

```
systems/truck/
  crate/              → truck-core WASM (GeometryStore)
  worker/             → truck-core worker
  web/                → browser app (one WASM, no splitting)
  formats/
    ifc/
      crate/          → IFC parser Rust crate
      worker/         → IFC worker (wrangler.toml + entry)
    step/
      crate/          → STEP parser Rust crate
      worker/         → STEP worker
    mvt/
      crate/          → MVT parser Rust crate
      worker/         → MVT worker
    gltf/
      crate/          → glTF parser Rust crate
      worker/         → glTF worker
```

Each format worker registered in `systems/truck/system.mjs` as an additional worker entry. Same pattern as test-worker today.

### The 1:1 rule in practice

The Cargo workspace, CF deploy config, and directory structure all mirror each other — one row per crate, one row per worker:

```toml
# Cargo.toml (workspace)
[workspace]
members = [
    "systems/truck/crate",                    # → truck-cad worker
    "systems/truck/formats/ifc/crate",        # → truck-ifc worker
    "systems/truck/formats/step/crate",       # → truck-step worker
    "systems/truck/formats/mvt/crate",        # → truck-mvt worker
    "systems/truck/formats/gltf/crate",       # → truck-gltf worker
    "systems/sync/crate",                     # → (WASM lib, no own worker)
]
```

```jsonc
// cf-deploy.json (workers map)
{
  "workers": {
    "plat-router":  { ... },
    "truck-cad":    { "crate": "systems/truck/crate" },
    "truck-ifc":    { "crate": "systems/truck/formats/ifc/crate" },
    "truck-step":   { "crate": "systems/truck/formats/step/crate" },
    "truck-mvt":    { "crate": "systems/truck/formats/mvt/crate" },
    "truck-gltf":   { "crate": "systems/truck/formats/gltf/crate" },
    "test-worker":  { ... }
  }
}
```

If a crate exists without a matching worker entry (like `sync/crate`), it's a library — loaded by another worker, not deployed independently.

Format crates share `[workspace.dependencies]` for common deps (serde, serde_json, etc.) but each brings only its own format-specific deps.

## Properties

- **Each format worker is tiny** — one format's deps, no GeometryStore, no rendering. Well under 3MB.
- **Stateless** — pure function: bytes in, objects out. No state management.
- **Independent deploy** — add a new format = new crate, new worker, one service binding, one dispatch entry.
- **Independent testing** — feed a format worker test files, check output. No CAD engine needed.
- **Caller-transparent** — `HeadlessController.execute("import_ifc", ...)` works the same whether IFC parsing is local or RPC.
- **Browser unaffected** — splitting is server-only. Browser keeps one WASM.
- **Incremental** — split one format at a time. Don't have to split them all at once.

## Splitting seam (ADR-0002 connection)

ADR-0002's GeometryStore creates the splitting seam. Today `import_ifc()` does both parsing AND adding to the store in one method. When splitting:

1. Extract the **parsing** part into the format worker (bytes → ParsedObject[])
2. Keep the **"add to store"** part in GeometryStore (ParsedObject[] → stored objects)
3. Add a generic `store.add_parsed_objects(result: FormatImportResult)` method

The split point is inside the method — clean seam.

## When to split

**Not now.** Split when:

- A single format's deps push the truck-core WASM past ~2.5MB (leave headroom)
- A new format would push it over 3MB
- A format has a slow compile time that drags down the dev loop

Split the biggest offender first (likely IFC — it brings nalgebra + ifc-lite). Leave small formats (OBJ, STL) in truck-core permanently — they have minimal deps.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| RPC serialization overhead | Low | Format handlers are called once per import/export, not per-frame. Latency is acceptable. |
| Shared type drift (ParsedObject) | Medium | Contract types in a shared crate or generated from schema (same pattern as cad-schema.json). |
| Deploy ordering | Low | Format workers are stateless — deploy in any order. Core worker gracefully falls back to local if binding unavailable. |
| Testing complexity | Low | Format workers testable in isolation. Integration test: core + format workers via miniflare multi-worker. |

## Relationship to other ADRs

| ADR | Relationship |
|-----|-------------|
| [ADR-0002](0002-headless-as-core-engine.md) | GeometryStore creates the splitting seam. Must land first. |
| [ADR-0001](0001-multi-actor-sync.md) | Replay calls HeadlessController.execute() per op — unaffected by whether format handling is local or RPC. |
