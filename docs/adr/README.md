# Architecture Decision Records

## Implementation Order

ADRs must be implemented in this order — each depends on the one before it.

| Order | ADR | What | Why this order |
|-------|-----|------|----------------|
| 1 | [ADR-0002](0002-headless-as-core-engine.md) | GeometryStore — single source of truth for all CAD operations | Pure internal refactor, no new infra. Fixes server gaps. Produces a stable engine. |
| 2 | [ADR-0001](0001-multi-actor-sync.md) | Multi-actor sync — R2 automerge, browser-server sync, server-direct MCP | Builds on HeadlessController (stabilized by ADR-0002). Needs all commands working on server. |
| 3 | [ADR-0003](0003-format-workers.md) | Format workers — stateless format handlers via CF RPC service bindings | Server-only splitting when 3MB limit approaches. Cuts along seams created by ADR-0002. Not urgent — split when needed. |

## Key constraint

**Browser is never split.** Browser WASM stays as one blob — no equivalent of CF service bindings, and rendering sync needs direct access to GPU state + GeometryStore simultaneously. Splitting only applies to server-side Cloudflare Workers and Rust native builds.

## Status

| ADR | Status |
|-----|--------|
| [ADR-0001](0001-multi-actor-sync.md) | Proposed |
| [ADR-0002](0002-headless-as-core-engine.md) | Proposed |
| [ADR-0003](0003-format-workers.md) | Proposed (future — implement when 3MB limit approaches) |
