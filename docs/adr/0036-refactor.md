# ADR 0036: Isomorphic WASM Core — Migrate DOMAIN Logic from TypeScript to Rust

**Status:** Proposed  
**Date:** 2026-03-04  
**Input:** AUDIT-typescript-cfworker.md  

---

## Context

The plat-trunk platform is designed to run in three environments:

| Environment | Runtime | Current state |
|---|---|---|
| Browser | Lit + Datastar + WASM | Working |
| CF Worker (headless) | Hono + WASM | Partial — geometry only |
| Rust test suite | Native | Geometry only |

The audit identified **3 DOMAIN files** currently living in TypeScript:

| File | Problem |
|---|---|
| `history.ts` | Automerge doc manager, op-log replay, snapshot logic — entirely untestable without a browser |
| `sketch.ts` | Quick-rect-extrude path knows the Sketch struct shape in JS — will drift from Rust |
| `model-store.ts` | Minor domain logic (object count parsing, manifest construction) leaking out of its layer |

The root cause is that the WASM boundary was defined too narrowly — it exposes geometry operations but not **document/sync operations**. Logic that needed to coordinate both ended up in TypeScript by default.

### Critical constraint: WASM bundle size

- Truck geometry WASM: ~3 MB
- Automerge-rs WASM: ~1.5 MB  
- CF Worker limit: 3 MB per bundle

These **cannot be combined into a single Worker bundle**. This is an architectural constraint that drives the split-worker approach below.

---

## Decision

### 1. Split the WASM core into two crates

```
crates/
  truck-geometry/        (existing — SceneController, HeadlessController)
  truck-sync/            (new — Automerge doc, op log, replay, validation)
```

Each compiles to its own WASM bundle, staying within the CF Worker size limit.

The browser loads both. Each CF Worker loads only what it needs.

### 2. Define the sync WASM boundary explicitly

The following exports are the contract for `truck-sync`:

```rust
// Apply a single op to the current Automerge doc
// Returns updated doc bytes
#[wasm_bindgen]
pub fn apply_op(doc: &[u8], op_json: &str) -> Result<Vec<u8>, JsValue>

// Merge two diverged docs (CRDT merge — commutative, associative)
// Returns merged doc bytes
#[wasm_bindgen]
pub fn merge_docs(local: &[u8], remote: &[u8]) -> Result<Vec<u8>, JsValue>

// Validate op params against schema before recording
#[wasm_bindgen]
pub fn validate_op(op_json: &str) -> bool

// Replay all ops in a doc and return the resulting scene JSON
// This is the headless equivalent of _replayScene() in history.ts
#[wasm_bindgen]
pub fn replay_to_scene(doc: &[u8]) -> Result<String, JsValue>

// Export only ops after a given index (incremental sync)
#[wasm_bindgen]
pub fn export_ops_since(doc: &[u8], since_index: u32) -> Result<String, JsValue>
```

TypeScript passes bytes in and gets bytes out. No Automerge logic remains in JS.

### 3. Migrate history.ts in two phases

**Phase A — Split the file (no logic change)**

Separate the two concerns that are currently mixed in `history.ts`:

```
history-domain.ts    ← op-replay, snapshot selection, frustum cull heuristic
                       (temporary TS home until Rust migration complete)
history-ui.ts        ← timeline chip rendering, UI event handlers
```

This makes `history-domain.ts` testable in Node.js immediately, without waiting for Rust migration.

**Phase B — Move history-domain.ts to Rust**

Replace `history-domain.ts` with calls to the `truck-sync` WASM exports above. The TypeScript file is deleted.

### 4. Fix sketch.ts drift risk

Remove the quick-rect-extrude JSON literal from `sketch.ts`. Replace with a dedicated WASM call:

```rust
#[wasm_bindgen]
pub fn quick_rect_extrude(width: f64, height: f64, depth: f64) -> Result<String, JsValue>
```

No TypeScript should construct a `Sketch` struct literal directly.

### 5. Fix model-store.ts leakage

Two minor fixes, no migration needed:

- Add `analyze_scene(json: string): { objectCount: number }` to `model-store.ts` — eliminate the two inline `JSON.parse` sites in `index.ts`
- Add a `buildManifest(...)` factory function — eliminate the two manifest literal construction sites in `index.ts`

### 6. Extend the codegen pipeline for Automerge

The current codegen pipeline only emits command-param structs. The Automerge doc structure requires the **full struct graph** including types not currently in the OpenAPI spec.

Add a second codegen output target:

```
Rust structs + #[derive(JsonSchema)]
    └── cargo run --bin generate-schema
          ├── systems/truck/cad-schema.json          (existing — command params)
          └── systems/truck/sync-schema.json         (new — SceneObject, Sketch, 
                                                       SketchPoint, SketchEdge,
                                                       SketchConstraintKind,
                                                       SceneEntry)
```

`sync-schema.json` is the authoritative definition of the Automerge doc shape. It is generated from Rust and committed. TypeScript never defines the doc structure independently.

### 7. Worker persistence for headless op replay

The browser uses IndexedDB for op log persistence. The CF Worker has no IndexedDB.

For headless op replay, the per-model op log is stored in **D1** (one row per op, indexed by model ID + op index). This replaces the Warm/Hot IndexedDB tier for the worker context.

The persistence interface is abstracted so `truck-sync` Rust code does not know whether it is talking to IndexedDB (browser) or D1 (worker). The WASM exports operate on doc bytes only — persistence is the shell's responsibility.

---

## Implementation Plan

Claude Code executes these steps in order. Each step is independently verifiable.

### Step 1 — Split history.ts (Phase A)

- Extract all non-UI logic from `history.ts` into `history-domain.ts`
- `history-ui.ts` imports from `history-domain.ts`
- No logic changes — pure file split
- **Verify:** existing browser behaviour unchanged

### Step 2 — Fix model-store.ts

- Add `analyzeScene()` function
- Add `buildManifest()` factory
- Update `index.ts` call sites
- **Verify:** `index.test.ts` still passes

### Step 3 — Fix sketch.ts drift

- Add `quick_rect_extrude` to Rust WASM exports
- Remove JSON literal construction from `sketch.ts`
- **Verify:** sketch extrude still works in browser

### Step 4 — Create truck-sync crate

- `cargo new --lib crates/truck-sync`
- Add `automerge` crate dependency
- Define Automerge doc structure against existing Rust structs
- Implement `apply_op`, `merge_docs`, `validate_op`, `replay_to_scene`
- Write unit tests first — all pure Rust, no WASM build needed
- **Verify:** `cargo test -p truck-sync` passes with concurrent op scenarios

### Step 5 — Add sync-schema codegen target

- Extend `generate_schema.rs` to also traverse `SceneObject`, `Sketch`, `SketchPoint`, `SketchEdge`, `SketchConstraintKind`
- Emit `sync-schema.json`
- **Verify:** schema committed, matches Automerge doc structure in Step 4

### Step 6 — Compile truck-sync to WASM

- Add `wasm-pack` build for `truck-sync`
- Verify bundle size < 1.5 MB
- **Verify:** `wasm-pack test --headless` passes

### Step 7 — Migrate history-domain.ts to Rust (Phase B)

- Replace `history-domain.ts` logic with calls to `truck-sync` WASM exports
- `history-ui.ts` now imports from WASM, not `history-domain.ts`
- Delete `history-domain.ts`
- **Verify:** browser undo/redo, progressive load, snapshot load all work

### Step 8 — Worker Automerge integration

- Add `truck-sync` WASM to `systems/truck/worker/`
- Add D1 op-log table + migration
- Implement server-side op replay endpoint
- **Verify:** headless op replay produces same scene as browser replay

### Step 9 — Tests for concurrent op scenarios

Write explicit regression tests for the conflict cases that motivated this entire migration:

```rust
#[test]
fn concurrent_extrude_and_fillet_merge_produces_valid_geometry()

#[test]  
fn op_replay_order_is_deterministic_after_merge()

#[test]
fn snapshot_plus_delta_replay_matches_full_replay()
```

---

## Consequences

### Positive

- Automerge merge and op replay are testable in pure Rust, in CI, with no browser
- CF Worker can run full headless op replay, not just geometry primitives
- TypeScript layer is reduced to UI + thin WASM glue — no business logic
- Codegen is the single source of truth for both HTTP API shapes and sync doc shapes
- WASM size constraint is respected via crate split

### Negative / risks

- Two WASM bundles to load in browser (additive, not a regression)
- D1 schema addition required for Worker persistence
- `@automerge/automerge-repo` JS Repo + DocHandle model has no direct Rust equivalent — the browser repo initialisation in `boot.ts` will need reworking to use raw doc bytes rather than handles

### Out of scope

- Replacing the existing geometry WASM (`truck-geometry`) — unchanged
- Changing the Hono REST API surface
- Migrating `tier-manager.ts` camera eviction to Rust — acceptable in JS (I/O boundary cost outweighs benefit)
- Multi-user real-time sync — this ADR only addresses local-first single-user CRDT correctness

---

## Open Questions Resolved

| Question | Resolution |
|---|---|
| CF Worker WASM size limit | Resolved by splitting into `truck-geometry` + `truck-sync` crates |
| Codegen extension point | Add second output target to `generate_schema.rs`; emit `sync-schema.json` |
| history.ts split | Phase A (file split) → Phase B (Rust migration); two discrete steps |
| Worker persistence | D1 op-log table; WASM exports operate on bytes only |
| `@automerge/automerge-repo` equivalent | `boot.ts` reworked to use raw doc bytes; Repo/DocHandle abstraction removed |