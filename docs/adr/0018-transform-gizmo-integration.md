# ADR-0018: Replace Hand-Rolled Gizmo with transform-gizmo Crate

**Status**: Proposed  
**Date**: 2026-03-18  
**Crate**: https://github.com/urholaukkarinen/transform-gizmo  
**License**: MIT / Apache-2.0 (dual)

## Current state

`wasm_app.rs` contains a hand-rolled translation-only gizmo (~150 lines):

- `add_gizmo_arrows()` — renders 3 axis arrows as wireframe lines added to the
  monstertruck scene in world space, scaled proportional to camera distance
- `begin_gizmo_drag()` — ray-vs-axis hit test, sets `InteractionMode::Dragging`
- `update_gizmo_drag()` — projects mouse delta onto axis via `compute_axis_drag_delta`
- `end_gizmo_drag()` — fires `on_drag_complete` JS callback with delta vector
- `cancel_gizmo_drag()` — resets to `InteractionMode::Selected`

**Missing entirely:** rotation, scale, multi-object transform, snap, local/world
orientation toggle. These are fundamental CAD operations.

## Decision

Replace the hand-rolled gizmo with `transform-gizmo` (core crate, not egui/bevy
integrations). The core crate is framework-agnostic — it takes camera matrices
and mouse input, returns draw vertices and updated transforms.

## Why transform-gizmo

- **Pure Rust, no_std-compatible, WASM-ready** — compiles to wasm32 without
  modification. No DOM, no egui, no bevy required.
- **All three modes** — translate, rotate, scale, any combination simultaneously
- **Multi-object** — manipulate a selection group as a single transform
- **Maintained** — 304 stars, last release November 2025 (v0.8.0 egui 0.33)
- **Correct math** — gimbal-free rotation via quaternions, proper axis-plane
  constraints, snap support built in
- **MIT/Apache-2.0** — compatible with truck's licensing

## API mapping

```rust
// What transform-gizmo needs each frame:
gizmo.update_config(GizmoConfig {
    view_matrix: ...,        // already in SharedState: camera view matrix
    projection_matrix: ...,  // already in SharedState: camera projection
    viewport: Rect { .. },   // canvas width/height — already known
    modes: GizmoMode::all(), // or per-tool selection
    orientation: GizmoOrientation::Global,
    ..Default::default()
});

// Interaction input:
let interaction = GizmoInteraction {
    cursor_pos: (ndc_x, ndc_y), // same NDC coords cad-viewport.ts already sends
    hovered: !is_dragging,
    drag_started: mouse_down_this_frame,
    dragging: mouse_held,
};

// Update → get new transforms:
if let Some((result, new_transforms)) = gizmo.update(interaction, &[transform]) {
    // apply new_transforms to selected object(s)
    // result contains GizmoResult::Translation/Rotation/Scale with delta
}

// Draw → get vertices for overlay rendering:
let draw_data = gizmo.draw();
// draw_data.vertices: Vec<GizmoDrawData> — viewport-space line segments
```

## Rendering: world-space vs viewport-space

**Current approach:** gizmo arrows are added as `WireFrameInstance` objects to
the monstertruck scene in world space. They get depth-tested against geometry —
the gizmo can be occluded.

**transform-gizmo approach:** `Gizmo::draw()` returns vertices in viewport
(screen) space. They are rendered as a 2D overlay after the main scene pass,
always on top. This is the correct approach — Blender, Maya, Fusion 360 all
render gizmos as overlays.

**Implementation:** `SceneController` already has the WebGPU device and
swapchain. Add a second render pass after the main scene that draws the
gizmo vertices as screen-space line segments into a separate vertex buffer.
This is ~50 lines of WGSL shader + ~100 lines of Rust render pass setup.

The overlay pass uses no depth buffer — gizmo always visible regardless of
camera angle or occluding geometry.

## What changes in wasm_app.rs

**Remove:**
- `add_gizmo_arrows()` — replaced by `gizmo.draw()`
- `compute_axis_drag_delta()` — replaced by gizmo internals
- `begin_gizmo_drag()`, `update_gizmo_drag()`, `end_gizmo_drag()` WASM exports

**Add to SharedState:**
- `gizmo: transform_gizmo::Gizmo`

**New WASM exports:**
```rust
// Single update function — replaces the three-step begin/update/end
pub fn update_gizmo(
    &self,
    cursor_x: f64, cursor_y: f64,    // viewport pixel coords
    drag_started: bool,
    dragging: bool,
) -> JsValue  // GizmoUpdateResult: { translation?, rotation?, scale?, vertices }
```

**Keep:**
- `InteractionMode::Selected` / `InteractionMode::Dragging` (still needed for
  other interaction logic — pick mesh, camera orbit guard, etc.)

## Changes in cad-viewport.ts

`begin_gizmo_drag` / `update_gizmo_drag` / `end_gizmo_drag` collapse to a
single `update_gizmo` call on every mouse event while an object is selected.
The returned `vertices` array drives the overlay render pass.

The JS side no longer needs to manage drag state — transform-gizmo owns it.

## Gizmo mode switching

Add `set_gizmo_mode(mode: 'translate' | 'rotate' | 'scale' | 'all')` as a new
WASM export, callable via `cadCommand('set_gizmo_mode', { mode: 'rotate' })`.
Keyboard shortcuts: G=translate, R=rotate, S=scale (matching Blender convention).
Wire into `keyboard.ts`.

## Snap support

transform-gizmo has built-in snap. Expose via `cadCommand('set_gizmo_snap', { enabled, translate_step, rotate_deg, scale_step })`. No snap logic to write.

## Multi-object transform

When multiple objects are selected, pass all their transforms to `gizmo.update`.
The crate handles pivot calculation and returns per-object deltas. This is
something the hand-rolled gizmo cannot do at all.

## Monstertruck-mvt contribution

The coordinate transform pipeline (truck model space → real-world metres →
ECEF/Mercator → MVT tile space) in `monstertruck-mvt` will benefit from gizmo
transforms being expressed in the same coordinate space. transform-gizmo works
in whatever coordinate space you give it — no special handling needed.

## Dependency addition

Add to `systems/truck/crate/Cargo.toml`:

```toml
[dependencies]
transform-gizmo = { version = "0.8", default-features = false }
```

No feature flags needed — the core crate has no renderer dependencies.
The mint feature is not required since we'll convert nalgebra matrices manually
(one `into()` call per matrix via the mint feature on nalgebra side).

## Implementation order

1. Add `transform-gizmo` dep, verify it compiles to wasm32 target
2. Add `Gizmo` to `SharedState`, configure with camera matrices each frame
3. Add `update_gizmo` WASM export — no rendering yet, just verify interaction
4. Add gizmo overlay render pass (WGSL shader + render pass setup)
5. Remove old gizmo code (`add_gizmo_arrows`, `compute_axis_drag_delta`, etc.)
6. Update `cad-viewport.ts` to call `update_gizmo` instead of begin/update/end
7. Add `set_gizmo_mode` export + keyboard shortcuts
8. Add multi-object support
9. Add snap support + UI toggle

Steps 1-6 are the minimum viable replacement. Steps 7-9 are the upgrade.

## Risks

| Risk | Mitigation |
|------|-----------|
| WASM binary size increase | Core crate is small (~50KB). Acceptable. |
| Coordinate handedness | truck uses right-handed Y-up. transform-gizmo is configurable. Verify in step 3 before rendering. |
| Screen-space vertex format | `GizmoDrawData` format needs mapping to WebGPU vertex buffer layout. Read the type docs before step 4. |
| Monstertruck camera matrix format | Need to extract view/projection from `StudioConfig` in SharedState. Already done for `compute_axis_drag_delta` — same matrices. |
