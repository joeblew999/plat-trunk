# sync — TODO

The sync system is complete and tested independently.
Truck is a consumer — its issues are truck's, not sync's.

## Future truck cleanup (when truck is fixed)

These are truck refactors, not sync work:

- **worker-relay.ts** — could use `SyncRelay` for sync events, keep `cad-command` handler
- **sync-wasm.generated.ts** — could use `createWasmAdapter` for the sync subset
- **POST /sync** — already uses `mergeWithRetry` from sync ✓

## Not sync

- ADR-0001 Part C — Replay with snapshots (truck geometry)
- ADR-0001 Part H — Tiering boundary (truck geometry)

## https://github.com/automerge/automerge-repo

Have they gotten things more right then we have ?  