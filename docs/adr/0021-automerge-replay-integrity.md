# ADR-0021: Automerge Replay Integrity

## Status

**Implemented** — all fixes verified via Playwright fuzz testing.

## Problem

The Automerge op-log replay mechanism (used for undo/redo) had two critical bugs:

1. **Object IDs regenerated on replay** — every `_replayScene()` call cleared the WASM scene and re-executed all ops, generating fresh UUIDs each time. After undo→redo, all object references (selection, boolean operands, style targets) broke because IDs changed.

2. **Name counters not reset on clear** — `clear_scene()` didn't reset the `name_counters` HashMap, so each replay cycle incremented counters: Box 1 → Box 5 → Box 9 → Box 13.

Additionally, a full architectural audit was performed to validate the op-log approach against three requirements: undo/redo, multi-user collaboration, and offline/online sync.

## Architecture Validation

The op-log (event-sourcing) approach stored in an Automerge CRDT document is **correct** for this system's requirements:

| Requirement | Why op-log works | Why state-based would fail |
|-------------|-----------------|---------------------------|
| **Undo/redo** | Toggle `enabled` flag on ops, replay | Would need full state snapshots per operation |
| **Multi-user collab** | Each user's ops merge via CRDT | Last-write-wins destroys concurrent edits |
| **Offline/online** | Ops merge automatically on reconnect | State merge = conflict resolution nightmare |

The two-layer architecture from ADR-0008 remains sound: snapshot-based local undo (fast, <5ms) backed by Automerge op-log (collaborative, persistent, mergeable).

## Design Principle

**The kernel knows nothing about Automerge or replay.** All creation methods (`add_cube`, `boolean_union`, etc.) always generate fresh UUIDs. The `execute()` API boundary is the only place that handles replay semantics — via a single post-hoc `rename_object` call.

## Fixes

### Fix 1: Reset name counters on clear (`wasm_app.rs`)

One line added to `clear_scene()`:

```rust
s.name_counters.clear();  // was missing — caused name inflation on replay
```

### Fix 2: Preserve UUIDs across replay — boundary rename (`wasm_app.rs`)

A single `rename_object()` helper updates an object's UUID in all three state structures (objects, id_to_index, bounding_spheres). Called once in `execute()` after the command dispatch:

```rust
/// Rename an object's UUID in place. Used by execute() at the API boundary
/// to preserve IDs during Automerge replay. The kernel stays pure.
fn rename_object(s: &mut SharedState, old_id: &str, new_id_str: &str) { ... }
```

In `execute()` — the ONE place that knows about replay:

```rust
// Replay ID: read _replayId (not objectId) because objectId is the source
// reference for commands like duplicate/translate — not the desired result ID.
let replay_id = p.get("_replayId").and_then(|v| v.as_str()).map(|s| s.to_string());

// ... dispatch ...

// API boundary: if replay provided a _replayId and the kernel created
// an object with a different (fresh) UUID, rename it to match.
if let Some(ref wanted_id) = replay_id {
    if let Some(actual_id) = result.get("objectId").and_then(|v| v.as_str()) {
        if actual_id != *wanted_id {
            rename_object(&mut self.state.borrow_mut(), &actual_id, wanted_id);
            result["objectId"] = serde_json::json!(wanted_id);
        }
    }
}
```

The kernel methods are untouched. No `_impl` variants, no hidden state, no `replay_id` parameter threading. The boundary does the translation.

### Fix 3: Separate `_replayId` from `objectId` (`history.js` + `wasm_app.rs`)

The original implementation used `objectId` in Automerge op params for both the replay ID and source references. This caused a collision for `duplicate` — the source object's `objectId` was consumed by the boundary rename, making the duplicate share the same UUID as the original.

**JS (`history.js`)** — `record()` stores the result ID as `_replayId`, preserving `objectId` as the source reference:

```js
params: { ...params, _replayId: meta.objectId || null },
```

**Rust (`wasm_app.rs`)** — reads `_replayId` instead of `objectId`:

```rust
let replay_id = p.get("_replayId").and_then(|v| v.as_str()).map(|s| s.to_string());
```

This ensures `duplicate` (which passes `objectId` as "source to copy") won't have its result renamed to the source's UUID.

## How replay works (end to end)

1. `history.js` `record()` stores result `objectId` as `_replayId` in op params
2. `undo()` / `redo()` toggles `enabled` flag, calls `_replayScene()`
3. `_replayScene()` calls `cadCommand('clear', {}, REPLAY)` then re-executes all enabled ops
4. Each replayed command passes its stored `_replayId` to Rust `execute()`
5. Kernel creates object with fresh UUID → `execute()` renames it to the stored `_replayId`
6. Result: same objects, same UUIDs, same names after every replay cycle

### Fix 4: Debounce change listener (`history.js`)

Remote Automerge mutations fired `_replayScene()` on every change event. Batch ops from a remote peer would trigger N replays. Now debounced with 100ms quiet period:

```js
clearTimeout(debounceTimer);
debounceTimer = setTimeout(() => { this._replayScene(); }, 100);
```

### Fix 5: Undo dispatch — `mgr.undo()` not `mgr.handle.undo()` (`state.js`)

`handleJsCommand('undo')` was calling `mgr.handle.undo()` (Automerge DocHandle-level undo — reverts the last `change()` call) instead of `mgr.undo()` (the CadDocumentManager method that toggles `enabled` flags and replays the scene). Same for redo. Fixed to call the correct methods.

### Fix 6: Multiple snapshot checkpoints (`history.js`)

Replaced single `snapshotJson`/`snapshotAtOpIndex` with a `snapshots[]` array (max 3 entries). During replay, the nearest valid checkpoint is found by searching newest→oldest. Schema change:

```js
// Old: { snapshotJson, snapshotAtOpIndex }
// New: { snapshots: [{ json, atOpIndex }, ...] }  // max 3
```

### Timeline DOM cleanup — already handled

`_renderTimeline()` uses `strip.innerHTML = ...` which replaces all children. No stale nodes.

## Files

| File | Role |
|------|------|
| `crates/truck-webgpu-gui/src/wasm_app.rs` | Rust WASM — name_counters fix + `rename_object` + boundary call in `execute()` |
| `web/gui/history.js` | Automerge CadDocumentManager — record, replay, undo/redo |
| `web/gui/state.js` | cadCommand dispatch, reconcile pipeline |

## References

- [ADR-0008](done/0008-undo-redo.md) — Undo/Redo & Collaborative State Management
- [ADR-0003](done/0003-automerge-collaboration.md) — Automerge Collaboration
