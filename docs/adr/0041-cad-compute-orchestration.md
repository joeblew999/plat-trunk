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

## Principle: Don't reinvent the wheel

We used PartyKit instead of building our own WebSocket sync. We used automerge-repo instead of building our own CRDT protocol. We used Hono instead of building our own router. We used hono-party instead of building our own DO routing.

This ADR follows the same principle:

- **Cloudflare Shell** for filesystem and storage — not our own D1/R2 abstraction
- **Cloudflare Containers** for native compute — not our own server infrastructure
- **PartyKit presence** for routing decisions — not our own complexity heuristics
- **stateTools** for AI agent file access — not our own MCP file tools

-----

## Context

The plat-trunk sync system is now working end-to-end with PartyKit and Durable Objects, with 28 integration tests passing. The Automerge CRDT layer correctly syncs ops across clients. What has not yet been connected is the CAD compute layer — the Truck Rust kernel — to this sync system.

The current approach runs Truck compiled to WASM inside the browser or a Cloudflare Worker. This creates two problems:

**Problem 1 — Compute limits.** The Cloudflare Worker runtime imposes CPU time limits and a 128MB memory ceiling. Complex B-Rep operations can exceed these limits. The browser has similar constraints.

**Problem 2 — AI agents cannot compute independently.** The MCP layer exposes CAD operations to AI agents. However, if compute requires a browser WASM environment, an AI agent has no path to execute CAD ops without a browser being present.

-----

## Decision

### 1. Peers compute. The DO syncs. That's it.

The PartyKit DO is **not** an orchestrator that picks compute targets. It syncs the Automerge doc and broadcasts events. Every participant — browser or container, human or AI — is just a peer in the room.

A browser peer computes geometry locally using WASM. A container peer computes geometry natively using the Rust binary. Both produce the same thing: ops + geometry. Both write results to the same place.

The DO doesn't need to know or care where compute happened.

### 2. Presence-based routing

When an op needs compute (e.g. an AI agent creates an op via MCP but has no geometry engine), PartyKit presence determines who computes:

| Presence state | Who computes | Why |
|---------------|-------------|-----|
| This user's browser is connected | Their browser (WASM) | Lowest latency, their own edit |
| No browser for this user, but other users are online | Another user's browser (WASM) | Free compute, WASM already loaded |
| No browsers connected at all | Container (native Rust) | The fallback — always available |

This is not complexity scoring. The question is **"who's available"**, not **"how hard is the op"**.

The MCP bridge works this way today — it sends `cad-command` SSE events to the browser, the browser executes. But if no browser is connected, there's no compute. The container fills that gap.

### 3. Shell filesystem is the single shared storage

Every peer — browser, container, AI agent — writes compute results to the same place: the Cloudflare Shell filesystem. The Shell handles the D1/R2 split automatically (small files in SQLite, large blobs in R2).

```
Automerge doc  =  ops only (what happened, in order)

Shell filesystem  =  everything else:
  /geometry/{opId}.mesh    ← computing peer writes here
  /status/{opId}.json      ← pending → computing → done
  /scene/nodes.json        ← current scene graph
```

**No geometry in Automerge.** Geometry is a deterministic function of op inputs — it can always be recomputed. The Shell filesystem is a cache, not a primary store. Automerge ops are the source of truth.

**No local-only storage for shared compute.** When User B's browser computes geometry for User A's op, the result goes to the Shell — not to User B's IndexedDB. All peers read from the Shell.

### 4. Human and AI are equal participants

An AI agent connects to the PartyKit room as a peer. It calls the same MCP tools a human triggers via the UI. Those tools write ops to the Automerge doc. The AI has no special pathway — it is just another participant.

The Shell filesystem is exposed to AI agents via `stateTools` from `@cloudflare/shell`:

```ts
const providers = [
  resolveProvider(stateTools(workspace)),   // state.readJson, state.glob, etc.
  resolveProvider(cadMcpTools),              // cad.boolean_union, cad.extrude, etc.
]
```

The AI can inspect the scene, read op history, check if geometry exists, propose operations, and verify results — all through the same Shell that human-initiated compute writes to.

### 5. Containers are just peers with native compute

A Cloudflare Container runs the Truck Rust kernel as a native `linux/amd64` binary. It exposes the same Hono HTTP routes as the browser WASM (isomorphic API). It connects to the PartyKit room as a peer.

The container is not special infrastructure. It's a participant that happens to have a native Rust binary instead of WASM. It creates ops, computes geometry, writes to the Shell — same as a browser.

### 6. Offline reconciliation

When a browser works offline:

- Automerge ops accumulate in OPFS (per ADR-0036)
- Geometry computed locally stays in browser IndexedDB (only storage available offline)
- On reconnect, Automerge sync happens automatically via PartyKit
- Browser pushes locally computed geometry to the Shell
- Other peers see the geometry via the Shell

If the Shell cache is cold, the op log in Automerge is authoritative — any op can be recomputed from its inputs.

-----

## Consequences

**Positive:**

- AI agents can compute server-side without a browser
- Heavy B-Rep ops run natively in Containers — no Worker CPU limits
- Human and AI collaborate on the same document with the same tools
- Shell handles storage complexity (D1/R2 split) — we don't build it
- Presence handles routing — we don't build a complexity scorer
- Offline reconciles via op log

**Negative / risks:**

- `@cloudflare/shell` is experimental — API may change
- Container cold starts may affect UX for the "no browsers connected" fallback
- Shell inside a PartyKit DO alongside automerge-repo is unproven — needs a spike
- Using another user's browser for compute needs consent/UX consideration

**Not in scope:**

- The Rust `cad-server` HTTP API inside the Container
- MCP tool schema definitions (existing ADR)
- Tauri native integration (ADR-0039)

-----

## Implementation order

1. ~~Confirm CRDT sync E2E tests~~ — **done** (28 tests, PartyKit + Durable Objects)
2. Spike: `@cloudflare/shell` inside a PartyKit DO — does it work alongside automerge-repo?
3. Spike: Cloudflare Container with native Truck binary — cold start, binding model
4. Connect truck-cad browser to SyncDoc (replace SyncClient)
5. Implement presence-based compute routing
6. Connect AI agent as room participant via MCP + stateTools
7. Implement offline reconnect geometry push
8. End-to-end test: human and AI concurrently authoring same document
