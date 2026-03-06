# Known Issues

## Current Limitations

- **~20% of Android devices lack WebGPU** — primarily Samsung devices with Mali GPUs. The app requires WebGPU support (Chrome 113+). No fallback renderer is available yet.

- **Object size changes after translate** — Moving an object may slightly change its rendered size due to bounding box renormalization. This is a rendering artifact; the B-Rep geometry is unchanged.

- **Large translations go off screen** — The camera doesn't follow translated objects. Keep dx/dy/dz values small (0.1 to 5.0) to stay in view.

- **No rotate/scale gizmo** — Only translate gizmo is currently supported. Rotate and scale are available via the Transform panel or MCP, but not as visual gizmos.

## Sketch Limitations

- **No arc/circle sketch entities** — Only straight edges (line segments) are supported. Arcs and circles are planned.
- **No sketch overlay** — Sketch geometry is not visually rendered on the canvas. Use the Solve button to preview solved positions in the status bar.
- **Closed loop required** — Extrude requires edges to form a single closed polygon. Branching or open edge graphs will fail.
- **No face-based sketch planes** — Sketch planes are limited to XY, XZ, YZ. Sketching on a face of an existing solid is planned.

## MCP Limitations

- **Browser must be open** — MCP commands are browser-delegated. A browser tab must be open at the model URL for commands to execute. Server-side headless WASM execution is planned (ADR-0001).

## Fixed in Previous Versions

- ~~Sphere/torus booleans crash~~ — Fixed in v0.7 with `Solid::try_new` and exact-then-perturbed fallback
- ~~No click-to-select~~ — Fixed in v0.2 with AABB ray-cast picking
- ~~No undo~~ — Fixed in v0.2 with Automerge-based undo/redo
- ~~No parametric modeling~~ — Fixed in v0.3 with ezpz constraint solver
- ~~Boolean ops only work with cubes/cylinders~~ — Fixed in v0.7, works for all shape combinations
