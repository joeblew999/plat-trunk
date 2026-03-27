# sync — TODO

Work remaining to fully decouple truck from sync internals.

## Move truck sync code into @plat/sync

Truck still has sync code that belongs in the library. Once moved, truck becomes a pure consumer — no sync internals.

### R2DocStore → @plat/sync/worker ✓ DONE

Moved to `ts/worker/handler.ts`. Exported from `@plat/sync/worker`.
Truck's `doc-store.ts` now re-exports from sync.

**Needs tests**: R2DocStore with etag concurrency (loadWithEtag, saveConditional, conflict handling). Add to `test/client/` or `test/integration/`.

### POST /sync route → already done

`createSyncHandler` in `@plat/sync/worker` replaces truck's inline POST /sync handler. But truck's `index.ts` still has its own merge logic (~50 lines). Truck should switch to `createSyncHandler` or call the handler for sync routes.

### worker-relay.ts → @plat/sync/adapters (SyncRelay)

`systems/truck/web/worker-relay.ts` manages SSE EventSource lifecycle. `SyncRelay` in `@plat/sync/adapters` is the replacement. Truck should switch to it.

**Truck becomes**:
```typescript
import { SyncRelay } from '@plat/sync/adapters';
const relay = new SyncRelay(client, { eventsUrl: `/api/cad/${modelId}/events?actorId=${actorId}` });
relay.connect();
```

### sync-wasm.generated.ts → @plat/sync/worker (createWasmAdapter)

`systems/truck/worker/src/sync-wasm.generated.ts` is a WASM loader. Replaced by `createWasmAdapter` from `@plat/sync/worker`. Truck should delete the generated file and use the library function.

### history-domain.ts inline sync → already mostly done

Truck's `history-domain.ts` already uses `SyncClient`, `IdbStorageAdapter`, `NullNetworkAdapter`, `bindNetworkEvents`, `loadAndSync`, `openBroadcast`. The wiring is done — just needs the remaining pieces (SyncRelay, R2DocStore).

## Related ADR phases (not sync — lives in truck)

These ADR phases touch sync-adjacent code but are truck-specific. Listed here so they don't get lost.

### ADR-0001 Part C — Replay with snapshots

Truck's replay system rebuilds the 3D scene from CRDT ops. Currently re-executes all ops every time. Part C caches `scene.json` by replay ops hash so subsequent loads are instant. This is geometry/truck-specific — sync provides the ops, truck owns the replay.

**Owner**: truck (`systems/truck/web/replay-executor.ts`)

### ADR-0001 Part H — Tiering boundary

Defines which ops run server-side (Tier 1: <10ms, e.g. add_cube) vs browser-side (Tier 2: heavy, e.g. booleans, STEP export). The `ReplayPlan` struct and `replay-executor.ts` implement this. Sync provides the op log — tiering decides where ops execute.

**Owner**: truck (`systems/truck/web/replay-executor.ts`, `tier-manager.ts`)

### ADR-0008 Phase 5 — Vitest harness (conditional)

Only needed if Playwright proves too slow for CI. Currently Playwright integration tests run in ~8s — fast enough. If this changes, add a vitest-based harness that mocks the browser environment for faster iteration.

**Status**: Not needed. Playwright is fast. Revisit if CI time exceeds 30s.

## Summary

| What | Where now | Move to | Truck becomes |
|------|-----------|---------|---------------|
| R2DocStore | `truck/worker/src/doc-store.ts` | `@plat/sync/worker` | 1-line import |
| POST /sync handler | `truck/worker/src/index.ts` (~50 lines) | `@plat/sync/worker` (createSyncHandler) | Route delegation |
| SSE relay | `truck/web/worker-relay.ts` | `@plat/sync/adapters` (SyncRelay) | 3-line init |
| WASM loader | `truck/worker/src/sync-wasm.generated.ts` | `@plat/sync/worker` (createWasmAdapter) | Delete file |
