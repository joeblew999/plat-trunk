# Scene Management

## Outliner

The Scene section shows all objects in the current scene. Each object displays its name (or UUID prefix). The selected object is highlighted.

## Selection

- **Click an object** in the viewport to select it
- **Click empty space** to deselect
- Selected objects show a translate gizmo (3 colored arrows)

## Delete

- **Delete Sel.** — removes the currently selected object
- **Delete key** — keyboard shortcut for the same action
- Deletion can be undone with Ctrl+Z

## Clear All

Removes all objects from the scene. This creates a blank scene. Can be undone.

## Undo / Redo

| Action | Shortcut |
|---|---|
| Undo | Ctrl+Z |
| Redo | Ctrl+Shift+Z |

The undo system uses Automerge CRDT operations. Each operation has an `enabled` flag — undo disables it, redo re-enables it, and the scene replays from scratch.

### Timeline

The timeline strip shows recent operations as chips. Each chip represents an undoable action (add, translate, boolean, delete, clear, etc.). Undone operations appear dimmed.

## Collaborative Editing

When multiple browser tabs are open, changes sync automatically via BroadcastChannel. Each tab sees the same scene state.

## Via MCP (AI Agents)

- `get_state` — get full scene state (object list, selection, etc.)
- `select` — `{ id }` — select an object
- `deselect` — clear selection
- `delete` — `{ objectId }` — delete an object
- `clear` — remove all objects
- `get_status` — system status (mode, sync state, object count)
