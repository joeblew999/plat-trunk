# plat-trunk

Browser + Cloudflare Workers CAD system. [truck](https://github.com/ricosjp/truck) B-Rep kernel → WASM → WebGPU rendering. Hono API for REST, SSE, and MCP. Humans and AI agents share the same command pipeline.

**Stack**: Rust/WASM · Hono + Zod · MCP · Automerge CRDT · Datastar · Cloudflare Workers

## URLs

| Environment | URL |
|-------------|-----|
| Production | https://cad.ubuntusoftware.net |
| Staging | https://truck-cad.gedw99.workers.dev |
| Local | http://localhost:8787 |
| API Docs | http://localhost:8787/api-docs |
| MCP | http://localhost:8787/mcp |
| GitHub | https://github.com/joeblew999/plat-trunk |

## Quick Start

```bash
curl -fsSL https://github.com/joeblew999/ubuntu-website/releases/latest/download/install.sh | bash
xplat task deps:install
xplat task truck:gui:build
xplat task truck:gui:serve      # → localhost:8787
```

## MCP (AI Agent Access)

```
Claude → POST /mcp → Worker queues → SSE relay → browser WASM → result back
```

The browser must be open — it runs the WASM kernel. The Worker relays commands via SSE.

### Tools

| Tool | Params |
|------|--------|
| `add_cube` | `size` |
| `add_sphere` | `radius` |
| `add_cylinder` | `radius`, `height` |
| `add_torus` | `majorRadius`, `minorRadius` |
| `translate` | `objectId`, `dx`, `dy`, `dz` |
| `boolean_union` | `idA`, `idB` |
| `boolean_subtract` | `idA`, `idB` |
| `boolean_intersect` | `idA`, `idB` |
| `delete_object` | `objectId` |
| `clear_scene` | — |
| `get_scene_state` | — |
| `export_scene` | — |
| `import_scene` | `json` |
| `set_object_color` | `objectId`, `r`, `g`, `b`, `a` |
| `get_object_style` | `objectId` |

### Setup

**Order matters**: server → browser → AI client.

```bash
xplat task truck:gui:serve          # 1. start server
open http://localhost:8787           # 2. open browser
claude                               # 3. start Claude Code
```

Config is already in `.claude/settings.json`:
```json
{ "mcpServers": { "truck-cad": { "type": "url", "url": "http://localhost:8787/mcp" } } }
```

For Claude Desktop, add the same to `~/Library/Application Support/Claude/claude_desktop_config.json`.

For production, use `https://cad.ubuntusoftware.net/mcp` instead.

### Troubleshooting

| Problem | Fix |
|---------|-----|
| No tools in Claude | Server wasn't running at startup — restart Claude |
| "No browser connected" | Open http://localhost:8787 |
| "Browser did not respond within 10s" | Foreground the browser tab, refresh if needed |

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/cad/exec` | Queue command (async) |
| `POST` | `/api/cad/exec-wait` | Execute command (sync, 10s timeout) |
| `GET` | `/api/cad/result/:id` | Poll result |
| `GET` | `/api/cad/state` | Scene state |
| `POST` | `/api/cad/state` | Push state (`broadcast: true` for SSE) |
| `GET` | `/api/cad/events` | SSE stream |
| `GET` | `/api/cad/schema` | Command types + params |

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
xplat task truck:test:install       # Playwright + Chrome

# Rust (no server needed)
xplat task truck:test               # truck library tests
xplat task truck:test:crate         # truck-webgpu-gui crate tests
xplat task truck:test:api           # Hono API tests (vitest)

# E2E (requires gui:serve running)
xplat task truck:test:e2e           # Fast
xplat task truck:test:e2e:slow      # + pauses + video (SLOW=1)
xplat task truck:test:sketch        # Sketch tests only
xplat task truck:test:sync          # Cross-tab Automerge sync (runs alone)
xplat task truck:test:videos        # Record doc videos (webm)
xplat task truck:test:all           # All tests + screenshots + examples + videos

# Docs (same tests, pointed at BASE_URL, uploads to R2)
xplat task truck:docs:publish       # Screenshots + videos → R2
xplat task truck:ci                 # Full CI: cargo check + test + WASM build
```

Env flags: `SLOW=1` `SCREENSHOTS=1` `EXAMPLES=1` `BASE_URL=https://...`

## Commands

```bash
xplat task truck:gui:build          # WASM → web/gui/pkg-browser-renderer/
xplat task truck:gui:serve          # Local dev (localhost:8787)
xplat task truck:gui:deploy         # Deploy to Cloudflare Workers
xplat task truck:deploy:full        # gui:deploy + docs:publish
```

## Requirements

- [xplat](https://github.com/joeblew999/ubuntu-website) (bundles task + process-compose)
- Rust
- Go 1.23+

## Configuration

| File | Description |
|------|-------------|
| `.env` | Default config (tracked), `PC_PORT_NUM=8000` |
| `.env.local` | Secrets (not tracked) |
| `xplat.yaml` | Manifest (source of truth) |
| `.claude/settings.json` | MCP server config |
