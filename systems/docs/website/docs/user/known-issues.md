# Known Issues

## Current Limitations

- **Sphere/Torus booleans fail** — Boolean operations only work reliably with cubes and cylinders. Sphere and torus booleans crash due to NURBS surface intersection limitations in the upstream truck-shapeops library.

- **Object size changes after translate** — Moving an object may slightly change its rendered size due to bounding box renormalization. This is a rendering artifact; the B-Rep geometry is unchanged.

- **Large translations go off screen** — The camera doesn't follow translated objects. Keep dx/dy/dz values small (0.1 to 5.0) to stay in view.

- **No rotate/scale gizmo** — Only translate gizmo is currently supported. Rotate and scale transforms are planned.

- **Bounding sphere picking** — Object selection uses bounding sphere approximation, which may be imprecise for elongated or flat objects. Mesh-level raycasting is planned.

## Sketch Limitations

- **No arc/circle sketch entities** — Only straight edges (line segments) are supported. Arcs and circles are planned.
- **No sketch overlay** — Sketch geometry is not visually rendered on the canvas. Use the Solve button to preview solved positions in the status bar.
- **Closed loop required** — Extrude requires edges to form a single closed polygon. Branching or open edge graphs will fail.
- **No face-based sketch planes** — Sketch planes are limited to XY, XZ, YZ. Sketching on a face of an existing solid is planned.

## Fixed in v0.2

These issues from v0.1 have been resolved:

- ~~No click-to-select~~ — Objects can now be selected by clicking in the viewport
- ~~No undo~~ — Full undo/redo with Ctrl+Z / Ctrl+Shift+Z
- ~~Objects selected by index only~~ — Gizmo-based direct manipulation now available

## Fixed in v0.3

- ~~No parametric modeling~~ — Full sketch → constrain → extrude workflow now available
- ~~No constraint solver~~ — ezpz integrated with 11 constraint types
