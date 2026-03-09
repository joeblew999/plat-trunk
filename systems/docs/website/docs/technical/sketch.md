# Sketch and Extrude Pipeline

Technical documentation for the parametric modeling system: 2D constrained sketch → solve → extrude to 3D solid.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────┐
│ sketch.ts    │────▶│ moduleRouter │────▶│ sketch.rs     │────▶│ truck    │
│  (browser UI)│     │  (WASM API)  │     │  (solve+loop) │     │ (B-Rep)  │
└──────────────┘     └──────────────┘     └───────────────┘     └──────────┘
       │                                        │
       │                                        ▼
       │                                 ┌──────────────┐
       │                                 │ kcl-ezpz     │
       │                                 │ (constraint   │
       │                                 │  solver)      │
       └──── Automerge op log ──────────▶└──────────────┘
```

## Rust Layer

### Types (`systems/truck/crate/src/sketch.rs`)

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

## WASM API (`systems/truck/crate/src/wasm_app.rs`)

Methods on the WASM controller:

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
| `quick_rect_extrude(w, h, depth, plane)` | object UUID | One-step rectangle extrusion |

## Browser Layer

### `systems/truck/web/sketch.ts`

Manages sketch UI state:
- Tracks points, edges, constraints arrays
- Populates dropdowns for constraint UI
- Shows/hides constraint fields based on selected type
- Quick rectangle helper: 4 points + 4 edges + 7 constraints in one click
- Keyboard shortcut: **S** to switch to Sketch tab

### Automerge Integration (`history-domain.ts`)

- `sketch_extrude` operation stores `{ sketchJson, height }` in op log
- On replay: imports sketch JSON then extrudes — collaborative across peers

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

### Rust Unit Tests

In `systems/truck/crate/src/sketch.rs`:
- Empty/unconstrained sketch, fixed point, rectangle, triangle
- Serialization round-trip, extrude rectangle/triangle, plane mapping

### Playwright E2E Tests

In `systems/truck/e2e/`:
- WASM API: begin_sketch, add_point, add_edge, add_constraint, solve, extrude
- Round-trip: export/import preserves sketch
- Edge cases: < 3 edges fails, has_active_sketch tracks state
- Multi-plane: XZ plane extrude produces solid

### Running Tests

```sh
bun run test:crate    # Rust unit tests
bun run test:e2e      # Playwright E2E tests (needs dev server)
```
