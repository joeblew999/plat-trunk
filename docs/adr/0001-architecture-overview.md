# [ADR-001] Architecture Overview

## Status

**Implemented** (core layers shipped).

## Summary

CAD/spatial platform. truck B-Rep kernel (Rust/WASM) + Automerge CRDT + Hono isomorphic API. Runs in browser and on Cloudflare Workers.

## Three Layers

| Layer | What | Tech |
|-------|------|------|
| HTTP API | Isomorphic across all targets | Hono + Zod + Zod-OpenAPI |
| GUI push | Server → client updates | Datastar + SSE (no websockets) |
| WASM boundary | JS ↔ Rust WASM | Direct `executeWasm()` via wasm-bindgen |

The WASM boundary uses direct `wasm-bindgen` calls — `JSON.parse(ctrl.execute(type, JSON.stringify(params)))`. No RPC framework needed. See [ADR-006](0006-wasm-boundary.md) for history.

## Target Classes

| Target | Rendering | WASM | Status |
|--------|-----------|------|--------|
| Browser (web) | WebGPU (Tier 1) | Main thread | **Shipped** |
| CF Workers | None (relay only) | N/A | **Shipped** |
| Native webviews | WebGPU (Tier 1) | Web Worker | Future |
| Bare metal | Headless | stdio | Future |

## Rendering Tiers

- **Tier 1 (browser-native)**: truck B-Rep kernel + wgpu compiled to WASM, renders locally via WebGPU. Zero server cost. **This is the product.**
- **Tier 3 (server-rendered video)**: Same Rust binary running natively on a GPU server, streaming H.264 video via WebRTC. Demo/insurance only. See [ADR-007](0007-webgpu-rendering.md).
- No Tier 2. Binary decision: can the browser handle WebGPU? Yes → Tier 1. No → Tier 3.

## State and Sync

- **Automerge**: CRDT op log for collaborative editing. Runs as JS WASM in browser (vendored bundle).
- **BroadcastChannel**: Cross-tab sync (free, built into browser).
- **CF Worker SSE relay**: Real-time command relay between browser tabs and API clients.
- **R2**: Persistent document storage on Cloudflare (future).

See [ADR-003](0003-automerge-collaboration.md) for sync decisions, [ADR-008](0008-undo-redo.md) for undo/redo.

## What Runs Where

| Module | Browser | CF Workers |
|--------|---------|------------|
| truck (Rust WASM) | Yes — B-Rep + WebGPU rendering | No |
| Automerge (JS WASM) | Yes — CRDT op log | No (future) |
| Hono routes | Yes — fetch intercept (local mode) | Yes — SSE relay + MCP |
| Datastar | Yes — reactive UI signals | No |

truck does NOT ship to CF Workers. The Worker is a stateless command relay — it queues commands via SSE, the browser executes them in WASM.

## Key Decisions

- No websockets. Datastar + SSE for data push.
- Direct `wasm-bindgen` for JS ↔ WASM — no RPC framework needed for single-module architecture.
- Schema-driven API: Rust structs → `cad-schema.json` → Worker Zod/MCP/OpenAPI. See [ADR-005](0005-schema-driven-unified-api.md).
- Design to CF Workers limits (3 MB compressed, 128 MB memory). Worker only runs Hono routes, not WASM.
- Thin WASM boundary: coarse `execute(type, json)` operations, JSON for params, typed arrays for bulk mesh data.

## ADR Index

See [README.md](README.md) for the full index with status markers.
