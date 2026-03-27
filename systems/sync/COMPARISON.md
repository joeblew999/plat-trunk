# sync — Architecture Comparison & Next Steps

## Current system (@plat/sync)

Works. Tested. Deployed.

- **Browser**: SyncClient + IDB + BroadcastChannel + HTTP POST
- **Server**: CF Worker + R2 + SSE + `merge_docs` (full doc every sync)
- **Tests**: 24 Rust + 23 workerd + 14 integration (real wrangler + R2)

## What automerge-repo does better

automerge-repo is the official Automerge networking/storage layer. Key differences:

| | Our system | automerge-repo |
|--|-----------|----------------|
| **Sync** | `merge_docs` — full doc every time | Incremental sync protocol — only changes since last sync |
| **Sync state** | None — fresh merge every request | Per-peer `SyncState` — persisted, resumed after reconnect |
| **Transport** | HTTP POST + SSE (half-duplex) | WebSocket (bidirectional) |
| **Server** | Stateless Worker (new isolate per request) | Stateful peer (keeps doc + sync state in memory) |
| **Storage** | Single R2 blob (full rewrite every save) | Snapshot + incremental chunks (append-only, compact periodically) |
| **Save frequency** | Every `addOp` (thrashes storage) | Throttled 100ms (batches rapid edits) |

## Compatibility

`@automerge/automerge` (npm) is the **same Rust code** compiled to WASM — not a separate implementation. Binary format is identical across:
- Our Rust crate (`automerge = "0.7.4"`)
- The npm package (`@automerge/automerge` v2–3)
- automerge-repo (uses the npm package internally)

No compatibility issue. Documents and sync protocol are interoperable.

## The right CF architecture: Durable Objects

The incremental sync protocol needs persistent in-memory state and bidirectional communication. CF Workers don't have either. Durable Objects do:

```
Browser (automerge-repo Repo + WebSocket)
    ↕ WebSocket
CF Worker (thin router → DO by modelId)
    ↕
Durable Object (one per model)
    ├── In-memory: Automerge doc + SyncState per peer
    ├── DO SQLite: incremental changes + sync state
    └── WebSocket Hibernation: zero cost when idle
```

- **WebSocket Hibernation**: DO sleeps when no connections, wakes on message — zero idle cost
- **DO SQLite**: local transactional storage, faster than R2 for hot path
- **Single writer**: no etag contention — one DO per model handles all mutations

## Existing work

### y-partykit (reference for DO + CRDT storage)

PartyKit's Yjs integration. Proves the DO storage pattern works:
- Incremental update log with clock (`["v1", docName, "update", N]`)
- Compaction when too many updates or bytes exceed budget
- 128KB chunking for DO storage key limits
- Transaction serialization (Promise chain)

Same pattern maps to Automerge.

### mergeparty (PartyKit + automerge-repo)

[`@substrate-system/mergeparty`](https://github.com/substrate-system/mergeparty) — someone built it. ~400 lines.

- Server creates automerge-repo `Repo` with itself as `NetworkAdapter` + `StorageAdapter`
- Client uses `PartykitNetworkAdapter` (thin WebSocket wrapper)
- 1 PartyKit room per document

**Concerns**: v0.0.8, uses forked deps (`automerge-repo-slim`), no tests, no chunking.

**Value**: Proves the architecture works. Small enough to rewrite properly.

## Options

| Option | What | Risk | Effort |
|--------|------|------|--------|
| **A. Use automerge-repo directly** | Write DO `StorageAdapter` + `NetworkAdapter` | DO lifecycle vs Repo lifecycle may clash | Medium |
| **B. Build from scratch** | Port y-partykit pattern for Automerge, add sync protocol | Reimplementing solved problems | High |
| **C. Wrap automerge-repo** | Use automerge-repo internally, export our API | Two abstraction layers | Medium |
| **D. Keep current system** | Ship what works, optimize later | Scales poorly with doc size | None |
| **E. PartyKit + automerge-repo** | Managed DOs + proven sync protocol | PartyKit dependency | Low-Medium |

## Recommendation

| Timeframe | Action |
|-----------|--------|
| **Now** | Ship current system. It works. |
| **Next** | Spike: rewrite mergeparty's pattern (~400 lines) using official automerge-repo, y-partykit's chunking, our test infrastructure. |
| **If spike works** | Wrap with `@plat/sync/*` API. Add `ts/worker/do.ts` alongside current `handler.ts`. Consumers choose Worker+R2 or DO+WebSocket. |
| **Migration** | Browser SyncClient gets a WebSocket transport option. Server adds DO class. Both paths work until DO is proven in production. |

The `@plat/sync/*` export boundaries don't change. Consumers are protected from the transport decision.
