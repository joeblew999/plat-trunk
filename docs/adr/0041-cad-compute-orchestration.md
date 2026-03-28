# ADR-0041: CAD Compute Orchestration and Human/AI Parity

**Status:** Intent — not yet implemented
**Date:** 2026-03-28
**Depends on:** ~~ADR-0001~~ (superseded — now PartyKit sync), ADR-0005 (Scene Graph), ~~ADR-0008~~ (superseded), ADR-0036 (OPFS), ADR-0038 (Versioning/R2), ADR-0039 (Tauri)

### References

| What | URL |
|------|-----|
| **Cloudflare Agents SDK** | https://github.com/cloudflare/agents |
| **@cloudflare/shell** (Workspace + stateTools) | https://github.com/cloudflare/agents/tree/main/packages/shell |
| **@cloudflare/shell on npm** | https://www.npmjs.com/package/@cloudflare/shell |
| **@cloudflare/codemode** (LLM code execution) | https://github.com/cloudflare/agents/tree/main/packages/codemode |
| **Agents SDK docs** | https://developers.cloudflare.com/agents/ |
| **Agents API reference** | https://developers.cloudflare.com/agents/api-reference/agents-api/ |
| **Agents starter template** | https://github.com/cloudflare/agents-starter |
| **Cloudflare Containers** | https://developers.cloudflare.com/containers/ |
| **PartyKit (partyserver)** | https://github.com/cloudflare/partykit |
| **automerge-partyserver (our fork)** | https://github.com/joeblew999/partykit/tree/feat/automerge-partyserver |
| **Upstream issue** | https://github.com/cloudflare/partykit/issues/361 |
| **plat-trunk sync system** | https://github.com/joeblew999/plat-trunk/tree/main/systems/sync |

> **Note:** `@cloudflare/shell` and the Workspace API are very new (early 2025). The API may change. Pin versions strictly. Many AI coding assistants don't yet know about these packages — the references above are the authoritative sources.

-----

## Context

The plat-trunk sync system is now working end-to-end with PartyKit and Durable Objects, with full integration tests passing. The Automerge CRDT layer correctly syncs document state across clients. What has not yet been connected is the CAD compute layer — the Truck Rust kernel — to this sync system.

The current approach runs Truck compiled to WASM inside the browser or a Cloudflare Worker. This creates two problems:

**Problem 1 — Compute limits.** The Cloudflare Worker runtime imposes CPU time limits (up to 5 minutes on paid plans) and a 128MB memory ceiling. Complex B-Rep operations — large boolean unions, dense mesh tessellations, high face-count fillets — can exceed these limits. The browser has similar constraints: WASM runs in a single tab with limited CPU and memory, and heavy ops block the UI thread.

**Problem 2 — AI agents cannot compute independently.** The MCP layer exposes CAD operations to AI agents. However, if compute requires a browser WASM environment, an AI agent has no path to execute CAD ops server-side without a browser being present. This blocks the goal of human/AI collaborative authoring on the same document.

### Why Cloudflare Containers solve this

Cloudflare Containers run arbitrary Docker images as Durable Object sidecars, globally distributed, with no Worker CPU time limits. The Truck Rust kernel compiled to a native `linux/amd64` binary runs faster than WASM (no interpreter overhead) with access to full CPU and memory. Containers are deployed via `wrangler deploy` alongside existing Workers — no new infrastructure.

### The isomorphic compute insight

The Hono framework runs identically in three environments: the browser (via service worker), a Cloudflare Worker (via workerd), and a Cloudflare Container (via Bun). The same Hono route definitions serve CAD operations in all three contexts. Only the Truck binding differs — WASM in the browser and Worker, native binary in the Container. This means the API contract, the request/response shapes, and the route structure are identical across all compute targets.

### The Workspace insight

`@cloudflare/shell` provides a `Workspace` abstraction backed by DO SQLite and optional R2. It exposes a filesystem-like API that both human users (indirectly via the CAD UI) and AI agents (directly via MCP `stateTools`) can read and write. The Workspace becomes the shared durable context between human and AI participants in a document session.

-----

## Decision

### 1. Introduce Cloudflare Containers as a third compute target

The existing complexity router in the PartyKit DO is extended to three tiers:

|Score |Target      |Runtime     |Trigger                         |
|------|------------|------------|--------------------------------|
|≤ 100 |Browser     |Truck WASM  |DO broadcasts `compute_local`   |
|≤ 1000|CF Worker   |Truck WASM  |DO fetches Worker endpoint      |
|> 1000|CF Container|Truck native|DO fetches Container via binding|

Complexity scoring is a simple heuristic based on operation type and face count, tuned over time from real usage data stored in the DO's op cache.

The Container exposes the same Hono HTTP routes as the Worker. The DO does not distinguish between the two at the route level — only the binding and complexity threshold differ.

### 2. The PartyKit DO is the single orchestration point

All compute — whether initiated by a human clicking in the browser or an AI agent calling an MCP tool — routes through the PartyKit DO. The DO:

- Receives the CAD op (from browser WS or AI MCP call)
- Scores complexity
- Checks the op cache (SQLite, keyed by SHA-256 of op inputs)
- Routes to the appropriate compute target on cache miss
- Writes the result to the Workspace
- Updates Automerge `opStatus` to `done`
- Broadcasts the result to all connected browser clients

This means the browser always receives geometry via the DO's broadcast, regardless of where compute ran. The browser does not need to know whether a result came from local WASM, a Worker, or a Container.

### 3. Geometry storage uses Workspace (SQLite + R2)

The `@cloudflare/shell` `Workspace` is initialised in the DO with DO SQLite for metadata and op status, and an R2 bucket for geometry blobs. Small payloads stay in SQLite; large mesh blobs are routed to R2 automatically by the Workspace abstraction.

The Workspace filesystem layout per document:

```
/scene/nodes.json          — scene graph (assembly hierarchy per ADR-0005)
/scene/branches.json       — branch metadata (per ADR-0038)
/ops/log.json              — append-only op log (mirrors Automerge ops[])
/ops/{opId}.json           — individual op detail and inputs
/geometry/{opId}.mesh      — computed mesh blob (→ R2 via Workspace)
/status/{opId}.json        — compute status: pending/computing/done/error
/presence/{userId}.json    — ephemeral cursor and selection state
```

### 4. Human and AI use the same interface

An AI agent connects to the PartyKit room as a participant. It calls the same MCP tools a human triggers via the UI. Those tools write ops to the Automerge doc and route through the same DO orchestration path. The AI has no special pathway — it is just another participant.

The Workspace is exposed to AI agents via `stateTools(workspace)` from `@cloudflare/shell/workers`, composited with the CAD MCP tools:

```ts
const providers = [
  resolveProvider(stateTools(this.workspace)),   // state.readJson, state.glob, etc.
  resolveProvider(cadMcpTools),                   // cad.boolean_union, cad.extrude, etc.
]
```

The AI can inspect the full scene, read op history, check geometry existence, propose operations, and verify results — all through the same Workspace that human-initiated ops write to.

### 5. Offline reconciliation

When a browser client works offline:

- Automerge ops accumulate in OPFS (per ADR-0036)
- Geometry computed locally via WASM is stored in browser IndexedDB
- On reconnect, Automerge sync happens automatically via PartyKit
- The browser then pushes any locally computed geometry to the DO via a dedicated reconnect handler
- The DO writes geometry to the Workspace (R2 path) and updates `opStatus`
- Other clients receive the geometry via DO broadcast

If the Workspace cache is cold (DO evicted, R2 key missing), the op log in Automerge is the authoritative source — any op can be recomputed from its inputs at any time.

### 6. The Automerge doc is the source of truth; geometry is derived

The Automerge document stores ops and status only. Geometry is never stored in Automerge — it is always a deterministic function of the op inputs and can be recomputed. The Workspace cache is a performance optimisation, not a primary store.

This means:

- Undo/redo is free: replay ops without the undone op; all results are cached or recomputable
- Two users doing the same op independently produce the same geometry (same cache key)
- The AI reasoning over the document sees the same logical state as the human

-----

## Consequences

**Positive:**

- AI agents can perform CAD compute server-side without a browser
- Heavy B-Rep ops no longer hit Worker CPU limits
- Human and AI collaborate on the same document with the same tools
- Offline work reconciles correctly via op log + geometry push on reconnect
- The Hono codebase is isomorphic across browser, Worker, and Container
- Op cache in SQLite means repeated identical ops (e.g. undo/redo cycles) are free

**Negative / risks:**

- `@cloudflare/shell` is experimental with unstable API — pin version strictly
- Container cold starts are 2-3 seconds — acceptable for heavy ops, not for interactive ones
- Complexity scoring heuristic requires tuning; wrong routing wastes cost or hits limits
- The CRDT sync layer must be correct before this is connected — sync bugs corrupt the op log that all compute depends on

**Not in scope for this ADR:**

- The Rust `cad-server` HTTP API inside the Container (separate ADR or implementation doc)
- MCP tool schema definitions for CAD ops (covered by existing SchemaEntry ADR)
- Tauri native integration (ADR-0039)
- FEA solver pipeline (RICOS partnership work)

-----

## Implementation order

1. Confirm CRDT sync end-to-end tests cover concurrent op merge (prerequisite — **done**, 28 tests passing)
2. Initialise Workspace in the PartyKit DO alongside existing SQLite usage
3. Implement complexity router with browser/Worker/Container tiers
4. Build native Rust `cad-server` binary and Dockerfile
5. Wire Container into wrangler.jsonc and DO binding
6. Add op cache (SHA-256 keyed, SQLite-backed)
7. Connect AI agent as a room participant via MCP + stateTools
8. Implement offline reconnect geometry push handler
9. End-to-end test: human and AI concurrently authoring same document
