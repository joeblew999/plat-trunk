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

### y-partykit — reference implementation for CRDT + DO storage

PartyKit has **no Automerge adapter** (only Yjs via `y-partykit`). But `y-partykit` is the best reference for how to do CRDT sync with Durable Objects storage.

Key patterns from `packages/y-partykit/src/storage.ts`:

**Incremental update log with clock**:
```
["v1", docName, "update", 0] → first update bytes
["v1", docName, "update", 1] → second update bytes
["v1", docName, "update", 2] → ...
["v1_sv", docName]           → state vector (for efficient sync)
```

Each op is stored as a separate DO storage entry with an incrementing clock. This allows:
- **Append-only writes** — no rewriting the full doc on every op
- **Efficient compaction** — merge old updates into one, clear range
- **State vector** — separate key for quick sync without loading all updates

**Compaction** (`compactUpdateLog`):
- Triggered when `updates.length > maxUpdates` or `totalBytes > maxBytes`
- Merges all updates into one, writes new state vector, clears old entries
- Same as our `compactIfNeeded` but at the storage level, not the doc level

**128KB chunking** (`levelPut`):
- DO storage has a per-key size limit
- Large values are split into chunks: `key#000`, `key#001`, etc.
- `levelGet` reassembles chunks transparently

**Transaction serialization** (`_transact`):
- Promise chain prevents concurrent writes to the same doc
- Critical for correctness — DO storage ops are not transactional by default

**Mapping Yjs → Automerge concepts**:

| Yjs (y-partykit) | Automerge equivalent |
|-------------------|---------------------|
| `applyUpdate(doc, update)` | `doc.apply_changes(changes)` or `receive_sync_message` |
| `encodeStateAsUpdate(doc)` | `doc.save()` (full snapshot) |
| `encodeStateVector(doc)` | Automerge sync state — `generate_sync_message` |
| Store individual update | Store individual Automerge change |
| `flushDocument` (compact) | `doc.save()` as snapshot + clear old changes |

### Recommendation

Build our own **Automerge DO sync class** following y-partykit's storage patterns:

1. **Use raw DOs** — full control, stays within CF, no PartyKit dependency
2. **Port the storage pattern** — incremental update log + clock + compaction
3. **Add Automerge sync protocol** — `generateSyncMessage`/`receiveSyncMessage` over WebSocket
4. **WebSocket Hibernation** — zero cost when idle

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

- **PartyKit vs raw DOs** — PartyKit may not have Automerge support built-in. Raw DOs stay within CF, no extra dependency.
- **Timeline** — current system works. DOs are the right architecture but not urgent.
- **Scope** — do we build the DO version in sync now, or ship current and iterate?

## Build vs Use

Before building anything, we need to ask: should we build our own DO sync layer, or use an existing one?

### Option A: Use automerge-repo directly

**What**: Import `@automerge/automerge-repo` + write a CF Workers `NetworkAdapter` and `StorageAdapter` for DOs.

**Pros**:
- Battle-tested sync protocol — they've solved edge cases we haven't hit yet
- Active maintenance by the Automerge team
- Ecosystem: React hooks, Svelte stores, Solid primitives — free
- Incremental sync, sync state persistence, document lifecycle — all done

**Cons**:
- Their `Repo` assumes long-lived process (Node/browser) — may not fit DO hibernation cleanly
- We'd need to write a `DOStorageAdapter` and `DOWebSocketNetworkAdapter` — nobody has done this yet
- Bundle size: automerge-repo + automerge JS adds weight vs our Rust WASM
- We lose control over the sync protocol details (WASM-level access)

**Risk**: Medium. The adapters are the unknown — DO hibernation and `Repo` lifecycle may clash.

### Option B: Use y-partykit patterns, build for Automerge

**What**: Port y-partykit's DO storage pattern (update log + clock + compaction) and add Automerge's sync protocol on top.

**Pros**:
- Proven DO storage pattern (y-partykit is production-tested)
- We keep our Rust WASM (smaller, faster, we control it)
- We keep our API boundaries (`@plat/sync/client`, `@plat/sync/worker`)
- Full control over the sync protocol and storage format

**Cons**:
- We're reimplementing what automerge-repo already does (sync state, incremental sync)
- More code to maintain
- More edge cases to discover ourselves

**Risk**: Medium-high. Sync protocols have subtle bugs. automerge-repo has years of fixes we'd be missing.

### Option C: Wrap automerge-repo with our API

**What**: Use automerge-repo internally but export our `@plat/sync/*` API. Consumers don't know automerge-repo exists.

**Pros**:
- Best of both: battle-tested sync internals + our clean API
- We write the DO adapters, automerge-repo handles the hard sync protocol
- If automerge-repo doesn't work on DOs, we can swap internals without changing the API

**Cons**:
- Two layers of abstraction
- Bundle size (automerge-repo + our wrapper)
- Debugging: issues could be in our wrapper, automerge-repo, or Automerge core

**Risk**: Low-medium. The API boundary protects consumers. The risk is in the DO adapter.

### Option D: Keep current system, optimize incrementally

**What**: Stay on Worker + R2 + SSE + merge_docs. Add incremental sync later when it's a real problem.

**Pros**:
- Working now. Tested. Deployed.
- No new dependencies, no migration
- merge_docs is correct — just not optimal

**Cons**:
- Full doc transfer on every sync
- No sync state persistence
- SSE is one-directional (server→client only)
- Etag retry is a hack around the single-writer problem DOs solve

**Risk**: Low short-term. Scales poorly with doc size and user count.

### Recommendation

| Timeframe | Action |
|-----------|--------|
| **Now** | Ship Option D (current system). It works. |
| **Next** | Spike Option A — write a DO `StorageAdapter` + `NetworkAdapter` for automerge-repo. See if it fits. |
| **If A works** | Option C — wrap automerge-repo with our API, migrate SyncClient internals. |
| **If A doesn't fit DOs** | Option B — port y-partykit patterns, use Automerge sync protocol from our Rust WASM. |

The spike is the decision point. Try automerge-repo on DOs before committing to building or buying.

## Summary

Our current architecture (Worker + R2 + SSE + merge_docs) is **correct but suboptimal**. The right Cloudflare architecture is **Durable Objects + WebSocket Hibernation + SQLite + incremental sync protocol**.

Before building the DO layer ourselves, spike automerge-repo on DOs to see if it fits. If it does, wrap it with our API. If not, port y-partykit's storage patterns with Automerge sync protocol.

Either way, the `@plat/sync/*` export boundaries don't change. Consumers are protected from the transport decision.
