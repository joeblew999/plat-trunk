# ADR-0013: Lit + Three.js + Passive WASM Architecture

## Status
**In Progress** — Patterns validated via [datastar-lit-examples](https://github.com/Yacobolo/datastar-lit-examples).

## Context

The current architecture uses an "Active WASM" model where the Rust kernel (via winit) owns the camera and captures mouse/touch events directly. This creates friction:

- **UI integration**: Can't use standard web component patterns (Lit, Shadow DOM)
- **AI agents**: No MCP tool to control the camera — agents can't "look" at specific geometry
- **Testing**: Playwright tests must simulate mouse drags instead of setting exact camera matrices
- **Extensibility**: Adding Three.js overlays (glTF, MVT) requires a shared scene graph that Rust doesn't own

## Decision

Transition to a **"Passive WASM"** architecture: JavaScript Lit component is the **Conductor**, Rust WASM module is the **Instrument**.

### 1. Datastar → Lit Bridge (Validated Pattern)

The [datastar-lit-examples](https://github.com/Yacobolo/datastar-lit-examples) repo proves this works:

```html
<!-- Datastar owns state, passes via data-attr (auto JSON.stringify) -->
<cad-viewport data-attr:scene-state="$sceneState"></cad-viewport>
```

```js
// Lit component receives as typed property (auto JSON.parse)
static properties = {
  sceneState: { type: Object, attribute: 'scene-state' }
};
```

**Why this works for deep reactivity**: Datastar's `data-attr` calls `JSON.stringify()` internally, which walks every nested property — creating reactive dependencies on all nested values. Mutating `$sceneState.selectedId` re-triggers the attribute update. Lit's type converter `JSON.parse()`s the string back.

**Constraint**: Only JSON-serializable data flows through this bridge (no Functions, Dates, Map/Set). This is fine for scene state.

### 2. The Conductor (`<cad-viewport>` Lit Component)

The Lit component owns:
- **Three.js `PerspectiveCamera`** managed by `OrbitControls` (mouse/touch/zoom)
- **`requestAnimationFrame` heartbeat** — extracts 4x4 matrix, pushes to WASM each frame
- **Gizmo traffic controller** — locks OrbitControls during drag, restores after

```
frame loop:
  OrbitControls.update()
  camera.updateMatrixWorld()
  cadCommand('set_camera', { matrix_world, fov_deg, near, far })
  // WASM renders with this camera
```

**Light DOM**: The `<cad-viewport>` uses Light DOM (`createRenderRoot() { return this }`) because WebGPU requires the canvas in the main document for `requestAdapter()`. Shadow DOM would isolate the canvas.

### 3. Camera as a Command (Single Dispatch Path)

Camera is promoted to a first-class schema command:

```rust
#[derive(Deserialize, JsonSchema)]
pub struct SetCameraParams {
    pub matrix_world: Vec<f64>,  // 16 floats (4x4 column-major)
    pub fov_deg: f64,
    pub near: f64,
    pub far: f64,
}
```

- Generates `cad_set_camera` MCP tool — AI agents can programmatically "look" at geometry
- Worker broadcasts camera changes to other tabs ("Follow the Leader" mode)
- Playwright tests snap to exact matrices instead of simulating mouse drags

### 4. Traffic Controller (Gizmo vs. Orbit)

To preserve 60fps gizmo performance, the Lit component locks/unlocks OrbitControls:

1. **PointerDown**: Call `begin_gizmo_drag(ndcX, ndcY)` — Rust picks axis
2. **If axis hit**: `controls.enabled = false` (lock orbit)
3. **PointerMove**: `syncCamera()` then `update_gizmo_drag()` (camera parity for ray-cast)
4. **PointerUp**: `end_gizmo_drag()` → record to Automerge → `controls.enabled = true`
5. **Escape**: `cancel_gizmo_drag()` reverses cumulative translation

### 5. Rendering Pipeline

All rendering stays in the single WebGPU context managed by Rust. The change is:
- **Before**: Rust event loop calls `scene.render()` on `RedrawRequested`
- **After**: JS `rAF` loop pushes camera matrix → Rust renders with new matrix

For Three.js overlays (glTF, MVT), see ADR-0014 and ADR-0015.

## Consequences

### Positive
- **AI viewport control**: `cad_set_camera` MCP tool — agents can navigate, inspect, screenshot
- **Deterministic testing**: Playwright sets exact camera matrices via `cadCommand`
- **UI ergonomics**: Standard Lit components, OrbitControls with damping
- **Extensibility**: Three.js scene graph ready for glTF/MVT overlay layers
- **Unified dispatch**: Camera flows through `cadCommand()` — single path, Automerge-compatible

### Negative
- **Matrix overhead**: Pushing 16 floats 60fps adds ~negligible WASM boundary cost
- **Event latency**: Traffic controller must not lag between mouse input and gizmo response
- **Light DOM**: Can't use Shadow DOM style isolation for the viewport (WebGPU constraint)

## Prior Art

- [Yacobolo/datastar-lit-examples](https://github.com/Yacobolo/datastar-lit-examples) — Datastar + Lit + Three.js integration patterns
- Three.js `OrbitControls` — standard camera interaction for web 3D
- `data-attr` JSON bridge — Datastar's `JSON.stringify` + Lit's `JSON.parse` type converter

## Action Plan

### Epic 1: Viewport Component
- [ ] 1.1: Vendor OrbitControls addon (`three/examples/jsm/controls/OrbitControls.js`)
- [ ] 1.2: Rewrite `cad-viewport.js` with proper Lit patterns + Datastar bridge
- [ ] 1.3: Wire into `index.html` replacing raw `<canvas>`

### Epic 2: WASM Camera Command
- [ ] 2.1: Add `SetCameraParams` to `commands.rs`
- [ ] 2.2: Handle `set_camera` in `wasm_app.rs` (update camera from JS matrix)
- [ ] 2.3: Return camera state in `get_state` (matrix, fov, near, far)

### Epic 3: Testing & Verification
- [ ] 3.1: MCP `cad_set_camera` tool works (AI can control viewport)
- [ ] 3.2: Existing e2e tests pass with new viewport
- [ ] 3.3: Gizmo drag + orbit + zoom all work
