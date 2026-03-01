# Project Context: plat-trunk

**Runtime: bun** — all JS/TS runs through `bun`. Never use `npm`, `npx`, or `node` directly. Use `bun run`, `bun x`, `bun install`.

Browser + Cloudflare Workers CAD system. [truck](https://github.com/ricosjp/truck) B-Rep kernel (Rust/WASM) for 3D modeling, WebGPU for rendering, Automerge CRDT for collaboration.

## Quick Start
```sh
bun install             # Install dependencies
bun run dev             # Start all workers (localhost:8788)
# Ctrl+C to stop
```

## Commands
```sh
# Dev
bun run dev             # Start router + truck + test workers (run.mjs)

# Build
bun run build           # Build WASM + docs
bun run build:truck     # wasm-pack build + cargo run --bin generate-schema → cad-schema.json
bun run build:docs      # Build VitePress docs

# Test
bun run test            # All tests (cargo test + vitest)
bun run test:crate      # Rust unit tests
bun run test:api        # Worker API tests (vitest)
bun run test:e2e        # Playwright E2E tests

# Deploy
bun scripts/cf-deploy.ts upload --target truck   # Upload single worker
bun scripts/cf-deploy.ts upload --target router  # Upload router
bun run deploy                                   # Build + upload all
bun scripts/cf-deploy.ts promote --target truck  # Promote to production
bun scripts/cf-deploy.ts versions                # Regenerate cf-versions.json
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
- **Kernel**: Rust (`truck` B-Rep), vendor source in `.src/truck`
- **Backend**: Hono + Zod + `@hono/zod-openapi` (Cloudflare Workers)
- **Frontend**: Lit (Web Components) + Three.js (camera/orbit) + Datastar v1.0.0-RC.7 (signals) + DaisyUI/Tailwind + WebGPU
- **Sync**: Automerge CRDT for local-first op log + undo/redo
- **Camera**: Three.js OrbitControls → pushes 4x4 matrix to WASM each frame (Passive WASM, ADR-0013)
- **BIM**: `ifc-lite` source in `.src/ifc-lite` for semantic building data

## Folder Layout

```
. (repo root = plat-router worker)
├── wrangler.toml          Router config (DOCS_ASSETS, TRUCK/TEST service bindings, custom domain)
├── src/router.ts          Routing logic (~70 lines: /docs/*, /test/*, /* passthrough)
├── workers.mjs            Worker registry (name, dir, port, build command)
├── run.mjs                Dev orchestrator (spawns wrangler dev per worker)
├── package.json           All commands
├── cf-deploy.json         Deploy config: workers map, endpoints, account (SINGLE SOURCE OF TRUTH)
├── .mcp.json              MCP config: truck-cad bridge + Playwright WebGPU
├── scripts/
│   ├── cf-deploy.ts       Deploy lifecycle (upload, promote, smoke, versions)
│   ├── build-llm-docs.ts  LLM docs generator (llms.txt, llms-full.txt)
│   ├── mcp-bridge.ts      stdio ↔ HTTP proxy to Worker /mcp (retry + hot-reload)
│   └── mcp-setup.sh       Generates MCP configs for Gemini/Cursor
├── systems/
│   ├── truck/
│   │   ├── crate/src/     Rust: wasm_app.rs (SceneController), commands.rs (params + schema)
│   │   ├── web/           Static assets (HTML, JS, CSS, vendor libs, cf-versions.json)
│   │   ├── worker/src/    Hono worker: index.ts (REST + OpenAPI + MCP), index.test.ts
│   │   └── tests/         Playwright E2E
│   ├── truck/cad-schema.json  GENERATED from Rust — drives Worker/MCP/OpenAPI/browser
│   ├── test/worker/       Test worker (port 5175, validates N-worker pattern)
│   ├── docs/website/      VitePress source (dist served by router DOCS_ASSETS)
│   └── ezpz/              KittyCAD kcl-ezpz integration
└── docs/adr/              Architecture Decision Records
```

## Schema-Driven Architecture (ADR-005)

```
Rust structs (#[derive(Deserialize, JsonSchema)])
  → bun run build:truck (wasm-pack + generate-schema)
  → systems/truck/cad-schema.json
  → Worker: Zod enum + OpenAPI spec + route validation + /mcp tools
  → Browser: cadCommand() dispatches to same execute()
```

Add a command in Rust → `bun run build:truck` → schema regenerates → Worker/MCP/OpenAPI/tests all update automatically. Nothing hand-written drifts.

## Single Dispatch Path

```
Everything → cadCommand(type, params, opts) → ctrl.execute(type, json) [WASM]
                ↓ also: Automerge record, reconcile() → Datastar signals → DOM
```

## Deploy

Immutable UUID URL on every upload (`preview_urls = true`). Named aliases only at **PR previews** and **releases**.

**CI** (`.github/workflows/ci.yml`):
- All branches: `bun run build && bun run test`
- Push to main: upload truck + build docs + upload router
- PR opened: upload with `pr-{N}` aliases + sticky PR comment

## MCP

**Two MCP servers** (both configured in `.mcp.json`, both must always work):

1. **CAD MCP** — 29 tools via stdio bridge → Worker `/mcp` (stateless JSON-RPC)
   - Auto-routing: localhost → PR preview → fallback with retry
   - Hot-reload: polls schema version every 30s → `tools/list_changed`
2. **Playwright MCP** — browser automation with WebGPU (`scripts/playwright-mcp-claude.config.json`)

**Dev workflow** (MANDATORY — edit → test → verify → deploy → verify):
```
1. Edit code (TS auto-reloads, static assets served immediately — NO RESTART)
2. bun run build:truck              (only if Rust changed)
3. bun run test:api                 → no regressions
4. browser_navigate + browser_snapshot → verify in browser (Playwright MCP)
5. bun scripts/cf-deploy.ts upload  → deploy
6. wrangler versions deploy <id>@100% --yes → promote
7. browser_navigate (prod URL) + browser_snapshot → verify production
```

## Datastar Signals

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

See `docs/adr/README.md`. Key: ADR-001 (3-layer arch), ADR-004 (hybrid BIM), ADR-005 (schema-driven), ADR-008 (undo/redo), ADR-010 (MCP+OpenAPI), ADR-013 (Lit+Three+Passive WASM), ADR-017 (versioned deploy).

## AI Agent Rules

1. **Use bun run scripts** — never bypass with ad-hoc commands or manual config edits
2. **Schema first** — change `commands.rs` → `bun run build:truck` → everything downstream updates
3. **Single dispatch** — all mutations through `cadCommand()`, all state sync through `reconcile()`
4. **DRY** — `cf-deploy.json` owns deploy config, `cad-schema.json` owns commands. Import the JSON. Never duplicate into env vars, wrangler [vars], or hardcoded strings
5. **Isomorphic local/cloud** — relative paths in HTML (`/docs/`, `/api/health`). Workers redirect cross-worker paths to the router
6. **Verify with Playwright MCP** — always check fixes in browser before AND after deploy. Never assume
7. **No hand-writing** — Zod enums, MCP tools, OpenAPI paths are all auto-generated from schema
8. **data-testid** — all interactive HTML elements need them for testing
9. **No legacy/compat** — no existing users, no migration paths, clean code only
10. **ADR context** — read `docs/adr/README.md` before proposing architectural changes

## Library Reference
- Automerge: `systems/docs/website/public/llms/automerge-llms-full.txt`
- kkrpc: `systems/docs/website/public/llms/kkrpc-llms-full.txt`
- Cross-language interop: `.claude/skills/interop/SKILL.md`

## Deployed URLs

| URL | Purpose |
|-----|---------|
| `https://cad.ubuntusoftware.net` | Production (custom domain → plat-router) |
| `https://truck-cad.gedw99.workers.dev` | Truck worker (workers.dev) |
| `https://cad.ubuntusoftware.net/docs/` | Docs (VitePress via router) |
| `http://localhost:8788` | Local dev (router → all workers) |
