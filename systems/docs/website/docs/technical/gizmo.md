# Gizmo — WYSIWYG Direct Manipulation

Fusion 360-style direct manipulation: click objects to select, drag gizmo handles to transform.

## Interaction State Machine (Rust)

```
IDLE  ──click object──>  SELECTED  ──drag arrow──>  DRAGGING
  ^                        │   ^                       │
  └──click empty───────────┘   └──mouseup / Escape─────┘
```

Three modes in `InteractionMode` enum:
- **Idle** — no selection, normal camera orbit
- **Selected** — object highlighted, gizmo arrows visible, camera still works
- **Dragging** — constrained axis movement, camera orbit disabled, live preview

## Picking

- **AABB** (axis-aligned bounding box) per object, computed from pick mesh vertices — tighter than bounding spheres
- `Camera::ray(ndc)` casts ray from screen coordinates
- Ray-AABB intersection finds closest hit
- Gizmo arrow picking via ray-to-segment distance

## Gizmo Geometry

- 3 colored `WireFrameInstance` arrows (X=red, Y=green, Z=blue) at selected object center
- Arrows scaled proportionally to camera distance (constant screen size)
- During drag: active axis highlighted, others dimmed

## Drag Mechanics

- Screen-to-world: project mouse NDC delta onto constrained axis via ray-axis closest-point math
- Live preview: `translate_object()` called incrementally during drag
- Cumulative delta tracked for final commit
- Escape reverses cumulative translation (cancel)

## JS ↔ WASM API

Public methods called from JS via `dispatch.ts`:
- `select_object_at(ndc_x, ndc_y) → JsValue` — pick and select
- `begin_gizmo_drag(ndc_x, ndc_y) → JsValue` — start drag if clicking gizmo arrow
- `update_gizmo_drag(ndc_x, ndc_y, prev_ndc_x, prev_ndc_y)` — live preview
- `end_gizmo_drag() → JsValue` — finish drag, return { objectId, dx, dy, dz }
- `cancel_gizmo_drag() → bool` — reverse translation

## Automerge Integration

On drag complete, JS commits a single `translate` operation to the Automerge op log via `cadCommand('translate', ...)`.
No ops created during drag (live preview only). Undo reverses the committed op.

## Future

- **Rotation gizmo** — circular handles for rotate-around-axis
- **Scale gizmo** — square handles for uniform/non-uniform scale
- **Snap-to-grid** — constrain drag to grid increments
- **Multi-select** — Shift+click to select multiple objects
