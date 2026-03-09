# plat-trunk

Browser + Cloudflare Workers CAD platform. [truck](https://github.com/ricosjp/truck) B-Rep kernel (Rust/WASM) for 3D modeling, WebGPU rendering, Automerge CRDT for collaboration.

**Stack**: Rust/WASM · Hono + Zod · MCP · Automerge CRDT · Datastar · Cloudflare Workers

## Quick Start

```bash
bun install
bun run dev          # starts all workers → http://localhost:5173
```

## Architecture

```
Client → plat-router (port 8788)
  /docs/*  → VitePress static docs (DOCS_ASSETS binding)
  /test/*  → test-worker (port 5175)
  /*       → truck-cad (port 8789) — API, MCP, Web UI
```

Each system = Rust crate → WASM → schema → worker with MCP endpoint. Truck is the first system. The router at repo root ties them together via service bindings. 3MB worker size limit means WASM-heavy systems must be separate workers.

## Commands

```bash
# Dev
bun run dev             # Start all workers + Vite dev server (HMR at :5173)

# Build — system-aware pipeline (each system declares steps in system.mjs)
bun run build           # All systems: sync → truck → docs
bun run build:sync      # Just sync (WASM + schema + types)
bun run build:truck     # Sync + truck (WASM + schema + adapters + sizes + web)
bun run build:docs      # Just docs (llm-docs + VitePress)

# Test — system-aware pipeline
bun run test            # All tests: alignment → sync → truck (Rust + vitest)
bun run test:crate      # Rust tests only (contract + domain)
bun run test:api        # Truck worker vitest
bun run test:sync       # Sync worker vitest
bun run test:e2e        # Playwright E2E tests

# Deploy
bun run deploy          # Build + deploy all workers + smoke test
```

## Deploy

```bash
bun run deploy                                   # Build + deploy all + smoke test
bun scripts/cf-deploy.ts upload --target truck   # Upload single worker
bun scripts/cf-deploy.ts promote --target truck  # Promote to production
bun run deploy:nuke:data                         # Wipe R2 data (re-seed after)
bun run deploy:nuke:all                          # Delete all workers + data
bun run seed:gallery                             # Populate gallery (localhost)
bun scripts/seed-gallery.ts --clean --url https://truck-cad.gedw99.workers.dev  # Seed prod
```

Immutable UUID URL on every upload. Production untouched until explicit promote. No backward compatibility — wipe and re-seed if data format changes.

## URLs

| | URL |
|--|-----|
| **Production** | |
| CAD App | https://cad.ubuntusoftware.net |
| Docs | https://cad.ubuntusoftware.net/docs/ |
| LLM Docs | https://cad.ubuntusoftware.net/docs/llms.txt |
| **Local Dev** | |
| UI (HMR) | http://localhost:5173 |
| Router | http://localhost:8788 |
| Truck (direct) | http://localhost:8789 |
| **Project** | |
| GitHub | https://github.com/joeblew999/plat-trunk |

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/mcp` | MCP StreamableHTTP (JSON-RPC, 29 tools) |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/cad/schema` | Command schema |
| `GET` | `/api/models` | List models |
| `PUT` | `/api/models/{id}` | Save model |
| `GET` | `/api/models/{id}` | Get model manifest |
| `DELETE` | `/api/models/{id}` | Delete model (cascades R2) |
| `POST` | `/api/models/{id}/ops` | Apply op to automerge doc |
| `GET` | `/api/models/{id}/ops` | Get ops from automerge doc |
| `POST` | `/api/models/{id}/sync` | Merge browser + server CRDT docs |
| `GET` | `/api/models/{id}/replay` | Headless WASM replay → scene JSON |
| `GET` | `/api/models/{id}/history` | Edit history by actor |
| `POST` | `/api/cad/{id}/sync/{cmd}` | Execute CAD command (sync) |
| `POST` | `/api/cad/{id}/async/{cmd}` | Execute CAD command (async/SSE) |

## MCP (AI Agent Access)

Worker `/mcp` — stateless MCP endpoint (JSON-RPC). 29 tools.

**Bridge** (`scripts/mcp-bridge.ts`) — stdio ↔ HTTP proxy with retry + schema hot-reload.

```json
{ "mcpServers": { "truck-cad": { "command": "bun", "args": ["scripts/mcp-bridge.ts"] } } }
```

For production: set `CAD_URL=https://cad.ubuntusoftware.net`.

## Adding a System

1. Create `systems/{name}/system.mjs` exporting `workers`, `devServers`, `building`, `testing`, `testFiles`
2. Add one import+spread line to `workers.mjs`
3. Add one import to `scripts/build.mjs` + one to `scripts/test.mjs`
4. The platform handles routing, build ordering, and test orchestration

## Requirements

- **Rust** + `wasm32-unknown-unknown` target + wasm-pack
- **Bun** — JavaScript runtime and package manager

## Configuration

| File | Description |
|------|-------------|
| `wrangler.toml` | Root router config (port 8788, service bindings) |
| `workers.mjs` | Worker aggregator (imports from each system.mjs) |
| `run.mjs` | Dev/deploy orchestrator |
| `cf-deploy.json` | Cloudflare deploy metadata |
| `.mcp.json` | MCP server config (bridge → Worker /mcp) |
| `AGENT.md` | Full project context for AI agents |
