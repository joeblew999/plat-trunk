# Automerge — Collaborative Editing

CRDT-based state sync for collaborative CAD editing. Implemented as the `truck-sync` Rust crate (`systems/sync/crate/`).

## Why Automerge

- **Conflict-free merging** — concurrent edits from multiple users merge automatically
- **Offline-first** — works without network, syncs when reconnected
- **Operation log** — every change is recorded, enabling undo/redo and audit trails

## truck-sync Crate

`systems/sync/crate/` — a plugin-agnostic CRDT op log that knows nothing about geometry or CAD internals.

### Op Structure

```rust
struct Op {
    id: String,           // UUID
    type_: String,        // "add_cube", "translate", etc.
    params: String,       // JSON params
    enabled: bool,        // for undo (disabled = skipped on replay)
    timestamp: u64,
    actor_id: String,
    group_id: Option<String>,
}
```

Field names match the JS `CadOperation` interface exactly.

### Automerge Document Structure

```
{
  operations: [Op, Op, Op, ...],   // flat list of op maps
  name: "My Model"                  // document metadata
}
```

Simple flat list — NOT nested by plugin/domain.

### WASM Exports

| Function | Purpose |
|---|---|
| `create_doc()` | Create empty Automerge document |
| `apply_op(doc, op_json)` | Append an operation |
| `get_ops(doc)` | Get all operations as JSON |
| `get_replay_ops(doc)` | Get enabled ops in order (for geometry replay) |
| `merge_docs(doc_a, doc_b)` | Merge two documents (CRDT) |
| `validate_op(doc, op_json)` | Validate an op before applying |
| `set_op_enabled(doc, id, enabled)` | Enable/disable op (undo/redo) |
| `set_group_enabled(doc, group_id, enabled)` | Enable/disable op group |
| `export_ops_since(doc, index)` | Get ops after a given index |
| `rollback_to(doc, index)` | Disable all ops after index |

### Build

Two WASM targets built by `bun run build:sync`:

```
wasm-pack build --target web       → systems/truck/web/pkg-sync/
wasm-pack build --target bundler   → systems/truck/worker/pkg-sync/
```

### Tests

10 Rust tests (run with `cargo test -p truck-sync`):
- Op creation, apply, replay ordering
- Enable/disable ops and groups
- Document merge (CRDT convergence)
- Rollback and export_ops_since

## Browser Integration

### CadDocumentManagerBase (`history-domain.ts`)

The browser-side manager wraps the truck-sync WASM:

- `record(type, params, meta)` — creates an Op and applies to Automerge doc
- `undo()` / `redo()` — disables/re-enables ops via `set_op_enabled`
- `_replayScene()` — gets replay ops, executes them through the WASM geometry kernel
- Cross-tab sync via BroadcastChannel

### Storage

- **IndexedDB** (`doc-store.ts`) — persists Automerge doc bytes locally
- **R2** (server) — model scene JSON and thumbnails

## Sync Paths

| Path | Mechanism |
|---|---|
| Cross-tab (same browser) | BroadcastChannel |
| Browser → Server | POST /api/cad/{modelId}/state via SSE |
| Server → Browser | SSE events |

## References

- https://automerge.org
- LLM reference: `docs/llms/automerge-llms-full.txt`
