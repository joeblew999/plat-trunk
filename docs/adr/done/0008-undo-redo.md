# Undo/Redo & Collaborative State Management

## Status

Implemented (Phase 1-5). Stable UUIDs, operation grouping, timeline UI, and comprehensive tests shipped.

## Problem

CAD systems require reliable undo/redo — every destructive operation (boolean subtract, delete, clear) must be reversible. But unlike single-user undo (a simple stack), collaborative CAD has harder constraints:

- Multiple users edit the same project simultaneously
- Users work offline and merge later
- Undo must only affect the current user's operations, not undo another user's work
- The operation history must be persistent and shareable

Fusion 360 solves this with a parametric timeline — every operation is a node, undo disables the node, the model rebuilds from the remaining nodes. We need the same pattern but decentralized (no central server required for basic operation).

## Decision

**Two-layer architecture**: snapshot-based local undo (fast, works without network) backed by an Automerge CRDT operation log (collaborative, persistent, mergeable).

### Why two layers?

1. **Snapshot undo is instant** — `export_scene()` / `import_scene()` takes <5ms for typical scenes. No replay needed.
2. **Automerge undo requires replay** — disabling an op means replaying all remaining ops to rebuild the scene. Boolean ops take ~100ms each. A 50-op scene = 5s replay.
3. **Graceful degradation** — if Automerge CDN fails to load, snapshot undo still works. The app is never broken.

### Why Automerge (not custom sync)?

- CRDTs handle concurrent edits without conflict resolution logic
- Built-in change history — every mutation is tracked automatically
- IndexedDB adapter for offline persistence
- BroadcastChannel adapter for cross-tab sync (free)
- Document URLs (`automerge:base58`) for sharing
- Per the existing automerge ADR, this is the chosen sync engine

### Why not Automerge in Rust (linked crate)?

Per the kkrpc ADR Rule 1: "automerge starts with npm package, link rust crates later if needed." The JS WASM module works in browser and avoids coupling the truck kernel to Automerge. If performance becomes an issue (large op logs), we can link the Rust crate and use typed ArrayBuffer transfer.

## Architecture

```
┌──────────────────────────────────────────────┐
│  Browser Tab                                  │
│                                               │
│  main.js ──→ cadDocManager.applyOperation()   │
│         │        │                            │
│         │        ├──→ Automerge doc.change()   │
│         │        ├──→ _executeOp() (WASM)     │
│         │        └──→ IndexedDB (persist)      │
│         │                                     │
│         └──→ undoManager.captureBeforeMutation()│
│              (fallback if Automerge not loaded) │
│                                               │
│  BroadcastChannel ←→ Other tabs               │
│  WorkerSyncAdapter ←→ CF Worker               │
└──────────────────────────────────────────────┘
         │
         │ HTTP POST + SSE
         ▼
┌──────────────────────────────────────────────┐
│  Cloudflare Worker                            │
│                                               │
│  POST /api/docs          — create document    │
│  GET  /api/docs/:id      — load document      │
│  POST /api/docs/:id/sync — exchange sync data │
│  GET  /api/docs/:id/events — SSE notifications│
│                                               │
│  R2 bucket: cad-documents                     │
└──────────────────────────────────────────────┘
```

## Operation Log Schema

```typescript
interface CadDocument {
  name: string;
  createdAt: string;
  operations: CadOperation[];
  snapshotJson?: string;        // periodic checkpoint
  snapshotAtOpIndex?: number;
}

interface CadOperation {
  id: string;                   // UUID
  type: 'add_cube' | 'add_sphere' | 'add_cylinder' | 'add_torus'
       | 'translate'
       | 'boolean_union' | 'boolean_subtract' | 'boolean_intersect'
       | 'delete' | 'clear';
  params: Record<string, number | string>;
  enabled: boolean;             // false = "undone"
  timestamp: number;
  actorId: string;              // identifies the user/peer
}
```

## Undo Semantics

### Single-user (Phase 1 — snapshot)

Standard undo stack. `captureBeforeMutation()` saves full scene state before each operation. Undo restores previous snapshot, pushes current to redo stack. Max 50 snapshots (~5MB for typical scenes).

### Collaborative (Phase 2 — Automerge)

**Undo = set `enabled: false`** on the last enabled operation by the current actor. This is collaborative-safe because:

- Each user only undoes their own operations (filtered by `actorId`)
- Disabled ops stay in the log — other users see the undo happen
- The CRDT merges the `enabled` flag change like any other edit
- No data is ever deleted from the log

**Redo = set `enabled: true`** on the first disabled operation by the current actor (scanning backward from end).

**Replay**: After every undo/redo, the scene is rebuilt from scratch:
1. `clear_scene()`
2. For each operation where `enabled === true`, execute it
3. Snapshot checkpoints every 10 ops to skip early replay

### Index stability — solved via UUIDs

Every `SceneObject` has a `Uuid` (v4, generated by the `uuid` crate with `js` feature for WASM entropy). All WASM API methods take/return UUID strings instead of array indices. An `id_to_index: HashMap<String, usize>` provides O(1) lookup. `rebuild_id_index()` runs after any operation that changes Vec ordering (delete, boolean). Boolean operations consume two objects and produce one new object with a fresh UUID — downstream ops referencing the consumed UUIDs gracefully fail, and the new UUID is tracked in `_opResultMap` for grouped operations.

## Files

| File | Role |
|------|------|
| `web/gui/history.js` | `CadDocumentManager`: Automerge Repo, op log, replay, undo/redo, timeline UI |
| `web/gui/state.js` | `cadCommand()` routes operations through docManager + reconcile |
| `web/gui/vendor/automerge-bundle.js` | Vendored Automerge + Automerge Repo (WASM included) |
| `systems/truck/worker/src/index.ts` | SSE relay + state sync API |

## Automerge loading strategy

Automerge is vendored as a single bundle at `web/gui/vendor/automerge-bundle.js`. This avoids CDN reliability issues and keeps the app bundler-free (all static files served from Wrangler `[assets]`).

## SSE limitations on CF Workers

Workers can't hold long-lived connections (30s timeout on free tier). The SSE endpoint returns immediately with current version info. Clients use `EventSource` which auto-reconnects (browser built-in, ~3s retry). This gives near-real-time sync (~3-5s latency) without WebSockets.

For true real-time (<100ms), future options:
- Durable Objects (stateful WebSocket rooms)
- NATS JetStream (per the architecture overview ADR)
- LiveKit data channels (if Tier 3 is active)

## Sync protocol

Current: simple "last write wins by size" — the Worker stores whichever binary is larger. This works for single-user persistence and basic multi-user where clients do their own Automerge merging.

Future: implement proper Automerge sync protocol on the Worker side. This requires running Automerge in the Worker (WASM), which adds ~500KB to the Worker bundle but enables server-side merging and conflict resolution.

## Performance

| Operation | Time |
|-----------|------|
| Snapshot capture (`export_scene`) | <5ms |
| Snapshot restore (`import_scene`) | <5ms |
| Automerge doc change | <1ms |
| Scene replay (10 ops) | ~200ms |
| Scene replay (50 ops) | ~1-5s |
| Snapshot checkpoint (skip replay) | <10ms |

Checkpoint interval: every 10 ops. Worst case replay from checkpoint: 9 ops.

## Future

- **Server-side Automerge**: Run WASM Automerge in Worker for proper sync protocol
- **Branching**: Fork documents for what-if exploration (Automerge supports this natively)
- **Auth**: Per-document access control (Better-Auth per mcp ADR)
- **Constraint solver**: Parametric constraints that auto-update on undo/redo
