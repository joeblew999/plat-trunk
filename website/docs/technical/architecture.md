# Architecture Overview

CAD/spatial platform. truck B-Rep kernel + Automerge CRDT + isomorphic API. Runs everywhere.

## Three Layers

| Layer | What | Tech |
|---|---|---|
| HTTP API | Isomorphic across all targets | Hono + Zod |
| GUI push | Server → client updates | Datastar + SSE (no websockets) |
| WASM boundary | JS/TS ↔ Go/Rust WASM | kkrpc |

## Four Target Classes

| Target | Rendering | WASM Transport | Build Tooling |
|---|---|---|---|
| Browser (web) | WebGPU (Tier 1) | SharedWorker | standard web |
| Native webviews | WebGPU (Tier 1) | Web Worker | goup-util |
| CF Workers | none | direct call | wrangler |
| Bare metal | none (or headless) | stdio | bun/node/deno |

Native webviews: WKWebView (macOS/iOS), WebView2 (Windows), WebKitGTK (Linux), Chromium WebView (Android).

## Rendering Tiers

- **Tier 1 (browser-native)**: truck B-Rep kernel + wgpu compiled to WASM, renders locally via WebGPU. Zero server cost. This is the product.
- **Tier 3 (server-rendered video)**: same Rust binary running natively on a GPU server, streaming H.264 video via WebRTC (LiveKit). Works on any device. Demo/fallback only.
- No Tier 2. Binary decision: can the browser handle WebGPU? Yes → Tier 1. No → Tier 3.

## State and Sync

- **Automerge**: CRDT op log for collaborative editing. Runs as WASM on browser + CF Workers + bare metal.
- **R2 + D1**: Persistent storage on Cloudflare.
- **NATS JetStream**: Real-time sync of Automerge ops between participants.

## What Runs Where

| Module | Browser | CF Workers | Bare Metal | GPU Server (Tier 3) |
|---|---|---|---|---|
| Automerge (Rust WASM) | Yes — CRDT state | Yes — sync/merge/R2 | Yes — sync | native Rust |
| truck (Rust WASM) | Yes — B-Rep + WebGPU | NO | maybe — headless | native Rust |
| Go business logic | Yes — validation | Yes — API logic | Yes | native Go |

truck does NOT ship to CF Workers. No rendering on CF.

## WASM Compilation

Two builds, not three. Browser + CF share `wasm32-unknown-unknown`. Bare metal gets `wasm32-wasip1`.

- Rust: cargo + wasm-bindgen + wasm-opt
- Go: TinyGo only (standard Go too large for CF/browser)
- Automerge: start with npm package, link Rust crates later if needed

## Key Decisions

- No websockets. Datastar + SSE for data push. WebRTC (LiveKit) only for Tier 3 video.
- kkrpc for all JS ↔ WASM communication. Same typed API, transport swapped per target.
- SharedWorker in browser (one WASM shared across tabs). Web Worker in native webviews.
- Design to CF Workers limits (3 MB compressed, 128 MB memory, 1s startup).
- Thin JS ↔ WASM boundary. Coarse operations. Typed arrays for bulk data. Lazy init.

## Related Docs

- [kkrpc](kkrpc.md) — WASM boundary layer, transports, compilation strategy
- [automerge](automerge.md) — CRDT sync, storage, state management
- [undo-redo](undo-redo.md) — Undo/redo and operation log
- [webgpu](webgpu.md) — GPU rendering architecture
- [gizmo](gizmo.md) — Direct manipulation (click-select, drag-transform)
- [direct-vs-parametric](direct-vs-parametric.md) — Parametric modeling with ezpz constraint solver
