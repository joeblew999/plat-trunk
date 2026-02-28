# Project Context: plat-trunk

Browser + Cloudflare Workers CAD system. [truck](https://github.com/ricosjp/truck) B-Rep kernel (Rust/WASM) for 3D modeling, WebGPU for rendering, Automerge CRDT for collaboration.

## Quick Start
```sh
bun install             # Install dependencies
bun run dev             # Start all workers (localhost:8788)
# Ctrl+C to stop
```

## Key Commands
```sh
bun run dev             # Start router + truck + test workers (run.mjs)
bun run build           # Build WASM + docs
bun run test            # Run all tests (cargo test + vitest)
bun run deploy          # Build + upload all workers
bun run build:truck     # WASM compile + schema generation only
bun run build:docs      # Build VitePress docs only
bun run test:crate      # Rust unit tests only
bun run test:api        # Worker API tests only (vitest)
bun run test:e2e        # Playwright E2E tests
```

## Architecture

**Root router pattern** — thin router at repo root, sub-workers per system:

```
Client → Router (port 8788, plat-router)
  /docs/*  → DOCS_ASSETS binding (VitePress static files)
  /test/*  → TEST service binding → test-worker (port 5175)
  /*       → TRUCK service binding → truck-cad (port 8789)
```

Each system = Rust crate → WASM → schema → worker with MCP endpoint. Truck is the first. The test worker validates the N-worker topology. 3MB worker size limit means WASM-heavy systems must be separate workers.

## Core Stack
- **Kernel**: Rust (`truck` B-Rep). We build directly on the vendor source in `.src/truck` (Topology, Assembly, STEP-IO, etc).
- **Backend**: Hono + Zod + `@hono/zod-openapi` (Cloudflare Workers)
- **Frontend**: Lit (Web Components) + Three.js (camera/orbit) + Datastar v1.0.0-RC.7 (reactive signals) + DaisyUI/Tailwind + WebGPU
- **Sync**: Automerge CRDT for local-first op log + undo/redo
- **Camera**: Three.js OrbitControls owns camera → pushes 4x4 matrix to WASM each frame (Passive WASM, ADR-0013)
- **Orchestration**: `bun run` scripts + `run.mjs` (spawns wrangler dev per worker)
- **BIM**: Building on `ifc-lite` source in `.src/ifc-lite` for semantic building data.

## Folder Layout

```
. (repo root = plat-router worker)
├── wrangler.toml          Root router config (port 8788, DOCS_ASSETS, service bindings)
├── src/router.ts          Routing logic (~70 lines)
├── workers.mjs            Worker registry (name, dir, port, build command)
├── run.mjs                Dev/deploy orchestrator (spawns child processes)
├── package.json           All commands (bun run dev/build/test/deploy)
├── cf-deploy.json         Deploy metadata (workers, endpoints, account)
├── scripts/
│   ├── cf-deploy.ts       Cloudflare deploy lifecycle (upload, promote, smoke)
│   ├── mcp-bridge.ts      stdio ↔ HTTP proxy to Worker /mcp
│   └── mcp-setup.sh       Generates MCP configs for Gemini/Cursor
├── systems/
│   ├── truck/             CAD kernel — Rust WASM + Cloudflare Worker + browser GUI
│   │   ├── crate/         Rust source (wasm_app.rs, commands.rs)
│   │   ├── web/           Static assets (HTML, JS, CSS, vendor libs) — served by truck worker
│   │   ├── worker/        Hono + Zod Worker (port 8789, own wrangler.toml)
│   │   ├── tests/         Playwright E2E + UI tests
│   │   └── cad-schema.json  Generated schema (Rust → JSON, checked in)
│   ├── test/worker/       Test worker (port 5175, validates N-worker pattern)
│   ├── docs/website/      VitePress source + public assets (dist served by router)
│   └── ezpz/              KittyCAD kcl-ezpz integration
├── docs/adr/              Architecture Decision Records
└── .mcp.json              Claude Code MCP config
```

## Key Files

### Router (repo root)
- `wrangler.toml` — plat-router config: DOCS_ASSETS binding, TRUCK/TEST service bindings, custom domain
- `src/router.ts` — /docs/* (VitePress clean URLs + redirect rewriting), /test/* (strip + forward), /* (truck passthrough)
- `workers.mjs` — Single registry of all workers (name, dir, port, inspectorPort, build)
- `run.mjs` — Dev: spawns wrangler dev per worker with colored output. Deploy: builds + uploads.

### Rust (kernel + schema)
- `systems/truck/crate/src/wasm_app.rs` — SceneController + `execute()` dispatch
- `systems/truck/crate/src/commands.rs` — Typed param structs + `build_schema()`
- `systems/truck/crate/src/bin/generate_schema.rs` — Native binary for schema generation

### JavaScript (browser)
- `systems/truck/web/state.js` — `cadCommand()`, `reconcile()`, `executeWasm()`, `renderObjectList()`
- `systems/truck/web/history.js` — `CadDocumentManager`: Automerge op log, undo/redo, timeline UI
- `systems/truck/web/ui.js` — Gizmo mouse handlers, keyboard shortcuts, sheet toggles
- `systems/truck/web/sketch.js` — Sketch tool (line/rect/triangle → extrude)
- `systems/truck/web/cad-viewport.js` — Lit web component: WebGPU canvas, Three.js OrbitControls, gizmo traffic controller
- `systems/truck/web/worker-relay.js` — SSE relay to Worker (only loaded when not local mode)
- `systems/truck/web/index.html` — DaisyUI + Datastar signals, outliner, properties panel, control plane header
- `systems/truck/web/style.css` — DaisyUI/Tailwind theming

### Worker (Cloudflare)
- `systems/truck/worker/src/index.ts` — Hono: `mountModule()` factory → REST routes + OpenAPI; stateless `/mcp` endpoint (MCP StreamableHTTP JSON-RPC)
- `systems/truck/worker/src/index.test.ts` — Vitest: API + MCP contract tests (32 tests)

### Generated artifacts
- `systems/truck/cad-schema.json` — 20 WASM commands + 7 control plane commands, auto-generated from Rust (checked into git)
- `systems/truck/web/cf-versions.json` — Version picker data (releases + PR previews)
- `systems/truck/web/vendor/datastar.js` — Vendored Datastar v1.0.0-RC.7
- `systems/truck/web/vendor/automerge-bundle.js` — Vendored Automerge
- `systems/truck/web/vendor/lit.js` — Vendored Lit (Web Components)
- `systems/truck/web/vendor/three.js` — Vendored Three.js r183

### Config
- `.mcp.json` — Claude Code MCP config (`truck-cad` → stdio bridge → Worker `/mcp`)
- `.gemini/settings.json` — Gemini CLI MCP config (generated by `scripts/mcp-setup.sh`)
- `scripts/mcp-bridge.ts` — Pure stdio ↔ HTTP proxy to Worker `/mcp` with retry + hot-reload polling
- `scripts/mcp-setup.sh` — Generates MCP configs for Gemini/Cursor (bridge + Playwright WebGPU)
- `scripts/playwright-mcp.config.json` — Playwright browser launch args for WebGPU
- `cf-deploy.json` — Shared Cloudflare config (workers map, endpoints, account)

## Schema-Driven Architecture (ADR-005)

**Single source of truth**: Rust param structs generate everything.

```
Rust structs (#[derive(Deserialize, JsonSchema)])
  → cargo run --bin generate-schema
  → systems/truck/cad-schema.json (34 WASM commands + 7 control plane commands)
  → Worker: Zod enum + OpenAPI spec + route validation + /mcp tools
  → Bridge: pure proxy to Worker /mcp (no schema reading)
  → Browser: cadCommand() dispatches to same execute()
  → controlPlane section: JS-layer commands (undo, redo, set_mode, clear_data, etc.)
```

**The contract chain**: Add a command in Rust → `bun run build:truck` → schema regenerates → Worker/MCP/OpenAPI/tests all update automatically. Nothing hand-written drifts.

## Single Dispatch Path

```
Everything → cadCommand(type, params, opts) → ctrl.execute(type, json) [WASM]
                ↓ also: Automerge record, reconcile() → Datastar, state POST
```

- `cadCommand()` is the ONE entry point for all mutations (GUI, MCP, API, tests)
- `execute(type, json)` in Rust handles all 20 WASM command types; JS-layer handles 7 control plane commands
- `reconcile()` reads WASM state → pushes to Datastar signals → updates DOM
- Gizmo drag stays direct WASM (60fps latency requirement)

## Deploy (versioned — Cloudflare Workers)

Every upload gets an **immutable UUID URL** automatically (`preview_urls = true` in wrangler.toml).
Named aliases are only created at two moments: **PR previews** and **releases**.

```sh
# Upload a single worker
bun scripts/cf-deploy.ts upload --target truck
bun scripts/cf-deploy.ts upload --target router

# Upload all workers
bun run deploy

# PR preview (CI does this automatically)
bun scripts/cf-deploy.ts upload --target truck --tag pr-42 --preview-alias pr-42

# Promote to production
bun scripts/cf-deploy.ts promote --target truck

# List versions
bun scripts/cf-deploy.ts list --target truck
```

**CI pipeline** (`.github/workflows/ci.yml`):
- All branches: `bun run build && bun run test`
- Push to main: upload truck + build docs + upload router
- PR opened: upload preview versions with `pr-{N}` aliases + sticky PR comment

## MCP Architecture

**Single implementation**: Worker `/mcp` endpoint (stateless MCP StreamableHTTP, JSON-RPC).
Handles `initialize`, `tools/list`, `tools/call` — dispatches to the same `waitForCommand()` pipeline as REST. 29 tools total (20 WASM commands + 7 control plane + 2 meta: `cad_health`, `cad_schema`).

**Bridge** (`scripts/mcp-bridge.ts`): pure stdio ↔ HTTP proxy. Adds:
- **Auto-routing**: tries localhost first, falls back to PR preview URL if local server is down
- Retry with exponential backoff (6 attempts, 1s→32s) — survives server restarts
- Schema version polling (every 30s) → sends `tools/list_changed` notification — **hot-reload without client restart**

URL resolution (no `CAD_URL` set):
1. `localhost:8788` — if dev server is running (quick health check)
2. `pr-{N}-truck-cad.gedw99.workers.dev` — if current branch has an open PR
3. `localhost:8788` — fallback (retry waits for server to start)

| Mode | Config | Hot-reload |
|------|--------|------------|
| **Auto** | No config needed — detects local or PR preview | Version polling + retry |
| **Explicit** | `CAD_URL=https://cad.ubuntusoftware.net` | Version polling on deploy |
| **Direct HTTP** | `"type": "http"` → `/mcp` (no bridge needed) | Manual restart only |

### Dev MCP Servers

1. **CAD MCP** — `cad_add_cube`, `cad_translate`, `cad_boolean_subtract`, etc.
2. **Playwright MCP** — `browser_navigate`, `browser_snapshot`, `browser_click`, etc.
   - WebGPU-enabled via `scripts/playwright-mcp.config.json`
   - Always available (independent of dev server)

**Interactive verification pattern**:
```
1. Make code change
2. bun run build:truck (if Rust changed)
3. cad_add_cube({size: 1})            → drive via CAD MCP
4. browser_snapshot                    → verify via Playwright MCP
5. Write equivalent Playwright test
6. bun run test:e2e                   → automate
```

## Workflow: Real-Time BIM & Design Review

The platform is designed for **Real-Time Architectural Coordination**:
- **Semantic BIM**: Using `ifc-lite` to parse building elements (Walls, Slabs) and mapping them to `truck-assembly` hierarchies.
- **Immediate Visualization**: No batch exports. IFC files are loaded and rendered in the browser instantly via WebGPU.
- **Live Clash Detection**: Leveraging `truck-shapeops` to perform boolean intersections between architectural and mechanical components in real-time as they are modified.
- **Collaborative Design**: Automerge ensures all designers see design modifications and clash results instantly without coordination meetings.

## Datastar Signals (UI State)

| Signal | Source | Purpose |
|--------|--------|---------|
| `selectedId` | reconcile() | Currently selected object |
| `boolSelA`, `boolSelB` | reconcile() | Boolean operation A/B picks |
| `boolReady`, `boolLabel` | reconcile() | Boolean UI state |
| `objectCount`, `sceneEmpty` | reconcile() | Scene stats |
| `canUndo`, `canRedo` | reconcile() | History navigation |
| `statusMode` | reconcile() | Current mode (Local/Online) |
| `feedback`, `feedbackError` | cadCommand() | User messages |

## Window Globals (browser)

7 globals, all needed:
- `sceneController` — Rust WASM SceneController instance
- `_ds` — Datastar instance (signals at `_ds.root.*`)
- `cadCommand` — Single dispatch function
- `cadDocManager` — Automerge CadDocumentManager
- `setSelection` — Legacy (being removed, use `cadCommand('select')`)
- `cadUI` — UI state helpers
- `showFeedbackSignal` — Toast feedback display

## ADRs

See `docs/adr/README.md` for the full index. Key decisions:
- **ADR-001**: Three-layer architecture (HTTP API, GUI push, WASM boundary)
- **ADR-004**: Hybrid BIM — Mechanical (truck B-Rep) + Architectural (ifc-lite IFC)
- **ADR-005**: Schema-driven unified API — Rust is single source of truth
- **ADR-008**: Undo/Redo — Automerge op log with timeline UI
- **ADR-010**: MCP + OpenAPI stack — Hono + Zod-OpenAPI + AI agent integration
- **ADR-011**: Control Plane — undo/redo, mode, documents, sync as API commands
- **ADR-013**: Lit + Three.js + Passive WASM — JS owns camera, WASM renders
- **ADR-017**: Versioned Deployments — Cloudflare Workers gradual rollout

## AI Agent Rules

1. **Use npm scripts**: All commands go through `package.json` scripts. `bun run dev` starts everything, `bun run test` tests everything.
   - NEVER manually edit MCP configs (`~/.claude/mcp.json`, `~/.claude/settings.json`, etc.)
   - NEVER use curl to call MCP endpoints — use native MCP tools (`cad_add_cube`, etc.)
2. **Schema first**: Never add/change API without updating `commands.rs` first, then `bun run build:truck`
3. **Test driven**: Use `bun run test` to verify changes across the entire stack
4. **Single dispatch**: ALL mutations go through `cadCommand()` — never call WASM directly (except gizmo drag)
5. **Don't hand-write**: Zod enums, MCP tool registrations, OpenAPI paths — all auto-generated from schema
6. **reconcile() only**: Never write to Datastar signals directly — `reconcile()` is the single sync point
7. **data-testid**: All interactive HTML elements must have `data-testid` attributes for testing
8. **ADR context**: Read `docs/adr/README.md` before proposing architectural changes
9. **No legacy / backward compatibility**: There are no existing users. Do not add migration paths, legacy fallback code, or backward-compat shims. Write clean code for the current design only.

## Library Reference (for AI assistants)
- Automerge patterns & API: `systems/docs/website/public/llms/automerge-llms-full.txt`
- kkrpc patterns & API: `systems/docs/website/public/llms/kkrpc-llms-full.txt`
- Cross-language interop (Go, Python, Rust, Swift): `.claude/skills/interop/SKILL.md`

## Deployed URLs

| URL | Purpose |
|-----|---------|
| `https://cad.ubuntusoftware.net` | Production (custom domain → plat-router) |
| `https://truck-cad.gedw99.workers.dev` | Truck worker (workers.dev) |
| `https://cad.ubuntusoftware.net/docs/` | Docs (VitePress via router DOCS_ASSETS) |
| `https://cad.ubuntusoftware.net/docs/llms.txt` | LLM docs (auto-generated) |
| `http://localhost:8788` | Local dev (router → all workers via `bun run dev`) |
