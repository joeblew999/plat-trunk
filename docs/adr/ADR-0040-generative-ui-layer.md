# ADR-0040: Generative UI Layer — MCP Apps and A2UI

**Status:** Draft — Design Intent  
**Date:** 2026-03-22  
**Author:** Gerard Webb  
**Deciders:** Gerard Webb  
**Supersedes:** —  
**Related:** ADR-0001 (Automerge CRDT), ADR-0008 (Sync Architecture), ADR-0009 (Observability), ADR-0038 (Versioning/R2), ADR-0039 (Tauri v2)

---

## Context

plat-trunk exposes a Hono-based MCP server with 29–52+ tools that allow any AI agent to author and edit 3D geometry via the Truck Rust kernel (compiled to WASM). Tool inputs and outputs are plain JSON, with schemas generated from Rust structs via `schemars::JsonSchema` into `cad-schema.json`. This schema is the single source of truth for the entire API contract, validated in CI via the `api-contract` check.

The current state is:

- **AI ↔ Model** — working. Any MCP-compatible AI (Claude, Gemini, etc.) can call CAD tools and receive JSON results.
- **AI ↔ User** — missing. Tool outputs are plain JSON. There is no rich UI layer for either external MCP hosts (Claude Desktop, VS Code, partner tooling) or the plat-trunk web shell at `cad.ubuntusoftware.net`.

Two complementary standards have emerged that address this gap at different layers of the stack:

**MCP Apps (SEP-1865)** — an official MCP extension, co-authored by Anthropic and OpenAI, ratified January 2026. MCP servers declare `ui://` resources alongside tool outputs. Hosts render them in sandboxed iframes. Already supported in Claude Desktop, ChatGPT, VS Code, and Goose.

**A2UI** — an open standard from Google (Apache 2.0), with a first-class Lit renderer (`@a2ui/web-lib`). Agents emit declarative JSONL describing a component tree; the client maps it to its own native components from a pre-approved catalog. Safe by design — no arbitrary code execution.

These are not competing. They operate at different layers and serve different audiences:

| Layer | Standard | Audience | Rendering |
|---|---|---|---|
| MCP tool output → any host | MCP Apps | Claude Desktop, VS Code, RICOS tooling, partners | Sandboxed iframe (HTML) |
| plat-trunk web shell | A2UI + Lit | `cad.ubuntusoftware.net` users | Native Lit web components |

---

## Decision

plat-trunk will adopt **both** MCP Apps and A2UI as its generative UI strategy, implemented in two sequential phases.

### Phase 1 — MCP Apps (Hono MCP server)

MCP tool responses will be extended to include `ui://` resource declarations alongside existing JSON outputs. This gives any MCP-compatible host (Claude Desktop, VS Code, RICOS partner tooling) rich interactive UI for CAD tool outputs without requiring a custom frontend per host.

The HTML templates for `ui://` resources will be **generated from `cad-schema.json`**, not hand-authored. This ensures they stay aligned with the Rust type definitions through the existing codegen pipeline.

The `api-contract` CI check will be extended to validate that all `ui://` resource templates reference only field names present in the current `cad-schema.json`. A Rust struct rename will break CI on the UI template, not silently drift.

### Phase 2 — A2UI + Lit (plat-trunk web shell)

The plat-trunk browser frontend at `cad.ubuntusoftware.net` will integrate the A2UI Lit renderer (`@a2ui/web-lib`). A component catalog will be defined, mapping A2UI abstract component types to existing and new Lit web components.

The A2UI component catalog will also be **generated from `cad-schema.json`** — specifically the CAD-domain component types (tool call cards, geometry parameter forms, operation result displays). Standard layout primitives (Card, Button, TextField, Timeline) come from the A2UI built-in library.

The backend (Hono MCP + Claude/Gemini) will stream A2UI JSONL to the frontend. The Lit renderer maps each message to the component catalog progressively as the stream arrives.

---

## Architecture

```
Rust structs (schemars::JsonSchema)
    │
    ▼  cargo build / codegen
cad-schema.json  ◄── single source of truth
    │
    ├──► MCP tool definitions (Hono/Zod)        [existing]
    ├──► MCP Apps ui:// templates (HTML)         [Phase 1 — new]
    └──► A2UI component catalog (Lit registry)   [Phase 2 — new]

─────────────────────────────────────────────────────

Runtime flow — external host (Phase 1):

  User (Claude Desktop / VS Code / RICOS)
      │  natural language
      ▼
  AI agent  ──MCP tool call──►  Hono MCP server
                                    │  JSON result
                                    │  + ui:// resource
                                    ▼
                              MCP host renders
                              sandboxed iframe UI

─────────────────────────────────────────────────────

Runtime flow — plat-trunk web shell (Phase 2):

  User (cad.ubuntusoftware.net)
      │  natural language
      ▼
  Chat input  ──►  Hono backend  ──►  Claude/Gemini
                                          │
                                          │  A2UI JSONL stream
                                          ▼
                                  A2UI Lit renderer
                                  (@a2ui/web-lib)
                                          │
                                          ▼
                                  Lit component catalog
                                  (CAD-domain + standard)
                                          │
                                          ▼
                                  Live UI in browser
```

---

## Component Catalog Design Intent (Phase 2)

The A2UI catalog will have two tiers:

**Standard tier** — from A2UI built-in library, used as-is:
- `Card`, `Button`, `TextField`, `DateTimePicker`, `Timeline`, `Markdown`

**CAD domain tier** — custom Lit components registered via `ComponentRegistry`:
- `CadToolCall` — displays tool name, typed parameters (key/value), execution status and latency
- `CadSolidResult` — solid ID, face/edge/vertex counts, bounding box
- `CadOperationStatus` — streaming status for long-running operations (e.g. boolean, export)
- `CadExportResult` — STEP/IGES export result with R2 key and download link
- `CadParameterForm` — generated from a tool's JSON schema input shape; handles real-valued geometry inputs
- `CadSketchPreview` — 2D sketch thumbnail (SVG)

The visual mapping (what each component looks like) is a one-time design decision per component type, expressed as a Lit template. It does not change when Rust structs evolve — only the parameter names passed to it change, and those are validated by CI.

---

## Transport

A2UI supports A2A Protocol and AG-UI as transports. For plat-trunk:

- **Phase 1 (MCP Apps):** transport is standard MCP JSON-RPC over HTTP/SSE — no change to existing Hono transport.
- **Phase 2 (A2UI web shell):** transport is SSE from the Hono backend, streaming A2UI JSONL. This is consistent with the existing Datastar SSE architecture and does not introduce a new transport mechanism.

---

## CI Contract Extension

The existing `api-contract` check (added 2026-03-18, `main bf28633`) will be extended:

```
ci: api-contract check
    ✓ Hono/Zod routes match cad-schema.json          [existing]
    ✓ MCP tool definitions match cad-schema.json     [existing]
    ✓ MCP Apps ui:// templates match cad-schema.json [Phase 1 — new]
    ✓ A2UI component catalog matches cad-schema.json [Phase 2 — new]
```

This ensures that a Rust struct change which regenerates `cad-schema.json` will immediately fail CI on any UI resource or component catalog definition that references a stale field name. Nothing drifts silently between the kernel types and the UI layer.

---

## Consequences

**Positive:**

- Any MCP-compatible AI host gets rich CAD tool UI immediately (Phase 1), with zero per-host frontend work. This is directly relevant to the RICOS partnership where the client tooling is not controlled by plat-trunk.
- The plat-trunk web shell gets a structured, streaming-capable generative UI layer on top of the existing Lit + Datastar stack (Phase 2), without migrating to React.
- The `cad-schema.json` codegen pipeline remains the single source of truth. UI templates and component catalogs are derived artifacts, not manually maintained.
- A2UI's security model (catalog of trusted components, no arbitrary code execution) is appropriate for a CAD tool where agent-generated geometry operations need to be auditable.
- Phase 1 (MCP Apps) is low-risk and additive — it does not change existing tool behaviour, only adds `ui://` resource declarations alongside existing JSON responses.

**Negative / Risks:**

- A2UI is pre-1.0 (currently v0.8 stable, v0.9 draft). The spec may change before v1.0. Mitigation: the component catalog is a thin mapping layer; a spec change requires updating the catalog bindings, not the underlying Lit components.
- MCP Apps renders in sandboxed iframes. The visual result in external hosts will not match plat-trunk's branding. This is acceptable for Phase 1 (tool utility > aesthetics in partner contexts) but is why Phase 2 (owned web shell with A2UI native rendering) is still required.
- The codegen extension (UI templates and catalog from `cad-schema.json`) requires implementation work that is not yet designed at the code level. This ADR is design intent only — implementation approach to be detailed in a follow-on ADR or implementation doc once the codebase has been reviewed.

---

## Deferred

- Specific Hono implementation of `ui://` resource declaration (to be detailed post code review)
- A2UI `ComponentRegistry` registration pattern for CAD domain components (to be detailed post code review)
- Decision on whether A2UI JSONL streaming replaces or sits alongside the existing Datastar SSE stream
- React renderer for A2UI (on Google's roadmap) — irrelevant for plat-trunk given Lit commitment, but worth tracking if Tauri v2 desktop shell eventually needs React

---

## References

- MCP Apps announcement: https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/
- MCP Apps spec (SEP-1865): https://github.com/modelcontextprotocol/specification
- A2UI repository: https://github.com/google/A2UI
- A2UI Lit renderer: https://github.com/google/A2UI/tree/main/renderers/lit
- A2UI documentation: https://a2ui.org
- Google A2UI announcement: https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/
- CopilotKit generative UI taxonomy: https://github.com/CopilotKit/generative-ui
