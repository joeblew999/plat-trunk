# Roadmap

## v0.1 — Direct Modeling Foundation

- [x] WebGPU-based 3D viewer with truck B-Rep kernel (WASM)
- [x] 4 primitives: cube, sphere, cylinder, torus
- [x] Boolean operations: union, subtract, intersect (cubes/cylinders only)
- [x] Translate transform
- [x] Save/load scenes as JSON (full B-Rep, no tessellation loss)
- [x] Responsive UI: desktop sidebar, mobile bottom sheet + dock
- [x] Auto-offset primitives — new objects partially overlap, ready for booleans
- [x] Docs: auto-generated screenshots + lesson videos (R2-hosted)
- [x] Deployed to Cloudflare Workers + custom domain

## v0.2 — Undo/Redo + Gizmo

- [x] **UUID identity** — every object has a stable UUID v4, persisted through transforms and export/import
- [x] **Undo/redo** — snapshot-based with Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts
- [x] **Operation grouping** — related operations (add + offset) grouped into single undo steps
- [x] **Timeline UI** — visual strip showing recent operations as clickable chips
- [x] **Click-to-select** — ray-cast picking via bounding sphere intersection
- [x] **Translate gizmo** — 3-axis colored arrows (X=red, Y=green, Z=blue), drag to move
- [x] **Gizmo cancel** — Escape reverses drag, restores original position
- [x] **Automerge integration** — CRDT-based op log for collaborative editing
- [x] **Cross-tab sync** — BroadcastChannel adapter for same-browser collaboration
- [x] **Document management** — new doc, share URL, example scenes
- [x] **Keyboard shortcuts** — Ctrl+Z undo, Ctrl+Shift+Z redo, Escape cancel, Delete remove
- [x] **24 E2E tests** — Playwright tests covering all operations including gizmo

## v0.3 — Parametric Modeling (Current)

- [x] **ezpz constraint solver** — integrated KittyCAD/ezpz for 2D sketch constraints (11 constraint types)
- [x] **Sketch mode** — 2D sketch on XY/XZ/YZ planes with points and edges
- [x] **Sketch constraints** — fixed, horizontal, vertical, distance, H/V-distance, coincident, parallel, perpendicular, equal length, midpoint
- [x] **Constraint solver** — Newton-Raphson solver via ezpz, live preview of solved positions
- [x] **Extrude** — 2D profile → 3D solid via truck `tsweep` (closed loop detection)
- [x] **Quick rectangle** — one-click constrained rectangle with auto-constraints
- [x] **Sketch export/import** — JSON serialization for Automerge replay
- [x] **Automerge sketch ops** — `sketch_extrude` in op log, collaborative replay
- [x] **31 tests** — 9 Rust unit (sketch), 11 golden resource, 11 Playwright E2E sketch tests
- [ ] **Rotate gizmo** — circular handles for rotate-around-axis
- [ ] **Scale gizmo** — square handles for uniform/non-uniform scale

## Medium Term

- [ ] **Boolean ops for all shapes** — fix sphere/torus booleans in truck-shapeops
- [ ] **STEP import/export** — leverage truck-stepio for industry-standard CAD interchange
- [ ] **kkrpc integration** — bidirectional RPC for server-side modeling operations
- [ ] **Mesh raycasting** — upgrade from bounding sphere to triangle-level picking
- [ ] **Snap-to-grid** — constrain drag/sketch to grid increments
- [ ] **Multi-select** — Shift+click to select multiple objects
- [ ] **RDK (robotics) integration** — CAD modeling with robot kinematics/planning

## Long Term

- [ ] **Assembly mode** — multi-part assemblies with mates/joints
- [ ] **Server-side rendering** — headless WebGPU for thumbnails and CI screenshots (Tier 3)
- [ ] **Revolve** — 2D profile → 3D solid via truck `rsweep`
- [ ] **Plugin system** — extend with custom operations via WASM modules
- [x] **Hugo docs site** — full documentation site on Cloudflare Pages
- [ ] **Mobile-first touch gestures** — multi-touch transform gizmos

## Known Issues

- **Sphere/Torus booleans fail** — truck-shapeops NURBS surface intersection crashes. Cubes/cylinders work.
- **Object size changes after translate** — bounding-box normalization rescales rendered objects. B-Rep geometry is correct.
- **Large translations go off screen** — camera doesn't follow objects. Keep values small.
- **Bounding sphere picking** — imprecise for elongated/flat objects. Mesh raycasting planned.
