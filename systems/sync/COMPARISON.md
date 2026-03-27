# sync — Comparison with automerge-repo

Analysis of https://github.com/automerge/automerge-repo and what we should adopt.

## What they are

automerge-repo is the official Automerge networking and storage layer. It handles document discovery, sync, persistence, and lifecycle — built by the Automerge team.

## Architecture comparison

| Concern | automerge-repo | @plat/sync |
|---------|---------------|------------|
| **Sync protocol** | Automerge incremental sync (`generateSyncMessage`/`receiveSyncMessage`) — sends only changes since last sync | Raw `merge_docs` — sends full doc bytes every time |
| **Sync state** | Per-peer `SyncState` — encoded, persisted to storage, restored on reconnect | None — every sync is a fresh full merge |
| **Storage format** | Snapshot + incremental chunks — partial reads, efficient compaction | Single `automerge.bin` blob — all or nothing |
| **Document lifecycle** | XState state machine (idle → loading → requesting → ready → deleted) | Manual flags (`_docBytes`, `_modelId`, `_syncing`) |
| **Save throttling** | 100ms debounce per document | Immediate save on every `addOp` |
| **Peer tracking** | Per-peer metadata (`storageId`, `isEphemeral`) | No concept of peers |
| **Networking** | EventEmitter-based `NetworkAdapter` interface with implementations (WebSocket, MessageChannel, BroadcastChannel) | Custom adapters (`NullNetworkAdapter`, `HttpSseNetworkAdapter`, `DirectNetworkAdapter`) |
| **Storage** | EventEmitter-based `StorageAdapter` with hierarchical keys and range queries | `SyncStorageAdapter` (save/load/delete — flat, no range queries) |
| **Message encoding** | CBOR binary | JSON over HTTP / structured clone over BroadcastChannel |
| **Document IDs** | UUID → base58check encoded (`automerge:` URLs) | Plain strings |

## What they got right

### 1. Incremental sync protocol (CRITICAL)

They use Automerge's built-in sync protocol:
```
A: generateSyncMessage(doc, syncState) → binary message + new syncState
B: receiveSyncMessage(doc, syncState, message) → new doc + new syncState
```

The `SyncState` tracks what each peer has already seen. On the next sync, only new changes are sent — not the entire document.

**Our problem**: We send the full Automerge doc on every `POST /sync`. For a doc with 1000 ops, every sync transfers ~100KB+ even if only 1 op changed. Their approach sends ~200 bytes for that same change.

**Impact**: Bandwidth, latency, mobile data usage, server load.

### 2. Persistent sync state (CRITICAL)

They store `SyncState` per peer in IndexedDB:
```
[documentId, "sync-state", storageId] → encoded SyncState bytes
```

After a page reload, sync resumes where it left off. No re-sending everything.

**Our problem**: After reload, `loadAndSync` sends the full doc again. The server merges it (idempotent, so correct), but wasteful.

### 3. Snapshot + incremental storage (IMPORTANT)

They split storage into snapshots and incremental changes:
```
[documentId, "snapshot", hash]      → compacted doc
[documentId, "incremental", hash]   → individual changes
```

Compaction: periodically merge incrementals into a new snapshot, delete old incrementals.

**Our problem**: Single `automerge.bin` blob. Every save writes the full doc. No way to append just the new change.

### 4. Document lifecycle state machine (NICE TO HAVE)

XState prevents invalid transitions:
```
idle → loading → requesting → ready
                              ↓
                         unavailable → deleted
```

**Our problem**: Manual boolean flags can be in inconsistent states. Not a correctness issue (Automerge is idempotent), but makes reasoning harder.

### 5. Throttled saves (NICE TO HAVE)

They debounce saves at 100ms per document. Rapid edits (typing, dragging) don't thrash storage.

**Our problem**: Every `addOp` calls `saveToStorage` immediately. If a user drags an object (30+ ops per second), that's 30 IDB writes per second.

### 6. Per-peer metadata (NICE TO HAVE)

Each peer has a `storageId` (persistent UUID) and `isEphemeral` flag. Sync state is tracked per storage ID, so a user with multiple tabs shares sync state.

**Our problem**: No peer concept. Each browser tab is independent. Sync state can't be shared across tabs from the same user.

## What we should do

### Phase 1 — Incremental sync (HIGH VALUE)

Replace `merge_docs` in `syncWithServer` with the Automerge sync protocol.

**Changes**:
- `SyncClient` maintains `SyncState` per server
- `syncWithServer` calls `generateSyncMessage` → POST bytes → receive response → `receiveSyncMessage`
- Server does the same: receive message → `receiveSyncMessage` → `generateSyncMessage` → respond
- `SyncState` persisted to IDB (browser) and R2 (server)

**API impact**: None — `addOp`, `syncWithServer`, `loadAndSync` signatures don't change. The transport underneath becomes incremental.

**Complexity**: Medium. The Automerge sync protocol API is straightforward. The work is plumbing the state through storage and the HTTP round-trip.

### Phase 2 — Save throttling (MEDIUM VALUE)

Add a configurable `saveThrottleMs` (default 100ms) to `SyncClient`. Rapid ops are batched into a single IDB write.

**Changes**:
- `addOp` applies to in-memory doc immediately
- IDB save is debounced (100ms)
- `saveToStorage` still works as a force-flush

**API impact**: None. `getOps()` reads from in-memory doc, not storage.

### Phase 3 — Snapshot + incremental storage (LOWER VALUE)

Split storage into snapshots and incremental chunks. Only write the new change, periodically compact.

**Changes**:
- Extend `SyncStorageAdapter` with `loadRange`/`removeRange`
- `StorageSubsystem` manages snapshot/incremental lifecycle
- Compaction runs periodically or on `compactIfNeeded`

**API impact**: `SyncStorageAdapter` interface adds 2 methods. Existing implementations (IDB, R2) need updating.

**Complexity**: High. Significant storage refactor.

### Not adopting

| Feature | Why not |
|---------|---------|
| XState lifecycle | Adds dependency, our lifecycle is simple enough with flags |
| CBOR encoding | HTTP + JSON is simpler, debugging is easier, perf difference is small |
| base58check doc IDs | Plain string IDs are fine for our use case |
| Full `Repo` orchestrator | We don't need document discovery or multi-peer gossip — we have a single server |

## The real fix: Durable Objects + WebSocket Hibernation

The phases above assume we keep the current Worker + R2 + SSE architecture. But automerge-repo's incremental sync protocol doesn't fit that model — it needs persistent in-memory state and bidirectional communication.

The correct Cloudflare architecture for this is **Durable Objects**:

### Why Durable Objects

| Problem | Current (Worker + R2 + SSE) | Durable Object |
|---------|---------------------------|----------------|
| Sync state | None — fresh merge every request | In-memory `SyncState` per connected peer |
| Communication | POST (client→server) + SSE (server→client) | WebSocket (bidirectional) |
| Concurrent writes | Etag retry race (mergeWithRetry) | Single writer — one DO per model |
| State between requests | None — stateless isolate | Persistent in-memory (hibernates when idle) |
| Storage | R2 (full blob replace every write) | DO SQLite storage (D1-compatible) + R2 for snapshots |

### Architecture

```
Browser (SyncClient)
    ↕ WebSocket
CF Worker (thin router — forwards to DO by modelId)
    ↕
Durable Object (one per model)
    ├── In-memory: Automerge doc + SyncState per peer
    ├── DO SQLite: incremental changes + sync state
    ├── R2: periodic full snapshot (backup/cold storage)
    └── WebSocket Hibernation: sleeps when no connections, wakes on message
```

### WebSocket Hibernation

DOs support [WebSocket Hibernation](https://developers.cloudflare.com/durable-objects/api/websockets/#websocket-hibernation) — the DO sleeps when all WebSocket connections are idle, paying zero compute cost. When a message arrives, it wakes up with state intact. This means:

- **No idle cost** — a model with no active editors costs nothing
- **Instant wake** — sub-millisecond resume when a user reconnects
- **Memory efficient** — thousands of models, only active ones in memory

### DO SQLite (D1-compatible)

Durable Objects have [built-in SQLite storage](https://developers.cloudflare.com/durable-objects/api/storage-api/) — transactional, durable, local to the DO. This replaces R2 for the hot path:

- **Sync state**: `sync_states` table — per-peer, loaded on wake
- **Incremental changes**: `changes` table — append-only, compacted periodically
- **Snapshots**: Periodic full doc save (to SQLite or R2 for cold backup)

No R2 read/write per sync — only SQLite (local, fast, transactional).

### PartyKit

[PartyKit](https://www.partykit.io/) is essentially a nice developer experience over DOs + WebSockets. automerge-repo already has a PartyKit adapter. We could:

1. **Use PartyKit directly** — simplest, managed infra, automerge-repo adapter exists
2. **Use raw DOs** — more control, same underlying tech, stays within CF ecosystem
3. **Build our own DO sync class** — uses our SyncWorker patterns but with DO + WS instead of Worker + R2 + SSE

### What changes in @plat/sync

The library structure stays the same. What changes:

| Component | Current | With DOs |
|-----------|---------|----------|
| `ts/client/sync-client.ts` | HTTP POST + SSE | WebSocket (Automerge sync protocol) |
| `ts/worker/sync-worker.ts` | Worker fetch handler + R2 | DO class + SQLite + WebSocket |
| `ts/worker/handler.ts` | HTTP routes | Thin Worker that routes to DO |
| `ts/client/adapters.ts` | `NullNetworkAdapter` + `makeSyncFetch` | `WebSocketNetworkAdapter` |
| Tests | HTTP integration | WebSocket integration |

The **export boundaries** (`@plat/sync/client`, `@plat/sync/worker`) don't change. The consumer API doesn't change. The transport underneath becomes WebSocket + incremental sync.

### Migration path

1. **Keep current system working** — it's correct, just not optimal
2. **Add DO class** alongside current Worker handler — new consumers can choose
3. **Migrate browser SyncClient** to WebSocket transport (add `WebSocketNetworkAdapter`)
4. **Switch truck** when DO version is proven
5. **Deprecate** Worker + R2 + SSE path

### Decision needed

- **PartyKit vs raw DOs** — PartyKit is easier but adds a dependency. Raw DOs are more work but stay within CF.
- **Timeline** — current system works. DOs are the right architecture but not urgent.
- **Scope** — do we build the DO version in sync now, or ship current and iterate?

## Summary

Our current architecture (Worker + R2 + SSE + merge_docs) is **correct but suboptimal**. The right Cloudflare architecture is **Durable Objects + WebSocket Hibernation + SQLite + incremental sync protocol**. The migration preserves our API boundaries — it's a transport change, not an API change.
