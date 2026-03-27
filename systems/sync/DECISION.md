# The Big Decision: What happens to @plat/sync?

## The situation

We built @plat/sync as a reusable CRDT sync library. It works. 60+ tests pass.

Then we discovered PartyKit — which provides partysync, partysub, partyfn, partysession, partyagent, partytracks, partywhen. These packages do most of what @plat/sync does, plus a lot more, better.

Now we need to decide: what happens to @plat/sync?

## Three options

### Option 1: Kill @plat/sync. Use PartyKit directly.

Every system (truck, auth, future) imports PartyKit packages directly.

```
truck-cad
  ├── uses partysync (state sync)
  ├── uses partysub (real-time updates)
  ├── uses partyfn (RPC)
  ├── uses partysession (per-user state)
  └── uses automerge-partyserver (CRDT sync)

auth-system
  ├── uses partysync (session state)
  └── uses partysub (auth events)
```

**Pros:**
- No abstraction layer. Direct access to PartyKit APIs.
- Less code to maintain (no @plat/sync).
- Each system picks exactly the PartyKit packages it needs.

**Cons:**
- No shared patterns between systems. Each system wires PartyKit differently.
- The op-log pattern (Operation, undo/redo, replay) would be duplicated if multiple systems need it.
- PartyKit becomes a hard dependency everywhere. No abstraction to swap it out.
- Consumers need to learn PartyKit, not just our API.

**Best if:** plat-trunk is only ever truck-cad, and we're committed to PartyKit forever.

### Option 2: Keep @plat/sync as a thin op-log layer on top of PartyKit.

@plat/sync provides the **domain-specific** things PartyKit doesn't:
- `Operation` type (id, type, params, enabled, actorId, groupId)
- Op-level undo/redo (enable/disable by op or group)
- Replay (get enabled ops in order)
- Op deduplication
- The Rust WASM crate for op validation + Blake3

PartyKit provides the **infrastructure**:
- WebSocket transport (partyserver + partysocket)
- State sync (partysync or automerge-partyserver)
- Pub/Sub (partysub)
- Per-user state (partysession)
- RPC (partyfn)

```
@plat/sync (thin layer)
  ├── Operation type + undo/redo/replay logic
  ├── Op dedup + validation (Rust WASM)
  └── Wraps PartyKit for transport

PartyKit (infrastructure)
  ├── partyserver (DOs + WebSocket)
  ├── partysync or automerge-partyserver (CRDT)
  ├── partysub (pub/sub)
  ├── partysession (per-user)
  └── partyfn (RPC)

truck-cad
  ├── uses @plat/sync (op log, undo/redo, replay)
  ├── uses partyfn (type-safe CAD commands)
  ├── uses partytracks (video collaboration)
  └── uses partywhen (scheduled exports)
```

**Pros:**
- Shared op-log pattern for all systems that need it.
- PartyKit is an implementation detail — consumers import @plat/sync, not PartyKit.
- Can swap PartyKit for something else without changing consumer code.
- The Rust WASM (op validation, Blake3, dedup) stays relevant.

**Cons:**
- Another abstraction layer.
- @plat/sync becomes much smaller (just ops + undo/redo).
- Need to keep @plat/sync in sync with PartyKit changes.

**Best if:** Multiple systems need op logs, or we want abstraction over the transport.

### Option 3: @plat/sync becomes @plat/ops — a pure op-log library. No sync at all.

Strip out ALL transport/sync code. Keep only:
- `Operation` type
- Op list management (add, enable/disable, group, replay)
- The Rust WASM crate
- No SyncClient, no adapters, no worker, no transport

Each system uses @plat/ops for the op pattern + PartyKit for the sync.

```
@plat/ops (pure library, no I/O)
  ├── Operation type
  ├── OpLog class (add, undo, redo, replay, dedup)
  └── Rust WASM (validation, Blake3)

truck-cad
  ├── uses @plat/ops (op log management)
  ├── uses automerge-partyserver (CRDT sync)
  ├── uses partyfn (type-safe CAD commands)
  └── uses partysession (per-user state)
```

**Pros:**
- Crystal clear responsibility: @plat/ops = op logic, PartyKit = sync.
- No transport code in the library at all. Pure data structures.
- Easy to test (no WebSocket, no IDB, no HTTP — just ops in, ops out).
- The Rust WASM stays focused on what it's good at.

**Cons:**
- Consumers wire PartyKit + @plat/ops themselves.
- No "one import" experience for sync + ops.

**Best if:** We want maximum clarity and separation of concerns.

## My recommendation: Option 3

Rename @plat/sync → @plat/ops. Pure op-log library. No transport.

**Why:**
1. The sync code we built is getting replaced by PartyKit. Don't maintain two sync layers.
2. The op-log pattern (Operation, undo/redo, replay, dedup) is genuinely useful and not provided by PartyKit.
3. The Rust WASM (Automerge doc management, Blake3, op validation) is genuinely useful.
4. Clean separation: ops are data, sync is infrastructure. Don't mix them.
5. Each system picks its own PartyKit packages. @plat/ops doesn't care how you sync.

**What @plat/ops would export:**

```
@plat/ops/types    → Operation, OpLog types
@plat/ops/log      → OpLog class (add, undo, redo, replay, dedup, getOpsSince)
@plat/ops/wasm     → Rust WASM (Automerge doc ops, Blake3 hash, validation)
```

**What gets deleted:**
- SyncClient, adapters, SyncWorker, createSyncHandler, R2DocStore
- All transport code (HTTP, SSE, WebSocket, BroadcastChannel)
- All storage adapters (IDB, Memory, R2)
- test/worker/, test/integration/ (transport tests)

**What stays:**
- crate/ (Rust WASM)
- Operation type + op log logic
- test/client/ (op logic tests, no transport)
- test/partykit/ (PartyKit transport tests — these test the PartyKit integration, not @plat/ops)

## What do you think?

This is your call. All three options work. The question is how much abstraction you want between your systems and PartyKit.
