# Undo/Redo System

Automerge CRDT-based undo/redo with operation enable/disable.

## Architecture

Undo/redo is implemented via the truck-sync Automerge op log. Each operation has an `enabled` flag — undo disables the last op, redo re-enables it.

### How It Works

1. **Record** — every data-plane command (add_cube, translate, etc.) creates an Op in the Automerge document
2. **Undo** — sets `enabled = false` on the most recent enabled op
3. **Redo** — sets `enabled = true` on the most recent disabled op
4. **Replay** — `get_replay_ops()` returns only enabled ops in order → geometry kernel replays them to reconstruct the scene

This is a **full replay** model — undo doesn't patch state, it replays from scratch with the undone op disabled.

## Operation Types

All commands recorded to the Automerge op log:

| Op Type | Recorded Params |
|---|---|
| `add_cube` | `{ size }` |
| `add_sphere` | `{ radius }` |
| `add_cylinder` | `{ radius, height }` |
| `add_torus` | `{ majorRadius, minorRadius }` |
| `translate` | `{ objectId, dx, dy, dz }` |
| `rotate` | `{ objectId, angleDeg, axisX, axisY, axisZ }` |
| `scale` | `{ objectId, sx, sy, sz }` |
| `boolean_union/subtract/intersect` | `{ idA, idB }` |
| `delete` | `{ objectId }` |
| `clear` | `{}` |
| `set_color` | `{ objectId, r, g, b, a }` |
| `set_style` | `{ objectId, style }` |
| `rename` | `{ objectId, name }` |
| `sketch_extrude` | `{ height, sketchJson }` |

## Grouping

Related operations share a `groupId`:
- Adding a primitive + auto-offset = one group → single undo step
- `set_group_enabled(doc, groupId, enabled)` toggles the whole group

## Browser Implementation

`CadDocumentManagerBase` in `history-domain.ts`:

- Maintains an undo cursor tracking which ops are undoable
- `record()` → `apply_op()` on Automerge doc + save to IndexedDB
- `undo()` → `set_op_enabled(id, false)` + `_replayScene()`
- `redo()` → `set_op_enabled(id, true)` + `_replayScene()`
- Cross-tab sync via BroadcastChannel

## Timeline UI

The history strip (`history-ui.ts`) shows recent operations as clickable chips. Disabled (undone) ops appear dimmed.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |

## Performance

Scene replay time depends on op count. For typical scenes (< 50 ops), replay completes in under 100ms.
