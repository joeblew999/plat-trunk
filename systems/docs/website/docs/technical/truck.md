# truck — Rust CAD Kernel

Pure Rust B-Rep CAD kernel with WebGPU rendering.

## What It Is

truck is a Rust library for B-Rep (Boundary Representation) solid modeling. It provides:

- **truck-modeling**: Geometric primitives, sweeps, boolean operations
- **truck-platform**: Scene management, camera, lighting, event loop
- **truck-rendimpl**: PBR rendering, instance creation, wireframes
- **truck-meshalgo**: Mesh algorithms and tessellation
- **truck-shapeops**: Boolean operations (union, subtract, intersect)

## How We Use It

truck is cloned to `.src/truck/` as a path dependency. Our `crates/truck-webgpu-gui/` crate builds on top of it to create the CAD application.

### Key Operations

| Operation | truck API |
|---|---|
| Create cube | `builder::cube(vertex, edge)` |
| Create sphere | `builder::sphere(center, radius, ...)` |
| Create cylinder | `builder::cylinder(bottom, top, radius)` |
| Translate | Modify vertex positions in topology |
| Boolean union | `truck_shapeops::and(solid_a, solid_b)` |
| Boolean subtract | `truck_shapeops::or(solid_a, solid_b)` (inverted) |
| Extrude profile | `builder::tsweep(face, vector)` |
| Revolve profile | `builder::rsweep(face, origin, axis, angle)` |

### Serialization

Solids serialize to JSON via serde. This preserves full B-Rep precision (no tessellation loss).

## Source

- Upstream: https://github.com/ricosjp/truck
- Fork: https://github.com/joeblew999/truck
- Local: `.src/truck/`

## Build

```sh
task truck:deps:clone      # Clone to .src/truck/
task truck:build           # Build library
task truck:test            # Run tests
task truck:wasm:build-browser-renderer  # Build WASM for browser
```
