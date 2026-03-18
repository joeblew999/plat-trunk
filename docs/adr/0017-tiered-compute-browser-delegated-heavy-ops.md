# ADR-0017: Tiered Compute — Browser-Delegated Execution for Heavy CAD Operations

**Status**: Proposed  
**Date**: 2026-03-18  
**Depends on**: ADR-0001 (multi-actor sync), ADR-0004 (WASM boundary contracts), ADR-0016 (browser threading)  
**Amends**: ADR-0001 "server-direct" decision for data-plane commands

## Problem

Cloudflare Workers have hard CPU time limits:
- Paid plan: 30ms CPU time per request (wall clock may be longer due to I/O waits,
  but WASM compute counts against CPU time directly)
- Complex boolean operations: 50–500ms CPU
- `import_ifc` on a real building model: 2–30s CPU
- `import_step` on a complex assembly: 1–10s CPU
- Large tessellation passes: 100ms–2s CPU

These operations reliably exceed the CF budget. ADR-0001 adopted "server-direct"
execution for data-plane commands, but this only works for lightweight ops.
ADR-0004 notes format workers via CF service bindings as a mitigation, but service
bindings get their own CPU budget from the SAME pool — the budget is per-worker,
not per-account.

**ADR-0001's server-direct path is correct for fast ops. It is not viable for
heavy ops.**

## Insight: the browser is the right compute node

Every connected browser already has:
- The geometry WASM loaded and warm (no cold start)
- Full CPU budget (no artificial limit — users have GHz cores)
- The current scene state (GeometryStore in memory)
- A result posting path back to the server (`/api/cad/{modelId}/result/{id}`)

This is not a workaround — it is architecturally correct. The user who issues
a heavy operation is sitting at a browser with the model loaded. Their browser
is the most capable compute node available for that operation. The server's
role is orchestration and persistence, not computation.

Furthermore: **other connected browsers are also compute nodes**. A model with
3 connected collaborators has 3 geometry WASM instances warm in memory. Heavy
operations can be delegated to any of them — not just the requesting browser.
This is a natural fit for the multi-actor collaboration architecture.

## Tiered execution model

Operations are classified by expected CPU cost:

```
TIER 1 — Server-direct (< 10ms CPU, no browser needed)
  add_cube, add_sphere, add_cylinder, add_torus
  translate, rotate, scale, duplicate
  delete, rename, set_color, set_style
  get_state, export_scene, get_bim_metadata
  → executeServerDirect() — runs in CF worker WASM, returns immediately

TIER 2 — Browser-delegated (> 10ms CPU, browser preferred)
  boolean_union, boolean_subtract, boolean_intersect, clash_detect
  import_step, import_ifc, import_scene (large)
  export_step, export_obj, export_stl (complex geometry)
  sketch_extrude, quick_rect_extrude (tessellation-heavy)
  → executeBrowserDelegated() — enqueued, browser executes, result posted back

TIER 3 — Control plane (browser required — needs UI state)
  undo, redo, select, get_status, set_camera
  → waitForCommand() — always browser-delegated (existing behaviour)
```

Tier classification is static — defined in `cad-schema.json` as a `compute_tier`
field on each command, generated from Rust annotations. Not runtime-decided.

## Protocol (Tier 2)

```
1. MCP/HTTP caller → POST /api/cad/{modelId}/execute/{command}

2. CF worker:
   a. Creates op: { id, type, params, actorId: 'mcp-server', timestamp }
   b. Writes op to automerge.bin in R2 (same as server-direct — op is recorded
      regardless of who executes it)
   c. If browsers connected → broadcast 'cad-command' SSE event to fastest
      available browser (see selection below)
   d. If no browsers connected → queue op, return 202 Accepted with job id
   e. Poll for result up to 30s wall clock (I/O wait, not CPU)

3. Selected browser:
   a. Receives 'cad-command' SSE event (existing path — already implemented)
   b. Executes command in WASM SceneController (or GeometryWorker per ADR-0016)
   c. Posts result to /api/cad/{modelId}/result/{id} (existing path)

4. CF worker:
   a. Receives result POST
   b. Broadcasts 'sync-op' SSE to all OTHER browsers (they apply the op
      from the automerge.bin that was already updated in step 2b)
   c. Returns result to original MCP caller

5. If no browser responds within 30s:
   a. Mark op as 'pending-execution' (op is in automerge.bin, not executed)
   b. Return 202 with job id to caller
   c. When a browser next connects: replay pending-execution ops in order
```

**Key property:** The op is written to automerge.bin BEFORE browser delegation.
Whether the browser executes it now or later (on reconnect), the op exists in
the CRDT. This preserves local-first semantics — no data is lost if the browser
disconnects mid-execution.

## Browser selection for delegation

When multiple browsers are connected to a model:

```typescript
function selectComputeBrowser(modelId: string): SSEListener | null {
  const model = getModel(modelId);
  // Prefer: browser that last posted a result (has warm WASM, proven responsive)
  // Fallback: any connected browser
  // Future: browser with lowest recent latency (track result posting times)
  return model.lastActiveComputer ?? model.listeners.values().next().value ?? null;
}
```

Initially: round-robin or first-available. Future: latency-based selection.
The protocol is the same regardless — the browser always posts results back.

## Connection to ADR-0016 (browser threading)

ADR-0016 proposes moving geometry to a Web Worker in the browser. This ADR is
compatible:

- Without ADR-0016: browser main thread executes heavy ops (existing behaviour,
  blocks rendering during the op)
- With ADR-0016: browser geometry worker executes heavy ops (main thread free,
  no UI freeze)

ADR-0017 does not require ADR-0016. It improves with ADR-0016.

The browser-delegated path (Tier 2) is essentially: "send this to a browser's
geometry worker". ADR-0016 makes that worker exist explicitly. The combination
means heavy ops are computed off-thread with full CPU budget, no CF limits,
and no main thread blocking.

## What changes from ADR-0001

ADR-0001 said: "MCP no longer delegates to browser. Server runs headless WASM
directly."

This was the right call for simple ops. It is wrong for heavy ops. The amendment:

**Simple ops (Tier 1):** server-direct. No browser needed. Fast, no CPU budget issue.

**Heavy ops (Tier 2):** browser-delegated. Server records the op, browser executes,
result posted back. Falls back to queue if no browser connected.

**Control plane (Tier 3):** unchanged — always browser-delegated.

The `waitForCommand` / `enqueueCommand` infrastructure already exists for Tier 3.
Tier 2 reuses the same mechanism with one addition: the op is written to R2
before delegation (Tier 3 control-plane commands don't need this).

## Multi-browser compute (future)

The architecture naturally extends to using idle browsers as compute nodes:

```
Model has 3 connected browsers (A, B, C).
MCP agent issues 3 simultaneous heavy booleans.

CF worker:
  - Delegates boolean 1 → Browser A
  - Delegates boolean 2 → Browser B
  - Delegates boolean 3 → Browser C
  - All three execute in parallel
  - Results posted back as they complete
  - CF worker merges results into automerge.bin

Total time: max(T_A, T_B, T_C) instead of T_A + T_B + T_C
```

This is a natural extension — each browser has independent WASM state and
full CPU. The server coordinates but does not compute. This fits the
"Where AI Designs Reality" positioning: AI agents issue many parallel geometry
operations, connected browsers provide the compute, results flow back via sync.

The `compute_tier` field in `cad-schema.json` enables this — the worker knows
which ops can be parallelised across browsers vs which must be sequential
(ops with data dependencies).

## Schema change

Add `compute_tier: 1 | 2 | 3` to each command in `commands.rs`:

```rust
#[derive(JsonSchema, Serialize, Deserialize)]
pub struct CadCommand {
    pub name: &'static str,
    pub description: &'static str,
    pub domain: &'static str,
    pub compute_tier: u8,  // 1=server-direct, 2=browser-delegated, 3=control-plane
    // ...
}
```

Generated into `cad-schema.json` → `gen-adapters.ts` → worker dispatch uses
`compute_tier` to route. No hand-maintained classification tables.

## Consequences

**Positive:**
- Heavy ops work reliably — no CF CPU budget violations
- Fast ops remain fast — server-direct, no browser round-trip
- Local-first preserved — op written to R2 before execution, survives disconnect
- Foundation for multi-browser parallel compute
- No new infrastructure — reuses existing `waitForCommand` / `enqueueCommand` /
  result-posting paths
- User's browser does the user's work — natural fit, low latency (same machine
  where result is displayed)

**Negative:**
- Heavy ops require a connected browser (or queue until one connects)
- MCP agents doing heavy ops in headless mode (no browser) get 202 + job polling
  instead of synchronous results
- Browser must stay connected for the duration of heavy ops (30s timeout)

**Risks:**
- Browser disconnects mid-execution: op is already in R2, will replay when
  browser reconnects. Result from interrupted execution is discarded.
- Malicious browser posts wrong result: out of scope for v1, mitigated by
  CRDT replay — any browser can verify the result by replaying the ops.
- High latency if browser is on mobile or slow connection: mitigation is
  timeout + fallback to queueing, or selecting a better-connected browser.

## Implementation order

1. Add `compute_tier` to `commands.rs` + regenerate `cad-schema.json`
2. `executeBrowserDelegated()` — records op to R2, then delegates via existing
   `enqueueCommand` + `waitForCommand` pattern
3. Worker dispatch: route by `compute_tier` (Tier 1 → server-direct,
   Tier 2 → browser-delegated, Tier 3 → existing waitForCommand)
4. 202 Accepted + job polling for headless/no-browser case
5. Browser selection strategy (latency-based)
6. Multi-browser parallel dispatch (when multiple browsers connected)
