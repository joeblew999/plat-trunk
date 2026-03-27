# systems/sync — CRDT Op Log

Reusable, plugin-agnostic CRDT operation log.
Knows nothing about CAD geometry, replay, or any specific system — it stores, merges, and replays ordered operations using Automerge.

## Goals

1. **Reusable** — any system can drop in sync and get multi-actor, offline-capable, conflict-free op logging with zero system-specific code.
2. **Standalone-testable** — `cd systems/sync && mise run ci` builds and tests everything in isolation.
3. **Offline-resilient** — ops are never lost. Local-first by design, sync recovers automatically when connectivity returns.

## Quick start

### CF Worker (server)

```typescript
import { SyncWorker, createWasmAdapter } from '@plat/sync/worker';
import wasmModule from './pkg-sync/plat_sync_bg.wasm';
import * as glue from './pkg-sync/plat_sync_bg.js';

const sync = new SyncWorker(await createWasmAdapter(wasmModule, glue), {
  onExecute: async (op, modelId) => {
    // Your app logic — what does this op DO?
    return myEngine.execute(op.type, op.params);
  },
});

export default {
  fetch: (req, env) => sync.fetch(req, env.SYNC_R2, '/api'),
};
```

Add to `wrangler.toml`:
```toml
[[r2_buckets]]
binding = "SYNC_R2"
bucket_name = "my-sync-docs"
```

This gives you:
- `POST /api/models/:id/sync` — merge browser doc with R2 (etag retry)
- `POST /api/models/:id/ops` — apply op server-side (execute + save + broadcast)
- `GET /api/models/:id/ops` — get all ops
- `GET /api/models/:id/replay` — get enabled ops only
- `GET /api/models/:id/events` — SSE stream (doc-changed, sync-op, presence)
- `DELETE /api/models/:id` — remove model

### Browser (client)

```typescript
import { SyncClient, bindNetworkEvents } from '@plat/sync/client';
import { IdbStorageAdapter, NullNetworkAdapter, makeSyncFetch } from '@plat/sync/adapters';
import type { Operation } from '@plat/sync/types';

const client = new SyncClient(wasm, new IdbStorageAdapter(), new NullNetworkAdapter(makeSyncFetch('/api')), {
  actorId: crypto.randomUUID(),
});

client.openBroadcast();           // cross-tab sync via BroadcastChannel
bindNetworkEvents(client);        // auto-detect online/offline
await client.loadAndSync('my-model');  // load from IDB + sync unsent ops

client.onRemoteOps = (ops) => { /* handle new ops */ };
await client.addOp({ id: '...', type: 'add_item', params: {}, enabled: true, timestamp: Date.now(), actorId: client.actorId });
```

## Package exports

| Import | What |
|--------|------|
| `@plat/sync/client` | `SyncClient`, `bindNetworkEvents`, `PresenceState`, `SyncMessage` |
| `@plat/sync/adapters` | `IdbStorageAdapter`, `NullNetworkAdapter`, `HttpSseNetworkAdapter`, `DirectNetworkAdapter`, `MemoryStorageAdapter`, `makeSyncFetch`, `SyncRelay` |
| `@plat/sync/worker` | `SyncWorker`, `createSyncHandler`, `createWasmAdapter`, `mergeWithRetry`, `R2DocStore` |
| `@plat/sync/types` | `Operation` type (+ deprecated `CadOperation` alias) |
| `@plat/sync/wasm-adapter` | `SyncWasmAdapter` interface |

## Features

- **CRDT merge** — Automerge handles concurrent edits, automatic conflict resolution
- **Op deduplication** — prevents dual-write bugs (browser + server both record same op)
- **Undo/redo** — per-op enable/disable, per-group, rollback by actor
- **Cross-tab sync** — `openBroadcast()` sends doc bytes via BroadcastChannel, other tabs merge instantly
- **Server sync** — debounced HTTP round-trip with retry/exponential backoff
- **Offline resilience** — ops queue while offline, `loadAndSync()` on page load, `bindNetworkEvents()` auto-detects connectivity
- **Per-model debounce** — each model gets its own sync timer
- **Presence** — `setPresence()` / `onPresence` for cursor positions, selections, user awareness
- **SSE relay** — `SyncRelay` manages EventSource lifecycle (connect, reconnect, event parsing)
- **Blake3 change detection** — `doc_hash()` for accurate `hadNewOps` detection and storage integrity
- **Storage budget** — `compactIfNeeded()` triggers Automerge compaction when `maxDocBytes` exceeded
- **Incremental reads** — `getOpsSince(index)` for delta processing
- **Model reset** — `reset()` clears local doc, storage, presence, timers (clean wipe)
- **Server application loop** — `SyncWorker` handles the full server-side protocol: apply op → save to R2 → broadcast → execute consumer callback
- **Reusable CF Worker** — `SyncWorker` or `createSyncHandler()` + `createWasmAdapter()` gives you a full sync server
- **Structured tracing** — every event logged as `SyncLogEntry`
- **Schema codegen** — Rust types → JSON Schema → TypeScript types (automated)
- **Size optimized** — release build: 1.1 MB raw, 361 KB gzipped (`opt-level=z`, LTO, strip)

## Doc structure

```
ROOT
  operations: List[Map]
    { id, type, params, enabled, timestamp, actorId, groupId }
  name: String
```

Flat list, no plugin segmentation. Multi-system: use separate Automerge docs per system (ADR-0015).

## Directory layout

```
systems/sync/
  crate/                Rust source (plat-sync crate — Automerge CRDT, Blake3)
  pkg/                  WASM build output (generated from crate/ by wasm-pack, gitignored)
    web/                  Browser ESM target (init() + .wasm)
    bundler/              CF Worker / bundler target (.wasm as module)
  ts/                   Library — what @plat/sync/* exports
    sync-client.ts        SyncClient class + bindNetworkEvents
    adapters.ts           Storage + network adapters + SyncRelay
    worker.ts             createSyncHandler + createWasmAdapter (CF Worker)
    sync-types.generated.ts   Operation type (from Rust)
    sync-wasm-adapter.generated.ts  SyncWasmAdapter interface
  test/
    client/             Tests @plat/sync/client + adapters (workerd runtime, 23 tests)
    worker/             Standalone sync CF Worker (wrangler + R2) for integration tests
    integration/        Full stack tests (Playwright — real browser + worker + R2, 9 tests)
  package.json          @plat/sync with exports map
  system.mjs            Build/test config for root pipeline
  mise.toml             Standalone task definitions
```

## Build

```bash
# Via root pipeline (incremental, copies to consumer dirs)
bun run build:sync

# Standalone (outputs to systems/sync/pkg/ only)
cd systems/sync && mise run build:wasm:self
```

## Test

```bash
# Unit tests (Rust + client boundary in workerd)
cd systems/sync && mise run test

# Rust only (fast, no WASM build)
mise run test:rust

# Client boundary only (workerd)
mise run test:client

# Integration (real browser + real CF Worker + R2)
mise run test:integration

# Full CI gate (Rust + client, no dev server needed)
mise run ci
```

### Test boundaries

| Directory | Runtime | What it tests |
|-----------|---------|---------------|
| `crate/src/lib.rs` | Rust native | CRDT math: merge, dedup, replay, rollback, Blake3 |
| `test/client/` | CF Workers (workerd) | `@plat/sync/client` + `@plat/sync/adapters` — protocol, retry, presence, compaction, debounce |
| `test/worker/` | CF Workers (wrangler) | `@plat/sync/worker` — createSyncHandler with real R2 |
| `test/integration/` | Chrome (Playwright) | All boundaries — real IDB + real HTTP + real R2 + BroadcastChannel |

## ADRs

- **ADR-0001** — Multi-actor sync: Automerge in R2 + browser IDB with CRDT merge
- **ADR-0008** — Sync architecture redesign: SyncClient + pluggable adapters + visual debugger
- **ADR-0015** — Doc structure: flat ops list, separate docs per system
