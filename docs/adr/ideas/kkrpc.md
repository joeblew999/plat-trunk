# kkrpc

https://docs.kkrpc.kunkun.sh has LLM and skills for claude !

https://github.com/kunkunsh/kkrpc

## why ?

we need to run in browser, on cloudflare workers and on bare metal.

we also run inside native webviews (WKWebView, WebView2, WebKitGTK) via goup-util.

we need to be able to add golang and rust as wasm to all targets.

we need to be isomorphic.

## targets

- browser (web) - full browser APIs
- native webviews - WKWebView (macOS/iOS), WebView2 (Windows), WebKitGTK (Linux), Chromium WebView (Android)
- cloudflare workers - V8 isolates
- bare metal - server (bun/node/deno)

see https://github.com/joeblew999/goup-util for native webview build tooling.

## how ?

hono + zod = isomorphic HTTP API for all targets.

datastar + sse = push UI updates when API is called. no websockets.

kkrpc = typed bridge between JS/TS and WASM (go + rust) on all targets.

## what kkrpc does

one typed interface definition for calling into wasm modules everywhere.

transport per target:
- browser - SharedWorker (one wasm shared across tabs, MessagePort)
- native webviews - Web Worker (one wasm per webview, postMessage)
- cf workers - direct call (wasm in same isolate)
- bare metal - stdio (wasm via wasmtime/wasmer or native process)

also: nats transport for typed rpc over our existing nats infrastructure.

## browser vs native webview

SharedWorker only works in browsers. native webviews do NOT support SharedWorker.

evidence (checked 2026-02-12):
- https://caniwebview.com/features/mdn-sharedworker/ — WKWebView: no, WebView2: no, Android WebView: no
- https://caniwebview.com/features/mdn-worker/ — Web Worker (dedicated): supported on all webviews
- https://bugs.webkit.org/show_bug.cgi?id=149850 — WebKit bug "Reinstate support for SharedWorkers" (still open)
- https://caniuse.com/sharedworkers — browser support: Chrome, Firefox, Safari 16+

- browser: SharedWorker = one wasm shared across all tabs
- native webviews: Web Worker = one wasm per app (only one webview anyway)
- both use kkrpc with same typed API, different transport

## wasm compilation strategy

two builds, not three. browser + CF workers share the same .wasm binary. bare metal is a separate build.

### rust

target `wasm32-unknown-unknown` for browser + CF. same .wasm file, different JS glue.
target `wasm32-wasip1` for bare metal (wasmtime/wasmer). different ABI, separate build.

build:
```
cargo build --target wasm32-unknown-unknown --release   # browser + CF
wasm-bindgen --target web --out-dir pkg/ ...            # JS glue
wasm-opt -O4 pkg/my_crate_bg.wasm -o pkg/my_crate_bg.wasm

cargo build --target wasm32-wasip1 --release            # bare metal
```

this is what automerge does: https://github.com/automerge/automerge/tree/main/rust/automerge-wasm
this is what truck does: https://github.com/ricosjp/truck/tree/master/truck-js

wasm-pack is dead (rustwasm org sunset july 2025). use cargo + wasm-bindgen + wasm-opt directly.
- https://blog.rust-lang.org/inside-rust/2025/07/21/sunsetting-the-rustwasm-github-org/
- https://nickb.dev/blog/life-after-wasm-pack-an-opinionated-deconstruction/

### go

tinygo only. standard go wasm is 5-20 MB — too fat for CF free tier (3 MB compressed) and too slow to download in browser.

tinygo produces 50 KB - 2 MB for real business logic. fits CF free tier. fast browser load.

```
tinygo build -target=wasm -no-debug -o app.wasm .       # browser + CF
tinygo build -target=wasip1 -no-debug -o app.wasm .     # bare metal
```

CF workers: use syumai/workers (https://github.com/syumai/workers) — community lib, no official CF Go SDK.

standard go only if you absolutely need full reflect/goroutines. then you need CF paid plan.

### what runs where

not everything runs everywhere. don't ship what you don't need.

| module | browser | CF workers | bare metal | GPU server (tier 3) |
|--------|---------|------------|------------|---------------------|
| automerge (rust wasm) | yes — CRDT state | yes — sync/merge/R2 | yes — sync | native rust (not wasm) |
| truck (rust wasm) | yes — B-Rep + WebGPU | NO | maybe — headless | native rust (not wasm) |
| go business logic | yes — validation | yes — API logic | yes | native go |

truck does NOT ship to CF workers. no rendering on CF. automerge + go logic do.

this means CF workers only loads automerge wasm + go wasm. browser loads all three. size budgets are per-target, not global.

## zero-copy and fast RPC

this is where performance lives or dies.

### the boundary problem

every call from JS → WASM copies data. every return copies data back. for a CAD kernel doing thousands of operations, this is the bottleneck — not the computation itself.

### rule 1: automerge — start with npm, link later if needed

automerge ships as an npm package (`@automerge/automerge`) with WASM bundled inside. it comes with Automerge Repo — storage adapters (IndexedDB, filesystem), network sync protocol, React hooks, DocHandles.
- https://github.com/automerge/automerge
- https://automerge.org/docs/reference/repositories/

two options:

**option A (start here): use the npm package as-is.**
automerge = separate WASM module managed by JS. truck = separate WASM module. data flows JS ↔ automerge WASM, JS ↔ truck WASM. two boundary crossings to get state into truck.
- pro: get Automerge Repo for free (storage, sync, React hooks). easy upstream updates.
- con: serialization boundary between automerge and truck.
- reality: the data flowing automerge → truck is model parameters (feature tree, constraints). that's small and infrequent (on edits). the heavy path is truck → WebGPU (mesh vertices), which stays inside WASM regardless. the boundary cost is negligible for this data shape.

**option B (optimize later): link rust crates into one wasm.**
automerge rust crate + truck rust crate compiled into ONE wasm module with shared linear memory. no serialization between them. pointer to pointer, zero copy.
- pro: zero-copy. one module.
- con: lose Automerge Repo JS ecosystem. must build own sync/storage in Rust. more maintenance.
- when: only if profiling shows the automerge ↔ truck boundary is actually a bottleneck.

```
option A:                                option B:
[automerge.wasm] ←JS→ [truck.wasm]      [single .wasm module]
  (npm package)          (our build)       automerge + truck (shared memory)
  + Repo (storage, sync, hooks)            + custom sync/storage in Rust
```

decision: **start with option A.** the kkrpc interface stays the same either way, so switching to B later is a refactor not a rewrite.

do NOT use the WASM Component Model for composing these. it uses shared-nothing architecture — every call between components copies data through the Canonical ABI. worse than option A.
- https://component-model.bytecodealliance.org/design/components.html

### rule 2: keep the JS ↔ WASM boundary thin

design the kkrpc interface so JS calls into WASM infrequently with coarse operations, not thousands of fine-grained calls.

bad: `for each face: wasm.evaluateFace(id)` — thousands of boundary crossings
good: `wasm.evaluateModel(docHandle)` — one call, WASM does the loop internally

return handles/IDs to JS, not full data. let WASM own the data in its linear memory.

### rule 3: typed ArrayBuffer for bulk data

when you must move large data across the boundary (mesh vertices for WebGPU, document snapshots for sync), use typed arrays that map directly to WASM linear memory. no JSON serialization.

wasm-bindgen supports this: `#[wasm_bindgen] fn get_mesh_vertices() -> Vec<f32>` copies once into a Float32Array. feed that directly to WebGPU buffers.

### rule 4: lazy init

don't instantiate everything on module load. CF has 1 second. browser users are waiting.

- compile module at deploy time on CF (wrangler handles this)
- use WebAssembly.compileStreaming in browser (download + compile in parallel)
- defer heavy init (loading automerge docs, building B-Rep caches) to first call
- on bare metal: wasmtime/wasmer can AOT precompile, startup is near-instant

### rule 5: memory layout

WASM linear memory starts at 0 and grows. plan for it:

- CF workers: 128 MB total shared between JS heap + ALL wasm modules. budget carefully.
- browser: 4 GB theoretical max per module. practical limit is device RAM.
- bare metal: configurable. set it high.

for the combined automerge+truck module in browser: automerge doc + B-Rep topology + tessellated mesh all live in one linear memory. no copies between them. this is the whole point of linking them together.

## CF workers limits

https://developers.cloudflare.com/workers/platform/limits/

- module size: 3 MB compressed (free), 10 MB compressed (paid)
- memory: 128 MB per isolate (shared between JS + WASM)
- cpu: 10 ms (free), 5 min (paid)
- startup: must init within 1 second

CF only runs automerge wasm + go business logic wasm. no truck. this keeps module size and memory manageable.

## browser constraints

- download size = user wait time. combined automerge+truck wasm will be the largest module.
- use WebAssembly.compileStreaming for parallel download + compile
- cache the .wasm in a Service Worker or Cache API — subsequent loads are instant
- serve with brotli compression (typically 50%+ reduction on .wasm)

## bare metal

- fewest constraints. more memory, more cpu.
- wasmtime/wasmer can AOT precompile — near-native startup
- target wasm32-wasip1 (WASI preview 1). wasip2 (Component Model) is not needed — we link rust modules together, not compose components.
- wazero (pure Go runtime, zero CGO) for embedding wasm in Go host apps: https://wazero.io/

## build optimization

rust:
```toml
[profile.release]
opt-level = "z"       # optimize for size
lto = true            # link-time optimization (critical for cross-crate inlining)
codegen-units = 1     # better optimization, slower compile
strip = true          # strip debug symbols
panic = "abort"       # smaller than unwind
```
then: `wasm-opt -O4` (10-20% additional reduction on top of LLVM)

tinygo:
```
-no-debug -gc=leaking -scheduler=none
```
gc=leaking is fine for short-lived CF request handlers. saves ~60% binary size.
- https://www.fermyon.com/blog/optimizing-tinygo-wasm

## what kkrpc does NOT do

- not the HTTP API layer. hono + zod does that.
- not the GUI update mechanism. datastar + sse does that.
- no websockets.

## decision

kkrpc is the JS/TS ↔ WASM boundary layer. same API contract, different transports per target.
hono + zod is the isomorphic HTTP API.
datastar + sse is the GUI push. no websockets.

two wasm builds: `wasm32-unknown-unknown` (browser + CF) and `wasm32-wasip1` (bare metal).
rust modules linked together in one wasm for zero-copy. go modules via tinygo.
thin JS boundary, coarse operations, typed arrays for bulk data, lazy init.
