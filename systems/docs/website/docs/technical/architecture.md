# Architecture Overview

CAD/spatial platform. truck B-Rep kernel + Automerge CRDT + Cloudflare Workers. Runs in the browser.

## Platform Architecture

plat-trunk is a **platform for N independent Rust-to-MCP systems**, not just a single CAD app. Each system follows the same pattern:

```
Rust crate → WASM → JSON Schema → Cloudflare Worker with MCP endpoint
```

Truck (3D CAD) is the first system. The architecture scales to N systems via a root router that dispatches to sub-workers.

## System Topology

```
                    ┌─────────────────────────────┐
                    │   plat-router (:8788)        │
                    │   Root Cloudflare Worker      │
                    └──────┬──────────┬────────────┘
                           │          │
              ┌────────────▼──┐   ┌───▼──────────┐
              │  truck-cad    │   │  test-worker  │
              │  (:8789)      │   │  (:8790)      │
              │  REST + MCP   │   │  topology     │
              │  + SSE + WASM │   │  validator    │
              └───────────────┘   └──────────────┘
```

- **plat-router** — root worker on port 8788, serves docs (VitePress), forwards to sub-workers via service bindings
- **truck-cad** — CAD sub-worker on port 8789 with REST API, MCP endpoint, SSE streaming, static web assets
- **test-worker** — validates the N-worker topology pattern

## Stack

| Layer | Technology | Purpose |
|---|---|---|
| HTTP API | Hono + Zod | API routing with validation |
| GUI push | Datastar + SSE | Server → client updates (no websockets) |
| MCP | JSON-RPC 2.0 | AI agent tool protocol |
| WASM kernel | truck B-Rep + wasm-bindgen | Browser-side geometry engine |
| Sync CRDT | Automerge (truck-sync crate) | Collaborative editing, undo/redo |
| Persistence | Cloudflare R2 | Model storage (scene JSON, thumbnails) |
| Types | openapi-typescript | End-to-end Rust → TypeScript type safety |
| UI | Vite + TypeScript + DaisyUI v5 | Browser application |

## What Runs Where

| Module | Browser | CF Workers |
|---|---|---|
| truck B-Rep (Rust WASM) | Yes — geometry + WebGPU rendering | No — too large (3MB limit) |
| truck-sync (Rust WASM) | Yes — CRDT op log | Yes — merge/validate |
| Hono API | No | Yes — REST + MCP + SSE |
| Datastar signals | Yes — reactive UI state | No |

## Rendering

- **WebGPU** — truck B-Rep kernel + wgpu compiled to WASM, renders locally in the browser
- Zero server cost — all geometry computation happens client-side
- Requires Chrome 113+ or equivalent WebGPU support
- ~20% of Android devices (primarily Samsung) lack WebGPU support

## Build System

Everything goes through `bun run` scripts in `package.json`:

| Command | What it does |
|---|---|
| `bun run dev` | Start all workers (router + truck + test + watchers) |
| `bun run build` | Build WASM (sync + truck) + schema + web + docs |
| `bun run test` | Run all tests (Rust + API + typecheck) |
| `bun run test:e2e` | Playwright E2E tests |
| `bun run deploy` | Build + upload all workers to Cloudflare |

No taskfiles, no process-compose — just npm scripts + `run.mjs` orchestrator.

## Schema-Driven Design

All CAD commands are defined in Rust with `#[derive(JsonSchema)]` and flow through:

```
Rust → cad-schema.json → openapi.json → api-types.ts → MCP tool list
```

Adding a new command = add it in Rust → rebuild → OpenAPI, TypeScript types, and MCP tools all update automatically.

## Key Decisions

- **No websockets** — Datastar + SSE for all data push
- **No Go/TinyGo** — pure Rust WASM for all computation
- **No SharedWorker** — direct wasm-bindgen calls in main thread
- **Browser-delegated MCP** — MCP commands execute in the user's browser via SSE, not server-side
- **3MB worker size limit** — WASM-heavy systems must be separate workers
- **Schema as source of truth** — Rust defines commands, everything else is derived

## File Layout

```
plat-trunk/
├── src/router.ts              # Root router (plat-router)
├── wrangler.toml              # Root worker config
├── run.mjs                    # Dev/deploy orchestrator
├── workers.mjs                # Worker aggregator
├── systems/
│   ├── truck/
│   │   ├── crate/             # Rust CAD kernel (truck B-Rep)
│   │   ├── worker/            # Cloudflare Worker (Hono API + MCP)
│   │   ├── web/               # Browser app (Vite + TypeScript)
│   │   ├── tests/             # E2E tests (Playwright)
│   │   └── cad-schema.json    # Generated command schema
│   ├── sync/
│   │   └── crate/             # Rust CRDT crate (Automerge ops)
│   ├── test/
│   │   └── worker/            # Topology validation worker
│   └── docs/
│       └── website/           # VitePress documentation
├── scripts/                   # Build, deploy, MCP bridge
└── docs/adr/                  # Architecture Decision Records
```

## Related Docs

- [MCP](mcp.md) — AI agent integration, execution model
- [Automerge](automerge.md) — CRDT sync, truck-sync crate
- [Undo/Redo](undo-redo.md) — Automerge-based undo system
- [WebGPU](webgpu.md) — GPU rendering
- [Gizmo](gizmo.md) — Direct manipulation
- [Sketch](sketch.md) — Parametric modeling pipeline
- [Developer Guide](developer-guide.md) — Setup, build, test, contribute
