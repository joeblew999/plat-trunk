# sync — TODO

## Done

- **R2DocStore** → moved to `@plat/sync/worker`. Truck re-exports.
- **mergeWithRetry** → etag-based optimistic concurrency in `@plat/sync/worker`.
- **createSyncHandler** uses R2DocStore + mergeWithRetry internally.

## Remaining

### Truck POST /sync → use mergeWithRetry from sync

Truck's `index.ts` has ~40 lines of inline merge logic with etag retry. This is now `mergeWithRetry` in `@plat/sync/worker`. Truck should import and call it instead of inlining.

**Truck keeps**: manifest actor name updates, SSE presence enrichment (truck-specific).
**Truck replaces**: the merge + etag retry block → `mergeWithRetry(store, wasm, modelId, browserDoc)`.

### Truck worker-relay.ts → SyncRelay for sync events

Truck's `worker-relay.ts` handles 4 SSE event types: `cad-command` (truck-specific), `sync-op`, `doc-changed`, `presence`. The last 3 are sync events that `SyncRelay` handles.

**Approach**: Truck creates a `SyncRelay` for sync events + keeps its own `cad-command` listener on the same EventSource.

### Truck sync-wasm.generated.ts — keep it

Truck uses 19 direct WASM function calls across MCP execution, replay, op recording, doc bootstrap. These are truck-specific uses beyond what `SyncWasmAdapter` covers (e.g. `syncMergeDocsWithInfo`, headless replay). The generated WASM loader stays in truck.

`createWasmAdapter` from sync is for new consumers that only need the sync protocol — truck is a power user with direct WASM access.

## Not sync — tracked for visibility

### ADR-0001 Part C — Replay with snapshots
Cache `scene.json` by replay ops hash. Owner: truck.

### ADR-0001 Part H — Tiering boundary
Which ops run server-side vs browser-side. Owner: truck.

### ADR-0008 Phase 5 — Vitest harness
Not needed. Playwright runs in ~8s.
