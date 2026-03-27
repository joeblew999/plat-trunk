# automerge-partyserver — Plan

https://github.com/threepointone is the maintainer of PartyKit.

PartyKit: https://github.com/cloudflare/partykit

Fork: https://github.com/joeblew999/partykit
Branch: `feat/automerge-partyserver`
Package: `packages/automerge-partyserver/`

Fork is at /Users/apple/workspace/go/src/github.com/joeblew999/partykit

## Done

- [x] Fork PartyKit → `joeblew999/partykit`
- [x] Create `feat/automerge-partyserver` branch
- [x] Write server: `withAutomerge(Server)` mixin using automerge-repo
- [x] Write `DOStorageAdapter` — automerge-repo StorageAdapter for DO storage (128KB chunking)
- [x] Write `PartyKitNetworkAdapter` — automerge-repo NetworkAdapter for PartyKit WebSocket
- [x] Write client: `AutomergeProvider` with automerge-repo Repo + IndexedDB + BroadcastChannel
- [x] Write README with Yjs vs Automerge comparison
- [x] TypeScript compiles with 0 errors
- [x] PartyKit dev server runs locally (:1999)
- [x] 4/4 sync tests pass (connect, change, two-client convergence)

## The migration reality

PartyKit **replaces** the current system. It does not sit alongside it.

| | Current (@plat/sync) | PartyKit |
|--|---------------------|----------|
| **Transport** | HTTP POST + SSE | WebSocket |
| **Server state** | Stateless Worker (fresh each request) | Stateful DO (doc in memory) |
| **Sync protocol** | `merge_docs` (full doc every time) | `generateSyncMessage` (incremental) |
| **Storage** | R2 (single blob, full rewrite) | DO SQLite (incremental appends) |
| **Client** | SyncClient + adapters | AutomergeProvider + automerge-repo Repo |
| **Doc model** | Our custom Op struct in Automerge | Raw Automerge doc |
| **Cross-tab** | BroadcastChannel (custom) | BroadcastChannel (automerge-repo) |
| **Presence** | Custom PresenceState | Ephemeral messages |

**You can't "wire PartyKit into SyncClient."** They are different architectures.

## What consumers care about

Not transport. They care about the application API:

```typescript
await sync.addOp(op);
await sync.getOps();
await sync.getReplayOps();
await sync.undo(opId);
await sync.redo(opId);
sync.onRemoteOps = (ops) => {};
sync.setPresence({ cursor });
sync.onPresence = (actors) => {};
```

This API stays the same. The class behind it changes.

## Migration phases

### Phase 1 — SyncDoc (new client class)

Build `SyncDoc` — PartyKit-native replacement for `SyncClient`. Same application API, PartyKit internals:

```
ts/client/sync-doc.ts — NEW
  Wraps AutomergeProvider
  Exposes: addOp, getOps, undo, redo, presence
  Uses: WebSocket, IndexedDB (via automerge-repo), BroadcastChannel
```

`SyncClient` stays for now (deprecated). `SyncDoc` is the replacement.

### Phase 2 — Test SyncDoc

Use existing test structure:
- `test/partykit/` — already has working server + 4 passing tests
- Add SyncDoc API tests (same scenarios as `test/client/sync-client.test.ts`)
- Verify: addOp, undo, redo, two-actor convergence, presence

### Phase 3 — Switch truck

Replace truck's usage:
- `history-domain.ts`: `new SyncClient(...)` → `new SyncDoc(...)`
- Remove: `NullNetworkAdapter`, `makeSyncFetch`, `IdbStorageAdapter` (AutomergeProvider handles all)
- Remove: `worker-relay.ts` (WebSocket replaces SSE)
- Remove: truck's POST /sync route (PartyKit server handles sync)
- Keep: op recording, replay, MCP execution (truck-specific)

### Phase 4 — Deprecate old transport

- Mark `SyncClient`, `SyncWorker`, `createSyncHandler` as deprecated
- Keep working for systems that haven't migrated
- Eventually remove

### Phase 5 — Deploy

- Deploy PartyKit server (`npx partykit deploy` or self-hosted on CF)
- Point truck at deployed PartyKit host
- Remove truck's R2 sync (PartyKit DO storage replaces it)

## What stays vs what goes

| Component | Status |
|-----------|--------|
| `ts/shared/types.ts` (Operation type) | **Stays** |
| `ts/shared/wasm-adapter.ts` | **Stays** |
| `crate/` (Rust WASM for replay, op execution) | **Stays** |
| `ts/client/sync-doc.ts` | **NEW** (replaces sync-client.ts) |
| `ts/client/sync-client.ts` | **Deprecated** → sync-doc.ts |
| `ts/client/adapters.ts` | **Deprecated** → AutomergeProvider |
| `ts/worker/handler.ts` | **Deprecated** → PartyKit server |
| `ts/worker/sync-worker.ts` | **Deprecated** → PartyKit server |
| `test/partykit/` | **Stays** (primary test path) |
| `test/client/` | **Stays** (test SyncDoc API) |
| `test/worker/` | **Deprecated** |
| `test/integration/` | **Rewrite** for WebSocket |

## PartyKit packages that make the CAD system amazing

PartyKit isn't just WebSocket sync. It's a full platform. These packages solve problems we're currently hacking around:

### Must use

| Package | What it does | How it helps truck-cad |
|---------|-------------|----------------------|
| **partyserver** | Core DO + WebSocket server | Foundation — replaces our Worker + R2 + SSE |
| **partysocket** | Smart WebSocket client with reconnect | Replaces our custom reconnect logic |
| **partysub** | Pub/Sub with topic filtering | Replace SSE broadcast. Subscribe to `layer-3` changes only, not everything. Viewport-aware — only get updates for objects you can see. |
| **partysync** | State sync with SQLite persistence | Replace our custom SyncClient. Optimistic updates, local-first, automatic consistency. Per-entity state (each object is a synced entity). |
| **partysession** | One DO per user | Per-user state: active tool, color, viewport zoom, selection. Survives page reload without polluting the shared doc. |

### Should use

| Package | What it does | How it helps truck-cad |
|---------|-------------|----------------------|
| **partyfn** | Type-safe bidirectional RPC | Replace MCP's HTTP bridge. Client calls `server.addCube()` → type-safe, auto-complete, bidirectional. Server calls `client.replayScene()`. |
| **partywhen** | Durable task scheduler (cron, delay, alarm) | Auto-save snapshots every hour. Scheduled renders. "Remind team to review changes Monday 9am." Export STL every night. |
| **hono-party** | Hono middleware for PartyServer | We already use Hono. Clean integration: auth, routing, error handling on the PartyKit server. |
| **partyagent** | Autonomous AI agents on DOs | AI design assistant lives as a DO. Maintains context across sessions. Hands off between agents (geometry agent → material agent). |
| **partytracks** | WebRTC audio/video via CF SFU | Voice/video during collaborative design. See your collaborator while editing together. Cursor + voice = much better UX than cursor alone. |

### What this means for the API

Instead of our custom sync protocol, truck-cad would use:

```typescript
// ── State sync (partysync) ──────────────────
// Each design object is a synced entity
const scene = partysync.useEntity('scene', sceneSchema);
scene.update({ objects: [...scene.objects, newCube] });
// All collaborators see the update instantly

// ── Pub/Sub (partysub) ──────────────────────
// Subscribe to changes on specific layers
partysub.subscribe(`layer:${activeLayer}`, (update) => {
  renderUpdate(update);
});

// ── RPC (partyfn) ───────────────────────────
// Type-safe server calls (replaces MCP HTTP bridge)
const result = await server.addCube({ size: 1, position: [0, 0, 0] });
// Server can call back to client
server.onReplayNeeded(() => replayScene());

// ── Presence (partysession) ─────────────────
// Per-user state without polluting shared doc
session.setState({ tool: 'select', viewport: { zoom: 2.5, center: [10, 20] } });
// Other users see your cursor + tool + viewport

// ── Scheduling (partywhen) ──────────────────
// Automated tasks
partywhen.schedule('0 * * * *', () => exportSnapshot('r2://backups'));
partywhen.delay('5m', () => notifyTeam('Changes pending review'));

// ── AI Agent (partyagent) ───────────────────
// Design assistant as a persistent DO
const agent = partyagent.connect('design-assistant');
agent.send('Add a window to the north wall, 1.2m wide');
// Agent maintains context: knows the building, materials, constraints

// ── Video (partytracks) ─────────────────────
// Voice + video during collaboration
partytracks.joinRoom('design-session-42');
// Automatic hardware detection, fallback, recovery
```

### The bigger picture

We're not just replacing sync transport. We're replacing:
- **Custom sync** → partysync + automerge-partyserver
- **Custom SSE** → partysub (topic-based, filtered)
- **Custom MCP bridge** → partyfn (type-safe RPC)
- **Custom presence** → partysession
- **Custom AI integration** → partyagent
- **No video** → partytracks
- **No scheduling** → partywhen

Each of these is a package we'd have to build ourselves. PartyKit already has them, tested, on the same CF infrastructure.

## Open questions

1. **Op struct**: SyncClient wraps ops in our `Op` struct inside Automerge. SyncDoc uses raw Automerge docs. Keep the Op abstraction or go raw?

2. **Replay**: Truck replays ops through geometry WASM. Needs the op list. How do we structure the Automerge doc to support replay with raw docs?

3. **Server-side op execution**: MCP applies ops server-side. With PartyKit, the server is a DO. Can we run WASM inside a DO for server-direct execution?

4. **Deploy pipeline**: PartyKit has its own deploy (`npx partykit deploy`). How does this fit with our CF deploy pipeline (`cf-deploy.ts`)?

5. **R2 backup**: DO storage is primary. Do we still want R2 as cold backup?

6. **Offline**: automerge-repo + IndexedDB handles offline. But what about the "page closed while offline" case — does automerge-repo handle it, or do we need `loadAndSync` equivalent?
