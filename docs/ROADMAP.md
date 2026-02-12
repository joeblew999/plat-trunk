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

## Short Term
- [ ] **Boolean ops for all shapes** — sphere/torus booleans fail in truck-shapeops; investigate NURBS surface intersection support, contribute fixes upstream
- [ ] **Better CSG UX** — auto-offset new primitives so booleans are obvious; visual indicators for boolean operands
- [ ] **Rotate + Scale transforms** — add rotation (Euler angles) and uniform scale
- [ ] **Object selection by clicking** — ray-cast picking on canvas instead of index numbers
- [ ] **Undo/redo** — command history stack
- [ ] **Split index.html** — extract CSS, responsive controller, docs content into separate files

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
- [ ] **Sketch mode** — 2D sketch → extrude/revolve workflow
- [ ] **Server-side rendering** — headless WebGPU for thumbnails and CI screenshots
- [ ] **Plugin system** — extend with custom operations via WASM modules
- [ ] **Mobile-first touch gestures** — multi-touch transform gizmos
