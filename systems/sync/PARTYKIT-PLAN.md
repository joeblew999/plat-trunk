# automerge-partykit — Plan

Fork PartyKit, add `packages/automerge-partykit` as a sibling to `packages/y-partykit`.

## How y-partykit works (the pattern to follow)

y-partykit has 4 files:

**Server** (`index.ts` — 595 lines):
- `onConnect(conn, room, opts)` — the main entry point. Consumer calls this from their PartyKit server's `onConnect`.
- Creates a `WSSharedDoc` (extends Yjs `YDoc`) per room — one doc per PartyKit room.
- On WebSocket message: decode → run Yjs sync protocol → broadcast updates to other connections.
- On close: clean up awareness, compact storage if last client disconnects.
- Persistence: `bindState()` loads from DO storage, listens for updates, stores each update incrementally.

**Storage** (`storage.ts` — 542 lines):
- `YPartyKitStorage` wraps `Party.Storage` (DO storage API).
- Incremental update log: `["v1", docName, "update", clock]` → bytes.
- State vector: `["v1_sv", docName]` → bytes.
- Compaction: merge all updates into one when count/bytes exceed limits.
- 128KB chunking for large values (DO storage key size limit).

**Client provider** (`provider.ts`):
- `WebsocketProvider` — connects to PartyKit WebSocket, runs Yjs sync protocol.
- BroadcastChannel for cross-tab sync.
- Awareness (cursor/presence) protocol.
- Reconnect with exponential backoff.

**Chunking** (`chunking.ts`):
- Handles messages larger than WebSocket frame size.

## What automerge-partykit needs

Same pattern, different CRDT:

### Server (`index.ts`)

```typescript
import type * as Party from 'partykit/server';
import { next as Automerge } from '@automerge/automerge';
import { AutomergePartyKitStorage } from './storage';

export async function onConnect(
  conn: Party.Connection,
  room: Party.Room,
  opts: AutomergePartyKitOptions
) {
  // Get or create doc for this room
  const doc = await getDoc(room, opts);

  // Track connection
  doc.conns.add(conn);

  // On message: Automerge sync protocol
  conn.addEventListener('message', (event) => {
    const msg = new Uint8Array(event.data);
    // receiveSyncMessage → update doc → generateSyncMessage → reply
    const [newDoc, newSyncState, reply] = Automerge.receiveSyncMessage(
      doc.automergeDoc,
      doc.syncStates.get(conn),
      msg
    );
    doc.automergeDoc = newDoc;
    doc.syncStates.set(conn, newSyncState);
    if (reply) conn.send(reply);

    // Broadcast to other connections
    for (const other of doc.conns) {
      if (other === conn) continue;
      const [, newState, syncMsg] = Automerge.generateSyncMessage(
        doc.automergeDoc,
        doc.syncStates.get(other)
      );
      doc.syncStates.set(other, newState);
      if (syncMsg) other.send(syncMsg);
    }

    // Persist
    doc.storage.storeUpdate(room.id, Automerge.saveIncremental(doc.automergeDoc));
  });

  // On connect: send initial sync message
  const [newState, syncMsg] = Automerge.generateSyncMessage(
    doc.automergeDoc,
    Automerge.initSyncState()
  );
  doc.syncStates.set(conn, newState);
  if (syncMsg) conn.send(syncMsg);

  // On close: clean up, compact if last connection
  conn.addEventListener('close', () => {
    doc.conns.delete(conn);
    doc.syncStates.delete(conn);
    if (doc.conns.size === 0) {
      doc.storage.compact(room.id);
    }
  });
}
```

### Storage (`storage.ts`)

Port y-partykit's `YPartyKitStorage` but for Automerge:
- Same key scheme: `["v1", docName, "update", clock]`
- Same chunking (128KB)
- Same compaction (merge updates when count/bytes exceed limits)
- `getDoc()` loads all updates, applies them to an Automerge doc
- `storeUpdate()` appends an incremental save
- `compact()` saves full doc, clears update log

### Client (`provider.ts`)

Automerge equivalent of Yjs WebsocketProvider:
- Connects to PartyKit WebSocket
- Runs Automerge sync protocol (`generateSyncMessage`/`receiveSyncMessage`)
- BroadcastChannel for cross-tab
- Presence/awareness (map Automerge ephemeral messages to presence)
- Reconnect with backoff

### Mapping Yjs → Automerge

| Yjs (y-partykit) | Automerge (automerge-partykit) |
|-------------------|-------------------------------|
| `YDoc` | `Automerge.Doc` |
| `applyUpdate(doc, update)` | `Automerge.loadIncremental(doc, changes)` |
| `encodeStateAsUpdate(doc)` | `Automerge.save(doc)` |
| `encodeStateVector(doc)` | `Automerge.getHeads(doc)` |
| `syncProtocol.writeSyncStep1` | `Automerge.generateSyncMessage` |
| `syncProtocol.readSyncStep2` | `Automerge.receiveSyncMessage` |
| `awareness.setLocalState` | Ephemeral messages or custom presence |
| `doc.on('update', handler)` | `Automerge.getLastLocalChange(doc)` after mutation |
| `doc.gc` | Not needed — Automerge compacts differently |

## Package structure

```
packages/automerge-partykit/
  src/
    index.ts          Server: onConnect, getDoc
    storage.ts        DO storage: incremental updates, compaction, chunking
    provider.ts       Client: WebSocket sync, BroadcastChannel, reconnect
    chunking.ts       Message chunking (copy from y-partykit)
  package.json
  tsconfig.json
  README.md
```

## Dependencies

```json
{
  "dependencies": {
    "@automerge/automerge": "^3.0.0",
    "partykit": "workspace:*",
    "partysocket": "workspace:*"
  }
}
```

Uses `@automerge/automerge` (the npm package which IS the Rust WASM). No separate Rust build needed.

## How @plat/sync uses it

```typescript
// Server (PartyKit)
import { onConnect } from 'automerge-partykit';

export default class SyncServer implements Party.Server {
  onConnect(conn: Party.Connection) {
    return onConnect(conn, this.room, { persist: { mode: 'history' } });
  }
}
```

```typescript
// Browser (via @plat/sync/client)
import { AutomergeProvider } from 'automerge-partykit/provider';

const provider = new AutomergeProvider(doc, {
  host: 'my-partykit-project.partykit.dev',
  room: modelId,
});
```

Our `@plat/sync/client` SyncClient wraps the provider. Consumers see `@plat/sync/*` — they don't know PartyKit or automerge-partykit exists.

## Steps

1. Fork `github.com/cloudflare/partykit` → `github.com/joeblew999/partykit`
2. Create `packages/automerge-partykit/`
3. Port `storage.ts` from y-partykit (change Yjs calls → Automerge)
4. Write `index.ts` server (Automerge sync protocol over WebSocket)
5. Write `provider.ts` client (WebSocket + BroadcastChannel + reconnect)
6. Test with a minimal example
7. Wire into `@plat/sync` as the new transport
