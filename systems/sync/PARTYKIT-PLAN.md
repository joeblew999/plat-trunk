# automerge-partyserver — Plan

https://github.com/threepointone is the maintainer of PartyKit.

Fork: https://github.com/joeblew999/partykit
Branch: `feat/automerge-partyserver`
Package: `packages/automerge-partyserver/`

## Status

- [x] Fork PartyKit → `joeblew999/partykit`
- [x] Create `feat/automerge-partyserver` branch
- [x] Write server: `withAutomerge(Server)` mixin using automerge-repo `Repo` internally
- [x] Write `DOStorageAdapter` — automerge-repo StorageAdapter for DO storage (128KB chunking)
- [x] Write `PartyKitNetworkAdapter` — automerge-repo NetworkAdapter for PartyKit WebSocket
- [x] Write client: `AutomergeProvider` with automerge-repo `Repo` + IndexedDB + BroadcastChannel
- [x] Write README with Yjs vs Automerge comparison
- [x] Add build config (tsdown, same as y-partyserver)
- [x] TypeScript compiles with 0 errors
- [ ] Test with PartyKit dev server (needs `npx partykit dev`)
- [ ] Wire into `@plat/sync` as transport option
- [ ] Push PR to upstream (or keep as fork)

## Architecture

Uses automerge-repo internally — not a separate sync implementation:

```
Browser
  AutomergeProvider
    → automerge-repo Repo (sync protocol, DocHandle lifecycle)
    → PartyKitWebSocketAdapter (WebSocket to PartyKit)
    → IndexedDBStorageAdapter (local persistence)
    → BroadcastChannelNetworkAdapter (cross-tab sync)

PartyKit Server (Durable Object)
  withAutomerge(Server) mixin
    → automerge-repo Repo (server-side sync, peer tracking)
    → PartyKitNetworkAdapter (WebSocket ↔ automerge-repo messages)
    → DOStorageAdapter (DO storage with 128KB chunking)
    → WebSocket Hibernation (zero cost when idle)
```

## What automerge-repo gives us (vs building ourselves)

| Feature | Without automerge-repo | With automerge-repo |
|---------|----------------------|---------------------|
| Sync protocol | Raw merge_docs (full doc every time) | Incremental sync (only changes since last sync) |
| Sync state | None — fresh merge every request | Per-peer SyncState, encoded + persisted |
| Document lifecycle | Manual flags | DocHandle state machine (idle → loading → ready) |
| Peer tracking | None | Per-peer metadata (storageId, isEphemeral) |
| Storage format | Single blob | Snapshot + incremental chunks |
| Throttled saves | Manual debounce | Built-in (100ms configurable) |

## Next: wire into @plat/sync

```typescript
// @plat/sync/client — new transport option

import { AutomergeProvider } from 'automerge-partyserver/provider';

// SyncClient wraps AutomergeProvider
// Consumers see @plat/sync/client — they don't know PartyKit exists
class SyncClient {
  private provider: AutomergeProvider;

  constructor(opts) {
    if (opts.partyHost) {
      // PartyKit transport (WebSocket + automerge-repo)
      this.provider = new AutomergeProvider({
        host: opts.partyHost,
        room: opts.modelId,
      });
    } else {
      // Legacy transport (HTTP + merge_docs)
      // ... existing code
    }
  }
}
```
