# MCP and API Stack

## Architecture

```
┌─────────────┐    stdio     ┌──────────────┐    HTTP     ┌─────────────────┐
│  AI Agent   │ ←──────────→ │  mcp-bridge  │ ←────────→  │  Worker /mcp    │
│ (Claude etc)│              │  (proxy)     │             │  (JSON-RPC)     │
└─────────────┘              └──────────────┘             └────────┬────────┘
                                                                   │ SSE push
                                                                   ▼
                                                          ┌─────────────────┐
                                                          │  Browser WASM   │
                                                          │  (executes cmd) │
                                                          └────────┬────────┘
                                                                   │ POST result
                                                                   ▼
                                                          ┌─────────────────┐
                                                          │  Worker returns │
                                                          │  result to MCP  │
                                                          └─────────────────┘
```

## Execution Model

MCP commands are **browser-delegated**, not server-executed:

1. Agent calls MCP tool (e.g. `cad_add_cube`)
2. Bridge proxies JSON-RPC to Worker `/mcp` endpoint
3. Worker queues command, pushes via SSE to connected browser
4. Browser WASM executes the command (B-Rep kernel runs client-side)
5. Browser POSTs result back to Worker
6. Worker returns result to MCP caller

This means **a browser tab must be open** for MCP commands to work. The Worker has no geometry engine — all B-Rep computation happens in browser WASM via WebGPU.

## Stack

| Layer | Technology | Purpose |
|---|---|---|
| Server | Hono + Zod | API routing with validation |
| Transport | SSE (Datastar) | Server → browser push (no websockets) |
| MCP | JSON-RPC 2.0 | AI agent tool protocol |
| Bridge | `scripts/mcp-bridge.ts` | stdio ↔ HTTP proxy (~65 lines) |
| Schema | Rust `#[derive(JsonSchema)]` | Single source of truth for all commands |
| Types | openapi-typescript | End-to-end type safety from Rust to TypeScript |

## Cloudflare Worker

The CAD API runs as a Cloudflare Worker (`systems/truck/worker/`):

- Hono router for REST + MCP endpoints
- Static asset serving for the web GUI (Vite dist)
- R2 bucket for persistent model storage
- SSE streaming for real-time browser ↔ agent sync
- Deployed to `truck-cad.gedw99.workers.dev` and `cad.ubuntusoftware.net`

## Schema-Driven Design

All 42 commands + 10 control plane tools are defined in Rust and flow through a single chain:

```
Rust (#[derive(JsonSchema)])
  → cad-schema.json        (committed, built by cargo)
  → openapi.json           (gitignored, built by gen-openapi.ts)
  → api-types.ts           (committed, built by openapi-typescript)
  → MCP tool list          (built at runtime from cad-schema.json)
```

Adding a new command = add it in Rust → rebuild → everything updates automatically.

## Bridge

`scripts/mcp-bridge.ts` is a pure stdio ↔ HTTP proxy:

- **Retry**: 6 attempts, exponential backoff 1s → 32s (survives server restarts)
- **Hot-reload**: polls `/api/cad/schema` version every 30s → sends `tools/list_changed`
- **Dev + prod**: change `CAD_URL` env var (`http://localhost:8788` vs `https://cad.ubuntusoftware.net`)

## Command Routing

The schema classifies each command into one of three paths:

| Path | Examples | Records to Automerge | Needs WASM |
|---|---|---|---|
| JS Control Plane | undo, redo, set_mode, save_cloud | No | No |
| WASM Control Plane | select, get_state, set_camera, pick_at | No | Yes (sync) |
| WASM Data Plane | add_cube, translate, boolean_union | Yes | Yes (async) |

This classification is in `dispatch.ts` — the schema determines the path, not hardcoded lists.

## Related Docs

- [MCP User Guide](../user/mcp-guide.md) — connect agents, tool reference, examples
- [Architecture](architecture.md) — system overview, rendering tiers
- [Automerge](automerge.md) — CRDT sync and state management
