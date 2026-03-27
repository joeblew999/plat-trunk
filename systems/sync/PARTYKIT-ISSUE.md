# GitHub Issue: `automerge-partyserver` — Automerge CRDT sync for PartyKit

> **Target repo:** `cloudflare/partykit`
> **References:** #97 (automerge backend — opened by @threepointone, 2023)
> **Fork + branch:** `joeblew999/partykit` → `feat/automerge-partyserver`

---

## Title

`automerge-partyserver` — Automerge CRDT sync for PartyKit (implements #97)

## Body

Hey @threepointone — this implements #97 (automerge backend).

`automerge-partyserver` is the Automerge counterpart to `y-partyserver`. Same mixin pattern, same package structure, same DX — but backed by `automerge-repo` for incremental sync instead of Yjs.

### What's included

**`packages/automerge-partyserver/`** — mirrors `y-partyserver` layout:

| File | Purpose |
|------|---------|
| `src/server/index.ts` | `withAutomerge(Server)` mixin + `AutomergeServer` — per-peer sync state via automerge-repo |
| `src/server/storage.ts` | `DOStorageAdapter` — automerge-repo StorageAdapter for DO storage (128KB chunking) |
| `src/provider/index.ts` | `AutomergeProvider` — browser client with IndexedDB + BroadcastChannel + auto-reconnect |
| `README.md` | Docs with Yjs vs Automerge comparison and usage examples |
| `example/` | Minimal server + client example |
| `scripts/build.ts` | tsdown build (ESM, sourcemaps, .d.ts) |

### Server API

```typescript
import { withAutomerge, AutomergeServer } from 'automerge-partyserver';
import { Server } from 'partyserver';

// Option A: zero-config
export default AutomergeServer;

// Option B: customize
export default class MyServer extends withAutomerge(Server) {
  // override onLoad/onSave for custom persistence
}
```

Uses `partyserver`'s `Server` class (extends `DurableObject`). The mixin accesses `this.name` for room ID and `this.ctx.storage` for DO persistence.

### Client API

```typescript
import { AutomergeProvider } from 'automerge-partyserver/provider';

const provider = new AutomergeProvider({
  host: 'localhost:1999',
  room: 'my-doc',
});

const handle = provider.repo.create();
handle.change((doc) => { doc.title = 'Hello'; });
```

### Why automerge-repo (not raw Automerge)

- **Incremental sync protocol** — only changes since last sync, not full doc every time
- **Per-peer SyncState** — encoded and persisted across reconnects
- **Document lifecycle** — DocHandle state machine (idle → loading → ready)
- **Throttled saves** — built-in debounce (configurable)
- **Storage adapters** — pluggable persistence (`DOStorageAdapter` for Durable Objects)
- **CBOR message framing** — efficient binary encoding over WebSocket

### How Yjs and Automerge complement each other

| | **Yjs** (`y-partyserver`) | **Automerge** (`automerge-partyserver`) |
|--|--|--|
| **Sweet spot** | Text editors, rich content | Application state, structured data |
| **Data model** | Text/Array/Map/XML types | JSON-like documents |
| **History** | GC'd by default | Full causal history preserved |
| **Sync** | Yjs sync protocol | automerge-repo incremental sync |
| **Core** | JavaScript | Rust → WASM |
| **Use cases** | ProseMirror, CodeMirror, TipTap | CAD, project state, offline-first apps, op logs |

A collaborative app might use **Yjs for the text fields** and **Automerge for the application state** — both over PartyKit.

### Tested and proven

We've been running this in production development with real Cloudflare Workers, real Durable Objects, and real browsers. Test suite:

| Test | What |
|------|------|
| automerge-repo transport (4 tests) | Connect, handshake, single-peer sync, two-peer convergence |
| SyncDoc ops over PartyKit (8 tests) | Add op, undo, redo, group undo/redo, model name sync, two-peer convergence, replay |
| Ephemeral presence (3 tests) | HTTP status, 2-peer broadcast, 3-peer broadcast |
| Playwright browser E2E (4 tests) | Real Chromium: add op UI, two-peer converge, undo/redo sync, multi-op |

**19 tests total, all passing.** Running against real wrangler dev with real Durable Objects — no mocks. Screenshots committed as proof.

### Stack we use it with

- **Hono** for HTTP routing
- **hono-party** for PartyKit-style WebSocket routing to DOs
- **automerge-partyserver** for Automerge sync in DOs
- **partyserver** for WebSocket management
- 3 separate DO classes on separate routes (sync, ops, presence)

### Status

- [x] Server mixin (`withAutomerge`) with automerge-repo Repo
- [x] `DOStorageAdapter` with 128KB chunking for DO storage
- [x] `AutomergeProvider` client with IndexedDB + BroadcastChannel + auto-reconnect
- [x] Ephemeral messages (presence/cursors — not persisted)
- [x] CBOR message framing (join/peer handshake + sync messages)
- [x] Build config (tsdown, matching y-partyserver)
- [x] TypeScript compiles with 0 errors
- [x] README with comparison and usage docs
- [x] 19 integration + E2E tests passing (wrangler + Playwright)
- [x] Works with Hono + hono-party routing
- [ ] npm publish config (we use .tgz locally for now)

### Known issues

1. **`FinalizationRegistry`** — automerge-repo uses it, but miniflare/workerd doesn't have it in local dev. Requires a no-op polyfill for `wrangler dev`. Works fine in deployed CF Workers.

2. **`@automerge/automerge/slim`** — Vite has trouble resolving this conditional export from automerge-repo. Needs a `resolve.alias` in Vite config.

3. **Browser WASM init** — `@automerge/automerge` needs `initializeWasm()` called before use in browser. The provider should handle this automatically.

### Questions for you

1. **Does this align with what you had in mind for #97?** Happy to adjust the API surface.
2. **Package name** — `automerge-partyserver` mirrors `y-partyserver`. Good, or do you prefer something else?
3. **FinalizationRegistry polyfill** — should this be handled in partyserver/partykit, or left to consumers?

### Motivation

We're building a local-first CAD platform ([plat-trunk](https://github.com/joeblew999/plat-trunk)) that uses Automerge for operation log sync. We need PartyKit as the sync transport and built this to fill the gap. Happy to maintain it as part of the PartyKit org.
