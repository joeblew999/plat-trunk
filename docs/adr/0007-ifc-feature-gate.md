# ADR-0007: IFC Feature Gate

**Status:** Proposed
**Date:** 2026-03-09

## Context

IFC support (`ifc-lite-core`, `ifc-lite-geometry`) is unconditionally compiled into the truck crate. The `import_ifc` implementation is duplicated inline in both `headless.rs` (~110 lines) and `wasm_app.rs` (~110 lines).

By contrast, MVT support follows a clean pattern:
- Feature-gated: `#[cfg(feature = "mvt")]` in `lib.rs`
- Own module: `src/mvt/mod.rs`
- Optional deps: `geozero`, `earcutr`, `bytes`, `prost`
- Cargo.toml: `mvt = ["dep:geozero", "dep:earcutr", "dep:bytes", "dep:prost"]`

IFC should follow the same pattern. Benefits:
1. **Compile-time isolation** — builds without IFC are faster and smaller
2. **No code duplication** — single `src/ifc/mod.rs` shared by headless + wasm_app
3. **Consistent architecture** — every import format follows the same pattern
4. **Test isolation** — IFC tests only run when the feature is enabled

## Decision

Feature-gate IFC following the MVT pattern.

### 1. Cargo.toml changes

```toml
# Make IFC deps optional
ifc-lite-core = { path = "../../../.src/ifc-lite/rust/core", optional = true }
ifc-lite-geometry = { path = "../../../.src/ifc-lite/rust/geometry", optional = true }

[features]
default = ["rendering", "mvt", "ifc"]
ifc = ["dep:ifc-lite-core", "dep:ifc-lite-geometry"]
```

### 2. Extract `src/ifc/mod.rs`

Move the duplicated `import_ifc` logic from `headless.rs` and `wasm_app.rs` into a single module:

```rust
// systems/truck/crate/src/ifc/mod.rs
use ifc_lite_core as ifc;
use ifc_lite_geometry::router::GeometryRouter;

pub fn import_ifc(data: &str) -> Result<Vec<ImportedObject>, String> {
    // ~110 lines, shared by headless + wasm_app
}

pub struct ImportedObject {
    pub mesh: PolygonMesh,
    pub name: String,
    pub bim_metadata: Option<BimMetadata>,
    pub parent_id: Option<String>,
}
```

### 3. Gate in lib.rs

```rust
#[cfg(feature = "ifc")]
pub mod ifc;
```

### 4. Gate dispatch arms

In both `headless.rs` and `wasm_app.rs`, the `import_ifc` match arm becomes:

```rust
#[cfg(feature = "ifc")]
"import_ifc" => ifc::import_ifc(&params.data),
#[cfg(not(feature = "ifc"))]
"import_ifc" => Err("IFC support not compiled (enable 'ifc' feature)".into()),
```

### 5. Schema entry

The `import_ifc` schema entry in `commands/scene.rs` stays unconditional — the command always exists in the schema, it just returns an error if the feature is disabled. This keeps the API surface stable.

## Consequences

- IFC is on by default (`default = [..., "ifc"]`) — no behavior change for existing builds
- Builds without IFC skip `ifc-lite-core` and `ifc-lite-geometry` compilation
- Single source of truth for IFC import logic (no more headless/wasm_app duplication)
- Future: if IFC grows into its own system (`systems/ifc/`), the module is already isolated

## Effort

Small — ~2 hours. Extract duplicated code, add feature gate, verify `cargo test` and `bun run test` pass with and without the feature.
