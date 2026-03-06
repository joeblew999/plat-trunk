# AGENT.md

Project Context: plat-trunk

You are a smart systems architect and make sure you do things in the right way to ensure a clean system that avoids Technical Debt and makes it easy to extend the system without breaking things. 




**Runtime: bun** — all JS/TS runs through `bun`. Never use `npm`, `npx`, or `node` directly. Use `bun run`, `bun x`, `bun install`.

Browser + Cloudflare Workers CAD system. [truck](https://github.com/ricosjp/truck) B-Rep kernel (Rust/WASM) for 3D modeling, WebGPU for rendering, Automerge CRDT for collaboration.

## Quick Start
```sh
bun install             # Install dependencies (also installs systems/truck/web/node_modules)
bun run dev             # Start all workers + Vite dev server
# → UI with HMR: http://localhost:5173  (use this for development)
# → API/worker:  http://localhost:8789
# → Router:      http://localhost:8788  (serves built dist, run build:truck-web first)
# Ctrl+C to stop
```

## Commands
```sh
# Dev
bun run dev             # Start router + truck + test workers + Vite dev server (run.mjs)
# Use localhost:5173 for UI development — .ts changes hot-reload without restart

# Build
bun run build           # Build WASM + truck-web (Vite) + docs
bun run build:truck     # wasm-pack build + cargo run --bin generate-schema → cad-schema.json
bun run build:truck-web # Vite build → systems/truck/web/dist/ (served by wrangler)
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
- **Frontend**: Lit (Web Components) + Three.js (camera/orbit) + Datastar v1.0.0-RC.7 (signals) + DaisyUI/Tailwind v4 + WebGPU
  - All browser code in `systems/truck/web/*.ts` — built by Vite, no manual vendor bundles
  - Dev: `localhost:5173` (Vite with HMR) — proxies `/api` + `/mcp` to truck-cad (8789)
  - Prod: `vite build` → `dist/` → served by wrangler ASSETS binding
- **Sync**: Automerge CRDT for local-first op log + undo/redo
- **Camera**: Three.js OrbitControls → pushes 4x4 matrix to WASM each frame (Passive WASM)
- **BIM**: `ifc-lite` source in `.src/ifc-lite` for semantic building data

## Folder Layout

```
. (repo root = plat-router worker)
├── wrangler.toml          Router config (DOCS_ASSETS, TRUCK/TEST service bindings, custom domain)
├── src/router.ts          Routing logic (~70 lines: /docs/*, /test/*, /* passthrough)
├── workers.mjs            Thin aggregator — imports from each systems/*/system.mjs
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
│   │   ├── web/           Browser TypeScript (Vite project): *.ts, vite.config.ts, public/
│   │   │                  → dist/ (gitignored, built by `bun run build:truck-web`)
│   │   ├── worker/src/    Hono worker: index.ts (REST + OpenAPI + MCP), index.test.ts
│   │   └── tests/         Playwright E2E
│   ├── truck/cad-schema.json  GENERATED from Rust — drives Worker/MCP/OpenAPI/browser
│   ├── test/worker/       Test worker (port 5175, validates N-worker pattern)
│   ├── docs/website/      VitePress source (dist served by router DOCS_ASSETS)
│   └── ezpz/              KittyCAD kcl-ezpz integration
└── docs/adr/              Architecture Decision Records
```

## Schema-Driven Architecture

```
Rust structs (#[derive(Deserialize, JsonSchema)])
  → bun run build:truck          wasm-pack --release + cargo run --bin generate-schema
  → systems/truck/cad-schema.json                     [COMMITTED generated artifact]
  → bun run gen:openapi          scripts/gen-openapi.ts reads cad-schema.json
  → systems/truck/web/openapi.json                    [gitignored intermediate]
  → bun run gen:api-types        openapi-typescript + chain-origin header
  → systems/truck/web/api-types.ts                    [COMMITTED generated artifact]
  → bun run build:truck-web      Vite build (imports api-types.ts via openapi-fetch)
  → systems/truck/web/dist/                           [gitignored, served by wrangler]

  → Worker: OpenAPIHono routes use same cad-schema.json at runtime
  → /api/openapi.json            live spec endpoint (mirrors gen-openapi.ts exactly)
  → /mcp tools                   29 CAD tools generated from cad-schema.json
  → Browser: cadCommand() dispatches to same Rust execute()
```

**Add a Rust command** → `bun run build:truck` + `bun run gen:api-types` → schema + types regenerate → Worker/MCP/OpenAPI/browser all update. Nothing hand-written drifts.

**bun run build:truck-web** runs the full gen chain automatically (gen:api-types is a prerequisite).

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
1. bun run dev                      → builds both WASMs (sync + geometry), applies D1 migrations,
                                      starts Vite (5173) + wrangler workers, polls /api/health
   - Browser TS changes: HMR at localhost:5173 — NO restart needed
   - Worker TS changes: wrangler auto-reloads — NO restart needed
   - Rust changes: watchexec triggers WASM rebuild automatically
2. bun run build:truck              (only if Rust changed outside dev)
3. bun run test:api                 → no regressions
4. browser_navigate('http://localhost:5173') + browser_snapshot → verify in browser
5. bun run build:truck-web          → build dist/ before deploying
6. bun scripts/cf-deploy.ts upload  → deploy
7. wrangler versions deploy <id>@100% --yes → promote
8. browser_navigate (prod URL) + browser_snapshot → verify production
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

## Isomorphic WASM Core + D1 Op-Log (COMPLETE)

**truck-sync crate** (`systems/sync/crate/`) — Automerge-backed op log, no geometry knowledge.
- Op schema: `{id, type, params, enabled, timestamp, actorId, groupId?}` — matches JS `CadOperation` exactly
- WASM built twice per target: `--target web` → `web/pkg-sync/` (browser), `--target bundler` → `worker/pkg-sync/` (CF Worker)
- `bun run dev` builds both targets automatically via `DEV_BUILD` in `systems/sync/system.mjs`

**D1 op-log** (`systems/truck/worker/src/op-log.ts`):
- Migration: `systems/truck/worker/migrations/0001_op_log.sql` — auto-applied by `bun run dev`
- `POST /api/models/{id}/ops` — append op (op_json must be full Op schema JSON string)
- `GET /api/models/{id}/ops?since=N` — get ops with op_index > N (use `since=-1` for all)
- `GET /api/models/{id}/replay` — headless WASM replay → scene JSON array (same shape as export_scene)

**Browser entry point** (`systems/truck/web/main.ts`):
- Vite drops inline `<script type="module">` in `<body>` — always use `<script src="...">` in `<head>`
- `main.ts` = Datastar init + `boot()` — single entry point for Vite

**system.mjs pattern** — each system owns its config in `systems/{name}/system.mjs`:
- Exports `workers`, `devServers`, `DEV_BUILD`, `RELEASE_BUILD`
- `workers.mjs` is a thin aggregator — imports from each system.mjs, no system-specific logic
- Adding a new system = create `systems/{name}/system.mjs` + one import line in `workers.mjs`
- `bun run check:alignment` verifies all system.mjs files, wrangler.toml names, migrations, and crate coverage

**system.mjs worker config fields:**
- `migrate`: shell command run before wrangler starts (D1 migrations, schema seeds)
- `healthUrl`: polled after all workers start — dev script prints `ready ✓` when 200

## ADRs

Active plans live in `docs/adr/`. Currently: `0001-multi-actor-sync.md` (snapshot + multi-actor sync).
Historical ADRs were removed — their decisions are baked into the codebase and documented in this file.

## AI Agent Rules

1. **Code + automation = one atomic change** — every code change must simultaneously update the relevant `systems/{name}/system.mjs` (build/migrate/healthUrl), run.mjs, package.json scripts, and AGENT.md. A migration without a `migrate:` field, or a boot change without updating the dev workflow section, is an incomplete change. Never finish one without the other.
2. **Use bun run scripts** — never bypass with ad-hoc commands or manual config edits
2. **Schema first** — change `commands.rs` → `bun run build:truck` → everything downstream updates
3. **Single dispatch** — all mutations through `cadCommand()`, all state sync through `reconcile()`
4. **DRY** — `cf-deploy.json` owns deploy config, `cad-schema.json` owns commands. Import the JSON. Never duplicate into env vars, wrangler [vars], or hardcoded strings
5. **Isomorphic local/cloud** — relative paths in HTML (`/docs/`, `/api/health`). Workers redirect cross-worker paths to the router
6. **Verify with Playwright MCP** — always check fixes in browser before AND after deploy. Never assume
7. **No hand-writing** — Zod enums, MCP tools, OpenAPI paths are all auto-generated from schema
8. **data-testid** — all interactive HTML elements need them for testing
9. **No legacy/compat** — no existing users, no migration paths, clean code only
10. **ADR context** — read `docs/adr/` before proposing architectural changes
11. **Plans live in `docs/adr/`** — all implementation plans go in `docs/adr/` as numbered ADRs, never in agent-private folders (`.claude/plans/`, `.cursor/`, etc.). The ADR is the single source of truth shared by all agents and humans

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
