# Snapshot + Multi-Actor Sync (v6)

## Context

Two problems, one solution:

1. **Replay is slow** — replays ALL ops from scratch every time
2. **Multi-actor sync doesn't work** — browser never syncs to server, MCP and GUI are separate worlds

**Root cause:** Server uses D1 op_log (flat rows with sequential index) instead of Automerge doc (CRDT that merges correctly). The Automerge merge already works browser-to-browser via BroadcastChannel. We just need to extend it to browser-to-server.

**Breaking backward compat is allowed.**

## Architecture Change

**Before:**
```
Browser (Automerge doc in IDB) ←BroadcastChannel→ Other tabs
MCP → Server → D1 op_log (sequential index, INSERT OR IGNORE)
Replay: rebuild Automerge doc from D1 rows every time
Browser and server NEVER sync
```

**After:**
```
Browser (Automerge doc in IDB) ←BroadcastChannel→ Other tabs
                ↕ POST /sync (merge_docs)
Server (Automerge doc in R2: automerge.bin)
                ↕ apply_op on MCP calls
MCP → Server → apply_op to R2 doc
Replay: load automerge.bin from R2, get_replay_ops, execute
```

**R2 `automerge.bin` is the only server store.** D1 op_log is removed entirely (breaking backward compat).

## Implementation Order

The parts are presented thematically but must be **implemented** in dependency order:

1. **E (codegen)** — `schemars` derive + `generate-schema` binary. Produces `sync-schema.json` and generated `CadOperation` type. Everything else imports this type.
2. **A0 (shared layer)** — Rust `get_name`/`set_name` + WASM exports. Then `doc-ops.ts` (shared pure functions). Then browser adapter (`doc-store.ts`) and server adapter (`doc-storage.ts`).
3. **D1 removal** — Delete `op-log.ts`, remove D1 bindings/endpoints. Clean break before adding new server code.
4. **A (server R2 doc)** — MCP writes to `automerge.bin`, extend manifest. Server-direct headless execution.
5. **A3 (SSE dedup)** — Full-op broadcast. Depends on A because server must have the op to broadcast.
6. **B (browser↔server sync)** — Sync endpoint + browser wiring. Depends on A (server doc exists to sync against).
7. **H (sync/tiering boundary)** — `ReplayPlan` + `replay-executor.ts`. Can be done alongside B.
8. **C (server replay)** — `replayModel()` from R2. Depends on A (automerge.bin exists).
9. **D (storage budget)** — Independent, can slot in anywhere after A0.
10. **F (presence)** — Depends on B (SSE infrastructure).
11. **G (wipe)** — Depends on B (sync exists to wipe against).

## Codebase Corrections

Issues found during plan review against actual code (2026-03-06):

### Import path for shared `doc-ops.ts`

`systems/sync/ts/doc-ops.ts` must be importable by both browser (Vite at `systems/truck/web/`) and worker (wrangler at `systems/truck/worker/src/`). Both bundlers handle relative imports across directory boundaries:

- **Browser** (`history-domain.ts`): `import { recordOp } from '../../sync/ts/doc-ops';`
- **Worker** (`sync-wasm.ts`): `import { recordOp } from '../../../sync/ts/doc-ops';`

No tsconfig paths needed — relative imports work in both Vite (Rollup) and wrangler (esbuild). The `systems/sync/ts/` directory is new and must be created.

### MCP execution model: server-direct, not browser-delegated

**Current state (wrong in plan):** MCP tools call `waitForCommand()` → enqueue → SSE → browser executes → browser POSTs result back. MCP **requires a connected browser**.

**Plan assumed:** "MCP `tools/call` → execute in WASM → POST result." — this was the intended future state, not the current state.

**Correct new flow (server-direct headless):**
```
MCP tool call
  → server creates full op: { id, type, params, actorId: "server", timestamp, enabled: true }
  → server loads automerge.bin from R2
  → server calls apply_op(doc, op) → saves to R2
  → server loads scene.json cache (or replays headless if stale)
  → server executes command in HeadlessController → gets result (objectId, etc.)
  → server broadcasts full op via SSE cad-op event → browser receives + applies
  → server returns result to MCP caller immediately (no browser round-trip)
```

**Key change:** MCP no longer delegates to browser. Server runs headless WASM directly (same as the replay endpoint already does). Browser is notified via SSE but is not required.

**What stays browser-delegated:** Control plane commands (`undo`, `redo`, `select`, `get_status`, etc.) still go through the browser because they depend on browser-only state (selection, camera, UI). Only data-plane commands (`add_cube`, `boolean_union`, `translate`, etc.) execute server-direct.

### File references updated for current codebase

The browser code was refactored after the plan was written:
- `cadCommand()` now lives in `dispatch.ts` (not `state.ts`)
- `reconcile()` now lives in `reconcile.ts` (not `state.ts`)
- Schema loading lives in `schema.ts` (new)
- Wipe logic (`clear_data`) lives in `dispatch.ts` `handleJsCommand()`, not `cf-control-plane.ts`
- `types.ts` holds `WasmResult`, `CadOptions`, `SceneEntry` (new)

File tables throughout this plan are updated to reflect this.

### `model-store.ts` has no doc methods

Plan A1 said "saveDoc/loadDoc methods move to doc-storage.ts". ModelStore currently has NO doc methods — it only stores manifest + scene + thumbnail. Correct statement: "ADD doc storage methods in new `doc-storage.ts`".

## Part A0: Shared DocManager + Adapter Pattern

**Problem:** Browser and server perform the **same core operations** on Automerge doc bytes (apply_op, merge, get_ops, undo/redo, get/set name) but the code is duplicated:
- Browser: `history-domain.ts` calls WASM directly, saves to IDB
- Server: `sync-wasm.ts` wraps WASM, saves to R2
- Metadata (`name`) stored in 3 independent places that never sync

**Fix:** Extract shared `DocManager` with storage adapter interface.

### A0.1 Shared interfaces — `systems/sync/ts/doc-ops.ts` (NEW)

```typescript
/** Storage adapter — platform provides load/save */
export interface DocStorage {
  load(modelId: string): Promise<Uint8Array | null>;
  save(modelId: string, bytes: Uint8Array): Promise<void>;
}

/** WASM function signatures — same on web and bundler targets */
export interface SyncWasm {
  create_doc(): Uint8Array;
  apply_op(doc: Uint8Array, opJson: string): Uint8Array;
  merge_docs(local: Uint8Array, remote: Uint8Array): Uint8Array;
  get_ops(doc: Uint8Array): string;
  get_replay_ops(doc: Uint8Array): string;
  set_op_enabled(doc: Uint8Array, opId: string, enabled: boolean): Uint8Array;
  set_group_enabled(doc: Uint8Array, groupId: string, enabled: boolean): Uint8Array;
  rollback_to(doc: Uint8Array, actorId: string, toIndex: number): Uint8Array;
  get_name(doc: Uint8Array): string;
  set_name(doc: Uint8Array, name: string): Uint8Array;
}
```

### A0.2 Shared pure operations — `systems/sync/ts/doc-ops.ts`

Pure functions that take `(docBytes, wasm)` → return new bytes. No storage, no side effects.

```typescript
export function recordOp(bytes: Uint8Array, op: CadOperation, wasm: SyncWasm): Uint8Array {
  return wasm.apply_op(bytes, JSON.stringify(op));
}

export function mergeRemote(local: Uint8Array, remote: Uint8Array, wasm: SyncWasm): Uint8Array {
  return wasm.merge_docs(local, remote);
}

export function undoOp(bytes: Uint8Array, opId: string, wasm: SyncWasm): Uint8Array {
  return wasm.set_op_enabled(bytes, opId, false);
}

export function getOps(bytes: Uint8Array, wasm: SyncWasm): CadOperation[] {
  return JSON.parse(wasm.get_ops(bytes));
}

export function getReplayOps(bytes: Uint8Array, wasm: SyncWasm): CadOperation[] {
  return JSON.parse(wasm.get_replay_ops(bytes));
}

export function getName(bytes: Uint8Array, wasm: SyncWasm): string {
  return wasm.get_name(bytes);
}

export function setName(bytes: Uint8Array, name: string, wasm: SyncWasm): Uint8Array {
  return wasm.set_name(bytes, name);
}
// ... redoOp, rollbackTo, undoGroup, etc.
```

### A0.3 Rust crate: add `get_name()` / `set_name()`

`systems/sync/crate/src/lib.rs` — add to `core` module + WASM exports:
```rust
pub fn get_name(doc_bytes: &[u8]) -> Result<String, String> { ... }
pub fn set_name(doc_bytes: &[u8], name: &str) -> Result<Vec<u8>, String> { ... }
```

### A0.4 Browser adapter — `systems/truck/web/doc-store.ts` (EDIT)

Already exists. Implements `DocStorage`:
```typescript
import type { DocStorage } from 'systems/sync/ts/doc-ops';

export const idbStorage: DocStorage = {
  load: (modelId) => loadDoc(modelId),   // existing IDB function
  save: (modelId, bytes) => saveDoc(modelId, bytes),  // existing IDB function
};
```

Remove `name` from `DocMeta` — name now lives in Automerge doc. Keep `snapshots` and `bimHierarchy` (browser-only).

### A0.5 Server adapter — `systems/truck/worker/src/doc-storage.ts` (NEW)

```typescript
import type { DocStorage } from 'systems/sync/ts/doc-ops';

export function r2Storage(r2: R2Bucket): DocStorage {
  return {
    async load(modelId) {
      const obj = await r2.get(`models/${modelId}/automerge.bin`);
      return obj ? new Uint8Array(await obj.arrayBuffer()) : null;
    },
    async save(modelId, bytes) {
      await r2.put(`models/${modelId}/automerge.bin`, bytes);
    },
  };
}
```

Plus `R2StorageWithEtag` variant for optimistic concurrency (sync endpoint + MCP writes).

### A0.6 Browser `history-domain.ts` refactor

Replace direct WASM calls with shared `doc-ops` functions:
```typescript
import { recordOp, mergeRemote, undoOp, getOps, getName, setName } from 'systems/sync/ts/doc-ops';

// Before: this._docBytes = apply_op(this._docBytes, JSON.stringify(op));
// After:  this._docBytes = recordOp(this._docBytes, op, this._wasm);
```

### A0.7 Server `sync-wasm.ts` refactor

Replace wrapper functions with shared `doc-ops` imports:
```typescript
import { recordOp, mergeRemote, getReplayOps, getName } from 'systems/sync/ts/doc-ops';

// Before: syncApplyOp(doc, opJson) → apply_op(doc, opJson)
// After:  recordOp(doc, op, wasm) — same function as browser
```

### A0.8 What metadata lives where

| Field | Lives in | Why |
|---|---|---|
| `name` | Automerge doc (synced via `merge_docs`) | Shared between all actors |
| `description` | Automerge doc (synced) | Shared — add later, same pattern as name |
| `snapshots` | Browser IDB `DocMeta` only | Local cache optimization |
| `bimHierarchy` | Browser IDB `DocMeta` only | Browser-only rendering hint |
| `objectCount`, `hasThumbnail` | Server `ModelManifest` only | Derived on server during replay/save |
| `replayOpsHash`, `actors` | Server `ModelManifest` only | Server-side cache/tracking |

Server extracts `name` from merged doc → updates `ModelManifest` (denormalized cache for listing).

## Part A: Server Automerge Doc in R2

### A1. Extend `model-store.ts`

Extend `ModelManifest`:
```typescript
replayOpsHash?: string;    // hash of enabled op IDs — merge-safe cache key
enabledOpCount?: number;
actors?: Record<string, string>;  // actorId → displayName (for Part F)
```

New `doc-storage.ts` (Part A0.5) adds doc load/save methods for R2. `model-store.ts` keeps manifest + scene + thumbnail R2 operations only (it has no doc methods today).

### A2. Update MCP op execution path in `index.ts`

**Current state:** MCP tools call `waitForCommand()` → enqueue → SSE → browser executes → browser POSTs result back. MCP requires a connected browser and uses D1 op-log only.

**New state:** MCP data-plane tools execute **server-direct** via headless WASM. Server creates the full op, applies to `automerge.bin` in R2, executes in `HeadlessController`, returns result immediately. No browser round-trip needed. Browser is notified via SSE `cad-op` event (Part A3).

Control-plane tools (`undo`, `redo`, `select`, `get_status`, etc.) continue to delegate to browser via `waitForCommand()` because they depend on browser-only state.

Apply op to `automerge.bin` with optimistic concurrency:
**Concurrency note:** MCP calls CAN be concurrent (fresh server per HTTP request). Two simultaneous `loadDoc → applyOp → saveDoc` would race. Use optimistic concurrency (etag):
```typescript
const { doc, etag } = await store.loadDocWithEtag(modelId) ?? { doc: await syncCreate(), etag: null };
const updated = await syncApplyOp(doc, JSON.stringify(op));
if (etag) {
  const ok = await store.saveDocConditional(modelId, updated, etag);
  if (!ok) {
    // Retry once: re-read, re-apply, re-save
    const fresh = (await store.loadDoc(modelId))!;
    const retried = await syncApplyOp(fresh, JSON.stringify(op));
    await store.saveDoc(modelId, retried);
  }
} else {
  await store.saveDoc(modelId, updated);
}
```

### A3. SSE broadcasts the full op (dedup fix)

Currently SSE sends raw commands: `{ type: 'add_cube', params: {...} }`. The browser then calls `record()` which creates a **new** op with a different id. If both server and browser create ops for the same command, `merge_docs()` sees two different ops → duplicate objects.

**Fix:** Server creates the full op (with `id`, `actorId: "server"`, `timestamp`), applies to `automerge.bin`, then broadcasts the **full op** via SSE — not just the raw command.

```typescript
// In enqueueCommand(), after applying op to automerge.bin:
const op: CadOperation = { id: crypto.randomUUID(), type, params, enabled: true,
  timestamp: Date.now(), actorId: 'server' };
// ... apply to automerge.bin ...
broadcast(modelId, { type: 'cad-op', data: { id: cmdId, op } });  // full op, not raw command
```

Browser receives SSE `cad-op` event:
- Executes in WASM (immediate visual feedback)
- Calls `apply_op()` with the server's op (same id) — NOT `record()` (which would create a new id)
- Saves to local IDB Automerge doc

**Result:** One op, one id, one creator. No duplicates on sync.

## Part B: Browser ↔ Server Sync

### B1. New endpoint: `POST /api/models/{id}/sync`

Accepts browser's Automerge doc bytes, merges with server's, returns merged result.

```typescript
// Request: raw bytes (application/octet-stream)
// Response: merged bytes (application/octet-stream)

const browserDoc = new Uint8Array(await c.req.arrayBuffer());
const { doc: serverDoc, etag } = await store.loadDocWithEtag(modelId)
  ?? { doc: await syncCreate(), etag: null };

const merged = await syncMergeDocs(serverDoc, browserDoc);

// Optimistic concurrency: retry if someone else wrote
if (etag) {
  const ok = await store.saveDocConditional(modelId, merged, etag);
  if (!ok) {
    // Race: re-read, re-merge, re-save (one retry)
    const fresh = await store.loadDoc(modelId);
    const reMerged = await syncMergeDocs(fresh!, browserDoc);
    await store.saveDoc(modelId, reMerged);
    return new Response(reMerged);
  }
}
await store.saveDoc(modelId, merged);
return new Response(merged);
```

### B2. Wire browser `worker-relay.ts` to call sync

When browser connects (SSE `open` event), sync local doc:
```typescript
// On connect (works for first visit AND reconnect):
const localDoc = await loadDoc(modelId) ?? await create_doc();  // empty doc if first visit
const resp = await fetch(`/api/models/${modelId}/sync`, {
  method: 'POST',
  body: localDoc,
});
const mergedDoc = new Uint8Array(await resp.arrayBuffer());
const finalDoc = merge_docs(localDoc, mergedDoc);
await saveDoc(modelId, finalDoc);
await _replayScene();  // re-render with merged state
```

Also sync periodically while connected (every 30s or on-demand after local ops).

### B3. Handle `cad-op` SSE events in browser

When browser receives a `cad-op` event (server-created op from MCP):
```typescript
// In worker-relay.ts SSE handler:
case 'cad-op':
  const { op } = ev.data;
  ctrl.execute(op.type, op.params);     // execute in WASM (visual)
  apply_op(docBytes, JSON.stringify(op)); // store in local Automerge doc (same id)
  saveDoc(modelId, docBytes);            // persist to IDB
  // Do NOT call record() — that would create a duplicate op with a new id
  break;
```

This replaces the current `cad-command` event handling for MCP-originated commands.

### B4. Wire browser `history-domain.ts` to push after ops

After `_saveAndBroadcast()`, if online, debounce a sync call:
```typescript
// In _saveAndBroadcast(), after BroadcastChannel post:
if (navigator.onLine) {
  this._debouncedSync();  // 2s debounce — batch rapid ops
}
```

## Part C: Replay with Snapshots

### C1. Extract `systems/truck/worker/src/replay.ts` (NEW)

```typescript
export async function replayModel(modelId: string, env: Env): Promise<ReplayResult | null>
```

Logic:
1. Load `automerge.bin` from R2 — this IS the merged state of all actors
2. If null → return null (404)
3. `syncGetReplayOps(docBytes)` → enabled ops in order
4. Check manifest: compute hash of enabled op IDs → if `replayOpsHash` matches → load `scene.json`, return cached
5. Else: HeadlessController → replay all enabled ops → export scene
6. `waitUntil`: save `scene.json` + update manifest with new `replayOpsHash` + `enabledOpCount`

**No D1 involvement in replay.** All state comes from `automerge.bin`.

### C2. Wire into `index.ts`

**GET replay:** Call `replayModel()`, return scene JSON.
**POST snapshot:** Call `replayModel()` with force-refresh, return `{ atOpIndex, objectCount }`.
**DELETE model:** Already works (R2 prefix-based deletion cleans automerge.bin automatically).

## Part D: Browser Storage Budget

### D1. `systems/truck/web/storage-budget.ts` (NEW)

```typescript
export interface StorageBudget {
  pctUsed: number;
  canStoreSnapshot: boolean;  // false > 90%
  canEvictToWarm: boolean;    // false > 95%
}
export async function refreshBudget(): Promise<StorageBudget>
export function currentBudget(): StorageBudget | null
```

### D2. Wire in

- `boot.ts`: `navigator.storage.persist()` + `refreshBudget()`
- `blob-store.ts`: check `canStoreSnapshot` before writes
- `tier-manager.ts`: check `canEvictToWarm` before evicting
- `history-domain.ts`: `refreshBudget()` every SNAPSHOT_INTERVAL ops

### D3. Status bar indicator

`index.html`: signal `storagePct: 0` + span with yellow/red thresholds.
`reconcile.ts`: read `window.__storagePct`.

## All files

### Shared layer (A0)
| File | Action | What |
|------|--------|------|
| `systems/sync/ts/doc-ops.ts` | NEW | Shared `DocStorage` interface, `SyncWasm` interface, pure doc operation functions |
| `systems/sync/crate/src/lib.rs` | EDIT | Add `get_name()`/`set_name()` + WASM exports, `JsonSchema` derive (E1) |

### Browser adapter + wiring
| File | Action | What |
|------|--------|------|
| `systems/truck/web/doc-store.ts` | EDIT | Export `idbStorage: DocStorage` adapter, remove `name` from `DocMeta` |
| `systems/truck/web/history-domain.ts` | EDIT | Use shared `doc-ops` functions, debounced sync push, import generated CadOperation |
| `systems/truck/web/worker-relay.ts` | EDIT | Call sync endpoint on connect + periodically, handle `cad-op` SSE events |
| `systems/truck/web/storage-budget.ts` | NEW | Quota manager |
| `systems/truck/web/blob-store.ts` | EDIT | Quota check before writes |
| `systems/truck/web/tier-manager.ts` | EDIT | Check `canEvictToWarm` |
| `systems/truck/web/boot.ts` | EDIT | `persist()` + `refreshBudget()` + actorId init |
| `systems/truck/web/index.html` | EDIT | Storage + presence indicators |
| `systems/truck/web/reconcile.ts` | EDIT | Read `__storagePct` + `__presenceActors` |
| `systems/truck/web/history-ui.ts` | EDIT | Actor name/color per op in timeline |
| `systems/truck/web/dispatch.ts` | EDIT | Two-mode wipe in `handleJsCommand('clear_data')` (local vs full) |

### Server adapter + wiring
| File | Action | What |
|------|--------|------|
| `systems/truck/worker/src/doc-storage.ts` | NEW | `r2Storage: DocStorage` adapter (+ etag variant) |
| `systems/truck/worker/src/sync-wasm.ts` | EDIT | Refactor to use shared `doc-ops`, add `SyncWasm` adapter |
| `systems/truck/worker/src/model-store.ts` | EDIT | Extend manifest (replayOpsHash, actors) |
| `systems/truck/worker/src/replay.ts` | NEW | `replayModel()` from R2 automerge.bin via shared ops |
| `systems/truck/worker/src/index.ts` | EDIT | Sync endpoint, server-direct MCP execution (headless WASM), remove D1 endpoints/imports |
| `systems/truck/worker/src/op-log.ts` | DELETE | D1 op log removed entirely |
| `systems/truck/worker/src/index.test.ts` | EDIT | Tests for sync + replay, remove D1 mock |
| `systems/truck/worker/wrangler.toml` | EDIT | Remove `OP_LOG_DB` D1 binding |

### Build + codegen
| File | Action | What |
|------|--------|------|
| `systems/truck/system.mjs` | EDIT | Remove `migrate` field, add sync watch paths |
| `systems/sync/system.mjs` | EDIT | Add schema gen to DEV_BUILD + RELEASE_BUILD |
| `systems/sync/crate/Cargo.toml` | EDIT | Add `schemars` dep + `[[bin]]` for generate-schema |
| `systems/sync/crate/src/bin/generate_schema.rs` | NEW | 5-line schema generator |
| `scripts/gen-openapi.ts` | EDIT | Import sync-schema, generate `CadOperation` type |
| `package.json` | EDIT | Add `build:sync-schema` script |

## Part E: Op Type Codegen (DRY)

Extend the existing Rust → TypeScript pipeline to generate `CadOperation` from the sync crate's `Op` struct. Eliminates the manually-synced duplicate in `history-domain.ts`. Also serve the schema at runtime for discovery.

**How it works — three layers from one Rust struct:**

```
Rust Op struct + #[derive(JsonSchema)]
  │
  ├── BUILD TIME: cargo run --bin generate-schema > sync-schema.json  (committed)
  │     ├── gen-openapi.ts reads it → generates CadOperation TypeScript interface
  │     └── TypeScript compiler enforces field names match Rust serde renames
  │
  ├── COMPILE TIME: TypeScript interface (CadOperation) — type-safe at dev time
  │     ├── history-domain.ts imports generated type (replaces hand-written)
  │     └── doc-ops.ts uses it in shared pure functions
  │
  └── RUNTIME: Worker serves sync-schema.json at /api/sync/schema
        └── Third-party tools / MCP agents can discover Op format dynamically
```

**schemars respects `#[serde(rename)]`** — so `actor_id` → `actorId`, `op_type` → `type` in the generated JSON Schema. The TypeScript interface field names match what WASM `get_ops()` actually returns.

### E1. Add `#[derive(JsonSchema)]` to `Op` struct

`systems/sync/crate/Cargo.toml`: add `schemars = { version = "0.8", features = ["derive"] }`
`systems/sync/crate/src/lib.rs`: add `JsonSchema` to the derive list on `Op`

### E2. Add `generate-schema` binary

`systems/sync/crate/src/bin/generate_schema.rs` (NEW, ~5 lines):
```rust
fn main() {
    let schema = schemars::schema_for!(truck_sync::Op);
    println!("{}", serde_json::to_string_pretty(&schema).unwrap());
}
```

`systems/sync/crate/Cargo.toml`: add `[[bin]]` section:
```toml
[[bin]]
name = "generate-schema"
path = "src/bin/generate_schema.rs"
```

### E3. Wire into build chain

**`systems/sync/system.mjs`:** extend DEV_BUILD and RELEASE_BUILD to also run schema gen:
```javascript
export const DEV_BUILD =
  'cd systems/sync/crate && wasm-pack build --target web --dev --out-dir ../../truck/web/pkg-sync && wasm-pack build --target bundler --dev --out-dir ../../truck/worker/pkg-sync && cargo run --bin generate-schema 2>/dev/null > ../sync-schema.json';
```

**`systems/truck/system.mjs`:** add `systems/sync/crate/src` to watch paths so Op struct changes trigger rebuild.

**`package.json`:** add `"build:sync-schema": "cd systems/sync/crate && cargo run --bin generate-schema > ../sync-schema.json"`

**`bun run build:truck`:** chain already runs `build:sync` first → sync schema gen now included automatically.

### E4. Extend `gen-openapi.ts`

Import `sync-schema.json` alongside `cad-schema.json`. Generate `CadOperation` TypeScript interface from the Op JSON Schema. Output into `api-types.ts` or a new `sync-types.ts`.

### E5. Replace manual `CadOperation`

`history-domain.ts`: remove hand-written `CadOperation` interface, import from generated types.
`doc-ops.ts`: uses the same generated type.
Worker code: import same generated type if needed.

### E6. Serve at runtime

Worker serves `sync-schema.json` at `GET /api/sync/schema` — same pattern as `cad-schema.json` at `/api/cad/schema`.
Enables runtime discovery of the Op format for third-party integrations and MCP agents.

### Files

| File | Action | What |
|------|--------|------|
| `systems/sync/crate/Cargo.toml` | EDIT | Add `schemars` dep + `[[bin]]` for generate-schema |
| `systems/sync/crate/src/lib.rs` | EDIT | Add `JsonSchema` derive to `Op` |
| `systems/sync/crate/src/bin/generate_schema.rs` | NEW | 5-line schema generator |
| `systems/sync/system.mjs` | EDIT | Add schema gen to DEV_BUILD + RELEASE_BUILD |
| `systems/truck/system.mjs` | EDIT | Add sync crate to watch paths |
| `scripts/gen-openapi.ts` | EDIT | Import sync-schema, generate `CadOperation` type |
| `systems/truck/web/history-domain.ts` | EDIT | Import generated `CadOperation` instead of hand-written |
| `systems/truck/worker/src/index.ts` | EDIT | Serve sync-schema.json at /api/sync/schema |
| `package.json` | EDIT | Add `build:sync-schema` script |

## Part F: Presence

Show who's currently connected to a model. Proves the sync infrastructure end-to-end and lays groundwork for auth (auth = who can get an actorId for a model).

### F1. Server: track actors per model in `index.ts`

Extend `ModelSession`:
```typescript
interface ModelSession {
  // ... existing fields ...
  actors: Map<string, { name: string; connectedAt: number }>;  // actorId → info
}
```

On SSE connect, browser sends `actorId` + `displayName` as query params:
```
GET /api/cad/{modelId}/events?actorId=uuid&name=User%20A
```

Server:
- Adds actor to `model.actors` on connect
- Removes on disconnect (stream abort)
- Broadcasts `presence` event to all listeners on join/leave:
  ```typescript
  broadcast(modelId, { type: 'presence', data: { actors: [...model.actors.entries()] } });
  ```
- MCP is also an actor (`actorId: "server"`, `name: "MCP Agent"`) — tracked the same way

### F2. New SSE event type: `presence`

```typescript
type SSEEvent =
  | { type: 'cad-command'; data: ... }
  | { type: 'cad-op'; data: ... }
  | { type: 'datastar-patch-signals'; data: ... }
  | { type: 'presence'; data: { actors: [string, { name: string; connectedAt: number }][] } };
```

### F3. Browser: display presence in status bar

`index.html`: add signal `presenceCount: 0` + display element next to storage indicator.
`worker-relay.ts`: on `presence` event, update `window.__presenceActors` + signal.

Show: `Editors: 3` (or actor names if few: `Editors: You, MCP Agent`)

### F4. Edit history from ops (no new storage)

Every op in `automerge.bin` already has `actorId` + `timestamp`. Extract edit history:

**Server:** Add `GET /api/models/{id}/history` endpoint:
```typescript
// Load automerge.bin → get_ops() → group by actorId → return summary
[
  { actorId: "server", name: "MCP Agent", opCount: 5, firstAt: ..., lastAt: ... },
  { actorId: "uuid-abc", name: "User A", opCount: 12, firstAt: ..., lastAt: ... },
]
```

**Browser:** The history-ui.ts timeline already shows ops. Extend to show actor name/color per op.

Actor name resolution: store `{ actorId → displayName }` in the model manifest (Part A `ModelManifest`). Updated on sync when a new actorId is seen.

### F5. Browser: generate stable actorId

`boot.ts`: generate UUID on first visit, persist in `localStorage` as `cad-actor-id`. Reuse across sessions.
Display name: `localStorage` `cad-actor-name` (default: `"User"`, settable later).

### Files

| File | Action | What |
|------|--------|------|
| `systems/truck/worker/src/index.ts` | EDIT | Track actors in ModelSession, presence SSE events, actorId query param |
| `systems/truck/web/worker-relay.ts` | EDIT | Send actorId on SSE connect, handle presence events |
| `systems/truck/web/boot.ts` | EDIT | Generate/persist actorId in localStorage |
| `systems/truck/web/index.html` | EDIT | Presence count in status bar |
| `systems/truck/web/reconcile.ts` | EDIT | Read `window.__presenceActors` |
| `systems/truck/web/history-ui.ts` | EDIT | Show actor name/color per op in timeline |

## Part G: Wipe (local + server)

### G1. Extend WIPE button with server-side cleanup

Currently WIPE (`cad_clear_data` MCP tool / GUI button) only clears browser IDB. After sync, server state would repopulate on next connect.

**Two modes:**
- **Local reset**: Clear IDB only. Next sync pulls server state. ("My browser is broken, reset it.")
- **Full delete**: Clear IDB + `DELETE /api/models/{id}` (removes R2 doc + D1 audit). True clean slate.

### G2. Wire into `dispatch.ts` `handleJsCommand('clear_data')`

The existing `clear_data` handler calls `indexedDB.deleteDatabase(...)`. Extend:
```typescript
case 'clear_data': {
  const mode = params.mode as string || 'local';  // 'local' or 'full'
  // Existing: clear IDB databases
  indexedDB.deleteDatabase('cad-sync');
  indexedDB.deleteDatabase('cad-blobs');
  indexedDB.deleteDatabase('cad-objects');
  indexedDB.deleteDatabase('cad-docs');
  localStorage.clear();
  // New: if full delete, also wipe server
  if (mode === 'full') {
    const mid = window.__modelId;
    await fetch(`/api/models/${mid}`, { method: 'DELETE' });
  }
  location.reload();
  return { success: true };
}
```

### G3. GUI confirmation dialog

WIPE button shows two options:
- "Reset local" — IDB only, server keeps state
- "Delete model" — IDB + server, everything gone

### Files

| File | Action | What |
|------|--------|------|
| `systems/truck/web/dispatch.ts` | EDIT | Two-mode wipe in `handleJsCommand('clear_data')` — `mode: 'local'` vs `mode: 'full'` |
| `systems/truck/web/index.html` | EDIT | Wipe dialog with two options |

## Part H: Sync Owns the Snapshot Lifecycle

### H0. Why the old boundary was wrong

The original plan treated tiering as "orthogonal" to sync, then needed 5 patches (H1-H5) to make them work together. Five patches means the boundary is drawn in the wrong place.

**Root cause: `_replayScene()` is a god function.** It currently:
1. Calls `resetTierState()` — reaches into tiering to nuke warm objects
2. Validates snapshots by checking op enabled state — sync knowledge
3. Retrieves snapshot blobs from `cad-blobs` — blob store access
4. Decides progressive vs full load — tiering decision
5. Calls `bulkPutObjects()` + `registerWarmObjects()` — populates warm tier
6. Replays remaining ops — sync operation
7. Restores selection — UI concern

Snapshots are the misassigned concept. They are:
- **Created** by sync (every SNAPSHOT_INTERVAL ops in `record()`)
- **Validated** by sync (checking if all prior ops are enabled — sync state)
- **Distributed** by sync (to R2 for other browsers — sync's job)
- **Keyed** by `replayOpsHash` (hash of enabled op IDs — sync concept)

But they're **stored** in tiering's blob store (`cad-blobs`) and **consumed** by tiering's progressive load. The fix: move snapshot lifecycle into sync, give tiering a clean interface.

### H1. The correct boundary

```
SYNC LAYER (owns all doc state + snapshots)
├─ Automerge doc (cad-sync IDB / R2 automerge.bin)
├─ Snapshot lifecycle: create, validate, store, distribute
├─ Replay planning: find best snapshot + remaining ops
├─ Scene-changed signal → emitted after replay
└─ Produces: ReplayPlan { snapshot, remainingOps }

    ↓ ReplayPlan (clean interface)

TIERING LAYER (owns local presentation)
├─ Consumes ReplayPlan → decides Hot/Warm/Cold based on camera
├─ Progressive load: frustum-based Hot/Warm split
├─ Eviction/promotion: camera-driven, 10Hz tick
├─ Warm object serialization: cad-objects IDB
└─ LOD proxies: sphere placeholders for Warm objects
```

**What crosses the boundary:**
- Sync → Tiering: `ReplayPlan` (snapshot JSON + remaining ops)
- Sync → Tiering: `scene-changed` event (after merge/replay)
- Tiering → Sync: nothing (tiering never writes to the Automerge doc)

**What does NOT cross:**
- Sync never calls `resetTierState()` directly
- Sync never calls `bulkPutObjects()` or `registerWarmObjects()`
- Tiering never reads `_meta.snapshots` or validates snapshot ops

### H2. ReplayPlan interface

New shared interface in `history-domain.ts`:

```typescript
interface ReplayPlan {
  snapshotJson: string | null;     // Best valid snapshot (or null = replay from scratch)
  startIndex: number;              // First op to replay after snapshot
  ops: CadOperation[];             // All ops (sync provides, tiering filters by startIndex)
  totalEnabledOps: number;         // For snapshot scheduling
  source: 'local' | 'remote' | 'server';  // Who triggered this replay
}
```

**Sync computes the plan:**
```typescript
// In history-domain.ts — sync layer method
async _computeReplayPlan(source: string): Promise<ReplayPlan> {
  const ops = this._getOps();
  let startIndex = 0;
  let snapshotJson: string | null = null;

  // Snapshot validation — sync owns this (knows op enabled state)
  const validFrom = this._computeSnapshotValidFrom(ops);
  const snaps = this._meta.snapshots || [];
  for (let s = snaps.length - 1; s >= 0; s--) {
    const snap = snaps[s];
    if (snap.atOpIndex == null || snap.atOpIndex > validFrom) continue;
    const json = await getBlob(snap.blobRef).catch(() => null);
    if (json) { snapshotJson = json; startIndex = snap.atOpIndex; break; }
  }

  return { snapshotJson, startIndex, ops, totalEnabledOps: ops.filter(o => o.enabled).length, source };
}
```

**Tiering executes the plan** — lives in tiering code, NOT in `history-domain.ts`:
```typescript
// In replay-executor.ts (NEW — tiering layer)
import { resetTierState, aggressivePass } from './tier-manager';
import { bulkPutObjects, registerWarmObjects } from './object-store';

export async function executeReplayPlan(plan: ReplayPlan): Promise<void> {
  await resetTierState();  // Tiering resets itself

  const entries = plan.snapshotJson ? JSON.parse(plan.snapshotJson) : null;
  const REPLAY = { record: false, reconcile: false, source: 'replay' };

  if (entries?.length >= PROGRESSIVE_THRESHOLD) {
    // Tiering decides Hot/Warm split based on camera
    await progressiveLoad(entries, plan.ops, plan.startIndex, REPLAY);
  } else {
    if (plan.snapshotJson) {
      cadCommand('import_scene', { json: plan.snapshotJson }, REPLAY);
    } else {
      cadCommand('clear', {}, REPLAY);
    }
    await replayRemainingOps(plan.ops, plan.startIndex, REPLAY);
  }
}
```

**`_replayScene()` in `history-domain.ts` becomes a thin orchestrator** — sync computes, tiering executes:
```typescript
// In history-domain.ts (sync layer) — imports from tiering
import { executeReplayPlan } from './replay-executor';

async _replayScene(source: 'local' | 'remote' | 'server' = 'local'): Promise<void> {
  if (!moduleRouter.ready || this._replayInProgress) return;
  this._replayInProgress = true;
  try {
    const plan = await this._computeReplayPlan(source);  // Sync layer
    await executeReplayPlan(plan);                         // Tiering layer
    this._restoreSelection();                              // UI layer
    this._emitSceneChanged(plan);                          // Signal to tiering
  } finally {
    this._replayInProgress = false;
  }
}
```

This enforces the boundary: `history-domain.ts` (sync) never imports from `object-store.ts` or calls `resetTierState()` directly. All tiering logic lives in `replay-executor.ts`.

### H3. Snapshot validation moves fully into sync

**Before:** `_replayScene()` has an inline loop checking `ops[i].enabled` for each snapshot.

**After:** Sync layer owns a `_computeSnapshotValidFrom()` method:

```typescript
/** Sync-layer: highest op index where all prior ops are enabled. */
_computeSnapshotValidFrom(ops: CadOperation[]): number {
  let validFrom = 0;
  for (let i = 0; i < ops.length; i++) {
    if (!ops[i].enabled) break;
    validFrom = i + 1;
  }
  return validFrom;
}
```

This replaces the O(ops x snapshots) nested loop with O(ops) once. Any snapshot with `atOpIndex <= validFrom` is valid.

Cache `snapshotValidFrom` in `DocMeta` for instant lookup on subsequent replays:

```typescript
interface DocMeta {
  snapshots: SnapshotRef[];
  bimHierarchy?: unknown;
  snapshotValidFrom?: number;  // Cached — recomputed on undo/redo
}
```

Invalidation: any undo/redo/toggle sets `snapshotValidFrom = undefined` → recomputed on next replay.

### H4. Snapshots sync to R2 (unifies with Part C)

Snapshots are sync's responsibility → sync stores them where sync stores everything: R2.

```
models/{id}/automerge.bin         — Automerge doc (source of truth)
models/{id}/scene.json            — Latest scene snapshot (derived cache)
models/{id}/scene-meta.json       — { atOpIndex, replayOpsHash }
```

**Server updates snapshot** (in `waitUntil`):
- After `POST /api/models/{id}/sync` — if merged doc has more enabled ops than cached snapshot
- After MCP op write — same check
- Uses Part C's `replayModel()` for headless replay

**Browser fetches on first visit** (before local replay):
```typescript
// model-loader.ts — try server snapshot first
const meta = await fetch(`/api/models/${modelId}/scene-meta`).then(r => r.ok ? r.json() : null);
if (meta?.replayOpsHash === computeReplayOpsHash(ops)) {
  const scene = await fetch(`/api/models/${modelId}/scene`).then(r => r.ok ? r.text() : null);
  if (scene) return { snapshotJson: scene, startIndex: meta.atOpIndex };
}
// Fall back to local IDB snapshots
```

**This unifies Part C** — the replay cache (`scene.json` + `replayOpsHash` in manifest) IS the server-side snapshot. Part C's `replayModel()` produces it, Part H4 exposes it via GET endpoints.

### H5. Scene-changed event replaces direct tiering calls

**Before:** Sync calls `resetTierState()` directly, then runs progressive load inline.

**After:** Sync emits `scene-changed`, tiering listens:

```typescript
// Sync layer emits after replay completes:
_emitSceneChanged(plan: ReplayPlan): void {
  window.dispatchEvent(new CustomEvent('cad-scene-changed', {
    detail: { source: plan.source, opCount: plan.totalEnabledOps }
  }));
}
```

Tiering listens:
```typescript
// tier-manager.ts — on scene change from remote, run aggressive pass
window.addEventListener('cad-scene-changed', (e: CustomEvent) => {
  if (e.detail.source === 'remote' || e.detail.source === 'server') {
    // Re-evaluate with current camera — objects may have moved
    requestAnimationFrame(() => aggressivePass());
  }
});
```

`aggressivePass()` — same as normal tick but no idle-time requirement, higher eviction limit (max 10 vs max 2).

### H6. Replay debounce is sync's internal concern

Remote ops (BroadcastChannel, SSE) trigger replays. Sync owns the debounce:

```typescript
// history-domain.ts — sync debounces its own replays
_scheduleRemoteReplay(): void {
  clearTimeout(this._remoteReplayTimer);
  this._remoteReplayTimer = setTimeout(() => {
    this._replayScene('remote');
  }, 500);  // 500ms debounce for remote ops (batches burst of 5 ops into 1 replay)
}
```

This replaces the current 100ms debounce. Local ops still replay immediately.

### H7. Tiering-only fixes (genuinely orthogonal)

These are real tiering bugs, not boundary violations:

**H7a. Warm sphere persistence on reload:**
Tier manager's `_warmSpheres` map is memory-only. On page reload, warm objects exist in `cad-objects` IDB but their bounding spheres are lost.

Fix: on tier manager init, load warm spheres from IDB:
```typescript
// tier-manager.ts init():
const warmList = await listObjectsWithSpheres(modelId);
for (const { objectId, boundingSphere, style } of warmList) {
  if (boundingSphere) {
    const [cx, cy, cz, r] = boundingSphere;
    const color = style?.albedo ?? [0.5, 0.5, 0.5, 1.0];
    _warmSpheres.set(objectId, { center: [cx, cy, cz], radius: r, color });
  }
}
```

**H7b. Diff-based replay (optional optimization):**
Currently `resetTierState()` nukes ALL warm objects on every replay. If the new replay produces the same object IDs, warm objects that haven't changed could be preserved.

Deferred — the 500ms debounce (H6) reduces replay frequency enough that nuke-and-rebuild is acceptable for v1. Diff-based replay is a future optimization.

### H8. What lives where (updated from A0.8)

| Data | Owned by | Storage | Why |
|------|----------|---------|-----|
| Ops (Automerge doc) | **Sync** | IDB `cad-sync` / R2 `automerge.bin` | User intent, CRDT-merged |
| Model name | **Sync** | In Automerge doc (merged via `merge_docs`) | Shared between all actors |
| Snapshot blobs | **Sync** | IDB `cad-blobs` (local) + R2 `scene.json` (server) | Derived from ops, distributed by sync |
| Snapshot metadata | **Sync** | IDB `cad-sync/meta` (local) + R2 `scene-meta.json` (server) | Sync validates, sync distributes |
| `snapshotValidFrom` | **Sync** | IDB `cad-sync/meta` (cached) | Derived from op enabled state |
| Warm object exports | **Tiering** | IDB `cad-objects` | Per-browser cache, camera-driven |
| Bounding spheres | **Tiering** | In-memory `_warmSpheres` + IDB `cad-objects` | View-local frustum culling |
| Tier assignments | **Tiering** | In-memory only | Ephemeral, 10Hz camera-driven |
| LOD proxies | **Tiering** | WASM GPU memory | Visual placeholders for Warm objects |
| Progressive load | **Tiering** | Computed per-replay | Frustum-based Hot/Warm split |

### Files

| File | Action | What |
|------|--------|------|
| `systems/truck/web/history-domain.ts` | EDIT | Extract `_computeReplayPlan()` (sync), call `executeReplayPlan()` from tiering, 500ms remote debounce, emit `cad-scene-changed` event. Remove `_progressiveLoad()`, `_replayRemainingOps()`, `resetTierState()` calls. |
| `systems/truck/web/replay-executor.ts` | NEW | `executeReplayPlan(plan)` — owns `resetTierState()`, progressive load, `bulkPutObjects()`, `registerWarmObjects()`, `replayRemainingOps()`. All tiering-side replay logic lives here. |
| `systems/truck/web/tier-manager.ts` | EDIT | Listen for `cad-scene-changed`, `aggressivePass()`, warm sphere persistence on init |
| `systems/truck/web/model-loader.ts` | EDIT | Fetch server snapshot on first visit before local replay |
| `systems/truck/web/doc-store.ts` | EDIT | Add `snapshotValidFrom` to DocMeta |
| `systems/truck/worker/src/index.ts` | EDIT | Expose `scene.json` + `scene-meta.json` as GET endpoints |
| `systems/truck/worker/src/model-store.ts` | EDIT | Store snapshot in R2 alongside automerge.bin |

## D1 op_log removal (breaking change)

Remove entirely:
- Delete `systems/truck/worker/src/op-log.ts`
- Remove `OP_LOG_DB` binding from `systems/truck/worker/wrangler.toml`
- Remove `migrations/` directory and migration scripts
- Remove `appendOp`, `getOpsSince`, `deleteOps` imports from `index.ts`
- Remove `GET/POST /api/models/{id}/ops` endpoints from `index.ts`
- Remove D1 mock from `index.test.ts`
- Remove `migrate` field from `systems/truck/system.mjs`

Op history is fully available via `get_ops()` on `automerge.bin`. The `GET /api/models/{id}/history` endpoint (Part F) serves this.

## Definition of Done

### Shared DocManager + adapters
- [ ] `systems/sync/ts/doc-ops.ts` — `DocStorage` interface, `SyncWasm` interface, pure operation functions
- [ ] Browser adapter: `idbStorage` in `doc-store.ts` implements `DocStorage`
- [ ] Server adapter: `r2Storage` in `doc-storage.ts` implements `DocStorage` (+ etag variant)
- [ ] `history-domain.ts` uses shared `doc-ops` functions (not direct WASM calls)
- [ ] `sync-wasm.ts` refactored to provide `SyncWasm` adapter
- [ ] `get_name()`/`set_name()` in Rust crate + WASM exports
- [ ] `DocMeta.name` removed — name lives in Automerge doc, synced via `merge_docs()`
- [ ] Server extracts `name` from merged doc → updates `ModelManifest` on sync

### Multi-actor sync
- [ ] `automerge.bin` in R2 is server source of truth
- [ ] MCP ops update `automerge.bin` via `apply_op()` with optimistic concurrency (etag retry)
- [ ] `POST /api/models/{id}/sync` merges browser + server docs
- [ ] Optimistic concurrency via R2 etag on sync endpoint
- [ ] Browser syncs on connect (including first visit with empty doc) + debounced after local ops
- [ ] SSE broadcasts full op (with id/actorId), not raw command — no duplicate on sync
- [ ] Two actors (MCP + browser) can work on same model and see each other's changes

### Replay/snapshots
- [ ] `replay.ts`: `replayModel()` loads from `automerge.bin` (no D1)
- [ ] Replay caches scene.json with `replayOpsHash` (merge-safe, not array index)
- [ ] POST `/api/models/{id}/snapshot` endpoint works
- [ ] DELETE cascades to R2 (prefix-based deletion)

### Browser storage
- [ ] `storage-budget.ts` with 90%/95% thresholds
- [ ] `blob-store.ts` + `tier-manager.ts` consult budget
- [ ] `boot.ts` calls `persist()` + `refreshBudget()`
- [ ] Status bar shows `Storage: N%`

### Presence
- [ ] Server tracks actors per model (join/leave)
- [ ] SSE broadcasts `presence` events
- [ ] Browser shows `Editors: N` in status bar
- [ ] Browser persists actorId in localStorage
- [ ] MCP shows as "MCP Agent" in presence
- [ ] `GET /api/models/{id}/history` returns per-actor edit summary
- [ ] Actor names stored in model manifest
- [ ] History timeline shows actor name/color per op

### Wipe
- [ ] Local reset clears IDB only (server state survives, re-syncs on connect)
- [ ] Full delete clears IDB + calls DELETE on server (R2 cleaned)
- [ ] GUI shows two-option confirmation dialog

### Op type codegen
- [ ] `#[derive(JsonSchema)]` on `Op` struct — serde renames (actorId, type, groupId) reflected in output
- [ ] `cargo run --bin generate-schema` outputs valid JSON Schema with correct field names
- [ ] `gen-openapi.ts` generates `CadOperation` TypeScript type from Rust
- [ ] `history-domain.ts` + `doc-ops.ts` import generated type (no hand-written duplicate)
- [ ] `sync/system.mjs` DEV_BUILD + RELEASE_BUILD include schema gen
- [ ] `truck/system.mjs` watch paths include `systems/sync/crate/src`
- [ ] `bun run build:truck` produces both `cad-schema.json` and `sync-schema.json`
- [ ] `GET /api/sync/schema` serves `sync-schema.json` at runtime (discovery endpoint)

### Sync/Tiering boundary (Part H)
- [ ] `_replayScene()` split: `_computeReplayPlan()` stays in `history-domain.ts` (sync), `executeReplayPlan()` moves to `replay-executor.ts` (tiering)
- [ ] `ReplayPlan` interface: `{ snapshotJson, startIndex, ops, totalEnabledOps, source }`
- [ ] Snapshot validation via `_computeSnapshotValidFrom()` — O(ops) not O(ops × snapshots)
- [ ] `snapshotValidFrom` cached in DocMeta, invalidated on undo/redo/toggle
- [ ] Server stores snapshot in R2 (`scene.json` + `scene-meta.json`) — unified with Part C replay cache
- [ ] Fresh browser fetches server snapshot via GET before local replay
- [ ] `cad-scene-changed` CustomEvent emitted by sync after replay
- [ ] Tier manager listens for `cad-scene-changed`, runs `aggressivePass()` on remote changes
- [ ] 500ms debounce for remote-triggered replays (sync internal, up from 100ms)
- [ ] Tier manager loads warm sphere data from IDB on init (survives page reload)
- [ ] Sync never calls `resetTierState()` / `bulkPutObjects()` / `registerWarmObjects()` directly

### Tests
- [ ] `bun run test` — all 6 phases pass
- [ ] `bun run typecheck` — zero errors
- [ ] New tests: sync merge, replay from R2, delete cascade

### Manual
- [ ] MCP: add 5 objects → browser opens → sees all 5 (sync works)
- [ ] Browser: add 5 objects offline → go online → MCP replay shows them
- [ ] Both: MCP adds cube, browser adds sphere simultaneously → both visible after sync
- [ ] Status bar shows storage %
