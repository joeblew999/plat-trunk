# WebGPU Rendering

GPU rendering architecture for the CAD platform.

## Tier 1: Browser-Native WebGPU

The primary rendering path. truck B-Rep kernel + wgpu compiled to WASM, renders locally via WebGPU.

- Zero server cost
- Full B-Rep precision
- Real-time interaction (gizmo, camera orbit)
- Requires Chrome 113+ or equivalent WebGPU support

### Stack

| Component | Role |
|---|---|
| truck-platform | Scene, Camera, Lights, event loop (winit) |
| truck-rendimpl | PBR shaders, InstanceCreator, WireFrameInstance |
| wgpu | WebGPU abstraction layer |
| wasm-bindgen | Rust ↔ JS bridge |

### Build

```sh
task truck:wasm:build-browser-renderer
# Outputs to web/gui/pkg-browser-renderer/
```

## Tier 3: Server-Rendered Video (Future)

For devices without WebGPU support. Same Rust binary running natively on a GPU server, streaming H.264 video via WebRTC (LiveKit).

See `docs/adr/webgpu_server.md` for the full Tier 3 specification.

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
