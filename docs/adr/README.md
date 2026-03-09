# Architecture Decision Records

## Implementation Order

ADRs must be implemented in this order — each depends on the one before it.

| Order | ADR | What | Why this order |
|-------|-----|------|----------------|
| 1 | [ADR-0001](0001-multi-actor-sync.md) | Multi-actor sync — R2 automerge, browser-server sync, server-direct MCP | Foundational plumbing. Sync must work before splitting workers further. |
| 2 | [ADR-0002](0002-headless-as-core-engine.md) | GeometryStore — single source of truth for all CAD operations | Deduplicates geometry logic, fixes server gaps, separates geometry from rendering. Unblocks browser Web Workers. |
| 3 | [ADR-0004](0004-wasm-boundary-contracts.md) | WASM boundary contracts — schema-driven codegen for multi-target adapters | Phase 0 done (codegen chain, contract tests). Phase 1+ needs ADR-0002 for browser Web Worker split. |

## Key constraint

**Browser Web Workers blocked until ADR-0002.** The truck-geometry WASM module owns both geometry AND WebGPU rendering on the main thread. ADR-0002's GeometryStore separates them, enabling the browser Web Worker split in ADR-0004 Phase 1+. CF Worker splitting is not blocked — headless mode already separates geometry from rendering.

## Status

| ADR | Status |
|-----|--------|
| [ADR-0001](0001-multi-actor-sync.md) | Implemented |
| [ADR-0002](0002-headless-as-core-engine.md) | Proposed |
| [ADR-0003](0003-format-workers.md) | Superseded by ADR-0004 |
| [ADR-0004](0004-wasm-boundary-contracts.md) | Phase 0 Implemented |
| [ADR-0005](0005-scene-graph-with-assembly-hierarchy.md) | Proposed |
| [ADR-0006](0006-worker-performance.md) | Proposed |
