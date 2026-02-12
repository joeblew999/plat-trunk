# architecture overview

CAD/spatial platform. truck B-Rep kernel + automerge CRDT + isomorphic API. runs everywhere.

## three layers

| layer | what | tech |
|-------|------|------|
| HTTP API | isomorphic across all targets | hono + zod |
| GUI push | server → client updates | datastar + sse (no websockets) |
| WASM boundary | JS/TS ↔ Go/Rust wasm | kkrpc |

see [kkrpc.md](kkrpc.md) for full WASM strategy, compilation targets, zero-copy rules.

## four target classes

| target | rendering | WASM transport | build tooling |
|--------|-----------|----------------|---------------|
| browser (web) | WebGPU (Tier 1) | SharedWorker | standard web |
| native webviews | WebGPU (Tier 1) | Web Worker | goup-util |
| CF workers | none | direct call | wrangler |
| bare metal | none (or headless) | stdio | bun/node/deno |

native webviews: WKWebView (macOS/iOS), WebView2 (Windows), WebKitGTK (Linux), Chromium WebView (Android).
see https://github.com/joeblew999/goup-util for native webview build tooling.

## rendering tiers

- **Tier 1 (browser-native)**: truck B-Rep kernel + wgpu compiled to WASM, renders locally via WebGPU. zero server cost. this is the product.
- **Tier 3 (server-rendered video)**: same Rust binary running natively on a GPU server, streaming H.264 video via WebRTC (LiveKit). works on any device. demo/insurance only.
- no Tier 2. binary decision: can the browser handle WebGPU? yes → Tier 1. no → Tier 3.

see [webgpu.md](webgpu.md) for full Tier 3 spec.

## state and sync

- **automerge**: CRDT op log for collaborative editing. runs as WASM on browser + CF workers + bare metal.
- **R2 + D1**: persistent storage on Cloudflare.
- **NATS JetStream**: real-time sync of automerge ops between participants.

see [automerge.md](automerge.md) for sync decisions.

## what runs where

| module | browser | CF workers | bare metal | GPU server (Tier 3) |
|--------|---------|------------|------------|---------------------|
| automerge (rust wasm) | yes — CRDT state | yes — sync/merge/R2 | yes — sync | native rust |
| truck (rust wasm) | yes — B-Rep + WebGPU | NO | maybe — headless | native rust |
| go business logic | yes — validation | yes — API logic | yes | native go |

truck does NOT ship to CF workers. no rendering on CF.

## WASM compilation

two builds, not three. browser + CF share `wasm32-unknown-unknown`. bare metal gets `wasm32-wasip1`.

- rust: cargo + wasm-bindgen + wasm-opt. wasm-pack is dead.
- go: tinygo only. standard go is too fat for CF/browser.
- automerge: start with npm package (get Repo ecosystem). link rust crates later if boundary hurts.

see [kkrpc.md](kkrpc.md) for full compilation strategy, build commands, optimization flags.

## key decisions

- no websockets. datastar + sse for data push. WebRTC (LiveKit) only for Tier 3 video.
- kkrpc for all JS ↔ WASM communication. same typed API, transport swapped per target.
- SharedWorker in browser (one wasm shared across tabs). Web Worker in native webviews.
- design to CF Workers limits (3 MB compressed, 128 MB memory, 1s startup). everywhere else is free.
- thin JS ↔ WASM boundary. coarse operations. typed arrays for bulk data. lazy init.

## ADR index

- [kkrpc.md](kkrpc.md) — WASM boundary layer, transports, compilation strategy, zero-copy rules
- [automerge.md](automerge.md) — CRDT sync, storage, state management
- [truck.md](truck.md) — Rust B-Rep CAD kernel
- [webgpu.md](webgpu.md) — GPU rendering architecture, Tier 1 + Tier 3
