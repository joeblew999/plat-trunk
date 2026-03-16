# truck — Rust CAD Kernel

Pure Rust B-Rep CAD kernel with WebGPU rendering.

## What It Is

truck is a Rust library for B-Rep (Boundary Representation) solid modeling. Key crates:

- **truck-modeling**: Geometric primitives, sweeps, boolean operations
- **truck-platform**: Scene management, camera, lighting, event loop
- **truck-rendimpl**: PBR rendering, instance creation, wireframes
- **truck-meshalgo**: Mesh algorithms and tessellation
- **truck-shapeops**: Boolean operations (union, subtract, intersect)

## How We Use It

truck is vendored to `.src/truck/` as a path dependency. Our `systems/truck/crate/` builds on top of it to create the CAD application WASM module.

### Key Operations

| Operation | truck API |
|---|---|
| Create cube | `builder::cube(vertex, edge)` |
| Create sphere | `builder::sphere(center, radius, ...)` |
| Create cylinder | `builder::cylinder(bottom, top, radius)` |
| Translate | Modify vertex positions in topology |
| Boolean union | `truck_shapeops::and(solid_a, solid_b)` |
| Boolean subtract | `truck_shapeops::or(solid_a, solid_b)` (inverted) |
| Extrude profile | `builder::tsweep(face, vector)` |

### Boolean Ops Stability

Boolean operations use `Solid::try_new` (not `Solid::new`) to avoid WASM panics:
- Exact intersection attempted first
- Falls back to perturbed intersection on failure
- AABB containment check rejects degenerate cases (B inside A, etc.)
- Works reliably for cubes, cylinders, and most sphere/torus combinations

The coplanar face bug (issue #57) is **not fixed in truck source** — it's worked around in our code at `systems/truck/crate/src/wasm_app.rs` via `try_bool_with_fallback()` + asymmetric perturbation.

### Serialization

Solids serialize to JSON via serde. This preserves full B-Rep precision (no tessellation loss).

## Source Repository

We use [virtualritz/monstertruck](https://github.com/virtualritz/monstertruck) — a ground-up restructure of the original [ricosjp/truck](https://github.com/ricosjp/truck):

- All crate names: `monstertruck-*` (e.g. `monstertruck-modeling`, `monstertruck-solid`)
- Robust boolean ops returning `Result<Solid, ShapeOpsError>` (no panics)
- Fillet engine, T-splines, parallel tessellation
- `difference()` + `symmetric_difference()` boolean ops
- Idiomatic Rust naming with industry-standard CAD terminology

Source is vendored in `.src/truck/` via `mise run src:sync`.

## Upstream Issues & Feature Gaps

Key upstream issues that affect us:

| Issue | Title | Status |
|---|---|---|
| [#57](https://github.com/ricosjp/truck/issues/57) | Shapeops fails on coplanar faces | **Workaround in our code** (perturbation) |
| [#17](https://github.com/ricosjp/truck/issues/17) | Boolean core reliability | Open |
| [#53](https://github.com/ricosjp/truck/issues/53) | Chamfer / Fillet | **Fixed in monstertruck** |
| [#13](https://github.com/ricosjp/truck/issues/13) | T-Splines | **Fixed in monstertruck** |
| [#85](https://github.com/ricosjp/truck/issues/85) | Missing difference/xor boolean | **Fixed in monstertruck** |
| [#37](https://github.com/ricosjp/truck/issues/37) | 2D sketching / constraint solving | Open |
| [#79](https://github.com/ricosjp/truck/issues/79) | Helix / screw modeling | Open |
| [#68](https://github.com/ricosjp/truck/issues/68) | Boolean operations slow | Open |

### Other Forks & PRs

Available for future cherry-picks (not currently used):

| Source | What |
|---|---|
| [ovo-Tim PR #110](https://github.com/ricosjp/truck/pull/110) | Coplanar boolean fix (partial — only partial-face overlap) |
| [ovo-Tim PR #111](https://github.com/ricosjp/truck/pull/111) | STEP import fix |
| [thayashi-tech PR #112](https://github.com/ricosjp/truck/pull/112) | Non-intersect bbox fix |
| [sethml PR #109](https://github.com/ricosjp/truck/pull/109) | Binary STL read fix >8192 bytes |
| [xgarnaud PR #101](https://github.com/ricosjp/truck/pull/101) | More tessellation parameters |

### Related Projects

| Project | Description |
|---|---|
| [Fornjot](https://github.com/hannobraun/fornjot) | Rust B-Rep kernel (experimental, no booleans yet) |
| [opencascade-rs](https://github.com/bschwind/opencascade-rs) | Rust bindings to OpenCASCADE (OCCT) |
| [curvo](https://github.com/mattatz/curvo) | Rust NURBS curves/surfaces library |
| [FoxCAD](https://github.com/ovo-Tim/FoxCAD) | Rust+WASM browser CAD (by ovo-Tim, also built on truck) |
| [CADmium](https://github.com/CADmium-Co/CADmium) | Was built on truck, archived Sep 2025 |
| [KittyCAD/modeling-app](https://github.com/KittyCAD/modeling-app) | Zoo (commercial), VC-funded, custom engine |

## Build

```sh
bun run build:truck    # Build sync WASM + truck WASM + generate cad-schema.json
bun run test:crate     # Run Rust tests (contract + truck-sync + native tests)
```

## Schema Generation

The truck crate includes a `generate-schema` binary that outputs `cad-schema.json` — the single source of truth for all 52+ commands. Each command is annotated with:
- `domain` (geometry, scene, booleans, sketch, style)
- `ephemeral` (true = control plane, false = data plane)
- `readonly` (true = no state mutation)
- `params` (JSON Schema from `#[derive(JsonSchema)]`)
