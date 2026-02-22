# Project Context: plat-trunk

Browser + Cloudflare Workers CAD system. [truck](https://github.com/ricosjp/truck) B-Rep kernel (Rust/WASM) for 3D modeling, WebGPU for rendering, Automerge CRDT for collaboration.

## Core Stack
- **Kernel**: Rust (`truck` B-Rep). We build directly on the vendor source in `.src/truck` (Topology, Assembly, STEP-IO, etc).
- **Backend**: Hono + Zod + `@hono/zod-openapi` (Cloudflare Workers)
- **Frontend**: Datastar v1.0.0-RC.7 (reactive signals) + DaisyUI/Tailwind + WebGPU
- **Sync**: Automerge CRDT for local-first op log + undo/redo
- **Orchestration**: `task` (Taskfile) + `process-compose`
- **BIM**: Building on `ifc-lite` source in `.src/ifc-lite` for semantic building data.

## Workflow: Real-Time BIM & Design Review

The platform is designed for **Real-Time Architectural Coordination**:
- **Semantic BIM**: Using `ifc-lite` to parse building elements (Walls, Slabs) and mapping them to `truck-assembly` hierarchies.
- **Immediate Visualization**: No batch exports. IFC files are loaded and rendered in the browser instantly via WebGPU.
- **Live Clash Detection**: Leveraging `truck-shapeops` to perform boolean intersections between architectural and mechanical components in real-time as they are modified.
- **Collaborative Design**: Automerge ensures all designers see design modifications and clash results instantly without coordination meetings.

## Schema-Driven Architecture (ADR-005)

**Single source of truth**: Rust param structs generate everything.

```
Rust structs (#[derive(Deserialize, JsonSchema)])
  → cargo run --bin generate-schema
  → web/cad-schema.json (34 commands)
  → Worker: Zod enum + MCP tools + OpenAPI spec + route validation
  → Browser: cadCommand() dispatches to same execute()
```

**The contract chain**: Add a command in Rust → `task truck:gui:build` → schema regenerates → Worker/MCP/OpenAPI/tests all update automatically. Nothing hand-written drifts.

## Single Dispatch Path

```
Everything → cadCommand(type, params, opts) → ctrl.execute(type, json) [WASM]
                ↓ also: Automerge record, reconcile() → Datastar, state POST
```

- `cadCommand()` is the ONE entry point for all mutations (GUI, MCP, API, tests)
- `execute(type, json)` in Rust handles all 27 command types
- `reconcile()` reads WASM state → pushes to Datastar signals → updates DOM
- Gizmo drag stays direct WASM (60fps latency requirement)

## Key Files

### Rust (kernel + schema)
- `crates/truck-webgpu-gui/src/wasm_app.rs` — SceneController + `execute()` dispatch
- `crates/truck-webgpu-gui/src/commands.rs` — Typed param structs + `build_schema()`
- `crates/truck-webgpu-gui/src/bin/generate_schema.rs` — Native binary for schema generation

### JavaScript (browser, 7 files)
- `web/gui/state.js` — `cadCommand()`, `reconcile()`, `executeWasm()`, `renderObjectList()`
- `web/gui/history.js` — `CadDocumentManager`: Automerge op log, undo/redo, timeline UI
- `web/gui/ui.js` — Gizmo mouse handlers, keyboard shortcuts, sheet toggles
- `web/gui/sketch.js` — Sketch tool (line/rect/triangle → extrude)
- `web/gui/worker-relay.js` — SSE relay to Worker (only loaded when not local mode)
- `web/gui/index.html` — DaisyUI + Datastar signals, outliner, properties panel
- `web/gui/style.css` — DaisyUI/Tailwind theming

### Worker (Cloudflare)
- `systems/truck/worker/src/index.ts` — Hono: `mountModule()` factory → routes + MCP + OpenAPI
- `systems/truck/worker/src/index.test.ts` — Vitest: API + MCP contract tests

### Generated artifacts
- `web/cad-schema.json` — 34 commands, auto-generated from Rust (checked into git)
- `web/gui/vendor/datastar.js` — Vendored Datastar v1.0.0-RC.7
- `web/gui/vendor/automerge-bundle.js` — Vendored Automerge

### Config
- `.mcp.json` — MCP server registration for Claude Code (`truck-cad` → localhost:8787/mcp)
- `process-compose.yml` — gui-worker + shape-viewer processes
- `Taskfile.yml` — Root: includes truck, envsubst, gh, ezpz, docs, skills
- `systems/truck/Taskfile.truck.yml` — All truck build/test/deploy tasks

## Commands

### Daily workflow
```sh
task up                    # Start all services via process-compose TUI
task down                  # Stop all services
task truck:gui:serve       # Dev server only (localhost:8787) — builds WASM + registers MCP
task truck:test:full       # Build → start server → run ALL tests → stop (CI-ready)
```

### Build
```sh
task truck:gui:build       # WASM compile + schema generation
task truck:gui:schema      # Regenerate cad-schema.json only (fast)
task truck:ci              # Full CI: cargo check + test + WASM build
```

### Test layers (schema contract pyramid)
```sh
task truck:test:api        # L2: Worker/MCP contract (vitest, no server needed)
task truck:test:e2e        # L3: cadCommand integration (Playwright, needs gui:serve)
task truck:test:ui         # L4: UI wiring — toolbar, outliner, canvas (Playwright)
task truck:test:sketch     # L1: WASM kernel — sketch, extrude (Playwright)
task truck:test:sync       # Cross-tab Automerge sync (Playwright)
task truck:test:all        # All of the above (needs gui:serve running)
```

### Deploy
```sh
task truck:gui:deploy      # Deploy Worker to Cloudflare
task deploy                # Deploy Worker + docs
```

## MCP Dev Workflow

Two MCP servers power interactive development:

1. **CAD MCP** (`http://localhost:8787/mcp`) — `cad_add_cube`, `cad_translate`, etc.
   - Auto-registered by `task truck:gui:serve` (creates `.mcp.json` + `claude mcp add`)
   - Restart Claude Code after first registration to load tools
2. **Playwright MCP** — `browser_navigate`, `browser_snapshot`, etc. (always available)

**Interactive verification pattern**:
```
1. Make code change
2. task truck:gui:build (if Rust changed)
3. cad_add_cube({size: 1})            → drive via CAD MCP
4. browser_snapshot                    → verify via Playwright MCP
5. Write equivalent Playwright test
6. task truck:test:e2e                → automate
```

## Datastar Signals (UI State)

| Signal | Source | Purpose |
|--------|--------|---------|
| `selectedId` | reconcile() | Currently selected object |
| `boolSelA`, `boolSelB` | reconcile() | Boolean operation A/B picks |
| `boolReady`, `boolLabel` | reconcile() | Boolean UI state |
| `objectCount`, `sceneEmpty` | reconcile() | Scene stats |
| `canUndo`, `canRedo` | reconcile() | History navigation |
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

## AI Agent Rules

1. **Schema first**: Never add/change API without updating `commands.rs` first, then `task truck:gui:schema`
2. **Test driven**: Use `task truck:test:full` to verify changes across the entire stack
3. **Single dispatch**: ALL mutations go through `cadCommand()` — never call WASM directly (except gizmo drag)
4. **Don't hand-write**: Zod enums, MCP tool registrations, OpenAPI paths — all auto-generated from schema
5. **reconcile() only**: Never write to Datastar signals directly — `reconcile()` is the single sync point
6. **data-testid**: All interactive HTML elements must have `data-testid` attributes for testing
7. **ADR context**: Read `docs/adr/README.md` before proposing architectural changes

## Library Reference (for AI assistants)
- Automerge patterns & API: `docs/llms/automerge-llms-full.txt`
- kkrpc patterns & API: `docs/llms/kkrpc-llms-full.txt`
- Cross-language interop (Go, Python, Rust, Swift): `.claude/skills/interop/SKILL.md`

## Deployed
- Production: `cad.ubuntusoftware.net`
- Worker: `truck-cad.gedw99.workers.dev`
