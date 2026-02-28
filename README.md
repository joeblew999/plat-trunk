# plat-trunk

Browser + Cloudflare Workers CAD platform. [truck](https://github.com/ricosjp/truck) B-Rep kernel (Rust/WASM) for 3D modeling, WebGPU rendering, Automerge CRDT for collaboration.

**Stack**: Rust/WASM · Hono + Zod · MCP · Automerge CRDT · Datastar · Cloudflare Workers

## Quick Start

```bash
bun install
bun run dev          # starts all workers → http://localhost:8788
```

## Architecture

```
Client → plat-router (port 8788)
  /docs/*  → VitePress static docs (DOCS_ASSETS binding)
  /test/*  → test-worker (port 5175)
  /*       → truck-cad (port 8789) — API, MCP, Web UI
```

Each system = Rust crate → WASM → schema → worker with MCP endpoint. The router at repo root ties them together via service bindings.

## Commands

```bash
bun run dev             # Start all workers (router + truck + test + watchers)
bun run build           # Build WASM + docs
bun run test            # Run all tests (cargo + vitest)
bun run deploy          # Build + deploy all workers to Cloudflare

bun run build:truck     # WASM compile + schema generation
bun run build:docs      # Build VitePress docs
bun run test:crate      # Rust unit tests
bun run test:api        # Worker API tests (vitest)
bun run test:e2e        # Playwright E2E tests
```

## Deploy

```bash
bun run deploy                          # Build + deploy all workers
bun scripts/cf-deploy.ts nuke           # Delete all workers (clean slate)
bun scripts/cf-deploy.ts deploy-all     # Upload + deploy triggers (correct order)
bun scripts/cf-deploy.ts upload --target truck   # Upload single worker
```

## URLs

| | URL |
|--|-----|
| **Production** | |
| CAD App | https://cad.ubuntusoftware.net |
| Docs | https://cad.ubuntusoftware.net/docs/ |
| LLM Docs | https://cad.ubuntusoftware.net/docs/llms.txt |
| **Local Dev** | |
| Router | http://localhost:8788 |
| Truck (direct) | http://localhost:8789 |
| Test (direct) | http://localhost:5175 |
| API Docs | http://localhost:8788/api-docs |
| MCP | http://localhost:8788/mcp |
| **Project** | |
| GitHub | https://github.com/joeblew999/plat-trunk |

## MCP (AI Agent Access)

Worker `/mcp` — stateless MCP endpoint (JSON-RPC). 29 tools.

**Bridge** (`scripts/mcp-bridge.ts`) — stdio ↔ HTTP proxy with retry + schema hot-reload.

```json
{ "mcpServers": { "truck-cad": { "command": "bun", "args": ["scripts/mcp-bridge.ts"] } } }
```

For production: set `CAD_URL=https://cad.ubuntusoftware.net`.

## Adding a Worker

1. Create `systems/{name}/worker/` with `wrangler.toml` + `src/index.ts`
2. Add entry to `workers.mjs` (unique port + inspectorPort)
3. Add `[[services]]` binding in root `wrangler.toml`
4. Add routing in `src/router.ts`
5. Add entry in `cf-deploy.json` (before "router")

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/mcp` | MCP StreamableHTTP (JSON-RPC) |
| `POST` | `/api/cad/{modelId}/sync/{cmd}` | Execute command (sync) |
| `POST` | `/api/cad/{modelId}/async/{cmd}` | Queue command (async) |
| `GET` | `/api/cad/{modelId}/state` | Scene state |
| `GET` | `/api/cad/schema` | Command schema |
| `GET` | `/api/health` | Health check |

## Requirements

- Rust + wasm-pack
- Bun
- Node.js

## Configuration

| File | Description |
|------|-------------|
| `wrangler.toml` | Root router config (port 8788, service bindings) |
| `workers.mjs` | Worker registry (ports, build commands) |
| `run.mjs` | Dev/deploy orchestrator |
| `cf-deploy.json` | Cloudflare deploy metadata |
| `.env` | Default config (tracked) |
| `.env.local` | Secrets (not tracked) |
| `.mcp.json` | MCP server config (bridge → Worker /mcp) |
