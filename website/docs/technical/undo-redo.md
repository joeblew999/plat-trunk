# Undo/Redo System

Two-layer architecture combining fast local snapshots with Automerge CRDT operation log.

## Architecture

### Layer 1: Snapshot-based Local Undo (fast)

- Before each operation, capture a JSON snapshot of the entire scene
- Undo = restore the previous snapshot (< 5ms)
- Redo = restore the next snapshot
- Stack-based: undo stack + redo stack

### Layer 2: Automerge Operation Log (collaborative)

- Every operation is also recorded in the Automerge document
- Enables collaborative undo (each user undoes their own ops)
- Persistent across sessions via IndexedDB/R2

## Operation Types

| Op | Recorded Data | Undo Behavior |
|---|---|---|
| `add` | type, id, params | Remove the added object |
| `translate` | objectId, dx, dy, dz | Reverse the translation |
| `boolean` | op, idA, idB, resultId | Restore both input objects |
| `delete` | objectId, snapshot | Restore deleted object |
| `clear` | snapshot | Restore entire scene |

## Grouping

Related operations are grouped into single undo steps:
- Adding a primitive + auto-offset = one undo step
- This prevents partial undos (e.g., object added but not positioned)

## Timeline UI

The timeline strip shows recent operations as clickable chips. Each chip represents one undo step.

## UUID Stability

All objects have stable UUIDs (v4). UUIDs persist through:
- Translations
- Scene export/import
- Undo/redo cycles
- Cross-tab sync

## Performance

- Snapshot capture: < 5ms
- Snapshot restore: < 5ms
- Scene replay (10 ops): ~200ms
