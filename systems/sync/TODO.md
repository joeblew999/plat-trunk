# sync — TODO

## Done

- **R2DocStore** — moved to `@plat/sync/worker`. Truck re-exports.
- **mergeWithRetry** — etag-based optimistic concurrency in `@plat/sync/worker`.
- **createSyncHandler** — uses R2DocStore + mergeWithRetry internally.
- **Truck POST /sync** — replaced ~35 lines of inline merge with `mergeWithRetry`. 20/20 tests pass.

## Stays in truck (not moving)

### worker-relay.ts

Truck's SSE relay has truck-specific behavior on every event: `cad-command` dispatch, `cadDocManager.applyServerOp`, `window.__presenceActors` + `reconcile`, state broadcast on connect. Can't switch to `SyncRelay` without two EventSources or losing truck wiring.

`SyncRelay` is for new consumers. Truck's relay is a power-user implementation.

### sync-wasm.generated.ts

Truck uses 19 direct WASM calls for MCP execution, replay, op recording, doc bootstrap. `createWasmAdapter` is for new consumers — truck needs the full WASM function set.

## Not sync — tracked for visibility

### ADR-0001 Part C — Replay with snapshots
Cache `scene.json` by replay ops hash. Owner: truck.

### ADR-0001 Part H — Tiering boundary
Which ops run server-side vs browser-side. Owner: truck.

### ADR-0008 Phase 5 — Vitest harness
Not needed. Playwright runs in ~8s.
