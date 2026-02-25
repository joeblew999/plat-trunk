# ADR-0023: Georeferencing — Unified Coordinate Space for CAD, MVT, and IFC

## Status

Proposed

## Context

The platform uses Truck (https://github.com/ricosjp/truck) as its Rust-based 3D CAD kernel, compiled to WASM. It runs in two environments:

- **Browser** — WebGPU compute + render, fully offline capable
- **Cloudflare Worker** — headless WebGPU compute only, no render

Three geometry sources need to coexist in the same coordinate space:

**1. CAD geometry** — created by users in Truck model space (cubes, sketches, booleans). No inherent coordinate system or units.

**2. MVT tiles** — city context from PMTiles archives on Cloudflare R2 (ADR-0014). **Parsing and extrusion already implemented** in `crates/truck-webgpu-gui/src/mvt/mod.rs`:

- `parse_mvt_tile(data, offset) -> Vec<Solid>` decodes protobuf MVT via `geozero`
- Building/landuse polygons are extruded to 3D B-Rep `Solid` objects via `tsweep`
- MVT (x,y) mapped to Truck ground plane (x,z), Y as height
- Default scale: `1.0` (1 MVT unit = 1 metre), default extrusion: 10 units
- The `offset: Point3` parameter is the hook point for georeferencing
- Feature-gated: `mvt` feature in Cargo.toml (`geozero`, `prost`, `earcutr`, `bytes`)
- `import_mvt` command already wired in `web/gui/state.js`
- **Output: Truck `Solid` (B-Rep)** — full boolean/clash-detection capable

**3. IFC models** — existing building designs imported from Revit/ArchiCAD/etc. **Import already implemented** in `wasm_app.rs:2290-2418`:

- `ifc-lite` parser extracts geometry via `GeometryRouter` + processors for extrusions, brep, CSG, etc.
- IFC files carry their own georeferencing: `IfcMapConversion` (eastings/northings/rotation) + `IfcProjectedCRS` (CRS metadata)
- Georef extraction implemented in `.src/ifc-lite/rust/core/src/georef.rs`
- **Output: `PolygonMesh` (triangles)** — rendering only, no boolean/clash capability
- ADR-0004 plans B-Rep promotion for simple extrusions but it is not yet implemented

When MVT tiles were loaded for Tokyo, geometry did not align — the scaling and coordinate space mismatch was immediately apparent. IFC imports also land at the wrong position because their embedded georef is extracted but not applied.

This ADR defines the plan to create a unified coordinate space where all three sources align correctly, and to promote IFC geometry to B-Rep so it can participate in the same operations as MVT and CAD geometry.

-----

## Problem

Three coordinate systems that don't talk to each other:

| Source | Coordinate system | Units | Geometry type |
|--------|------------------|-------|---------------|
| CAD (Truck) | Abstract model space (origin 0,0,0) | Unitless (`f64`) | `Solid` (B-Rep) |
| MVT tiles | Web Mercator (EPSG:3857), tile-local 0–4096 | Quantised pixels | `Solid` (B-Rep via `tsweep`) |
| IFC models | Projected CRS (UTM, national grids) via `IfcMapConversion` | Metres (typically) | `PolygonMesh` (triangles only) |

**Georeferencing gap:** The MVT parser (`mvt/mod.rs`) accepts an `offset: Point3` but has no Mercator-to-model transform — it just applies a raw offset and scale=1.0. IFC georef is extracted but not applied during import.

**B-Rep gap:** MVT buildings are real `Solid` objects (booleans, clash detection work). IFC buildings are triangle meshes (display only). This means you can't do a boolean between an MVT city block and an IFC building, even if they're in the same coordinate space.

**Scale gap:** It is not yet known what implicit scale Truck is using — whether 1 unit = 1mm, 1m, or something else. The MVT parser currently assumes 1 unit = 1 metre.

-----

## Decision

Two things:

**1. Unified georeferencing** — a coordinate transform pipeline within the Rust WASM crate that maps all three sources into Truck model space:

```
IFC (projected CRS) ──→ GeoReference::map_to_local() ──→╮
                                                          │
CAD geometry ─────────────────────────────────────────────┤→ Truck model space (Y-up, metres)
                                                          │
MVT (Web Mercator) ──→ GeoReference::mercator_to_model()─╯
                                                          │
                        GeoReference::model_to_mercator()─→ Map display
```

**2. IFC B-Rep promotion** — rebuild simple IFC extrusions as Truck `Solid` objects using the same `tsweep` technique the MVT parser already uses. Complex IFC geometry stays as `PolygonMesh`.

The transform parameters (anchor point, scale, bearing) are stored in the Automerge document alongside other scene state, giving us undo/redo, offline persistence, and cross-tab sync for free.

-----

## Implementation Plan

### Phase 1: Confirm Truck’s Unit Scale

**Goal:** Determine what 1 Truck unit represents in the real world.

**What we already know:** Truck has no built-in unit system — coordinates are raw `f64` values. When you call `cad_add_cube(size: 1.0)`, you get a cube from 0 to 1. The existing MVT parser already assumes `scale = 1.0` (1 unit = 1 metre) as a modelling convention.

**What needs confirmation:** Verify that the existing `cad_add_cube(size: 1.0)` produces a 1×1×1 cube (vertex range 0–1) by inspecting the WASM output. This can be done via the existing MCP tools:

```
1. cad_add_cube({size: 1.0})
2. Check the scene — if it renders as expected relative to a 10m MVT extrusion, scale = 1.0 is correct
```

**Convention to adopt:** 1 Truck unit = 1 metre. This matches the MVT parser assumption and is the standard BIM/CAD convention for architectural models. Document this in AGENT.md once confirmed.

**If scale is NOT 1:1 with metres:** Update `units_to_metres` in the `GeoReference` struct and the MVT parser’s `scale` constant.

-----

### Phase 2: Define the Transform Struct

**Goal:** A single Rust struct that holds georeferencing parameters and performs all coordinate transforms.

**Design informed by existing IFC georef** (`.src/ifc-lite/rust/core/src/georef.rs`). The IFC `GeoReference` already implements scale + rotation + offset with `to_matrix()`, inverse transform, and RTC offset handling. This struct follows the same pattern but targets Web Mercator instead of projected CRS.

```rust
// src/georef.rs

use wasm_bindgen::prelude::*;

/// Georeferencing parameters that anchor Truck model space to Earth.
///
/// Axis convention: Truck uses Y-up. The ground plane is XZ.
/// - Truck X → East  (Mercator +X)
/// - Truck Z → North (Mercator +Y)
/// - Truck Y → Up    (height, orthogonal to ground)
///
/// Bearing rotates in the XZ ground plane (around Y axis), matching
/// the MVT parser convention in mvt/mod.rs.
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct GeoReference {
    /// Latitude of the model origin in decimal degrees (WGS84)
    anchor_lat: f64,
    /// Longitude of the model origin in decimal degrees (WGS84)
    anchor_lon: f64,
    /// Rotation of the model relative to true north, in radians.
    /// Rotates in the XZ ground plane (around Y axis).
    bearing: f64,
    /// Scale factor: multiply by this to convert 1 Truck unit → metres
    /// e.g. 1.0 if units are metres, 0.001 if units are millimetres
    units_to_metres: f64,
}

const EARTH_RADIUS: f64 = 6378137.0; // WGS84 semi-major axis in metres
const MAX_MERCATOR: f64 = 20037508.342789244;

#[wasm_bindgen]
impl GeoReference {
    #[wasm_bindgen(constructor)]
    pub fn new(
        anchor_lat: f64,
        anchor_lon: f64,
        bearing: f64,
        units_to_metres: f64,
    ) -> Self {
        Self { anchor_lat, anchor_lon, bearing, units_to_metres }
    }

    /// Hardcoded Tokyo test anchor — use for development only
    pub fn tokyo_test() -> Self {
        Self {
            anchor_lat: 35.6762,
            anchor_lon: 139.6503,
            bearing: 0.0,
            units_to_metres: 1.0, // update after Phase 1 investigation
        }
    }

    /// Convert WGS84 lon/lat to Web Mercator metres (EPSG:3857)
    fn lon_lat_to_mercator(lon: f64, lat: f64) -> (f64, f64) {
        let x = lon.to_radians() * EARTH_RADIUS;
        let y = (lat.to_radians().tan() + 1.0 / lat.to_radians().cos())
            .ln() * EARTH_RADIUS;
        (x, y)
    }

    /// Convert Mercator metres to MVT tile pixel coordinates at a given zoom
    fn mercator_to_tile_px(mx: f64, my: f64, zoom: u32) -> (f64, f64) {
        let tile_size = 4096.0_f64;
        let resolution = (MAX_MERCATOR * 2.0) / (tile_size * 2f64.powi(zoom as i32));
        let px = (mx + MAX_MERCATOR) / resolution;
        let py = (MAX_MERCATOR - my) / resolution;
        (px, py)
    }

    /// Transform a Truck model-space point (Y-up) to Web Mercator metres.
    ///
    /// Truck coords: (x, y, z) where Y is up, XZ is ground plane.
    /// Mercator coords: (easting, northing) where X is east, Y is north.
    /// Mapping: Truck X → Mercator easting, Truck Z → Mercator northing.
    pub fn model_to_mercator(&self, x: f64, y: f64, z: f64) -> Vec<f64> {
        // Step 1: apply scale — convert Truck units to metres
        let east_m  = x * self.units_to_metres;  // Truck X = east
        let up_m    = y * self.units_to_metres;   // Truck Y = height (preserved)
        let north_m = z * self.units_to_metres;   // Truck Z = north

        // Step 2: apply bearing rotation in the ground plane (around Y axis)
        // This rotates (east, north) by bearing angle
        let cos_b = self.bearing.cos();
        let sin_b = self.bearing.sin();
        let r_east  = east_m * cos_b - north_m * sin_b;
        let r_north = east_m * sin_b + north_m * cos_b;

        // Step 3: get anchor in Mercator
        let (anchor_mx, anchor_my) = Self::lon_lat_to_mercator(
            self.anchor_lon, self.anchor_lat
        );

        // Step 4: offset from anchor
        vec![anchor_mx + r_east, anchor_my + r_north, up_m]
    }

    /// Inverse: transform Web Mercator metres back to Truck model-space (Y-up).
    pub fn mercator_to_model(&self, merc_x: f64, merc_y: f64, merc_z: f64) -> Vec<f64> {
        let (anchor_mx, anchor_my) = Self::lon_lat_to_mercator(
            self.anchor_lon, self.anchor_lat
        );

        // Remove anchor offset
        let dx = merc_x - anchor_mx;
        let dy = merc_y - anchor_my;

        // Inverse bearing rotation
        let cos_b = self.bearing.cos();
        let sin_b = self.bearing.sin();
        let east_m  =  cos_b * dx + sin_b * dy;
        let north_m = -sin_b * dx + cos_b * dy;

        // Inverse scale
        let inv_s = if self.units_to_metres.abs() < f64::EPSILON {
            1.0
        } else {
            1.0 / self.units_to_metres
        };

        // Map back: Mercator easting → Truck X, Mercator northing → Truck Z
        vec![east_m * inv_s, merc_z * inv_s, north_m * inv_s]
    }

    /// Get 4x4 transformation matrix (column-major for WebGPU/Three.js).
    ///
    /// Encodes scale + bearing rotation + anchor offset.
    /// Useful for Option B (render-time transform via view matrix).
    /// Follows the same pattern as IFC GeoReference::to_matrix().
    pub fn to_matrix(&self) -> Vec<f64> {
        let s = self.units_to_metres;
        let cos_b = self.bearing.cos();
        let sin_b = self.bearing.sin();
        let (anchor_mx, anchor_my) = Self::lon_lat_to_mercator(
            self.anchor_lon, self.anchor_lat
        );

        // Column-major 4x4: maps Truck (X,Y,Z) → Mercator (east, up, north)
        // Row 0: Truck X → Mercator east   (cos_b, 0, sin_b, 0)
        // Row 1: Truck Y → height          (0, 1, 0, 0)
        // Row 2: Truck Z → Mercator north  (-sin_b, 0, cos_b, 0)
        // Row 3: translation               (anchor_mx, 0, anchor_my, 1)
        vec![
            s * cos_b,   0.0,  s * sin_b,  0.0,
            0.0,         s,    0.0,        0.0,
            -s * sin_b,  0.0,  s * cos_b,  0.0,
            anchor_mx,   0.0,  anchor_my,  1.0,
        ]
    }

    /// Transform a Truck model-space point to MVT tile pixel coords at zoom
    pub fn model_to_tile_px(&self, x: f64, y: f64, z: f64, zoom: u32) -> Vec<f64> {
        let merc = self.model_to_mercator(x, y, z);
        let (px, py) = Self::mercator_to_tile_px(merc[0], merc[1], zoom);
        vec![px, py, merc[2]]
    }

    /// Serialise to JSON string for storage in Automerge document
    pub fn to_json(&self) -> String {
        format!(
            r#"{{"anchor_lat":{},"anchor_lon":{},"bearing":{},"units_to_metres":{}}}"#,
            self.anchor_lat, self.anchor_lon, self.bearing, self.units_to_metres
        )
    }

    /// Deserialise from JSON string
    pub fn from_json(json: &str) -> Result<GeoReference, JsValue> {
        // Simple manual parse to avoid pulling in serde for now
        // TODO: add serde_json when stabilised
        Err(JsValue::from_str("not yet implemented"))
    }
}
```

-----

### Phase 3: Wire Into the Render Pipeline

**Goal:** MVT tile geometry and CAD geometry render in the same coordinate space.

**Current render flow** (ADR-0013: Passive WASM):
```
Three.js OrbitControls → 4x4 camera matrix → cadCommand(‘set_camera’) → WASM SceneController
SceneController renders all SceneObjects via WebGPU shared depth buffer
```

**Integration point — two options:**

**Option A: Transform at import time (simpler, recommended for Phase 5)**
- Modify `parse_mvt_tile()` in `mvt/mod.rs` to accept a `GeoReference` instead of a raw `offset: Point3`
- Apply `georef.model_to_mercator()` to compute the offset for each tile
- MVT solids enter the scene in the correct world position
- CAD geometry stays in model space — the Three.js camera view matrix handles the visual alignment

**Option B: Transform at render time via view matrix (deferred)**
- Encode the georef transform into the Three.js camera/projection setup
- Use `GeoReference::to_matrix()` to get a column-major 4x4 transform for WebGPU/Three.js
- All geometry stays in its native space; the view matrix does the alignment
- More complex but avoids re-importing tiles when anchor changes
- Will require RTC offset handling for large Mercator coordinates (see Consequences)

**Recommendation:** Start with Option A for the Tokyo test (Phase 5). The MVT parser already accepts `offset` — replacing it with a computed offset from `GeoReference` is minimal code change. Option B can be explored later if anchor-change performance matters.

**Concrete change to `mvt/mod.rs`:**
```rust
// Before (current):
pub fn parse_mvt_tile(data: &[u8], offset: Point3) -> Vec<Solid>

// After:
pub fn parse_mvt_tile(data: &[u8], georef: &GeoReference, tile: &TileCoord) -> Vec<Solid>
// georef computes the offset from tile coords + anchor
```

-----

### Phase 3b: IFC B-Rep Promotion

**Goal:** Simple IFC geometry becomes real Truck `Solid` objects, enabling booleans and clash detection across all three sources.

**Current IFC import pipeline** (`wasm_app.rs:2290-2418`):
```
IFC file → ifc-lite parser → GeometryRouter → triangle mesh (positions + indices)
    → PolygonMesh → add to scene (display only)
```

**Proposed pipeline for promotable geometry:**
```
IFC file → ifc-lite parser → GeometryRouter
    → IfcExtrudedAreaSolid?
        YES → extract 2D profile + extrusion vector → tsweep → Truck Solid (B-Rep)
        NO  → triangle mesh → PolygonMesh (display only, unchanged)
```

**Why `IfcExtrudedAreaSolid` first:** It's the most common IFC geometry type by far — walls, slabs, columns, beams are almost always extrusions. The promotion path is identical to what the MVT parser already does:

| Step | MVT (existing) | IFC (proposed) |
|------|----------------|----------------|
| 2D shape | Building footprint polygon | `IfcArbitraryClosedProfileDef` or `IfcRectangleProfileDef` |
| Axis swap | MVT (x,y) → Truck (x,z) | IFC Z-up → Truck Y-up |
| Extrusion | `tsweep(&face, Vector3(0, 10, 0))` | `tsweep(&face, extrusion_vector)` |
| Output | `Solid` | `Solid` |

**Concrete changes:**

1. **New function in the truck crate** — `promote_ifc_extrusion(profile_points, extrusion_vec, placement) -> Option<Solid>`:
   - Takes the 2D profile points and extrusion direction from `ifc-lite`'s extrusion processor
   - Builds vertices → edges → wire → face → `tsweep` (same as `mvt/mod.rs:68-89`)
   - Applies the IFC `local_to_map()` axis swap (Z-up → Y-up) during vertex construction
   - Returns `None` for degenerate profiles (< 3 points, self-intersecting)

2. **Modify IFC import in `wasm_app.rs`** — when `GeometryRouter` identifies an `IfcExtrudedAreaSolid`:
   - Try `promote_ifc_extrusion()` first
   - If it succeeds → add as `Solid` SceneObject (like MVT buildings)
   - If it fails → fall back to existing `PolygonMesh` path

3. **Apply IFC georef during promotion** — use the extracted `GeoReference` from `IfcMapConversion` to place the solid in model space. The IFC georef already has `local_to_map()` — we need the inverse `map_to_local()` with Y-up axis swap to land in Truck model space.

**What stays as PolygonMesh (no promotion):**
- `IfcFacetedBrep` — already triangulated, topology lost
- `IfcBooleanClippingResult` — CSG results are complex meshes
- `IfcTriangulatedFaceSet` — pre-triangulated (IFC4)
- `IfcSweptDiskSolid` — pipes/tubes (could be promoted later via `rsweep`)
- Any geometry where promotion fails

**Result after this phase:**

| Source | Geometry type | Booleans | Clash detection |
|--------|--------------|----------|-----------------|
| CAD | `Solid` | Yes | Yes |
| MVT buildings | `Solid` | Yes | Yes |
| IFC extrusions | `Solid` (promoted) | Yes | Yes |
| IFC complex | `PolygonMesh` | No | Bounding-box only |

-----

### Phase 4: Persist GeoReference Parameters

**Goal:** Anchor + scale survive page reload and work offline.

**Automerge document** (same as all other scene state):

Store georef params as a field on the Automerge document managed by `CadDocumentManager`:

```js
// In the Automerge doc, alongside existing scene state:
doc.georef = {
  anchor_lat: 35.6762,
  anchor_lon: 139.6503,
  bearing: 0.0,
  units_to_metres: 1.0
}
```

This gives us:
- **Undo/redo** — anchor changes are undoable like any other operation
- **Offline persistence** — Automerge docs are saved to IndexedDB automatically
- **Cross-tab sync** — other tabs see georef changes via existing Automerge sync
- **Collaboration** — remote peers receive georef updates via CRDT merge

-----

### Phase 5: Hardcoded Tokyo Test

**Goal:** Prove the full pipeline works before building any UI.

**Test A — CAD + MVT alignment:**
1. Load Tokyo MVT tiles (existing working test)
1. Create a simple Truck geometry — a 10×10×10 box
1. Apply `GeoReference::tokyo_test()` transform
1. Render both MVT tiles and Truck geometry in the same WebGPU pass
1. Verify the box appears at the correct location on the Tokyo basemap

**Test B — IFC + MVT alignment:**
1. Import a georeferenced IFC file (any file with `IfcMapConversion` pointing to a known location)
1. Load MVT tiles for the same area
1. Apply the IFC's embedded georef to place IFC geometry in model space
1. Verify IFC buildings align with MVT buildings at the same location

**Test C — IFC B-Rep promotion:**
1. Import an IFC file containing `IfcExtrudedAreaSolid` elements
1. Verify promoted elements are `Solid` SceneObjects (not `PolygonMesh`)
1. Perform a boolean operation between a promoted IFC wall and a CAD cylinder
1. Verify the boolean succeeds (this would fail with `PolygonMesh`)

Success criteria: all three geometry sources render in the same coordinate space at correct scale, and booleans work across CAD + MVT + promoted IFC.

-----

## Consequences

- **Scale factor** is likely 1.0 (1 unit = 1 metre) based on the MVT parser convention, but Phase 1 must confirm
- **No user-facing anchor UI yet** — anchor is hardcoded for now, UI comes later
- **Bearing** — defaulting to 0.0 (model north = true north). Most CAD models don’t have north alignment so this may need a calibration UI later
- **WASM binary size** — keeping dependencies minimal (no serde yet) to keep WASM small for Cloudflare Worker cold starts

### Y-Axis Convention (Critical)

Truck uses **Y-up** with XZ as the ground plane. This is confirmed across the codebase:

| Primitive | Sweep | Code |
|-----------|-------|------|
| Cube | vertex→X, edge→Y, face→Z | `lib.rs:68-70` |
| Sphere | revolve around Y then Z | `lib.rs:79` |
| Cylinder | sweep along Z | `lib.rs:93` |
| MVT buildings | extrude along Y | `mvt/mod.rs:88` |
| Sketch extrude | along plane normal | `sketch.rs:421` |

The MVT parser explicitly maps MVT `(x,y)` → Truck `(x, ground_y, z)`:

```rust
// mvt/mod.rs:70-74
Point3::new(
    p.x * scale + self.offset.x,   // MVT x → Truck X (east)
    self.offset.y,                  // ground height → Truck Y (up)
    p.y * scale + self.offset.z    // MVT y → Truck Z (north)
)
```

**This means bearing rotation must be around the Y axis** (rotating in the XZ ground plane), NOT around Z as originally proposed. The `GeoReference` struct has been corrected above. The IFC georef’s `local_to_map()` rotates in its `(x,y)` plane because IFC uses Z-up — a different convention that must be accounted for when converging the two systems.

### IFC Georef Convergence

The IFC `GeoReference` in `.src/ifc-lite/rust/core/src/georef.rs` already implements the same core pattern (scale + rotate + offset) with additional capabilities:

| Capability | IFC georef | This ADR |
|-----------|-----------|----------|
| Anchor | eastings/northings (map CRS metres) | anchor_lat/lon (WGS84 degrees) |
| Rotation | cos/sin pair (`x_axis_abscissa`/`ordinate`) | `bearing` (radians) |
| Scale | `scale` (default 1.0) | `units_to_metres` (default 1.0) |
| CRS metadata | crs_name, geodetic_datum, vertical_datum, map_projection | None (assumes EPSG:3857) |
| Inverse transform | `map_to_local()` | `mercator_to_model()` (added) |
| 4x4 matrix | `to_matrix()` column-major | `to_matrix()` (added) |
| Large coords | `RtcOffset` (>10km centroid subtraction) | Not yet — see below |

**Convergence plan:** Both structs are named `GeoReference`. They should eventually share a common trait or base:
- The IFC version is CRS-aware (UTM, national grids) and parses from IFC entities
- This version targets Web Mercator (EPSG:3857) and serialises to Automerge
- The core transform pattern is identical; the difference is the coordinate reference system
- Phase 3b uses the IFC georef's `map_to_local()` (with Y-up axis swap) to place promoted IFC Solids in Truck model space
- **Axis swap at the boundary:** IFC uses Z-up, Truck uses Y-up. The swap happens once during import — promoted Solids live in Truck's Y-up space from that point on

### RTC Offset (Future Required)

Tokyo in Web Mercator is approximately 15,535,000 metres easting. At `f32` precision (WebGPU vertex buffers), this gives ~1 metre jitter — visible and unacceptable. The IFC georef already solves this with `RtcOffset`:

```rust
// .src/ifc-lite/rust/core/src/georef.rs
pub struct RtcOffset { pub x: f64, pub y: f64, pub z: f64 }
// is_significant() triggers at >10km from origin
// apply() subtracts centroid from all positions, keeping f64 offset separate
```

This is not needed for Phase 5 (Tokyo test) because the MVT parser works in tile-local coordinates (0–4096). But it will be required when CAD geometry is placed at real Mercator coordinates for WebGPU rendering. Phase 5 should flag this if precision artefacts are observed.

-----

## Out of Scope for This ADR

- User UI for placing model on map
- Survey-accurate georeferencing (sub-centimetre)
- Multiple models with different anchors
- B-Rep promotion for complex IFC types (`IfcSweptDiskSolid`, `IfcBooleanClippingResult`)
- CRS transformations beyond Web Mercator (UTM ↔ Mercator reprojection)

-----

## Existing Code

| File | What |
|------|------|
| `crates/truck-webgpu-gui/src/mvt/mod.rs` | MVT parser + building extrusion → `Solid` (implemented) |
| `crates/truck-webgpu-gui/src/lib.rs` | `make_cube`, `make_sphere`, `make_cylinder` — CAD primitives via `tsweep`/`rsweep` |
| `crates/truck-webgpu-gui/src/wasm_app.rs` | SceneController, `execute()` dispatch, IFC import at line ~2290 |
| `crates/truck-webgpu-gui/src/commands.rs` | Typed param structs + schema generation |
| `web/gui/state.js` | `cadCommand()` dispatch — `import_mvt` handler at line ~304 |
| `web/gui/cad-viewport.js` | Lit web component: WebGPU canvas, Three.js OrbitControls |
| `.src/ifc-lite/rust/core/src/georef.rs` | IFC georef: `GeoReference`, `local_to_map()`, `map_to_local()`, `to_matrix()`, `RtcOffset` |
| `.src/ifc-lite/rust/geometry/src/router/mod.rs` | IFC geometry dispatch — identifies `IfcExtrudedAreaSolid` etc. |
| `.src/ifc-lite/rust/geometry/src/processors/` | Per-type geometry processors (extrusion, brep, boolean, etc.) |

## References

- ADR-0014: MVT for Urban Context (the MVT rendering decision)
- ADR-0013: Lit + Three.js + Passive WASM (camera/render pipeline)
- ADR-0004: Hybrid Semantic BIM (B-Rep promotion strategy)
- Truck CAD kernel: https://github.com/ricosjp/truck
- Web Mercator spec (EPSG:3857): https://epsg.io/3857
- MVT spec: https://github.com/mapbox/vector-tile-spec
- WGS84 constants: https://epsg.io/4326
- IFC schema (IfcMapConversion): https://standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD2_TC1/HTML/link/ifcmapconversion.htm