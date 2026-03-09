# Developer Guide

Set up the development environment, build, test, and contribute.

## Prerequisites

- **Rust** — `rustup` with `wasm32-unknown-unknown` target
- **Bun** — JavaScript runtime and package manager
- **wasm-pack** — Rust → WASM build tool
- **Chrome 113+** — for WebGPU (or any WebGPU-capable browser)

```sh
# Install Rust + WASM target
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install wasm-pack
cargo install wasm-pack
```

## Clone & Setup

```sh
git clone https://github.com/joeblew999/plat-trunk.git
cd plat-trunk
bun install
```

## Build

```sh
# Full build: WASM (sync + truck) + schema + web + docs
bun run build

# Individual builds (system-aware — each system declares steps in system.mjs):
bun run build:sync         # Sync: WASM (3 targets) + schema + types
bun run build:truck        # Sync + Truck: WASM + schema + adapters + sizes + web
bun run build:docs         # Docs: llm-docs + VitePress
```

### Build Chain

```
Rust (#[derive(JsonSchema)])
  → bun run build:truck        → cad-schema.json → adapters → sizes → web (dist/)
  → gen:api-types (auto)       → openapi.json → api-types.ts
```

Adding a new CAD command = add Rust struct + `bun run build:truck` → types, API, MCP all update automatically.

## Dev Server

```sh
bun run dev
```

Starts everything:
- **plat-router** on `:8788` — root worker, serves docs, routes to sub-workers
- **truck-cad** on `:8789` — CAD API + MCP + static web assets
- **Vite HMR** on `:5173` — web UI with hot module replacement
- Colored output per worker, auto-restart on changes

Open `http://localhost:8788` in Chrome.

## Test

```sh
# Run all tests (Rust + API + typecheck)
bun run test

# Individual test suites:
bun run test:crate         # Rust: contract + truck-sync + native tests
bun run test:api           # Vitest: 30+ Worker API tests
bun run typecheck          # TypeScript: worker + web, zero errors
bun run test:e2e           # Playwright: E2E browser tests (needs dev server)

# Everything:
bun run test:all           # test + test:e2e
```

### Test Architecture

| Suite | Tool | What it tests |
|---|---|---|
| `test:crate` | `cargo test` | Rust: schema contract, sync CRDT, geometry |
| `test:api` | Vitest | Worker: API routes, MCP, model CRUD |
| `typecheck` | `tsc --noEmit` | TypeScript: worker + web type safety |
| `test:e2e` | Playwright | Browser: full stack with real WebGPU |

## Project Structure

```
plat-trunk/
├── src/router.ts              # Root router (plat-router)
├── wrangler.toml              # Root worker config
├── package.json               # All scripts
├── run.mjs                    # Dev/deploy orchestrator
├── workers.mjs                # Worker aggregator
├── systems/
│   ├── truck/
│   │   ├── crate/             # Rust CAD kernel
│   │   │   └── src/
│   │   │       ├── lib.rs     # WASM entry, primitives, booleans
│   │   │       ├── wasm_app.rs # SceneController WASM API
│   │   │       └── sketch.rs  # Parametric sketch + extrude
│   │   ├── worker/            # Cloudflare Worker
│   │   │   └── src/
│   │   │       └── index.ts   # Hono API + MCP + SSE
│   │   ├── web/               # Browser app
│   │   │   ├── main.ts        # Entry point
│   │   │   ├── dispatch.ts    # Command routing (cadCommand/cadQuery)
│   │   │   ├── reconcile.ts   # WASM → UI state sync
│   │   │   ├── schema.ts      # Schema loader + classifiers
│   │   │   ├── types.ts       # WasmResult, CadOptions, CadSchema
│   │   │   ├── history-domain.ts # Automerge undo/redo
│   │   │   └── ...
│   │   ├── e2e/               # Playwright E2E
│   │   └── cad-schema.json    # Generated command schema
│   ├── sync/
│   │   ├── crate/             # truck-sync Rust CRDT crate
│   │   ├── ts/                # Shared TS (doc-ops.ts)
│   │   └── worker/            # Vitest runner (WASM boundary tests)
│   ├── test/
│   │   └── worker/            # Topology validation worker
│   └── docs/
│       └── website/           # VitePress docs
├── scripts/
│   ├── mcp-bridge.ts          # MCP stdio ↔ HTTP proxy
│   ├── gen-openapi.ts         # Schema → OpenAPI → TypeScript
│   └── ...
├── .src/truck/                # Vendored upstream truck kernel
└── docs/adr/                  # Architecture Decision Records
```

## Key Concepts

### Schema-Driven Dispatch

Every CAD command is defined in Rust with `#[derive(JsonSchema)]`. The schema classifies commands into three paths:

| Path | Examples | Records to Automerge |
|---|---|---|
| JS Control Plane | undo, redo, save_cloud | No |
| WASM Control Plane | select, get_state, pick_at | No |
| WASM Data Plane | add_cube, translate, boolean_union | Yes |

`dispatch.ts` reads the schema to route commands — no hardcoded lists.

### MCP Execution Model

MCP commands are **browser-delegated**: Worker queues → SSE push to browser → browser WASM executes → POSTs result back. A browser tab must be open.

### Automerge

All data-plane commands record to an Automerge CRDT document. Undo = disable op, redo = re-enable, then full scene replay.

## Deploy

```sh
# Build everything + upload to Cloudflare
bun run deploy
```

Deploy config is in `cf-deploy.json`. Workers deploy to:
- `plat-router` → root domain
- `truck-cad` → accessed via service binding

## Adding a New CAD Command

1. Add params struct in `systems/truck/crate/src/wasm_app.rs` with `#[derive(Serialize, Deserialize, JsonSchema)]`
2. Add handler method on the WASM controller
3. Register in the command dispatch
4. `bun run build:truck` → schema + adapters + types + web all update
5. MCP tool appears automatically

## Adding a New System

1. Create `systems/{name}/system.mjs` exporting `workers`, `devServers`, `building`, `testing`, `testFiles`
2. Add one import+spread line to `workers.mjs`
3. Add one import to `scripts/build.mjs` + one to `scripts/test.mjs`
4. The platform handles routing, build ordering, and test orchestration
