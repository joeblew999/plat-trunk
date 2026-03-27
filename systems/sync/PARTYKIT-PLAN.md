# automerge-partyserver — Plan

https://github.com/threepointone is the maintainer of PartyKit.

Fork: https://github.com/joeblew999/partykit
Branch: `feat/automerge-partyserver`
Package: `packages/automerge-partyserver/`

## What it is

`automerge-partyserver` — Automerge CRDT sync for PartyKit, sibling to `y-partyserver`.

Follows the same pattern: `withAutomerge(Server)` mixin, like `withYjs(Server)`.

## Structure

```
packages/automerge-partyserver/
  src/
    server/index.ts     withAutomerge mixin + AutomergeServer
    provider/index.ts   AutomergeProvider (browser WebSocket client)
  package.json
  README.md
```

## Server pattern

```typescript
import { withAutomerge } from 'automerge-partyserver';
import { Server } from 'partyserver';

export default class MyServer extends withAutomerge(Server) {
  async onLoad() {
    return await this.room.storage.get('doc') as Uint8Array | undefined;
  }
  async onSave(bytes: Uint8Array) {
    await this.room.storage.put('doc', bytes);
  }
}
```

What it handles:
- WebSocket sync protocol (Automerge `generateSyncMessage`/`receiveSyncMessage`)
- Per-connection sync state (stored in `conn.setState()` — survives hibernation)
- Debounced persistence via `onSave` callback
- Ephemeral messages (presence/cursor)
- Re-sync after hibernation wake-up

## Client pattern

```typescript
import { AutomergeProvider } from 'automerge-partyserver/provider';

const provider = new AutomergeProvider({
  host: 'localhost:1999',
  room: modelId,
  doc: Automerge.init(),
  onUpdate: (newDoc) => { doc = newDoc; render(); },
});

provider.change((doc) => { doc.items.push({ name: 'Widget' }); });
```

What it handles:
- WebSocket connection + reconnect with exponential backoff
- Automerge sync protocol (client side)
- BroadcastChannel for cross-tab sync
- Ephemeral messages (send/receive)

## How @plat/sync uses it

```typescript
// @plat/sync/client wraps AutomergeProvider
// Consumers see @plat/sync/client — they don't know PartyKit exists

import { AutomergeProvider } from 'automerge-partyserver/provider';

// Inside SyncClient — new WebSocket transport option
class SyncClient {
  private provider: AutomergeProvider;

  constructor(opts) {
    this.provider = new AutomergeProvider({
      host: opts.partyHost,
      room: opts.modelId,
      doc: Automerge.init(),
      onUpdate: (doc) => this._handleRemoteUpdate(doc),
    });
  }

  async addOp(op) {
    this.provider.change((doc) => {
      doc.operations.push(op);
    });
  }
}
```

## Status

- [x] Fork PartyKit → `joeblew999/partykit`
- [x] Create `feat/automerge-partyserver` branch
- [x] Write `server/index.ts` — `withAutomerge` mixin
- [x] Write `provider/index.ts` — `AutomergeProvider` client
- [x] Write README
- [ ] Add tsconfig + build config
- [ ] Test with PartyKit dev server
- [ ] Wire into `@plat/sync` as transport option
- [ ] Push branch + open PR (to own fork, or upstream)
