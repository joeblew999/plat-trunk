# ADR-0002: GeometryStore — Single Source of Truth for All CAD Operations

## Status

**Proposed** — 2026-03-06

## Principle

The server MUST be able to do everything the browser can do, except render. Every geometry command is implemented ONCE in a shared engine. New command = add it once, both actors get it automatically. Bug fix = fix it once, both actors are fixed.

## Backwards Compatibility

**Breaking internal compat is allowed.** Struct fields, method signatures, module visibility — all can change freely. Four external contracts preserved:

1. **WASM exports**: `HeadlessController.new()`, `.execute(cmd, params_json) -> String`
2. **JSON protocol**: Same commands, same param shapes, same response shapes
3. **Schema**: `cad-schema.json` generated from `commands.rs`
4. **ADR-0001 dependency**: `replayModel()` and MCP server-direct execution (ADR-0001 Part A2/C) call `HeadlessController.execute()` — this public API is unchanged by the refactor. ADR-0002 must land first; ADR-0001 builds on top of the stable engine it produces.

## Problem

`headless.rs` (server) and `wasm_app.rs` (browser) independently implement the same CAD operations. This causes:

- **Drift**: Boolean perturbation strategies diverged. Containment logic only in browser. `quick_rect_extrude` missing from server entirely.
- **Double work**: Every new command must be written in two files.
- **Silent bugs**: Fixes applied to one file but not the other.

### What's duplicated (~810 lines)

| Layer | What | Lines |
|-------|------|-------|
| Data types | `BimMetadata`, `BimNodeJson`, `ObjectStyle`, `ExportEntry` — identical in both files | ~80 |
| Object store | `add_solid`, `add_mesh`, `rebuild_id_index`, `next_name` — same logic, different struct types | ~80 |
| Import logic | IFC import (~120 lines), STEP import (~30 lines) — nearly identical | ~150 |
| Command methods | `add_cube`, `translate`, `boolean_union`, `export_scene`, etc. — geometry logic duplicated | ~300 |
| Dispatch tables | Param parsing + JSON wrapping for ~25 commands | ~200 |

### What's NOT duplicated (structurally different)

| Layer | Why it's different |
|-------|-------------------|
| GPU instance creation (`solid_to_instances`, `mesh_to_instances`) | Only browser has GPU |
| Scene rebuild (`rebuild_scene`, `rebuild_bounding_spheres`) | Only browser has `Scene` |
| rsweep guard (block booleans on sphere/torus) | Browser-only WASM trap issue |
| Containment short-circuit (`check_sphere_containment`) | Uses pick mesh AABB — rendering data |
| Selection, gizmos, interaction mode | Pure rendering |
| Camera, mouse, touch event loop | Pure rendering |
| LOD proxies | Pure rendering |
| `_replayId` renaming | Browser replay only |

### Known gaps (bugs)

| Command | Server | Browser | Issue |
|---------|--------|---------|-------|
| `quick_rect_extrude` | Missing | Works | Server can't do what browser can — violates principle |
| `set_mode` | Missing | Missing | Dead schema entry — in `commands.rs` but not dispatched anywhere |
| `set_automerge` | Missing | Missing | Dead schema entry — in `commands.rs` but not dispatched anywhere |

## Decision

### Architecture: Data Plane / Control Plane

```
CONTROL PLANE (routing, dispatch, hooks)
├── HeadlessController (server)
│   = GeometryStore + JSON dispatch + WASM glue
│
├── SceneController (browser)
│   = GeometryStore + JSON dispatch + rendering sync + rendering hooks
│
└── External actors unchanged:
    MCP bridge → Worker /mcp → HeadlessController.execute()
    Browser JS → SceneController.execute()
    HTTP API → Worker routes → HeadlessController.execute()
    CRDT Replay → HeadlessController.execute() per op

DATA PLANE (geometry computation)
├── GeometryStore — object store + ALL command implementations
│   (new always-compiled module: geometry_store.rs)
│
└── lib.rs — pure geometry functions (make_cube, bool_union, etc.)
```

This is the same Data Plane / Control Plane split used in ADR-0001 (sync layer). ADR-0001 line 85: "Only data-plane commands (add_cube, boolean_union, translate, etc.) execute server-direct" — those are exactly the commands in GeometryStore.

### GeometryStore: the shared engine

A new file `geometry_store.rs` that is **always compiled** — no cfg gates. Both headless.rs and wasm_app.rs import from it.

This solves the **cfg gate conflict**: today headless.rs compiles when `wasm32 + NOT rendering` or `native`. wasm_app.rs compiles when `wasm32 + rendering`. These are mutually exclusive — wasm_app CANNOT import from headless.rs. GeometryStore lives in its own always-compiled module, accessible to both.

```rust
// geometry_store.rs — always compiled, no cfg gates, no WASM deps, no rendering deps

pub(crate) struct GeometryObject {
    pub(crate) id: Uuid,
    pub(crate) name: String,
    pub(crate) solid: Option<Solid>,
    pub(crate) mesh: PolygonMesh,
    pub(crate) style: ObjectStyle,
    pub(crate) bim: Option<BimMetadata>,
}

pub(crate) struct GeometryStore {
    pub(crate) objects: Vec<GeometryObject>,
    pub(crate) id_to_index: HashMap<String, usize>,
    pub(crate) name_counters: HashMap<String, usize>,
    pub(crate) active_sketch: Option<Sketch>,
}

impl GeometryStore {
    // Every geometry command — implemented ONCE:
    pub(crate) fn add_cube(&mut self, size: f64) -> String { ... }
    pub(crate) fn add_sphere(&mut self, radius: f64) -> String { ... }
    pub(crate) fn add_cylinder(&mut self, radius: f64, height: f64) -> String { ... }
    pub(crate) fn add_torus(&mut self, major_r: f64, minor_r: f64) -> String { ... }
    pub(crate) fn translate_object(&mut self, id: &str, dx: f64, dy: f64, dz: f64) -> bool { ... }
    pub(crate) fn rotate_object(&mut self, id: &str, ...) -> bool { ... }
    pub(crate) fn scale_object(&mut self, id: &str, ...) -> bool { ... }
    pub(crate) fn duplicate_object(&mut self, id: &str) -> String { ... }
    pub(crate) fn boolean_union(&mut self, id_a: &str, id_b: &str) -> String { ... }
    pub(crate) fn boolean_subtract(&mut self, id_a: &str, id_b: &str) -> String { ... }
    pub(crate) fn boolean_intersect(&mut self, id_a: &str, id_b: &str) -> String { ... }
    pub(crate) fn clash_detect(&self, id_a: &str, id_b: &str) -> bool { ... }
    pub(crate) fn delete_object(&mut self, id: &str) -> bool { ... }
    pub(crate) fn clear_scene(&mut self) { ... }
    pub(crate) fn export_scene(&self) -> String { ... }
    pub(crate) fn export_step(&self) -> String { ... }
    pub(crate) fn export_obj(&self) -> String { ... }
    pub(crate) fn export_stl(&self) -> String { ... }
    pub(crate) fn import_scene(&mut self, json: &str) -> bool { ... }
    pub(crate) fn import_step(&mut self, data: &str) -> serde_json::Value { ... }
    pub(crate) fn import_ifc(&mut self, data: &str) -> serde_json::Value { ... }
    pub(crate) fn quick_rect_extrude(&mut self, ...) -> String { ... }
    pub(crate) fn rename_object(&mut self, id: &str, name: &str) -> bool { ... }
    pub(crate) fn get_bim_metadata(&self, id: &str) -> String { ... }
    pub(crate) fn get_state(&self) -> serde_json::Value { ... }
    // Sketch ops:
    pub(crate) fn begin_sketch(&mut self, plane: &str) -> String { ... }
    pub(crate) fn sketch_add_point(&mut self, x: f64, y: f64) -> String { ... }
    pub(crate) fn sketch_add_edge(&mut self, p0_id: &str, p1_id: &str) -> String { ... }
    pub(crate) fn sketch_add_constraint(&mut self, kind: &str, params: &str) -> String { ... }
    pub(crate) fn sketch_solve(&self) -> serde_json::Value { ... }
    pub(crate) fn sketch_cancel(&mut self) { ... }
    pub(crate) fn sketch_export(&self) -> String { ... }
    pub(crate) fn sketch_extrude(&mut self, height: f64, sketch_json: &str) -> String { ... }
    // Internal helpers:
    fn add_solid(&mut self, solid: Solid, kind: &str, bim: Option<BimMetadata>) -> String { ... }
    fn add_mesh(&mut self, mesh: PolygonMesh, kind: &str, bim: Option<BimMetadata>) -> String { ... }
    fn rebuild_id_index(&mut self) { ... }
    fn tessellate_solid(solid: &Solid) -> PolygonMesh { ... }
}
```

Also in `geometry_store.rs` — the shared data types (defined ONCE):

```rust
pub(crate) struct ObjectStyle { ... }      // data only — no rendering methods
pub(crate) struct BimMetadata { ... }
pub(crate) struct BimNodeJson { ... }
pub(crate) struct ExportEntry {
    // ... same fields ...
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub(crate) is_rsweep: bool,   // browser sets this, server ignores it
}
```

`ObjectStyle` rendering methods (`from_index()`, `to_material_color()`) become free functions in wasm_app.rs — they need the `COLORS` constant and `Vector4` type which are rendering-only.

### HeadlessController: server shell

```rust
// headless.rs — thin wrapper, compiled for server + native tests

pub struct HeadlessController {
    store: GeometryStore,
}

impl HeadlessController {
    pub fn new() -> Self {
        HeadlessController { store: GeometryStore::new() }
    }

    // Direct method access (used by tests):
    pub fn add_cube(&mut self, size: f64) -> String { self.store.add_cube(size) }
    pub fn object_count(&self) -> usize { self.store.objects.len() }
    // ...

    // JSON dispatch (used by Worker):
    pub fn execute(&mut self, cmd: &str, params_json: &str) -> String {
        // parse params → call self.store.method() → wrap in JSON
    }
}
```

### SceneController: browser shell

```rust
// wasm_app.rs — rendering wrapper, compiled for browser

struct SharedState {
    store: GeometryStore,                          // DATA PLANE
    // RENDERING (not in server):
    scene: Scene,
    creator: InstanceCreator,
    surface: wgpu::Surface<'static>,
    render_instances: HashMap<String, RenderInstance>,
    bounding_spheres: Vec<(String, Point3, f64)>,
    rsweep_ids: HashSet<String>,
    interaction: InteractionMode,
    selected: Option<String>,
    lod_proxies: Vec<LodProxy>,
    on_select: Option<js_sys::Function>,
    on_drag_complete: Option<js_sys::Function>,
    camera_external: bool,
    rotate_flag: bool,
    prev_cursor: Vector2,
    touches: HashMap<u64, Vector2>,
    prev_pinch_dist: Option<f64>,
}
```

### Rendering sync: 5 functions, write once

After GeometryStore mutates data, the browser updates GPU instances. Every command falls into one of 5 patterns:

| Sync function | Used by | What it does |
|--------------|---------|-------------|
| `sync_after_add(id)` | add_cube, add_sphere, add_cylinder, add_torus, sketch_extrude, quick_rect_extrude, duplicate | Create GPU polygon + wireframe + pick mesh for the new object |
| `sync_after_transform(id)` | translate, rotate, scale | Recreate GPU instances for that one object |
| `sync_after_boolean(old_a, old_b, new_id)` | boolean_union, subtract, intersect | Remove GPU for 2 old objects, create for 1 new |
| `sync_after_delete(id)` | delete | Remove GPU instances for that object |
| `sync_all()` | clear, import_scene, import_step, import_ifc | Rebuild all GPU instances from store |

No diffing. No event queues. No observer pattern. The caller knows what mutation it performed, so it knows which sync to call.

These functions contain the rendering code that ALREADY exists today — scattered across 20 method bodies. It's extracted into 5 reusable functions. Not new code, reorganized code.

### Dispatch tables: accepted boilerplate

Both controllers keep their own `execute()` dispatch (~200 lines each). This is param-parsing boilerplate, NOT logic duplication. The two dispatchers differ:

- Browser has rendering-only commands: `select_at`, `pick_at`, `set_camera`, `set_style`, `set_color`, `get_object_style`, `pick_mesh_stats`
- Browser has `_replayId` post-processing
- Browser has rsweep guards on boolean dispatch
- Server has domain-organized sub-dispatchers

Per-command cost in browser dispatch: ONE extra line (the sync call). Not worth a macro or codegen.

### Containment short-circuit

`check_sphere_containment()` uses pick mesh AABB — rendering-only data. Stays in wasm_app as a pre-check before calling `store.boolean_*()`. This is correct layering: rendering concerns in the rendering layer, geometry in the geometry layer.

### What about logging?

GeometryStore has no logging. It returns results; callers log. Errors come back as empty strings or error JSON values. HeadlessController and SceneController each have their own logging setup (console.log for WASM, println for native tests).

## Future: Format Workers via Cloudflare RPC Service Bindings

GeometryStore's clean method boundaries create natural splitting seams for when the server WASM approaches the 3MB worker size limit. Format handlers (IFC, STEP, MVT, glTF, etc.) are **stateless transformations** — they don't need GeometryStore. They just convert bytes between formats. That makes them perfect candidates for separate workers.

### The pattern

```
truck-core worker (stateful — has GeometryStore)
  ├── GeometryStore: primitives, transforms, booleans, sketch
  ├── Core deps: monstertruck-modeling, monstertruck-meshing
  └── HeadlessController dispatch (routes to local or RPC)

truck-ifc worker (stateless format handler)
  ├── Deps: ifc-lite-core, ifc-lite-geometry, nalgebra
  ├── IN:  IFC file bytes
  └── OUT: [{solid_json, mesh_json, name, bim_metadata}, ...]

truck-step worker (stateless format handler)
  ├── Deps: monstertruck-step
  ├── Import: STEP bytes → [{solid_json, name}, ...]
  └── Export: [{solid_json, name}, ...] → STEP bytes

truck-mvt worker (stateless format handler)
  ├── Deps: geozero, prost, earcutr, bytes
  ├── IN:  MVT protobuf bytes
  └── OUT: [{mesh_json, name, layer}, ...]

truck-gltf worker (stateless format handler)
  ├── Deps: gltf crate
  ├── IN:  glTF bytes
  └── OUT: [{mesh_json, name}, ...]
```

### Import flow (with RPC)

```
1. MCP/HTTP calls: import_ifc(data)
2. truck-core receives it
3. Forwards raw bytes to truck-ifc worker via CF RPC service binding
4. truck-ifc parses → returns array of parsed objects
5. truck-core calls store.add_solid() / store.add_mesh() for each
6. Returns summary to caller
```

Export is the reverse — truck-core serializes objects from GeometryStore, forwards to format worker, format worker produces output bytes.

### Shared contract between core and format workers

```typescript
interface ParsedObject {
  solid_json?: string;       // serialized truck Solid (if solid geometry)
  mesh_json?: string;        // serialized PolygonMesh (if mesh-only)
  name: string;
  bim?: BimMetadata;         // IFC-specific
  layer?: string;            // MVT-specific
}

interface FormatImportResult {
  objects: ParsedObject[];
  warnings?: string[];
}
```

### Why this works

- **Each format worker is tiny** — one format's deps, no GeometryStore, no rendering. Well under 3MB.
- **Stateless** — pure function: bytes in, objects out. Simplest possible worker.
- **Independent deploy** — add glTF support = new worker, new service binding, one dispatch entry in truck-core.
- **Independent testing** — feed a format worker test files, check output. No CAD engine needed.
- **Caller doesn't know** — `HeadlessController.execute("import_ifc", ...)` works the same whether IFC parsing is local or RPC. The dispatch table decides.
- **Browser unaffected** — format splitting is server-only via CF service bindings. Browser keeps everything in one WASM (no equivalent of service bindings in-browser).

### Splitting seam inside GeometryStore

Today `import_ifc()` does both parsing AND adding to the store in one method. When you split:

1. Extract the **parsing** part into the format worker (bytes → ParsedObject array)
2. Keep the **"add to store"** part in GeometryStore (ParsedObject array → stored objects)

The split point is inside the method — clean seam, no abstraction needed today.

### Directory structure (when needed)

```
systems/truck/
  crate/              → truck-core WASM (GeometryStore)
  worker/             → truck-core worker
  web/                → browser app
  formats/
    ifc/
      crate/          → IFC parser WASM
      worker/         → IFC worker + wrangler.toml
    step/
      crate/          → STEP parser WASM
      worker/         → STEP worker + wrangler.toml
    mvt/
      crate/          → MVT parser WASM
      worker/         → MVT worker + wrangler.toml
    gltf/
      crate/          → glTF parser WASM
      worker/         → glTF worker + wrangler.toml
```

Each format worker added to `systems/truck/system.mjs` as an additional worker entry. Same pattern as test-worker today.

### Not now — design for, don't build

This split is a FUTURE optimization, not part of the current refactor. ADR-0002 keeps all formats inside GeometryStore. But the method boundaries it creates are exactly where you'd cut. No premature abstraction needed — when the 3MB limit approaches, extract and deploy.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Rendering sync bugs (stale GPU instances) | Medium | 5 simple, explicit sync patterns. Existing e2e tests catch rendering issues. |
| RefCell borrow conflicts | Medium | Sync functions take `&mut SharedState` — single borrow covers store + rendering. No nested borrows. |
| WASM size increase | Low | GeometryStore code already compiled in both builds. No new deps. |
| Performance (re-tessellation) | Low | `sync_after_transform` re-tessellates one object. `sync_all` only on import/clear. <100 objects typical. |
| Dispatch table drift | Low | Param types in commands.rs (single source). Schema contract test catches format drift. |
| ObjectStyle rendering methods | Low | Moved to free functions in wasm_app. No method on shared type depends on rendering. |

## Migration Plan

Each step is independently testable. `bun run test` after every step. No step changes external behavior.

### Step 1: Create geometry_store.rs with shared types

- New file `geometry_store.rs` — always compiled, no cfg gates
- Move type definitions: `ObjectStyle` (data only), `BimMetadata`, `BimNodeJson`, `ExportEntry` (with `is_rsweep`), `GeometryObject` (renamed from `HeadlessObject`)
- Move `ObjectStyle::from_index()` and `to_material_color()` to free functions in wasm_app.rs
- Both headless.rs and wasm_app.rs import types from `crate::geometry_store`
- Delete duplicate type definitions from both files
- Add `pub(crate) mod geometry_store;` to lib.rs (no cfg gates)
- **Test**: `bun run test`

### Step 2: Move GeometryStore struct + store methods

- Move object store fields and all command method bodies from headless.rs into `GeometryStore`
- Move internal helpers: `tessellate_solid`, `rebuild_id_index`, `next_name`
- HeadlessController wraps `GeometryStore`, delegates all methods (one-liner per method)
- No behavior change — just code moving
- **Test**: `bun run test` (all 114 tests unchanged)

### Step 3: Wire wasm_app to use GeometryStore

- Add `store: GeometryStore` to `SharedState`
- Write the 5 rendering sync functions
- Initially unused — just verify it compiles alongside existing code
- **Test**: `bun run test`

### Step 4: Migrate primitives

- `add_cube/sphere/cylinder/torus`: call `s.store.add_*()` + `sync_after_add()`
- Delete duplicate geometry logic from wasm_app for these 4 methods
- **Test**: `bun run test`

### Step 5: Migrate transforms

- `translate/rotate/scale/duplicate`: call `s.store.*()` + `sync_after_transform()` / `sync_after_add()`
- **Test**: `bun run test`

### Step 6: Migrate booleans

- Keep rsweep guard + containment pre-check in wasm_app
- `boolean_union/subtract/intersect`: call `s.store.*()` + `sync_after_boolean()`
- `clash_detect`: call `s.store.clash_detect()` (no sync needed — read-only)
- **Test**: `bun run test`

### Step 7: Migrate scene + import ops

- `delete/clear/export_*/import_*/import_step/import_ifc`
- IFC and STEP import move to GeometryStore — biggest single win (~150 lines)
- **Test**: `bun run test`

### Step 8: Migrate sketch + remaining ops

- Sketch ops, `rename`, `get_bim_metadata`, `get_state`, `quick_rect_extrude`
- `quick_rect_extrude` now works on server too (fixes gap)
- **Test**: `bun run test`

### Step 9: Remove old wasm_app object store

- Delete `SceneObject` struct entirely
- Delete `objects: Vec<SceneObject>` from `SharedState`
- Delete `add_solid_to_state`, `add_mesh_to_state`, wasm_app's `rebuild_id_index`
- SharedState uses `store.objects` for geometry, `render_instances` for rendering
- **Test**: `bun run test` + `bun run build` + `bun run test:e2e`

### Realistic line counts

| After step | headless.rs | wasm_app.rs | geometry_store.rs |
|------------|------------|-------------|-------------------|
| Current | ~995 | ~3100 | — |
| Step 1 (types) | ~920 | ~3020 | ~100 |
| Step 2 (extract store) | ~350 | ~3020 | ~670 |
| Steps 3-8 (delegate) | ~350 | ~2500 | ~670 |
| Step 9 (remove old store) | ~350 | ~2200 | ~670 |

wasm_app stays at ~2200 lines — the remaining code is legitimate rendering: event loop (~200), camera/mouse/touch (~200), gizmo/interaction (~300), picking (~150), LOD (~80), rendering sync (~80), style/color GPU rebuild (~60), dispatch with rendering hooks (~300), rendering infrastructure (~200), imports/declarations (~50). None of this is duplicated.

### Plumbing cost

#### One-time cost

| What | Lines | Notes |
|------|-------|-------|
| 5 rendering sync functions | ~80 | Extracted from existing wasm_app code |
| `geometry_store.rs` module declaration | 1 | `pub(crate) mod geometry_store;` in lib.rs |
| HeadlessController delegation methods | ~30 | One-liner per method |

#### Per-new-command cost (ongoing)

| What | Lines | Where |
|------|-------|-------|
| Command implementation | N | `geometry_store.rs` (ONCE) |
| Server dispatch entry | ~5 | `headless.rs` execute() |
| Browser dispatch entry | ~6 | `wasm_app.rs` execute() (same + sync call) |

Compare to today: full implementation in BOTH files + dispatch in BOTH files.

## Automation & Codegen Impact

**Nothing changes.** The refactor is below the `execute()` boundary.

```
commands.rs (#[derive(JsonSchema)])
  → bun run build:truck     → cad-schema.json       [committed]
  → bun run gen:openapi      → openapi.json          [gitignored]
  → bun run gen:api-types    → api-types.ts          [committed]
  → bun run build:truck-web  → dist/                 [gitignored]
```

| Component | Changes? |
|-----------|----------|
| `commands.rs` param structs | **No** |
| `cad-schema.json` | **No** |
| Worker `truck-wasm.ts` | **No** — HeadlessController.execute() signature unchanged |
| Browser WASM API | **No** — SceneController.execute() signature unchanged |
| MCP bridge | **No** — pure HTTP proxy |
| Tests (`tests/*.rs`) | **No** — test HeadlessController which wraps GeometryStore |
| `system.mjs`, `package.json`, `run.mjs` | **No** |
| `check-alignment.mjs` | **No** |

## Test Strategy

### Existing tests — NO changes needed

All tests call `HeadlessController.execute()`. HeadlessController now wraps GeometryStore. External API identical. Tests pass without modification.

| Test file | Tests | Changes? |
|-----------|-------|----------|
| `schema_contract.rs` | 1 | **No** |
| `schema_geometry.rs` | 14 | **No** |
| `schema_booleans.rs` | 5 | **No** |
| `schema_scene.rs` | 6 | **No** |
| `schema_sketch.rs` | 7 | **No** |
| `schema_style.rs` | 3 | **No** |
| `sync_crdt.rs` | 8 | **No** |
| `resources_golden.rs` | 11 | **No** |
| `bool_robustness.rs` | 29 | **No** |
| `worker/*.test.ts` | 30 | **No** |

### New test (Step 9)

Rendering delegation test (wasm-pack test, browser target) verifying SceneController.execute() produces identical JSON output to HeadlessController.execute() for all geometry commands.

## Definition of Done

### Code structure
- [ ] `geometry_store.rs` exists, always compiled, contains ALL geometry command implementations
- [ ] `HeadlessController` wraps `GeometryStore` + dispatch (no own geometry logic)
- [ ] wasm_app `SharedState` contains `GeometryStore` + rendering state (no own geometry logic)
- [ ] Zero duplicate type definitions across files
- [ ] Zero duplicate geometry logic across files
- [ ] `quick_rect_extrude` works on server (gap fixed)
- [ ] Dead schema entries (`set_mode`, `set_automerge`) cleaned up or documented

### Behavioral correctness
- [ ] `bun run test` — all 6 phases pass (114+ tests)
- [ ] `bun run build` — WASM builds for both targets (browser + CF Worker)
- [ ] `bun run test:e2e` — Playwright browser tests pass

### External contracts preserved
- [ ] `cad-schema.json` unchanged
- [ ] `api-types.ts` unchanged
- [ ] Worker `truck-wasm.ts` unchanged
- [ ] MCP tools work via bridge
- [ ] CRDT replay produces same results
- [ ] ADR-0001 server-direct execution path unaffected

### Internal breaking changes (allowed)
- [ ] `HeadlessObject` renamed to `GeometryObject`
- [ ] Shared types moved to `geometry_store.rs`
- [ ] wasm_app `SceneObject` deleted (replaced by `GeometryObject` + `RenderInstance`)
- [ ] `ObjectStyle::from_index()` and `to_material_color()` moved to free functions in wasm_app
