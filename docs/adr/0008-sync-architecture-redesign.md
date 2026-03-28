# ADR-0008: Sync Architecture Redesign

**Status**: SUPERSEDED (2026-03-27)
**Date**: 2026-03-11
**Superseded by**: PartyKit sync — SyncDoc + automerge-partyserver + Durable Objects.
SyncClient, adapters (IDB/R2/HTTP/SSE), SyncWorker all deleted.
See `systems/sync/README.md` for the current architecture.
**Context**: 3 days lost to a sync bug that was diagnosable in 30 seconds from server logs. Root cause was architectural — not a typo.

## Problems

### 1. Logic is scattered across 6+ files
The sync flow touches:
- `systems/sync/crate/src/lib.rs` — CRDT core + WASM exports
- `systems/truck/worker/src/sync-wasm.generated.ts` — generated WASM adapters
- `systems/truck/worker/src/index.ts` — server sync endpoint, SSE broadcast
- `systems/truck/web/history-domain.ts` — browser doc manager, `syncWithServer()`
- `systems/truck/web/worker-relay.ts` — SSE listener, `doc-changed` handler
- `systems/truck/web/doc-store.ts` — IndexedDB persistence

A single sync round-trip (browser adds cube → other browser sees it) requires all 6 files to agree on types, field names, and control flow. One mismatch breaks sync silently.

### 2. WASM boundary returns complex objects that corrupt silently
`merge_docs_with_info` returned a JS object built with `js_sys::Reflect::set`. In Cloudflare Workers, the wasm-bindgen externref table corrupted field values — `hadNewOps` was the string `"localOpCount"` instead of a boolean. This passed all unit tests. Only failed at runtime in the real environment.

**Lesson**: Never return complex JS objects from WASM. Only `Uint8Array` and scalar types (`number`, `boolean`, `string`).

### 3. Tests don't test the real sync flow
Unit tests exercise isolated functions (merge two docs, check op count). They don't test:
- Browser A adds cube → POST /sync → server merges → SSE broadcast → Browser B receives `doc-changed` → Browser B re-syncs → Browser B replays → cube appears

The real flow has 7 steps. Tests cover steps in isolation but never the chain.

### 4. No network state awareness
The sync system has no concept of online/offline. When the browser goes offline:
- SSE connection drops silently (EventSource auto-reconnects, but sync state is stale)
- `syncWithServer()` fails with a network error caught by a generic `catch` — no retry queue
- Ops accumulate locally but nothing tracks "these ops haven't synced yet"
- When the browser comes back online, there's no explicit resync trigger — it relies on SSE reconnect firing `doc-changed`, which is fragile

The `SyncClient` must own network state: detect online/offline via `navigator.onLine` + `online`/`offline` events, queue unsynced ops, and trigger a full resync on reconnect.

### 5. No observability
- Server logs show HTTP method/path/status but not sync logic (op counts, hadNewOps, actor IDs)
- Browser errors swallowed by `catch` blocks — `console.warn` only visible if dev tools open
- No way for an AI agent (or CI) to verify sync worked without a human watching two browser windows

## Options

### A. Consolidate browser sync into one module
Move all browser-side sync logic into a single `SyncClient` class:
- Owns the CRDT doc bytes
- Owns the SSE connection and `doc-changed` listener
- Owns `syncWithServer()` round-trip
- Owns replay trigger
- Exposes events: `onRemoteOps(ops)`, `onSyncComplete(hadNewOps)`

**Pros**: One file to read, one place for bugs.
**Cons**: Large class. Still hand-rolling the sync protocol.

### B. Use Automerge Repo
Replace hand-rolled sync with [automerge-repo](https://github.com/automerge/automerge-repo):
- Provides `Repo`, `DocHandle`, sync protocol, storage adapters, network adapters
- Handles peer discovery, sync state, conflict resolution
- We write a `NetworkAdapter` for our SSE/HTTP transport and a `StorageAdapter` for R2

**Pros**: Battle-tested sync protocol. Eliminates our merge/broadcast/re-sync logic entirely. Peer awareness built in.
**Cons**: New dependency (~50KB). Need custom network adapter for Cloudflare Workers (no WebSocket DO yet). May not fit our op-log-centric model (Automerge Repo is document-centric).

### ~~C. Server-authoritative sync (no browser CRDT)~~ — REJECTED
Kills local-first. Kills offline. Non-starter.

### D. Structured sync tracing (folded into A)
Not a separate option — tracing is part of the consolidated `SyncClient`. Every sync event is logged with structured data so tests can assert on the sync log and agents can diagnose issues from logs alone.

## Blake3 — under consideration

[`blake3`](https://docs.rs/blake3/latest/blake3/) could replace fragile scalar comparisons across the WASM boundary with hash-based change detection. Inspired by Iroh's ([github.com/n0-computer/iroh-blake3](https://github.com/n0-computer/iroh-blake3)) use of Blake3 for content-addressed blobs and verified streaming — note: `iroh-blake3` fork is deprecated, features upstreamed to `blake3` v1.8+. Use `blake3 = { version = "1.8", default-features = false }` (no_std, ~20-40KB WASM). Potential uses: `hadNewOps` via hash diff, sync optimization (skip transfer if hashes match), storage integrity verification. Needs a spike to validate integration with the sync crate.

## Constraints
1. Must work in Cloudflare Workers (no WebSocket Durable Objects yet in our stack)
2. Must support offline-capable local-first editing
3. WASM boundary must use only scalar types + Uint8Array
4. Must be testable without two real browsers
5. **Must track network connectivity** — online/offline detection, unsent op queue, automatic resync on reconnect. The sync system is the right owner because it's the only component that cares about server reachability.
6. **Must be testable by AI agents and CI** — no human watching two browser windows. A test harness that simulates N actors with controllable network state, running against the real server endpoints, asserting on a structured sync log.

## Decision
**Option A + D combined**: Consolidate all browser-side sync into a single `SyncClient` class with built-in structured tracing. Option B (Automerge Repo) remains a future consideration but doesn't block this work.

### `SyncClient` owns:
1. **CRDT doc bytes** — the Automerge document (currently in `history-domain.ts`)
2. **SSE connection** — EventSource lifecycle, reconnect (currently in `worker-relay.ts`)
3. **IDB persistence** — doc + meta storage (currently in `doc-store.ts`)
4. **Server sync** — `syncWithServer()` round-trip, debounce (currently in `history-domain.ts`)
5. **Cross-tab sync** — BroadcastChannel merge (currently in `history-domain.ts`)
6. **Replay trigger** — schedules replay after remote changes
7. **Network state** — online/offline detection, queue management (see requirement 5 below)
8. **Structured tracing** — every sync event logged as `{ ts, modelId, actorId, event, detail }` with `[sync:event]` prefix, assertable in tests

### Events emitted:
- `onRemoteOps(ops)` — new ops from another browser/tab
- `onSyncComplete(hadNewOps)` — server round-trip finished
- `onNetworkState(online: boolean)` — connectivity changed
- `onError(error, context)` — sync failure with structured context

## Implementation Plan

### Phase 1: `SyncClient` with pluggable adapters — lives in `systems/sync/ts/`

The `SyncClient` is a **sync-system TypeScript module**, not a truck file. It lives in `systems/sync/ts/` and is imported by truck (and any future system). It's the unit under test for the harness.

**Pluggable adapters** make it testable without a browser:

```typescript
// systems/sync/ts/sync-client.ts

interface SyncStorageAdapter {
  save(modelId: string, bytes: Uint8Array): Promise<void>
  load(modelId: string): Promise<Uint8Array | null>
  delete(modelId: string): Promise<void>
}

interface SyncNetworkAdapter {
  postSync(modelId: string, bytes: Uint8Array, actorId: string): Promise<Uint8Array>
  onRemoteChange(modelId: string, callback: () => void): void
  disconnect(): void
}

interface SyncWasmAdapter {
  createDoc(): Uint8Array
  applyOp(doc: Uint8Array, opJson: string): Uint8Array
  mergeDocs(local: Uint8Array, remote: Uint8Array): Uint8Array
  getOps(doc: Uint8Array): string
  getOpCount(doc: Uint8Array): number
  getReplayOps(doc: Uint8Array): string
  setOpEnabled(doc: Uint8Array, opId: string, enabled: boolean): Uint8Array
  rollbackTo(doc: Uint8Array, actorId: string, index: number): Uint8Array
}

class SyncClient {
  constructor(
    private wasm: SyncWasmAdapter,
    private storage: SyncStorageAdapter,
    private network: SyncNetworkAdapter,
    private opts: { actorId: string, debounceMs?: number }
  ) {}

  // All the sync logic lives here — the thing being tested
  async addOp(type: string, params: object): Promise<Op> { ... }
  async syncWithServer(): Promise<{ hadNewOps: boolean }> { ... }
  async mergeRemote(remoteBytes: Uint8Array): Promise<{ hadNewOps: boolean }> { ... }
  async loadFromStorage(modelId: string): Promise<boolean> { ... }
  async saveToStorage(modelId: string): Promise<void> { ... }

  // Network state
  goOffline(): void { ... }
  goOnline(): void { ... }   // triggers queued sync
  get isOnline(): boolean { ... }

  // Undo/redo
  setOpEnabled(opId: string, enabled: boolean): void { ... }
  rollbackTo(index: number): void { ... }

  // Read state
  getOps(): Op[] { ... }
  getOpCount(): number { ... }
  getReplayOps(): Op[] { ... }

  // Structured tracing — every action logged
  readonly syncLog: SyncLogEntry[]

  // Events
  onRemoteOps?: (ops: Op[]) => void
  onSyncComplete?: (hadNewOps: boolean) => void
  onNetworkState?: (online: boolean) => void
  onError?: (error: Error, context: string) => void
}
```

**Adapter implementations**:

| Adapter | Browser (truck imports) | Tests (harness) |
|---------|------------------------|-----------------|
| Storage | `IdbStorageAdapter` (IndexedDB) | `MemoryStorageAdapter` (Map) |
| Network | `HttpSseNetworkAdapter` (fetch + EventSource) | `DirectNetworkAdapter` (function call) |
| WASM | `WasmAdapter` (real sync WASM) | Same real WASM — no mock |

**Key**: The WASM adapter is the **same real WASM** in both browser and tests. Only storage and network are swapped. The TypeScript logic (debounce, offline queue, merge decisions, tracing) is tested exactly as it runs in production.

**What moves from truck to sync**:
- CRDT doc state management → `SyncClient`
- Server sync logic (`syncWithServer`) → `SyncClient`
- Cross-tab merge → `SyncClient` (BroadcastChannel becomes a `SyncNetworkAdapter` variant)
- Offline queue → `SyncClient`
- Structured tracing → `SyncClient.syncLog`

**What stays in truck**:
- `history-domain.ts` → thin wrapper: op recording + undo/redo UI (delegates to `SyncClient`)
- `worker-relay.ts` → remote command handler only (non-sync SSE events: `cad-command`, `presence`)
- `doc-store.ts` → replaced by `IdbStorageAdapter` in truck's bootstrap

### Phase 2: Structured tracing
- Every sync event logged with `[sync:event]` prefix and structured JSON
- Server-side: structured log on POST /sync with `{ modelId, actorId, serverOps, incomingOps, mergedOps, hadNewOps, broadcastSent }`
- Browser-side: `SyncClient` logs all state transitions
- `/api/debug/sync-log` ring buffer endpoint (last 100 sync events)

### Phase 3: Sync Test GUI + Playwright — `systems/sync/web/` + `systems/sync/e2e/`

A standalone web app that visualizes the sync protocol in real-time. Uses `SyncClient` with real WASM + a lightweight sync server. Playwright drives real multi-device tests against the GUI.

**How to run**: `bun run dev:sync` (Vite dev server on its own port, added to `systems/sync/system.mjs` as a devServer)

**Files**:
```
systems/sync/web/
  index.html          ← single page app
  main.ts             ← imports SyncTestHarness, wires to UI
  style.css           ← Tailwind + DaisyUI (same as truck)
  vite.config.ts      ← points at sync WASM pkg
```

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Sync Protocol Visualizer                          [Reset All]  │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  Actor A     │  Actor B     │  Server      │  Sync Log          │
│  ○ online    │  ○ online    │  (always on)  │                    │
│  [offline]   │  [offline]   │              │  A: add_op "foo"   │
│              │              │              │  A→S: merge ✓ +1   │
│  Ops: 2      │  Ops: 1      │  Ops: 2      │  S→B: merge ✓ +1   │
│  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │  B→S: merge ✗ +0   │
│  │ foo ✓  │  │  │ bar ✓  │  │  │ foo ✓  │  │                    │
│  │ baz ✓  │  │  │        │  │  │ baz ✓  │  │  [clear log]       │
│  └────────┘  │  └────────┘  │  └────────┘  │                    │
│              │              │              │                    │
│  Store: 1    │  Store: 0    │  Store: 1    │                    │
│  [save]      │  [save]      │  [save]      │                    │
│  [load]      │  [load]      │  [load]      │                    │
│              │              │              │                    │
│  [+ Add Op]  │  [+ Add Op]  │              │                    │
│  [Merge →S]  │  [Merge →S]  │              │                    │
│  [← Merge S] │  [← Merge S] │              │                    │
│  [+ Actor]   │              │              │                    │
├──────────────┴──────────────┴──────────────┤                    │
│  Merge Graph                               │                    │
│  A ──op──→ A ──merge──→ S ──merge──→ B     │                    │
│                                            │                    │
│  Timeline: ●───●───●───●───●               │                    │
└────────────────────────────────────────────┴────────────────────┘
```

**Interactive controls per actor**:
- **[+ Add Op]** — adds an op with auto-generated type name ("op-1", "op-2", ...)
- **[Merge →S]** — push this actor's doc to the server actor
- **[← Merge S]** — pull server's doc into this actor
- **[offline] / [online]** — toggle network state (merge buttons disabled when offline)
- **[save] / [load]** — persist/restore from the actor's `SyncTestStore`
- **Op chips** — click to toggle enabled/disabled (undo/redo visualization)
- **[+ Actor]** — add more actors dynamically

**Sync log panel** (right side):
- Real-time stream of every `addOp`, `merge`, `save`, `load` event
- Color-coded by actor
- Shows `hadNewOps` result on merges (✓ = new ops, ✗ = no change)
- Shows op count delta (+N)
- Filterable by actor, event type
- Exportable as JSON (for bug reports)

**Merge graph** (bottom):
- DAG visualization of merge history
- Nodes = actor states (labeled with op count)
- Edges = merges (labeled with hadNewOps)
- Makes ping-pong loops visually obvious

**Two modes**:

1. **Single-browser simulation** (the GUI above) — all actors run in-memory in one tab. Fast, visual, great for debugging and onboarding. But it's simulated — actors share the same JS runtime, there's no real IDB isolation, no real SSE, no real network.

2. **Multi-device Playwright** — sync system owns its own Playwright setup that drives N real browser tabs against the sync test GUI. Each tab is a real browser context with its own IDB, its own SSE connection (once we have a minimal sync server endpoint), its own network state via `context.setOffline()`. This is how you test N devices × N models for real.

**Playwright in sync** (not truck's Playwright):
```
systems/sync/e2e/
  playwright.config.ts     ← points at sync GUI (dev:sync port)
  multi-device.spec.ts     ← N-device sync scenarios
  helpers.ts               ← sync-specific helpers (no CAD, no geometry)
```

**How to run**: `bun run test:sync:e2e`

```typescript
// multi-device.spec.ts — real multi-device sync via Playwright
test('three devices sync a shared model', async ({ browser }) => {
  // 3 real browser contexts = 3 independent IDB stores, 3 SSE connections
  const device1 = await browser.newContext()
  const device2 = await browser.newContext()
  const device3 = await browser.newContext()

  const p1 = await device1.newPage()
  const p2 = await device2.newPage()
  const p3 = await device3.newPage()

  // All open the sync GUI to the same model
  await p1.goto(`${baseURL}?model=test-123`)
  await p2.goto(`${baseURL}?model=test-123`)
  await p3.goto(`${baseURL}?model=test-123`)

  // Device 1 adds an op
  await p1.click('[data-action="add-op"]')
  await p1.waitForSelector('[data-op-count="1"]')

  // Device 2 and 3 should see it arrive
  await p2.waitForSelector('[data-op-count="1"]')
  await p3.waitForSelector('[data-op-count="1"]')

  // Take device 2 offline, add ops
  await device2.setOffline(true)
  await p2.click('[data-action="add-op"]')
  await p2.click('[data-action="add-op"]')
  // p2 has 3 ops locally, p1 and p3 still have 1

  // Bring device 2 back — ops should sync
  await device2.setOffline(false)
  await p1.waitForSelector('[data-op-count="3"]')
  await p3.waitForSelector('[data-op-count="3"]')
})
```

**What this needs**: The sync test GUI needs a lightweight sync server endpoint — a minimal HTTP handler that accepts POST `/sync` (merge bytes) and broadcasts SSE `doc-changed` events. This can live in `systems/sync/test/sync-server.ts` — a tiny Bun serve() that wraps the sync WASM. NOT the truck worker. NOT the test worker. A ~50-line sync-only server for testing.

**Why this matters**:
- **The 3-day bug is now a 30-second visual diagnosis** — open the GUI, add an op, merge, see if `hadNewOps` is wrong
- **Real multi-device testing** — Playwright drives N real browser contexts with real IDB, real SSE, real network isolation
- **AI agents can use it** — Playwright MCP can drive the GUI for automated exploratory testing
- **Onboarding** — new developers (or Gemini) can see how the sync protocol works without reading 6 files
- **Isolated from truck** — loads sync WASM directly, no truck worker, no geometry, no CAD

#### Playwright sync tests (`bun run test:sync:e2e`)

Tests that exercise the **real chain** with real browser tabs against the sync GUI:

1. **Two-device sync** — Tab A adds op → Tab B sees it arrive
2. **Ping-pong prevention** — sync log shows exactly 1 broadcast, no cascade
3. **Offline → online** — Tab A goes offline, adds 3 ops, comes back → Tab B gets all 3
4. **Cross-tab** — two tabs same browser, shared IDB → BroadcastChannel delivers ops
5. **Concurrent edits** — A and B both offline, each adds op → both go online → both have 2
6. **Undo across devices** — A undoes op → B sees it disappear
7. **Crash recovery** — close tab, reopen → IDB restores state
8. **Network disconnect mid-sync** — go offline during POST → retry on reconnect → no dupes
9. **Sync log output** — structured entries visible in GUI, assertable by Playwright

### Phase 4: Blake3 integration

Add `blake3 = { version = "1.8", default-features = false }` to sync crate. Export `doc_hash(bytes) -> String` from WASM. Use in `SyncClient` for:
- `hadNewOps` detection via hash diff (replaces fragile op count comparison)
- Storage integrity (hash verified on load, discard + re-sync if mismatch)
- Sync optimization (send hash header, server returns 304 if match)

### Phase 5: Vitest test harness (if needed)

Fast inner-loop protocol tests without Playwright overhead. Only build this if Playwright sync tests prove too slow for CI. Uses `SyncClient` with `DirectNetworkAdapter` + `MemoryStorageAdapter` — same real WASM, no browser.

## Execution Order

1. **Phase 1: `SyncClient` consolidation** — the main fix. One class, pluggable adapters, lives in `systems/sync/ts/`
2. **Phase 2: Structured tracing** — `[sync:event]` prefix, server debug endpoint
3. **Phase 3: Sync Test GUI + Playwright** — visual protocol debugger + real multi-device e2e tests
4. **Phase 4: Blake3** — harden change detection (`hadNewOps` via hash diff), storage integrity, sync optimization
5. **Phase 5: Vitest test harness** — fast inner-loop protocol tests *if* Playwright proves too slow for CI. May not be needed if GUI + Playwright covers everything.
6. Future: evaluate Automerge Repo `NetworkAdapter` as a drop-in replacement for `SyncClient` internals
