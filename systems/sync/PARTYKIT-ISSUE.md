# GitHub Issue: `automerge-partyserver` — Automerge CRDT sync for PartyKit

> **Target repo:** `partykit/partykit`
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
| `src/server/index.ts` | `withAutomerge(Server)` mixin + `AutomergeServer` — WebSocket Hibernation, per-peer sync state |
| `src/server/storage.ts` | `DOStorageAdapter` — automerge-repo StorageAdapter for DO storage (128KB chunking) |
| `src/provider/index.ts` | `AutomergeProvider` — browser client with IndexedDB + BroadcastChannel + auto-reconnect |
| `README.md` | Docs with Yjs vs Automerge comparison and usage examples |
| `example/` | Minimal server + client example |

### Why automerge-repo (not raw Automerge)

The implementation uses `automerge-repo` internally, which gives us:

- **Incremental sync protocol** — only changes since last sync, not full doc every time
- **Per-peer SyncState** — encoded and persisted across reconnects
- **Document lifecycle** — DocHandle state machine (idle → loading → ready)
- **Throttled saves** — built-in debounce (configurable)
- **Storage adapters** — pluggable persistence (we provide `DOStorageAdapter` for Durable Objects)

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

### Client API

```typescript
import { AutomergeProvider } from 'automerge-partyserver/provider';

const provider = new AutomergeProvider({
  host: 'localhost:1999',
  room: 'my-doc',
  doc: Automerge.init(),
  onUpdate: (newDoc) => render(newDoc),
});

provider.change((doc) => { doc.title = 'Hello'; });
```

### How Yjs and Automerge complement each other

They solve different problems:

| | **Yjs** (`y-partyserver`) | **Automerge** (`automerge-partyserver`) |
|--|--|--|
| **Sweet spot** | Text editors, rich content | Application state, structured data |
| **Data model** | Text/Array/Map/XML types | JSON-like documents |
| **History** | GC'd by default | Full causal history preserved |
| **Sync** | Yjs sync protocol | automerge-repo incremental sync |
| **Core** | JavaScript | Rust → WASM |
| **Use cases** | ProseMirror, CodeMirror, TipTap | CAD, project state, offline-first apps, op logs |

A collaborative app might use **Yjs for the text fields** and **Automerge for the application state** — both over PartyKit.

### Status

- [x] Server mixin (`withAutomerge`) with WebSocket Hibernation
- [x] `DOStorageAdapter` with 128KB chunking for DO storage
- [x] `AutomergeProvider` client with IndexedDB + BroadcastChannel + auto-reconnect
- [x] Ephemeral messages (presence/cursors — not persisted)
- [x] Build config (tsdown, matching y-partyserver)
- [x] TypeScript compiles with 0 errors
- [x] README with comparison and usage docs
- [ ] Tests (want to align on test approach with you before writing)
- [ ] npm publish config

### Questions for you

1. **Does this align with what you had in mind for #97?** Happy to adjust the API surface.
2. **Test approach** — `y-partyserver` doesn't seem to have tests either. Should we add a test pattern for both packages? I can set that up.
3. **Package name** — `automerge-partyserver` mirrors `y-partyserver`. Good, or do you prefer something else?
4. **Scope for initial PR** — should I include the example in the first PR, or keep it server+client only?

### Motivation

We're building a local-first CAD platform ([plat-trunk](https://github.com/joeblew999/plat-trunk)) that uses Automerge for operation log sync. We need PartyKit as the sync transport and built this to fill the gap. Happy to maintain it as part of the PartyKit org.
