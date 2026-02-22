# plat-trunk

Browser + Cloudflare Workers CAD system. [truck](https://github.com/ricosjp/truck) B-Rep kernel → WASM → WebGPU rendering. Hono API for REST, SSE, and MCP. Humans and AI agents share the same command pipeline.

**Stack**: Rust/WASM · Hono + Zod · MCP · Automerge CRDT · Datastar · Cloudflare Workers

## URLs

| Environment | URL |
|-------------|-----|
| Production | https://cad.ubuntusoftware.net |
| Staging | https://truck-cad.gedw99.workers.dev |
| Local | http://localhost:8788 |
| API Docs | http://localhost:8788/api-docs |
| MCP | http://localhost:8788/mcp |
| GitHub | https://github.com/joeblew999/plat-trunk |
| CF Deployments | [Dashboard](https://dash.cloudflare.com/7384af54e33b8a54ff240371ea368440/workers/services/view/truck-cad/production/deployments) |

## Quick Start

```bash
curl -fsSL https://github.com/joeblew999/ubuntu-website/releases/latest/download/install.sh | bash
task deps:install
task truck:gui:build
task truck:gui:serve      # → localhost:8788
```

## MCP (AI Agent Access)

```
AI Agent → Bridge (stdio) → Worker /mcp (JSON-RPC) → SSE relay → browser WASM → result back
```

The browser must be open — it runs the WASM kernel. The Worker relays commands via SSE.

29 tools: 27 CAD commands + `cad_health` + `cad_schema`.

### Architecture

**Worker `/mcp`** — single MCP implementation (stateless JSON-RPC, no SDK at runtime).

**Bridge** (`scripts/mcp-bridge.ts`) — pure stdio ↔ HTTP proxy to `/mcp`. Adds retry (survives server restarts) and schema version polling (hot-reload tools without restarting AI client). Works for dev AND production — just set `CAD_URL`.

### Setup

**With bridge** (recommended — hot-reload + retry):
```json
{ "mcpServers": { "truck-cad": { "command": "bun", "args": ["scripts/mcp-bridge.ts"], "env": { "CAD_URL": "http://localhost:8788" } } } }
```
For production: set `CAD_URL` to `https://cad.ubuntusoftware.net`.

**Direct HTTP** (simpler, no hot-reload):
```json
{ "mcpServers": { "truck-cad": { "type": "http", "url": "https://cad.ubuntusoftware.net/mcp" } } }
```

**Local dev**:
```bash
task truck:gui:serve          # 1. start server
open http://localhost:8788    # 2. open browser
claude                        # 3. start Claude Code (bridge auto-connects)
```

### Troubleshooting

| Problem | Fix |
|---------|-----|
| No tools in Claude | Server wasn't running at startup — restart Claude |
| "No browser connected" | Open http://localhost:8788 |
| "Browser did not respond within 10s" | Foreground the browser tab, refresh if needed |

## REST API

All routes are model-scoped (`{modelId}` defaults to `default`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/mcp` | MCP StreamableHTTP (JSON-RPC) |
| `POST` | `/api/cad/{modelId}/sync/{cmd}` | Execute command (sync, 10s timeout) |
| `POST` | `/api/cad/{modelId}/async/{cmd}` | Queue command (async) |
| `POST` | `/api/cad/{modelId}/exec` | Polymorphic queue (legacy) |
| `GET` | `/api/cad/{modelId}/result/{id}` | Poll result |
| `GET` | `/api/cad/{modelId}/state` | Scene state |
| `POST` | `/api/cad/{modelId}/state` | Push state (`broadcast: true` for SSE) |
| `GET` | `/api/cad/{modelId}/events` | SSE stream |
| `GET` | `/api/cad/schema` | Command schema (auto-generated from Rust) |

## Tests & Docs

Tests and docs are the same pipeline. E2E tests produce the screenshots, videos, and example scenes that the Hugo docs site references.

```
cad.spec.ts + sketch.spec.ts  ──SCREENSHOTS=1──→  docs/hugo/static/screenshots/*.png
                               ──EXAMPLES=1────→  web/gui/examples/*.json
doc-videos.spec.ts             ──always records──→  docs/hugo/static/videos/*.webm
                                                          ↓
                                                    Hugo site + R2
```

Hugo pages (`docs/hugo/content/docs/user/`) reference these by name. Test output names must match.

```bash
# Setup (one-time)
task truck:test:install       # Playwright + Chrome

# Rust (no server needed)
task truck:test               # truck library tests
task truck:test:crate         # truck-webgpu-gui crate tests
task truck:test:api           # Hono API tests (vitest)

# E2E (requires gui:serve running)
task truck:test:e2e           # Fast
task truck:test:e2e:slow      # + pauses + video (SLOW=1)
task truck:test:sketch        # Sketch tests only
task truck:test:sync          # Cross-tab Automerge sync (runs alone)
task truck:test:videos        # Record doc videos (webm)
task truck:test:all           # All tests + screenshots + examples + videos

# Docs (same tests, pointed at BASE_URL, uploads to R2)
task truck:docs:publish       # Screenshots + videos → R2
task truck:ci                 # Full CI: cargo check + test + WASM build
```

Env flags: `SLOW=1` `SCREENSHOTS=1` `EXAMPLES=1` `BASE_URL=https://...`

## Commands

```bash
task truck:gui:build          # WASM → web/gui/pkg-browser-renderer/
task truck:gui:serve          # Local dev (localhost:8788)
task truck:gui:deploy         # Deploy to Cloudflare Workers
task truck:deploy:full        # gui:deploy + docs:publish
```

## Requirements

- [task](https://taskfile.dev)
- [process-compose](https://github.com/F_S_M/process-compose)
- Rust
- Go 1.23+

## Configuration

| File | Description |
|------|-------------|
| `.env` | Default config (tracked), `PC_PORT_NUM=8000` |
| `.env.local` | Secrets (not tracked) |
| `.mcp.json` | MCP server config (bridge for dev, HTTP for production) |
