# Roadmap

## Current State (v0.1)
- WebGPU-based 3D viewer with truck B-Rep kernel (WASM)
- 4 primitives: cube, sphere, cylinder, torus
- Boolean operations: union, subtract, intersect (cubes/cylinders only)
- Translate transform
- Save/load scenes as JSON (full B-Rep, no tessellation loss)
- Responsive UI: desktop sidebar, mobile bottom sheet + dock
- Docs: auto-generated screenshots + lesson videos (R2-hosted)
- Deployed to Cloudflare Workers + custom domain

## Known Issues
- **Sphere/Torus booleans fail** — truck-shapeops NURBS surface intersection crashes on sphere/torus geometry. Cubes and cylinders work. Upstream issue.
- **Object size changes after translate** — Bounding-box normalization rescales objects after move. Rendering artifact; B-Rep geometry is correct.
- **Large translations go off screen** — Camera doesn't follow objects. Keep values small (0.1 to 5.0).
- **No undo** — All operations are permanent. Save before destructive ops.
- **No click-to-select** — Objects selected by index number only.

## Short Term
- [x] **Auto-offset primitives** — new objects partially overlap, ready for booleans
- [x] **Split index.html** — extracted CSS, responsive controller, docs content into separate files
- [x] **Inline roadmap in docs** — roadmap content shown in app, not just a GitHub link
- [ ] **Boolean ops for all shapes** — fix sphere/torus booleans in truck-shapeops; contribute upstream
- [ ] **Rotate + Scale transforms** — add rotation (Euler angles) and uniform scale
- [ ] **Object selection by clicking** — ray-cast picking on canvas instead of index numbers
- [ ] **Undo/redo** — command history stack
- [ ] **World-space transforms** — store per-object world matrix separately from normalization to fix size artifacts

## Medium Term
- [ ] **Automerge collaboration** — CRDT-based op log for concurrent multi-user editing
- [ ] **kkrpc integration** — bidirectional RPC for server-side modeling operations
- [ ] **STEP import/export** — leverage truck-stepio for industry-standard CAD interchange
- [ ] **Constraint system** — parametric constraints between features (distance, angle, tangent)
- [ ] **RDK (robotics) integration** — marry CAD modeling with robot kinematics/planning
- [ ] **Keyboard shortcuts** — common operations bound to keys
- [ ] **Object naming** — user-defined names instead of indices

## Long Term
- [ ] **Assembly mode** — multi-part assemblies with mates/joints
- [ ] **Feature tree** — parametric history tree (like Fusion 360/SolidWorks)
- [ ] **Sketch mode** — 2D sketch -> extrude/revolve workflow
- [ ] **Server-side rendering** — headless WebGPU for thumbnails and CI screenshots
- [ ] **Plugin system** — extend with custom operations via WASM modules
- [ ] **Mobile-first touch gestures** — multi-touch transform gizmos
