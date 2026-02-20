# [ADR-002] Truck CAD Kernel

## Status

**Implemented**. 27 commands shipped, direct modeling with B-Rep geometry.

## Context

We need a geometry kernel that:
- Runs in the browser via WASM (no server GPU required)
- Provides true B-Rep (Boundary Representation) for manufacturing-grade precision
- Supports boolean operations (union, subtract, intersect)
- Has STEP import/export for industry interoperability
- Is written in Rust (memory safety, WASM compilation, performance)

## Decision

Use [truck](https://github.com/ricosjp/truck) — a pure Rust B-Rep CAD kernel with WebGPU rendering.

### Why truck?

- **Pure Rust**: Compiles to `wasm32-unknown-unknown` via `wasm-bindgen`. No C/C++ dependencies to cross-compile.
- **B-Rep native**: Topology (vertices, edges, faces, shells, solids) + NURBS geometry. Not mesh-only.
- **WebGPU rendering**: `truck-rendimpl` provides GPU tessellation and rendering via `wgpu`.
- **Boolean ops**: `truck-shapeops` handles union/subtract/intersect on B-Rep solids.
- **STEP I/O**: `truck-stepio` reads/writes ISO 10303 (STEP) files — the manufacturing standard.

### What's implemented

The `SceneController` in `wasm_app.rs` exposes a single `execute(type, json)` entry point. 27 command types:

**Primitives**: `add_cube`, `add_sphere`, `add_cylinder`, `add_torus`
**Transforms**: `translate`, `rotate`, `scale`, `duplicate`
**Booleans**: `boolean_union`, `boolean_subtract`, `boolean_intersect`
**Selection**: `select`, `deselect`, `pick_at`
**Style**: `set_style`, `get_object_style`, `set_color`, `rename`
**Scene**: `delete`, `clear`, `export_scene`, `import_scene`, `get_state`
**Sketch**: `begin_sketch`, `end_sketch`, `sketch_extrude`
**History**: `undo`, `redo`
**BIM (stub)**: `import_ifc`

### WASM boundary

Direct `wasm-bindgen` — no RPC framework:

```
JS: JSON.parse(ctrl.execute(type, JSON.stringify(params)))
Rust: pub fn execute(&mut self, cmd_type: &str, params_json: &str) -> String
```

All params and results are JSON. Bulk mesh data (vertices for WebGPU) stays in WASM linear memory and is pushed to GPU buffers directly.

### Key crates

| Crate | Purpose |
|-------|---------|
| `truck-modeling` | B-Rep construction (vertices, edges, wires, faces, shells, solids) |
| `truck-topology` | Topological data structures |
| `truck-shapeops` | Boolean operations on B-Rep solids |
| `truck-stepio` | STEP file import/export |
| `truck-rendimpl` | WebGPU rendering via wgpu |
| `truck-meshalgo` | Tessellation (B-Rep → triangle mesh) |

### Vendor source

truck is cloned to `.src/truck/` (gitignored). We build directly against the vendor source to enable patches and customizations. Clone/update managed by `task truck:deps:clone` / `task truck:deps:upgrade`.

## Files

| File | Role |
|------|------|
| `crates/truck-webgpu-gui/src/wasm_app.rs` | SceneController + `execute()` dispatch |
| `crates/truck-webgpu-gui/src/commands.rs` | Typed param structs + `build_schema()` |
| `crates/truck-webgpu-gui/Cargo.toml` | Dependencies on truck crates |

## Future

- **STEP import/export**: Leverage `truck-stepio` for file exchange (ADR-004 Stage 3).
- **Assembly hierarchy**: `truck-assembly` for multi-part models and BIM spatial hierarchy.
- **Constraint solver**: `ezpz` for parametric constraints on B-Rep geometry (ADR-009).
- **IFC integration**: Map `ifc-lite` building elements to truck geometry (ADR-004).
