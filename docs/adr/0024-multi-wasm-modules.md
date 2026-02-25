# ADR-0024: Multi-WASM Module Architecture

## Status

Proposed

## Context

The platform runs the **same CAD kernel** in two environments:

- **Browser** — WebGPU compute + render
- **Cloudflare Worker** — WebGPU compute only, no render

Both environments execute the same commands (`add_cube`, `boolean_union`, `import_ifc`, etc.) on the same geometry. The only difference is the Worker doesn't render pixels — it has no `wgpu` render pipeline, no `winit` window, no Three.js camera sync.

Today this is one Rust crate (`truck-webgpu-gui`) compiled twice with different feature flags:

| Target | Features | Size | Headroom |
|--------|----------|------|----------|
| Browser | rendering + mvt (default) | **2.9 MB** | 100 KB to 3 MB |
| Worker | no-default-features | **2.5 MB** | 500 KB to 3 MB |

Cloudflare Workers enforces a **3 MB** WASM limit on the free plan (10 MB paid). Both builds are at the edge.

The problem is structural: **rendering code is tangled into `wasm_app.rs`** (2,739 lines) alongside scene management, command dispatch, IFC import, and everything else. You can't cleanly separate what runs everywhere from what's browser-only. And `headless.rs` (1,011 lines) duplicates most of the dispatch logic.

Meanwhile, dependencies that should be optional are always compiled:

| Dependency | Used by | Gated? |
|-----------|---------|--------|
| `ifc-lite-core` + `ifc-lite-geometry` | IFC import | **No** — always compiled |
| `kcl-ezpz` | Sketch commands | **No** — always compiled |
| `truck-stepio` | STEP import | **No** — always compiled |
| `truck-assembly` | Assembly commands | **No** — always compiled |
| `nalgebra` | IFC transforms | **No** — always compiled |
| `truck-platform` + `truck-rendimpl` + `wgpu` | Browser rendering | **Yes** — `rendering` feature |
| `geozero` + `prost` | MVT import | **Yes** — `mvt` feature |

ADR-0023 (georeferencing + IFC B-Rep promotion) will add more code. **We need the split now.**

-----

## Problem

Two structural issues:

**1. Rendering is tangled with compute.** The platform's value proposition is running the same geometry operations on Cloudflare as in the browser. But the rendering code (`wgpu`, `winit`, `truck-platform`, `truck-rendimpl`, Three.js camera sync) is woven into `wasm_app.rs` alongside command dispatch and scene management. `headless.rs` duplicates most of the dispatch to work around this.

**2. Everything is one monolith.** IFC, MVT, sketch, STEP, glTF — all compiled into one WASM binary whether used or not. The system needs a plugin architecture where new capabilities (e.g., point cloud import, mesh repair, drone path planning) can be added as independent WASM modules without touching the core.

-----

## Decision

Two splits, both required:

**1. Compute vs Render** — separate rendering (browser-only) from all compute (runs everywhere).

**2. Domain Plugins** — separate IFC, MVT, sketch, export into independent WASM modules that plug into the system via the existing Hono + Zod + OpenAPI chain.

### The Plugin Bus: One Hono Router, Both Environments

The Worker already uses `OpenAPIHono` + `mountModule()` ([index.ts:181](systems/truck/worker/src/index.ts#L181)) to auto-generate routes from a schema. The browser uses a hand-rolled `BrowserModuleRouter` ([module-router.js](web/gui/core/module-router.js)) — a 128-line single-module pass-through with untested multi-module scaffolding.

**The problem with separate routers:** The browser currently has three independent routing implementations — a 20-line regex for URL/model routing (`index.html` lines 23-41), a 128-line `BrowserModuleRouter` for command dispatch, and `worker-relay.js` for HTTP coordination. With N plugins, all three need to understand plugin boundaries, model scoping, and schema validation. Maintaining this across separate implementations means every new plugin or model feature needs changes in multiple places.

**The fix:** Run the same Hono router in both environments. Hono is built on Web Standards (`Request`/`Response`) and explicitly supports browser, Workers, Deno, Bun, and Node.js. In the browser it doesn't serve HTTP — Lit components call `app.request()` internally.

Today's `mountModule()` has two layers tangled together:

| Layer | What it does | Portable? |
|-------|-------------|-----------|
| **Schema routing** (lines 276-296) | Iterates `schema.commands`, creates Zod validation, builds command→module map | **Yes** — works anywhere |
| **HTTP coordination** (lines 184-250) | SSE stream, command queue, result callbacks, state sync | **No** — Worker↔Browser relay only |

The refactor: split `mountModule()` into `mountSchema()` (portable, both environments) and `mountWorkerRelay()` (Worker-only HTTP plumbing).

```typescript
// SHARED (runs in both environments):
mountSchema(api, 'cad',    geometrySchema);  // Zod + OpenAPI + command routing
mountSchema(api, 'bim',    bimSchema);
mountSchema(api, 'mvt',    mvtSchema);
mountSchema(api, 'sketch', sketchSchema);
mountSchema(api, 'export', exportSchema);

// WORKER ONLY (HTTP relay, SSE, command queue):
mountWorkerRelay(api, 'cad');
mountWorkerRelay(api, 'bim');
// ...
```

Each `mountSchema()` call auto-generates:
- **Zod validation** from JSON Schema (per-command request/response types)
- **OpenAPI routes** (`/api/{prefix}/{command}`) with typed params
- **MCP tools** (via `buildMcpTools()` from the same schema)
- **Per-command endpoints** (route to correct WASM module's `execute()`)
- **Merged schema** for discovery (`/api/openapi.json`, `/api/cad/schema`)

**Browser integration — `app.request()`, not HTTP:**

Lit components call the Hono router in-process. No network round-trip:

```javascript
// Browser: Hono app is an in-process router
const result = await app.request('/api/bim/default/sync/import_ifc', {
  method: 'POST',
  body: JSON.stringify({ fileData: arrayBuffer })
});
const json = await result.json();
```

**60fps gizmo escape hatch:** `cad-viewport.js` bypasses the router entirely and calls `wasmInstance.execute()` directly for gizmo operations — this already happens today via `moduleRouter.core()` (Tier 3). The gizmo path stays synchronous, zero-overhead. Every other command goes through Hono.

**Adding a new plugin:** write a Rust crate with `execute()` + `schema()` → call `mountSchema(api, '{name}', schema)` → done. One registration, both environments.

### Target Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  OpenAPIHono — same app instance in BOTH environments         │
│  mountSchema() per plugin → Zod → OpenAPI → MCP tools        │
├──────────┬───────────┬──────────┬───────────┬────────────────┤
│ geometry │    bim    │   mvt    │  sketch   │   export       │
│  .wasm   │   .wasm   │  .wasm   │   .wasm   │   .wasm        │
│          │           │          │           │                │
│ add_cube │ import_   │ import_  │ sketch_   │ export_gltf    │
│ boolean_ │   ifc     │   mvt    │   add_    │ export_step    │
│  union   │ promote_  │ parse +  │   point   │ export_stl     │
│ translate│   brep    │ extrude  │ sketch_   │ import_gltf    │
│ rotate   │ bim_meta  │ to Solid │  extrude  │                │
│ georef_* │           │          │  solve    │                │
│ scene_*  │           │          │           │                │
├──────────┴───────────┴──────────┴───────────┴────────────────┤
│  All above: compute — runs on BOTH environments               │
│  Each < 3 MB, each generates its own schema                   │
└──────────────────────┬───────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │ Worker      │ Browser     │
         │             │             │
         │ + relay:    │ + renderer: │
         │  SSE stream │  WebGPU     │
         │  cmd queue  │  Three.js   │
         │  result cb  │  gizmos     │
         │  state sync │  camera     │
         │             │             │
         │ mountWorker │ cad-render  │
         │  Relay()    │  er.wasm    │
         └─────────────┴─────────────┘
```

**Key insight:** The Hono app, `mountSchema()` calls, WASM modules, and plugin schemas are identical in both environments. Only the environment-specific layer differs — `mountWorkerRelay()` (HTTP/SSE coordination) on the Worker, `cad-renderer.wasm` (WebGPU rendering) in the browser. The browser calls `app.request()` in-process; the Worker serves HTTP externally.

-----

## Implementation Plan

### Phase 0: Extract Shared Dispatch (prerequisite)

**Goal:** Eliminate the duplication between `wasm_app.rs` (2,739 lines) and `headless.rs` (1,011 lines).

**Current structure:**
```
wasm_app.rs   ← browser: SceneController + rendering + execute() dispatch
headless.rs   ← worker:  HeadlessController + execute() dispatch (copy-paste)
```

**Target structure:**
```
src/
  dispatch.rs     ← shared execute() match arms, operates on trait CadState
  state.rs        ← CadState trait + shared state management (object store, etc.)
  wasm_app.rs     ← browser: WebGPU init, resize, render loop (slim)
  headless.rs     ← worker: WASM exports only (slim)
```

The key abstraction: `dispatch.rs` takes a `&mut dyn CadState` (trait with `add_object()`, `remove_object()`, `get_object()`, etc.) and the command string. Both `wasm_app.rs` and `headless.rs` implement `CadState` and delegate to the shared dispatch.

**This is the prerequisite for everything else.** Without it, the compute/render split means copying the dispatch duplication into `cad-core` and `cad-renderer`.

### Phase 1: Feature-Gate Ungated Dependencies

**Goal:** Immediate size relief without changing crate boundaries.

```toml
[features]
default = ["rendering", "mvt"]
rendering = ["dep:truck-platform", "dep:truck-rendimpl", "dep:wgpu", "dep:winit", "dep:web-sys"]
mvt = ["dep:geozero", "dep:earcutr", "dep:bytes", "dep:prost"]
gltf = ["dep:gltf"]
# NEW — currently always compiled:
ifc = ["dep:ifc-lite-core", "dep:ifc-lite-geometry", "dep:nalgebra"]
sketch = ["dep:kcl-ezpz"]
step = ["dep:truck-stepio"]
assembly = ["dep:truck-assembly"]
```

Guard code with `#[cfg(feature = "...")]`. Then **measure**:

| Build | Features | Expected size |
|-------|----------|---------------|
| Worker (geometry only) | none | ~1.5 MB |
| Worker (all compute) | ifc, sketch, mvt, step | ~2.5 MB |
| Browser (all) | rendering, ifc, sketch, mvt, gltf | ~2.9 MB |

These measurements inform the size budget for Phase 2 plugin boundaries.

### Phase 2: Split Into Plugin Crates

**Goal:** Each domain becomes an independent WASM plugin with its own schema. Rendering becomes a browser-only plugin.

**Workspace layout:**

```
crates/
  cad-core/                ← shared types + geometry (always loaded)
    src/
      lib.rs               ← CadState trait, execute(), schema()
      dispatch.rs          ← shared dispatch framework (from Phase 0)
      state.rs             ← CadState implementation (scene graph)
      georef.rs            ← GeoReference struct (ADR-0023)
      commands/             ← geometry param structs
    Cargo.toml             ← truck-modeling, truck-shapeops, etc.
  cad-bim/                 ← IFC import + B-Rep promotion
    src/lib.rs             ← execute(), schema()
    Cargo.toml             ← depends on cad-core, ifc-lite
  cad-mvt/                 ← MVT tile parsing + extrusion
    src/lib.rs             ← execute(), schema()
    Cargo.toml             ← depends on cad-core, geozero, prost
  cad-sketch/              ← parametric sketching
    src/lib.rs             ← execute(), schema()
    Cargo.toml             ← depends on cad-core, kcl-ezpz
  cad-export/              ← glTF, STEP, STL import/export
    src/lib.rs             ← execute(), schema()
    Cargo.toml             ← depends on cad-core, truck-stepio, gltf
  cad-renderer/            ← browser-only rendering
    src/lib.rs             ← SceneController, render loop, gizmo, camera
    Cargo.toml             ← depends on cad-core, truck-platform, truck-rendimpl, wgpu, winit
```

Every plugin crate exposes the same interface:
```rust
#[wasm_bindgen]
pub fn execute(cmd_type: &str, params_json: &str) -> String;
pub fn schema() -> String;  // returns JSON Schema for this plugin's commands
```

Every plugin generates its own `cad-schema-{name}.json` at build time. The schema chain (Rust `#[derive(JsonSchema)]` → JSON → Zod → OpenAPI → MCP) works per-plugin, then the router merges them.

**Build commands:**
```bash
# Worker: core + domain plugins (no renderer)
wasm-pack build crates/cad-core   --target bundler --out-dir systems/truck/worker/pkg/core
wasm-pack build crates/cad-bim    --target bundler --out-dir systems/truck/worker/pkg/bim
wasm-pack build crates/cad-mvt    --target bundler --out-dir systems/truck/worker/pkg/mvt
wasm-pack build crates/cad-sketch --target bundler --out-dir systems/truck/worker/pkg/sketch
wasm-pack build crates/cad-export --target bundler --out-dir systems/truck/worker/pkg/export

# Browser: same plugins + renderer
wasm-pack build crates/cad-renderer --target web --out-dir web/gui/pkg/renderer
# (plus all the above with --target web)
```

### Phase 3: Unified Hono Router (both environments)

**Goal:** One Hono app with `mountSchema()` per plugin, running in both Worker and browser. Replace `BrowserModuleRouter` with Hono.

**Step 1: Split `mountModule()` into portable + Worker-only:**

```typescript
// PORTABLE — mountSchema() (both environments)
// Extracted from mountModule() lines 269-296 + 298-331
function mountSchema(hono: OpenAPIHono, prefix: string, schema: ModuleSchema) {
  // Schema endpoint
  hono.get(`/${prefix}/schema`, (c) => c.json(schema));

  // Per-command routes with Zod validation
  for (const [name, def] of Object.entries(schema.commands)) {
    const RequestSchema = z.object(zodFromJsonSchema(def.params));
    hono.openapi(createRoute({
      method: 'post', path: `/${prefix}/{modelId}/exec/${name}`,
      request: { body: { content: { 'application/json': { schema: RequestSchema } } } },
      // ...
    }), (c) => {
      const result = plugins.get(prefix).execute(name, JSON.stringify(c.req.valid('json')));
      return c.json(JSON.parse(result));
    });
  }
}

// WORKER ONLY — mountWorkerRelay() (SSE, command queue, result callbacks)
// Extracted from mountModule() lines 184-267
function mountWorkerRelay(hono: OpenAPIHono, prefix: string) {
  // SSE stream, pending/queue endpoints, state sync, result posting
  // ... (the async browser↔worker relay plumbing)
}
```

**Step 2: Shared app, environment-specific bootstrap:**

```typescript
// shared/router.ts — imported by BOTH Worker and browser
import { OpenAPIHono } from '@hono/zod-openapi';

export function createPluginRouter(schemas: Record<string, ModuleSchema>) {
  const app = new OpenAPIHono();
  for (const [prefix, schema] of Object.entries(schemas)) {
    mountSchema(app, prefix, schema);
  }
  return app;
}
```

```typescript
// Worker bootstrap (index.ts)
const app = createPluginRouter({ cad: geometrySchema, bim: bimSchema, ... });
for (const prefix of Object.keys(schemas)) mountWorkerRelay(app, prefix);
export default app;  // serves HTTP

// Browser bootstrap (via Lit component)
const app = createPluginRouter({ cad: geometrySchema, bim: bimSchema, ... });
// No HTTP — call in-process:
const res = await app.request('/api/bim/default/exec/import_ifc', {
  method: 'POST', body: JSON.stringify(params)
});
```

**Step 3: Dynamic plugin loading in browser:**

```javascript
// Core loads eagerly at startup
const app = createPluginRouter({ cad: coreSchema });

// Domain plugins load on demand
async function loadPlugin(name) {
  const mod = await import(`/pkg/${name}/mod.js`);
  await mod.default();
  const schema = JSON.parse(mod.schema());
  mountSchema(app, name, schema);       // same function as Worker
  plugins.set(name, mod);               // WASM instance for execute()
}

document.addEventListener('ifc-drop', () => loadPlugin('cad-bim'));
document.addEventListener('mvt-load', () => loadPlugin('cad-mvt'));
```

**Step 4: Replace `BrowserModuleRouter`:**

`module-router.js` (128 lines) is replaced by the shared Hono app. What changes:

| Today (`BrowserModuleRouter`) | Tomorrow (Hono `app.request()`) |
|---|----|
| `moduleRouter.execute('add_cube', params)` | `app.request('/api/cad/.../exec/add_cube', { method: 'POST', body })` |
| `moduleRouter.combinedSchema()` | `app.request('/api/openapi.json')` — auto-merged by Hono |
| `moduleRouter.core()` (Tier 3 gizmo) | **Unchanged** — `plugins.get('cad').execute()` direct call, bypasses router |

`cadCommand()` in `state.js` calls `app.request()` instead of `moduleRouter.execute()`. The gizmo escape hatch stays synchronous — it calls the WASM instance directly, bypassing Hono entirely (same as today).

**What this gives every plugin automatically:**
- Zod request/response schemas (generated from JSON Schema)
- OpenAPI routes with typed params
- MCP tools (via `buildMcpTools()`)
- Schema merged into `/api/openapi.json`
- Identical behavior in both environments

**Adding a new plugin** (e.g., point cloud import, mesh repair, drone planning):
1. Create `crates/cad-{name}/` with `execute()` + `schema()`
2. Add `mountSchema(app, '{name}', schema)` — one line, both environments
3. Done — Zod, OpenAPI, MCP, routing all auto-generated

### Phase 4: Cross-Plugin State via Automerge

**Goal:** Operations from any plugin are recorded, replayable, and undoable.

The **Automerge op log** ([history.js](web/gui/history.js)) already records every `cadCommand()` as `{ type, params, enabled, actorId }`. Today all ops go to the single 'core' module. With N plugins, the same op log records ops from all plugins — `import_ifc` (cad-bim), `import_mvt` (cad-mvt), `add_cube` (cad-core), etc.

**Replay** (`_replayScene()`) iterates enabled ops and calls `cadCommand(op.type, op.params)` for each. The Hono router (or `cadCommand()` → `app.request()`) routes each op to the correct plugin's `execute()`. The op log doesn't need to know about plugin boundaries.

**Cross-plugin geometry transfer** uses serialization:

| Transfer | Format | When |
|----------|--------|------|
| Solid → Solid | `truck-topology` JSON | BIM creates Solid → core does boolean |
| Solid → Mesh | Tessellation | Any module → export |
| Metadata | Automerge doc fields | BIM metadata → core reads property |

Not zero-copy, but operations are coarse (one `execute()` per user action) — serialization cost is negligible vs. geometry computation.

**Snapshots** (periodic `export_scene()` checkpoints at every 10 ops) come from `cad-core` and include all objects regardless of which plugin created them — because all plugins share the same scene graph in WASM memory.

-----

## Consequences

### Compute/Render Parity

Every plugin runs identically on browser and Cloudflare. The renderer is the only browser-specific piece. If it works on Cloudflare, it works in the browser — and vice versa.

### Plugin Extensibility

Adding a new capability to the platform means:
1. Write a Rust crate: `crates/cad-{name}/` with `execute()` + `schema()`
2. Build to WASM
3. Add `mountSchema(app, '{name}', schema)` — **one line, both environments**
4. Zod validation, OpenAPI, MCP tools, and routing are auto-generated

No changes to other plugins. No changes to the router core. No schema hand-maintenance. No second registration step.

### Three Routers Become One

Today the browser has three separate routing concerns, each hand-rolled independently:

| Routing concern | Current implementation | Location |
|---|---|---|
| **URL / model routing** | 20-line regex in `<script>` tag | [index.html:23-41](web/gui/index.html#L23-L41) — `location.pathname.match(/^\/model\/([^/]+)/)` |
| **Command → WASM dispatch** | `BrowserModuleRouter` (128 lines) | [module-router.js](web/gui/core/module-router.js) — `moduleRouter.execute(type, params)` |
| **Worker HTTP relay** | `worker-relay.js` + SSE in Datastar | [index.html:70](web/gui/index.html#L70) — `data-attr:data-sse="'/api/cad/' + $modelId + '/events'"` |

The Worker also has three, but they're already unified in Hono — `mountModule()` handles command routing, URL patterns use `:modelId` params, and the relay endpoints share the same app.

With Hono in the browser, all three collapse into one router:

```typescript
// URL routing — replaces hand-rolled regex in index.html <script>
app.get('/model/:id', (c) => bootstrapModel(c.req.param('id')));
app.get('/model/new', (c) => bootstrapModel(randomId()));
app.get('/', (c) => bootstrapModel('default'));

// Command routing — replaces BrowserModuleRouter
// (already handled by mountSchema() per plugin)

// Model-scoped commands — :modelId is a native Hono param
app.post('/:prefix/:modelId/exec/:command', (c) => {
  const plugin = plugins.get(c.req.param('prefix'));
  return c.json(JSON.parse(
    plugin.execute(c.req.param('command'), JSON.stringify(c.req.valid('json')))
  ));
});
```

**Result:** One router, one param extraction pattern (`:modelId`), one place to add middleware (auth, logging, model loading). The `modelId` Datastar signal, the SSE path, and the command dispatch all read from the same Hono route context.

**Note on model persistence:** Automerge is the persistence layer — not a database or file server. The Automerge document stores an **operation log** (`{ type, params, enabled, actorId }` per op), not geometry. The scene is rebuilt by replaying enabled ops from the nearest snapshot checkpoint ([history.js:279-337](web/gui/history.js#L279-L337)).

| Storage | What | Where |
|---|---|---|
| **Automerge op log** | Operations + snapshots (replay-based) | IndexedDB in browser (`cad-docs`) |
| **WASM memory** | Live B-Rep geometry (rebuilt from replay) | Browser process, volatile |
| **Worker `ModelSession`** | Ephemeral command queue + SSE state | In-memory `Map`, GC'd after 5 min idle |
| **Files** | STEP/IFC/JSON import/export | User's local disk, manual load/save |

The `modelId` is a session namespace, not a storage key. Each `modelId` maps to an Automerge document URL stored in `localStorage` ([history.js:64-67](web/gui/history.js#L64-L67)). Cloud-side persistence (R2, D1, Automerge sync server) is a separate concern — not in scope for this ADR.

This matters for the plugin split: **all plugin operations go into the same Automerge op log**. When `cad-bim` records `import_ifc` or `cad-mvt` records `import_mvt`, those ops are replayed through the Hono router which routes each command to the correct plugin's `execute()`. The op log doesn't need to know about plugin boundaries — the router handles that.

### Tiered Object Scaling

As models grow (IFC buildings, Tokyo-scale georeferenced scenes from ADR-0023), objects must move between Hot (WASM + GPU), Warm (IndexedDB), and Cold (R2) tiers based on camera distance and editing proximity. The plugin split enables this — `cad-renderer` owns LOD proxies independently, and the `ExportEntry` serialization format already supports per-object storage.

**See [ADR-0025](0025-tiered-object-scaling.md)** for the full design: tier definitions, implementation phases, spatial index integration with ADR-0023, and progressive model loading.

### Size Budget

| Plugin | Target | Runs on |
|--------|--------|---------|
| `cad-core` (geometry + scene + georef) | < 2.0 MB | Browser + Worker |
| `cad-bim` (IFC + B-Rep promotion) | < 1.5 MB | Browser + Worker |
| `cad-mvt` (MVT tile parsing) | < 1.0 MB | Browser + Worker |
| `cad-sketch` (parametric) | < 1.0 MB | Browser + Worker |
| `cad-export` (glTF, STEP, STL) | < 1.5 MB | Browser + Worker |
| `cad-renderer` (WebGPU render) | < 1.5 MB | Browser only |
| Hono router (shared `mountSchema()`) | < 100 KB | Browser + Worker |

**Each plugin independently under 3 MB.** Total across all plugins: ~8.5 MB — impossible in a monolith, fine as separate Workers or dynamic imports.

### What Changes for ADR-0023

| ADR-0023 Phase | Plugin | Notes |
|---------------|--------|-------|
| Phase 1 (unit scale) | `cad-core` | Convention, no code change |
| Phase 2 (GeoReference) | `cad-core` | Shared by all plugins |
| Phase 3 (MVT pipeline) | `cad-mvt` | MVT parser is its own plugin |
| Phase 3b (IFC B-Rep) | `cad-bim` | IFC import + promotion |
| Phase 4 (Automerge) | Router (JS) | Automerge doc owned by router |
| Phase 5 (Tokyo test) | All plugins | Integration test across plugins |

### `wasm_app.rs` God File Decomposition

| Current location | Lines | Destination |
|-----------------|-------|-------------|
| Command dispatch (`execute()` match arms) | ~800 | `cad-core/src/dispatch.rs` |
| Scene management (add/remove/list objects) | ~400 | `cad-core/src/state.rs` |
| IFC import | ~130 | `cad-bim/src/lib.rs` |
| STEP import | ~35 | `cad-export/src/lib.rs` |
| WebGPU init + render loop | ~500 | `cad-renderer/src/lib.rs` |
| SceneObject → GPU buffers | ~300 | `cad-renderer/src/scene_object.rs` |
| Gizmo rendering | ~200 | `cad-renderer/src/gizmo.rs` |
| Camera sync | ~100 | `cad-renderer/src/camera.rs` |
| `headless.rs` (1,011 lines) | 1,011 | **Deleted** — replaced by thin wrapper over `cad-core` |

-----

## Sequencing

```
Phase 0: Extract shared dispatch           ← do now (prerequisite for clean split)
Phase 1: Feature-gate ungated deps         ← do now (measure per-domain sizes)
           ↓ measure
Phase 2: Split into plugin crates          ← the architectural change
           ↓ each plugin builds + measures
Phase 3: Unified Hono router                ← mountSchema() in both, replace BrowserModuleRouter
           ↓
ADR-0023:  GeoReference in cad-core        ← lands in the right plugin from day one
           IFC B-Rep in cad-bim
           MVT pipeline in cad-mvt
Phase 4: Scene state sharing               ← Automerge doc bridges plugins
```

**Phase 0 + 1 are pure refactors** — no crate boundary changes, no build system changes. They give real size measurements that inform the plugin boundaries.

**Phase 2 + 3 are the architectural change** — plugin crates + unified Hono routing in both environments. This is where the system becomes extensible.

**ADR-0023 work lands after the split** — each piece goes directly into the right plugin.

-----

## Existing Code

| File | Lines | What | Destination plugin |
|------|-------|------|-------------------|
| `crates/truck-webgpu-gui/src/wasm_app.rs` | 2,739 | God file | Split across all plugins |
| `crates/truck-webgpu-gui/src/headless.rs` | 1,011 | Duplicate dispatch | **Deleted** |
| `crates/truck-webgpu-gui/src/lib.rs` | 146 | CAD primitives | `cad-core` |
| `crates/truck-webgpu-gui/src/sketch.rs` | 642 | Sketch logic | `cad-sketch` |
| `crates/truck-webgpu-gui/src/mvt/mod.rs` | 127 | MVT parser | `cad-mvt` |
| `crates/truck-webgpu-gui/src/gltf_import.rs` | 100 | glTF import | `cad-export` |
| `crates/truck-webgpu-gui/src/commands/` | 578 | Param structs | Per-plugin `commands/` |
| `systems/truck/worker/src/index.ts` | — | Hono router + `mountModule()` | Split into `mountSchema()` (shared) + `mountWorkerRelay()` (Worker-only) |
| `web/gui/core/module-router.js` | 128 | Browser router (single-module) | **Replaced** by shared Hono `app.request()` |
| `web/gui/state.js` | — | `cadCommand()` dispatch | Updated — calls `app.request()` instead of `moduleRouter.execute()` |
| `web/gui/index.html` (lines 23-41) | 20 | Hand-rolled URL/model routing | **Replaced** by Hono route `/model/:id` |
| `web/gui/worker-relay.js` | — | SSE + Worker HTTP relay | Subsumed by Hono `app.request()` + `mountWorkerRelay()` |

## References

- ADR-0018: Code Mode MCP (Stage 3 multi-module vision)
- ADR-0019: GUI Unification (browser dispatch prerequisite)
- ADR-0023: Georeferencing (affected by module boundaries)
- ADR-0024: Multi-WASM Module Architecture (plugin split enables tiered loading)
- ADR-0025: Tiered Object Scaling (Hot/Warm/Cold object lifecycle)
- ADR-0004: Hybrid Semantic BIM (IFC B-Rep promotion)
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Service Bindings: https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/
