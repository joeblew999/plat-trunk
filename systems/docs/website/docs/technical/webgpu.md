# WebGPU Rendering

GPU rendering architecture for the CAD platform.

## Browser-Native WebGPU

The primary (and only) rendering path. truck B-Rep kernel + wgpu compiled to WASM, renders locally via WebGPU.

- Zero server cost — all geometry runs client-side
- Full B-Rep precision
- Real-time interaction (gizmo, camera orbit)
- Requires Chrome 113+ or equivalent WebGPU support
- ~20% of Android devices (primarily Samsung) lack WebGPU support

### Stack

| Component | Role |
|---|---|
| truck-platform | Scene, Camera, Lights, event loop (winit) |
| truck-rendimpl | PBR shaders, InstanceCreator, WireFrameInstance |
| wgpu | WebGPU abstraction layer |
| wasm-bindgen | Rust ↔ JS bridge |

### Build

```sh
bun run build:truck
# Builds: systems/sync/crate → systems/truck/crate → cad-schema.json
# Outputs WASM to: systems/truck/web/pkg-browser-renderer/
```

## Canvas Setup

The browser renderer uses a single `<canvas id="cad-canvas">` element. The WASM module:

1. Initializes wgpu with the canvas
2. Creates a Scene with camera + lighting
3. Runs the winit event loop for input handling
4. Renders at display refresh rate

## Object Rendering

Each solid is rendered as:
- **PolygonInstance** — filled PBR surface (tessellated from B-Rep)
- **WireFrameInstance** — edge wireframe overlay
- **Gizmo arrows** — colored WireFrameInstance lines for selected object

## Pick Mesh

A secondary CPU-side mesh is maintained for ray-cast picking:
- AABB (axis-aligned bounding box) per object — tighter than bounding spheres
- Used for click-to-select and gizmo arrow picking
- Separate from GPU render mesh
