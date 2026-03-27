# systems/sync — CRDT Op Log + PartyKit Sync

Reusable, plugin-agnostic CRDT operation log with real-time sync via PartyKit.
Knows nothing about CAD geometry, replay, or any specific system — it stores, merges, and syncs ordered operations using Automerge.

## Quick start

### SyncDoc (PartyKit transport — recommended)

```typescript
import { SyncDoc } from '@plat/sync/partykit';
import type { Operation } from '@plat/sync/types';

// Peer A creates a doc
const syncA = new SyncDoc({ host: 'localhost:1999', room: 'my-model', actorId: 'user-1' });
const docId = await syncA.create();

syncA.addOp({ id: '1', type: 'add_cube', params: { size: 1 }, enabled: true, timestamp: Date.now(), actorId: 'user-1' });
syncA.undo('1');       // disable op
syncA.redo('1');       // re-enable

// Peer B joins the same doc
const syncB = new SyncDoc({ host: 'localhost:1999', room: 'my-model', actorId: 'user-2' });
await syncB.join(docId);

// B sees A's ops automatically via automerge-repo CRDT sync
syncB.onRemoteOps = (ops) => replayScene(ops);
```

### Server (wrangler dev with Durable Objects)

```bash
cd systems/sync/test/partykit
npx wrangler dev --port 1999
```

The server uses the real `automerge-partyserver` package — `withAutomerge(Server)` mixin, `DOStorageAdapter` with 128KB chunking, automerge-repo sync protocol over WebSocket.

## Package exports

| Import | What |
|--------|------|
| `@plat/sync/partykit` | `SyncDoc` — collaborative op log over PartyKit |
| `@plat/sync/types` | `Operation` type |
| `@plat/sync/wasm-adapter` | `SyncWasmAdapter` interface (optional — for validation/replay) |
| `@plat/sync/client` | `SyncClient` (legacy HTTP+SSE transport) |
| `@plat/sync/adapters` | Legacy adapters (IDB, R2, HTTP, SSE) |
| `@plat/sync/worker` | Legacy CF Worker handler (HTTP+R2) |

## Architecture

```
Browser A                    Cloudflare DO                    Browser B
  SyncDoc                    AutomergeServer                    SyncDoc
  automerge-repo  ←—WS—→  automerge-repo + DOStorage  ←—WS—→  automerge-repo
     │                          │                                  │
  ops array (CRDT)          ops array (CRDT)                  ops array (CRDT)
```

- **SyncDoc** — typed API on top of automerge-repo (addOp, undo, redo, getReplayOps)
- **automerge-partyserver** — automerge-repo sync over PartyKit WebSocket + DO storage
- **automerge-repo** — incremental CRDT sync protocol, DocHandle lifecycle
- **Durable Objects** — one DO per room, WebSocket Hibernation, SQLite storage

## Directory layout

```
systems/sync/
  crate/                Rust WASM (Automerge CRDT, Blake3 — optional for validation)
  pkg/                  WASM build output (web + bundler targets)
  ts/
    partykit/           NEW: SyncDoc + PartyKit transport
      sync-doc.ts         SyncDoc class (ops + automerge-repo + WebSocket)
      index.ts            exports
    shared/
      types.ts            Operation type (from Rust schema)
      wasm-adapter.ts     SyncWasmAdapter interface
    client/             LEGACY: SyncClient (HTTP+SSE+R2)
    worker/             LEGACY: CF Worker handler
  test/
    partykit/           E2E tests (wrangler dev + DO + automerge-repo)
      worker.ts           Wrangler entry (routes to AutomergeServer DO)
      polyfill.ts         FinalizationRegistry polyfill for miniflare
      sync.test.ts        Transport tests (4 tests)
      sync-doc.test.ts    SyncDoc E2E tests (8 tests)
      wrangler.toml       DO bindings
    client/             Legacy boundary tests (workerd)
    integration/        Legacy Playwright tests
```

## Build

```bash
# WASM (only needed if using validation/replay)
cd systems/sync && mise run build:wasm:self

# PartyKit fork package
mise run partyserver:build     # → .packages/automerge-partyserver-0.1.0.tgz
mise run partyserver:install   # → installed in test/partykit/
```

## Test

```bash
cd systems/sync

# PartyKit E2E (12 tests — real DO + wrangler + automerge-repo)
mise run test:partykit

# Rust CRDT tests (fast, no WASM)
mise run test:rust

# Legacy client boundary tests (workerd)
mise run test:client

# Full CI gate
mise run ci
```

### Test boundaries

| Directory | Runtime | Tests | What |
|-----------|---------|-------|------|
| `test/partykit/sync-doc.test.ts` | Node + wrangler DO | 8 | SyncDoc: add, undo, redo, group, name, two-peer convergence |
| `test/partykit/sync.test.ts` | Node + wrangler DO | 4 | automerge-repo transport: connect, sync, converge |
| `crate/src/lib.rs` | Rust native | 24 | CRDT math: merge, dedup, replay, rollback, Blake3 |
| `test/client/` | CF Workers (workerd) | 23 | Legacy SyncClient protocol |

## automerge-partyserver fork

The `automerge-partyserver` package is built from the fork at `joeblew999/partykit` (branch `feat/automerge-partyserver`). It's not yet on npm — installed as a `.tgz` from `.packages/`.

```bash
mise run partyserver:build    # Build fork → .tgz
mise run partyserver:install  # Install .tgz in test/partykit
```

When published to npm: replace `.tgz` with `bun add automerge-partyserver`.
