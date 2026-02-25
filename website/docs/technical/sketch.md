# Sketch and Extrude Pipeline

Technical documentation for the parametric modeling system: 2D constrained sketch → solve → extrude to 3D solid.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────┐
│ sketch-ui.js│────▶│ SceneController│────▶│ sketch.rs     │────▶│ truck    │
│  (JS UI)    │     │  (WASM API)  │     │  (solve+loop) │     │ (B-Rep)  │
└─────────────┘     └──────────────┘     └───────────────┘     └──────────┘
       │                                        │
       │                                        ▼
       │                                 ┌──────────────┐
       │                                 │ kcl-ezpz     │
       │                                 │ (constraint   │
       │                                 │  solver)      │
       └──── Automerge op log ──────────▶└──────────────┘
```

## Rust Layer

### Types (`crates/truck-webgpu-gui/src/sketch.rs`)

| Type | Purpose |
|---|---|
| `SketchPlane` | XY, XZ, YZ — determines 2D→3D mapping and extrude direction |
| `SketchPoint` | UUID + (x, y) initial position |
| `SketchEdge` | UUID + two point UUIDs |
| `SketchConstraintKind` | Enum with 11 variants (Fixed, Horizontal, Vertical, Distance, etc.) |
| `SketchConstraint` | UUID + kind |
| `Sketch` | Full sketch: plane, points, edges, constraints |
| `SolvedSketch` | Result of constraint solving: `Vec<(Uuid, f64, f64)>` positions |

All types derive `Serialize` and `Deserialize` for JSON round-trip (Automerge storage).

### Constraint Solver Integration

ezpz types (`DatumPoint`, `DatumLineSegment`, `Constraint`) do **not** implement serde. The `SolveContext` struct bridges this gap:

1. Creates fresh ezpz datums from sketch points/edges at solve time
2. Maps sketch `SketchConstraintKind` variants to ezpz `Constraint` values
3. Builds guess vectors from initial positions
4. Calls `kcl_ezpz::solve()` with Newton-Raphson solver
5. Extracts solved positions via `outcome.final_value_point()`

Key detail: `Fixed { point_id, x, y }` expands to **two** ezpz constraints — `Constraint::Fixed(dp.x_id, x)` and `Constraint::Fixed(dp.y_id, y)`.

### Extrude Pipeline

`sketch_to_solid(sketch, height)` follows truck's builder pattern:

1. **Solve** — run constraint solver to get final 2D positions
2. **Closed loop** — `find_closed_loop()` walks the edge graph to order points into a polygon boundary
3. **3D vertices** — map 2D solved positions to 3D via `SketchPlane::to_3d(x, y)`
4. **Wire** — `builder::vertex()` → `builder::line()` → `Wire::from(edges)`
5. **Face** — `builder::try_attach_plane(&[wire])` creates a planar face
6. **Extrude** — `builder::tsweep(&face, normal * height)` sweeps along plane normal

This is the same pattern as `make_cube()` in lib.rs — vertex → line → wire → face → tsweep.

## WASM API (`crates/truck-webgpu-gui/src/wasm_app.rs`)

12 methods on `SceneController`:

| Method | Returns | Description |
|---|---|---|
| `begin_sketch(plane)` | sketch UUID | Start sketch on XY/XZ/YZ |
| `sketch_add_point(x, y)` | point UUID | Add a point |
| `sketch_add_edge(p0_id, p1_id)` | edge UUID | Connect two points |
| `sketch_add_constraint(type, params_json)` | constraint UUID | Add constraint (11 types) |
| `sketch_solve()` | JSON positions | Solve and return `[{id, x, y}]` |
| `sketch_extrude(height)` | object UUID | Extrude → solid, add to scene |
| `sketch_cancel()` | — | Discard active sketch |
| `sketch_export()` | JSON string | Serialize sketch for Automerge |
| `sketch_import(json)` | bool | Restore sketch from JSON |
| `has_active_sketch()` | bool | Check if sketch is active |

The active sketch is stored in `SharedState.active_sketch: Option<Sketch>`. Extrude consumes it (takes ownership via `.take()`). On extrude failure, the sketch is put back so the user can fix it.

## JavaScript Layer

### `web/gui/sketch-ui.js`

IIFE that manages sketch state client-side:

- Tracks `sketchPoints`, `sketchEdges`, `sketchConstraints` arrays
- Populates point/edge dropdowns for constraint UI
- Shows/hides constraint fields based on selected type
- Quick rectangle helper: 4 points + 4 edges + 7 constraints in one click
- Exposes `window.sketchUI = { isActive, cancel() }` for keyboard shortcuts

### `web/gui/cad-document.js`

Automerge integration:

- `sketch_extrude` operation type stores `{ sketchJson, height }` in op log
- On replay: `ctrl.sketch_import(sketchJson)` then `ctrl.sketch_extrude(height)`
- Enables collaborative sketch → extrude across peers

## Constraint Types

| Kind | ezpz mapping | Parameters |
|---|---|---|
| `Fixed` | 2x `Constraint::Fixed` (x, y separately) | point_id, x, y |
| `Horizontal` | `Constraint::Fixed` on y0==y1 | edge_id |
| `Vertical` | `Constraint::Fixed` on x0==x1 | edge_id |
| `Distance` | `Constraint::EuclideanDistance` | p0_id, p1_id, value |
| `HorizontalDistance` | `Constraint::HorizontalDistance` | p0_id, p1_id, value |
| `VerticalDistance` | `Constraint::VerticalDistance` | p0_id, p1_id, value |
| `Coincident` | `Constraint::Coincident` | p0_id, p1_id |
| `Parallel` | `Constraint::Parallel` | edge0_id, edge1_id |
| `Perpendicular` | `Constraint::Perpendicular` | edge0_id, edge1_id |
| `EqualLength` | `Constraint::EqualLength` | edge0_id, edge1_id |
| `Midpoint` | `Constraint::InternalMidpoint` | edge_id, point_id |

## Tests

### Rust Unit Tests (9)

In `crates/truck-webgpu-gui/src/sketch.rs`:

- `test_empty_sketch` — empty sketch solves to empty result
- `test_unconstrained_sketch` — points keep initial positions
- `test_fixed_point` — fixed constraint pins a point
- `test_solve_rectangle` — 4 points + constraints → correct solved positions
- `test_solve_triangle_with_distances` — triangle with distance constraints
- `test_sketch_serialization_roundtrip` — JSON round-trip preserves sketch
- `test_extrude_rectangle` — rectangle → box with 6 faces
- `test_extrude_triangle` — triangle → prism with 5 faces
- `test_sketch_plane_to_3d` — XY/XZ/YZ coordinate mapping

### Playwright E2E Tests (11)

In `tests/e2e/sketch.spec.ts`:

- WASM API tests: begin_sketch, add_point, add_edge, add_constraint, solve, extrude (rectangle + triangle)
- Round-trip: export/import preserves sketch
- Edge cases: < 3 edges fails gracefully, has_active_sketch tracks state
- Cancel: sketch_cancel clears active sketch
- Multi-plane: XZ plane extrude produces solid

### Running Tests

```sh
task truck:test:crate    # Rust unit tests (sketch + golden)
task truck:test:sketch   # Playwright E2E sketch tests (needs gui:serve)
task truck:ci            # Full CI: check + test + WASM build
```
