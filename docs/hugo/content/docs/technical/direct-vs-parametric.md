# Direct vs. Parametric Modeling

## Vision

We provide both modeling paradigms:
- **Direct modeling** (like SketchUp) — for architects, quick concept work
- **Parametric modeling** (like Fusion 360) — for mechanical engineers, precise constraint-driven design

## Direct Modeling (v0.1–v0.2)

Implemented features:
- Primitive creation (cube, sphere, cylinder, torus)
- Boolean operations (union, subtract, intersect)
- Gizmo-based translate transform (click-drag)
- Undo/redo with Automerge CRDT op log
- Scene save/load as JSON B-Rep
- Collaborative editing via Automerge + BroadcastChannel

## Parametric Modeling (v0.3 — Current)

### Constraint Solver: ezpz

We use [KittyCAD/ezpz](https://github.com/KittyCAD/ezpz) as the 2D geometric constraint solver.

- **Language**: Pure Rust, WASM-compatible
- **What it does**: Takes a set of geometric constraints and solves positions/dimensions
- **Constraints implemented**: fixed, horizontal, vertical, distance, H/V-distance, coincident, parallel, perpendicular, equal length, midpoint
- **Solver**: Newton-Raphson (Gauss-Newton with Tikhonov regularization)
- **Local path**: `.src/ezpz/kcl-ezpz` (Cargo path dependency)
- **Integration**: Wrapper types in `sketch.rs` bridge serde-serializable sketch types to ezpz's non-serde internal types

### Parametric Workflow

```
Sketch Plane → Points + Edges → Constraints → Solver → Extrude → 3D B-Rep Solid
```

1. **Sketch plane**: User selects XY, XZ, or YZ plane
2. **2D profile**: Add points with (x, y) coordinates, connect with edges
3. **Constraints**: Add geometric constraints (fixed, distance, horizontal, etc.)
4. **Solver**: ezpz solves the constraint system, returns solved positions
5. **Closed loop**: Edge graph is walked to find a polygon boundary
6. **Extrude**: truck's `tsweep` sweeps the 2D face along the plane normal
7. **Automerge**: `sketch_extrude` op stores full sketch JSON for collaborative replay

### Quick Rectangle

One-click helper creates a fully constrained rectangle:
- 4 points at (0,0), (w,0), (w,h), (0,h)
- 4 edges forming a closed loop
- 7 constraints: fixed origin, 2 horizontal edges, 2 vertical edges, 2 distance constraints

### Integration Points

| Component | Role | Status |
|---|---|---|
| ezpz (`kcl-ezpz`) | 2D constraint solving | Integrated |
| truck-modeling | vertex → line → wire → face builder | Integrated |
| truck-modeling `tsweep` | 2D face → 3D solid extrusion | Integrated |
| Automerge | Op log with `sketch_extrude` operation | Integrated |
| WASM | All runs in browser via WebAssembly | Integrated |

### What's Next

- **Arc/circle entities** — curved sketch geometry
- **Revolve** — `rsweep` for rotational sweeps
- **Face-based sketch planes** — sketch on existing solid faces
- **Feature tree UI** — visual history with re-evaluation
