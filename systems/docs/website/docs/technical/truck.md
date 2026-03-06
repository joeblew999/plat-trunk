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

## Source Repositories

We track three repos (virtualritz/truck is dead — superseded by monstertruck):

| Repo | URL | Status |
|---|---|---|
| **ricosjp/truck** | https://github.com/ricosjp/truck | Original upstream. Effectively unmaintained. Reference only. |
| **virtualritz/monstertruck** | https://github.com/virtualritz/monstertruck | **Active development.** Ground-up restructure by Moritz Moeller. Fillet, T-splines, parallel mesh, new boolean ops, 16+ modular crates. |
| **joeblew999/truck** | https://github.com/joeblew999/truck | **Our fork.** Currently uses truck-* crate names. Composite branch built by `truck-update.sh`. |

### Monstertruck

[virtualritz/monstertruck](https://github.com/virtualritz/monstertruck) is a ground-up restructure of truck:
- All crate names change: `truck-*` → `monstertruck-*`
- Modular split: 16+ crates (core, derive, traits, geometry, topology, modeling, solid, assembly, mesh, meshing, gpu, render, step, wasm)
- Idiomatic Rust naming with industry-standard CAD terminology
- Improved build times via smaller crates
- New boolean ops: `difference()` and `symmetric_difference()`

#### Crate Name Mapping

| truck | monstertruck |
|---|---|
| `truck-modeling` | `monstertruck-modeling` |
| `truck-shapeops` | `monstertruck-solid` |
| `truck-meshalgo` | `monstertruck-meshing` |
| `truck-rendimpl` | `monstertruck-render` |
| `truck-platform` | `monstertruck-gpu` |
| `truck-base` | `monstertruck-core` |
| `truck-stepio` | `monstertruck-step` |
| `truck-polymesh` | `monstertruck-mesh` |
| `truck-topology` | `monstertruck-topology` |
| *(new)* | `monstertruck-traits`, `monstertruck-derive`, `monstertruck-assembly` |

#### API Changes

Core types are **unchanged**: `Solid`, `Wire`, `Face`, `Edge`, `Vertex`, `Point3`, `Vector3`.

Function renames:

| truck | monstertruck | Call sites in our code |
|---|---|---|
| `builder::tsweep()` | `builder::extrude()` | ~5 |
| `builder::rsweep()` | `builder::revolve()` | ~2 |
| `Curve::BSplineCurve` | `Curve::BsplineCurve` | 1 (pattern match in `lib.rs`) |

**Migration is automated**: `bun run truck:update:monster` checks out monstertruck source into `.src/truck/` and auto-patches our crate code (Cargo.toml deps + Rust imports + API renames). `bun run truck:update` switches back.

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

## Fork Management

The `scripts/truck-update.sh` script manages our fork. It tracks 3 repos as git remotes in `.src/truck/` and **auto-patches our crate code** when switching between truck and monstertruck.

### Commands

```sh
# joeblew999/truck (current base — truck-* crate names)
bun run truck:update              # Full: fetch → composite → auto-patch → build + test
bun run truck:update:quick        # Git only, skip build/test

# monstertruck (auto-patches code to monstertruck-* crate names)
bun run truck:update:monster      # Full: fetch → composite-monstertruck → auto-patch → build + test
bun run truck:update:monster:quick # Git only

# Status (read-only)
bun run truck:status              # Show all remotes, active base, monstertruck crate count
```

### How It Works

1. **Ensures 3 remotes** in `.src/truck/`: `origin` (joeblew999/truck), `upstream` (ricosjp/truck), `monstertruck` (virtualritz/monstertruck)
2. **Fetches all remotes**
3. **Creates composite branch** from selected base:
   - Default: `composite` from `origin/master` (our fork, truck-* names)
   - With `--base=monstertruck`: `composite-monstertruck` from `monstertruck/main`
4. **Auto-patches `systems/truck/crate/`**:
   - `truck:update` → ensures truck-* crate names in Cargo.toml + Rust source
   - `truck:update:monster` → rewrites to monstertruck-* names + API renames (`tsweep`→`extrude`, etc.)
5. **Runs 5-step verification** (unless `--no-build`):
   - `cargo check` — type-check our crate against the composite
   - `cargo test` — kernel's own tests (adapts package names per base)
   - `wasm-pack build` — verify WASM compilation
   - `cargo run --bin generate-schema` — regenerate cad-schema.json
   - `bun x vitest run` — API tests against the new WASM

### Status Output

```
=== Truck Fork Status ===
Current branch: composite → abc1234 Latest commit message
Active base: joeblew999/truck
Remotes:
  origin         https://github.com/joeblew999/truck.git
  upstream       https://github.com/ricosjp/truck.git
  monstertruck   https://github.com/virtualritz/monstertruck.git
Monstertruck (active development):
  monstertruck/master → ghi9012 2026-02-15 Latest commit
  Crates: 16 monstertruck-* modules
```

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
bun run test:crate     # Run Rust tests (schema_contract + truck-sync + native tests)
```

## Schema Generation

The truck crate includes a `generate-schema` binary that outputs `cad-schema.json` — the single source of truth for all 52+ commands. Each command is annotated with:
- `domain` (geometry, scene, booleans, sketch, style)
- `ephemeral` (true = control plane, false = data plane)
- `readonly` (true = no state mutation)
- `params` (JSON Schema from `#[derive(JsonSchema)]`)
