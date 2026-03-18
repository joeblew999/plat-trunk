# ADR-0015: Sync Doc Structure — Flat vs Segmented

**Status**: Accepted  
**Date**: 2026-03-18

## Decision

The truck-sync Automerge doc uses a **flat operations list**, not a segmented per-plugin map.

```
ROOT
  operations: List[Map{ id, type, params_json, enabled, timestamp, actorId, groupId }]
  name: String
```

## Context

An earlier prototype used a segmented structure:

```
ROOT
  plugins: Map{
    "{plugin_id}": Map{ operations: List[...], name: String }
  }
```

## Reasons for flat structure

1. **truck CAD is the only consumer** — no other system needs ops in the same doc today
2. **Zero translation** — flat matches `CadOperation` in TypeScript exactly; segmented requires a mapping layer at the WASM boundary
3. **Simpler tests** — no plugin namespace to manage in Rust or TS tests
4. **Simpler WASM API** — raw bytes in / raw bytes out with no `plugin_id` routing

## If multi-system is needed in future

Two options:

**(a) Separate Automerge docs per system** — simplest; no changes to this crate. Each system (truck-cad, truck-mvt, ifc-lite) owns its own doc with its own R2 key. `SyncClient` takes a `modelId` that namespaces docs naturally.

**(b) Re-introduce the plugins map** — add `plugin_id: String` to `Op`, restore nested structure in `apply_op` / `get_ops`. Breaking change to the WASM API and all consumers.

**Option (a) is strongly preferred.** The CRDT model scales horizontally — more docs, not a bigger doc.
