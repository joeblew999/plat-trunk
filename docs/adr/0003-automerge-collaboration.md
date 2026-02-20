# [ADR-003] Automerge Collaboration

## Status

**Implemented**. Op log, undo/redo, cross-tab sync via BroadcastChannel, timeline UI.

## Context

CAD requires reliable state management:
- **Undo/redo** for every destructive operation (booleans, delete, clear)
- **Persistence** so models survive page refresh
- **Collaboration** so multiple users can edit simultaneously
- **Offline-first** so the app works without network

Traditional approaches (central server, last-write-wins) break under concurrent editing. We need CRDTs.

## Decision

Use [Automerge](https://automerge.org) — a CRDT library for JSON-like documents.

### Why Automerge?

- **CRDT-native**: Concurrent edits merge automatically without conflict resolution logic.
- **Change history**: Every mutation is tracked. Built-in support for branching and merging.
- **IndexedDB adapter**: Offline persistence for free.
- **BroadcastChannel adapter**: Cross-tab sync without any server (free, built into browser).
- **Document URLs**: `automerge:base58` for sharing and linking.
- **JS + Rust**: npm package for browser, Rust crate available for future native integration.

### What's implemented

**Op log**: Every `cadCommand()` call records an operation to the Automerge document:
```typescript
{ type: 'add_cube', params: { size: 1 }, enabled: true, actorId: 'peer-xxx', timestamp: ... }
```

**Undo/redo**: Set `enabled: false` on the last operation by the current actor. Replay all enabled ops to rebuild the scene. Per-actor undo is collaborative-safe.

**Timeline UI**: Horizontal strip of operation chips. Single-click toggles individual ops. Visual ghost chips for disabled operations.

**Cross-tab sync**: BroadcastChannel propagates Automerge changes between browser tabs instantly.

**Snapshot checkpoints**: `export_scene()` / `import_scene()` snapshots every 10 ops to avoid full replay on undo.

### Integration pattern

Automerge runs as a vendored JS WASM bundle (`web/gui/vendor/automerge-bundle.js`). It is NOT linked into the truck Rust crate — they communicate through JS:

```
cadCommand() → executeWasm(type, params)     [truck WASM]
            → cadDocManager.record(type, params)  [Automerge JS]
            → reconcile()                    [sync state → Datastar]
```

This keeps truck and Automerge independent. If profiling shows the boundary costs too much, we can link the Rust crates later (see ADR-006 history for discussion).

## Files

| File | Role |
|------|------|
| `web/gui/history.js` | `CadDocumentManager`: Automerge Repo, op log, replay, undo/redo, timeline UI |
| `web/gui/vendor/automerge-bundle.js` | Vendored Automerge + Automerge Repo (WASM included) |

## Sync Layers

| Layer | Transport | Status |
|-------|-----------|--------|
| Cross-tab | BroadcastChannel | **Shipped** |
| Cross-device | CF Worker SSE relay | **Shipped** (command relay, not Automerge sync) |
| Persistent storage | IndexedDB | **Shipped** |
| Cloud persistence | CF R2 | **Future** |
| Server-side merge | Automerge WASM in Worker | **Future** |

## References

- https://automerge.org
- https://automerge.org/docs/guides/using-automerge-with-llms/
- https://github.com/automerge/automerge
- See [ADR-008](0008-undo-redo.md) for detailed undo/redo strategy.
