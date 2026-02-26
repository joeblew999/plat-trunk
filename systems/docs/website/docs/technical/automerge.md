# Automerge — Collaborative Editing

CRDT-based state sync for collaborative CAD editing across browser, Cloudflare Workers, and bare metal.

## Why Automerge

We have state sync issues across three deployment contexts (browser, CF Workers, bare metal). The end data lives on D1 and R2, but operations happen in all 3 contexts. Automerge provides:

- **Conflict-free merging** — concurrent edits from multiple users merge automatically
- **Offline-first** — works without network, syncs when reconnected
- **Operation log** — every change is recorded, enabling undo/redo and audit trails

## How It's Used

### Operation Log

All CAD operations are recorded as Automerge operations:

| Operation | Data |
|---|---|
| `add` | `{ type, id, params }` |
| `translate` | `{ objectId, dx, dy, dz }` |
| `boolean` | `{ op, idA, idB, resultId }` |
| `delete` | `{ objectId }` |
| `clear` | `{}` |

### Document Structure

Each scene is an Automerge document containing:
- Operation log (ordered list of ops)
- Scene state (derived from replaying ops)

### Sync

- **Cross-tab**: BroadcastChannel adapter (same browser)
- **Cross-device**: WebSocket adapter via sync server
- **Storage**: IndexedDB in browser, R2/D1 on Cloudflare

## References

- https://automerge.org
- https://automerge.org/docs/guides/using-automerge-with-llms/
- LLM reference: `docs/llms/automerge-llms-full.txt` (166KB)
