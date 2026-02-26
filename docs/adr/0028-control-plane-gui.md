# ADR-0028: Control Plane — Unified Deployment Surface

**Author**: Claude (Anthropic) + Joe
**Date**: 2026-02-26

## Status

**Absorbed** into ADR-0022 (v2). The design work here informed the from-scratch redesign of ADR-0022, which now includes the control plane Web Component (Section 3) and render targets (Section 2, render targets table). This ADR is preserved as design history — the implementation follows ADR-0022 v2.

## Context

The system deploys to two Cloudflare platforms — **Workers** (CAD kernel + GUI) and **Pages** (VitePress docs). Each has its own versioned deployment lifecycle (ADR-0017), but there's no unified view of what's deployed where. The existing `<cf-versions-picker>` component only shows Worker versions and only lives in the Worker GUI.

Meanwhile, ADR-0011 established that all application state (mode, sync, undo/redo, wipe) is accessible through `cadCommand()` — giving the GUI, MCP agents, and tests identical control surfaces. But these controls are scattered across the GUI (toolbar buttons, side panels, status bar footer) with no cohesive "control plane" UI.

The user wants a single, shared banner across both sites that answers: **what version am I on, what's deployed where, how do I get to the API/MCP/docs, and what's the system status?**

## Problem

The same set of URLs and version metadata is maintained separately in multiple places, with no shared source of truth:

| Surface | How URLs get there | Problem |
|---------|-------------------|---------|
| **GUI** (`cf-versions-picker.js`) | Reads `cf-versions.json` manifest | Only Worker versions, only in Worker GUI |
| **GitHub Release** (`deploy:tag`) | Hardcoded in Taskfile heredoc template | Duplicates URLs, can drift from manifest |
| **README.md** | Manually maintained URL table | Falls out of date, no version info |
| **Pages docs** | No version awareness at all | No banner, no links, no status |

Every time a URL changes (new domain, new endpoint), it must be updated in 3+ places. The GitHub release template duplicates what the manifest already knows. The README URL table is a manual snapshot.

| Gap | Impact |
|-----|--------|
| Worker and Pages versions tracked separately | No way to see "is v0.7.0 deployed on both platforms?" |
| URLs duplicated across GUI, README, GitHub releases | Drift, stale links, maintenance burden |
| Version picker only on Worker GUI | Docs site has no version awareness |
| API/MCP endpoint URLs not surfaced in GUI | Developers manually construct URLs |
| Cross-links missing | No navigation between Worker GUI ↔ Docs ↔ GitHub |
| Control plane actions scattered | Mode toggle, wipe, status live in different UI locations |
| No mobile layout | Current dropdown doesn't work well on small screens |

## Decision

### 1. Unified Version Manifest

Replace the two separate version files (`cf-versions.json` + `cf-pages-versions.json`) with a single `cf-versions.json` that tracks both platforms per version:

```json
{
  "production": {
    "worker": "https://cad.ubuntusoftware.net",
    "pages": "https://docs.ubuntusoftware.net"
  },
  "github": "https://github.com/joeblew999/plat-trunk",
  "endpoints": {
    "health": "/api/health",
    "mcp": "/mcp",
    "schema": "/api/cad/schema",
    "gui": "/",
    "docs": "https://docs.ubuntusoftware.net"
  },
  "generated": "2026-02-26T...",
  "versions": [
    {
      "version": "0.7.0",
      "tag": "v0.7.0",
      "date": "2026-02-26T...",
      "worker": {
        "id": "abc-uuid",
        "url": "https://v0-7-0-truck-cad.gedw99.workers.dev",
        "immutableUrl": "https://abc-uuid-truck-cad.gedw99.workers.dev"
      },
      "pages": {
        "id": "def-uuid",
        "url": "https://v0-7-0.cad-docs.pages.dev",
        "immutableUrl": "https://def-uuid.cad-docs.pages.dev"
      },
      "git": { "commitSha": "abc1234", "branch": "main", "commitUrl": "..." },
      "commandCount": 29
    }
  ],
  "previews": [
    { "label": "PR #5", "platform": "worker", "url": "..." },
    { "label": "PR #5", "platform": "pages", "url": "..." }
  ]
}
```

**One script run** queries both `wrangler versions list` and `wrangler pages deployment list`, merges by version number. Either platform can fail gracefully (not all projects use both).

### 2. `<cf-control-plane>` Web Component

Replace `<cf-versions-picker>` with `<cf-control-plane>` — a Lit Web Component that renders a persistent top banner. It consolidates **both** the deployment control plane (versions, endpoints, cross-links) and the application control plane (mode, undo/redo, wipe, status) into one surface, replacing the scattered buttons currently embedded throughout the GUI.

#### Two Layers

The banner has two logical rows that stack vertically:

```
┌──────────────────────────────────────────────────────────────────────┐
│ v0.7.0 [W● P●]  │  API · MCP · Schema · Docs  │  ● Online  │  ≡   │  ← deployment
├──────────────────────────────────────────────────────────────────────┤
│ 3 objects │ ⤺ Undo  ⤻ Redo │ Mode: Local │ Wipe │ Share            │  ← application
└──────────────────────────────────────────────────────────────────────┘
```

| Layer | Section | Content |
|-------|---------|---------|
| **Deployment** | Version | Current version badge, dropdown with W/P deploy status per version |
| | Endpoints | Links to API health, MCP, schema, docs — from manifest |
| | Status | Online/Offline connection indicator |
| | Cross-links | Worker GUI ↔ Docs ↔ GitHub |
| **Application** | Scene | Object count, selection info |
| | History | Undo / Redo buttons (calls `cadCommand('undo')` / `cadCommand('redo')`) |
| | Mode | Local / Online toggle (calls `cadCommand('set_mode')`) |
| | Actions | Wipe (calls `cadCommand('clear_data')`), Share / New Document |

The application layer uses the exact API contract from ADR-0011 — same `cadCommand()` calls that toolbar buttons currently make, just relocated to the banner.

#### Why Consolidate

Currently the application controls are scattered:
- **Undo/Redo** — toolbar buttons in the 3D viewport header
- **Mode toggle** — side panel File section
- **Wipe** — side panel File section
- **Status** — footer status bar
- **Object count** — footer status bar

On mobile, these are buried in menus or off-screen. Moving them to the banner means they're always one tap away, in a consistent location.

#### Desktop Layout

Both rows visible. Deployment row is compact (badge + links). Application row has action buttons.

#### Mobile Layout

Collapses to a single compact bar + expandable menu:

```
┌──────────────────────────┐
│ v0.7.0 ●  │  3 obj  │ ≡  │
└──────────────────────────┘
```

Tap `≡` expands a full-width panel with all sections stacked vertically — deployment links first, then application controls. This replaces the need to navigate through toolbar menus on small screens.

#### Context Adaptation

The component auto-detects where it's running and shows/hides layers:

| Feature | Worker GUI | Pages Docs |
|---------|-----------|------------|
| **Deployment row** | | |
| Version badge | From `/api/health` (live) | From manifest metadata |
| Version dropdown | Full (W + P status per version) | Full (same) |
| Endpoint links | API, MCP, Schema, Docs | API, MCP, Schema (links to Worker) |
| Cross-link | "Open Docs →" | "Open CAD →" |
| **Application row** | | |
| Scene info | Object count, selection | *Hidden* |
| Undo / Redo | `cadCommand('undo'/'redo')` | *Hidden* |
| Mode toggle | `cadCommand('set_mode')` | *Hidden* |
| Wipe / Share | `cadCommand('clear_data')` | *Hidden* |

Detection: try `fetch('/api/health')`. If it responds, we're on the Worker — show both layers. If not, we're on Pages — show deployment layer only.

#### Configuration

```html
<!-- Worker GUI (auto-detects, shows both layers) -->
<cf-control-plane></cf-control-plane>

<!-- Pages Docs (deployment layer only, links to Worker) -->
<cf-control-plane
  worker-url="https://cad.ubuntusoftware.net"
  manifest-url="https://cad.ubuntusoftware.net/cf-versions.json"
></cf-control-plane>
```

When hosted on the Worker, the component fetches `/api/health` and `/cf-versions.json` directly, and hooks into `cadCommand()` for application controls. When hosted on Pages, it fetches from the Worker URL (CORS) and hides the application row.

#### Integration with Existing GUI

When the control plane banner is active, the existing toolbar buttons (undo/redo), side panel controls (mode, wipe), and status bar (object count) become redundant. They can be:
1. **Removed** — banner is the single location for these controls
2. **Kept as secondary** — banner is primary, existing locations stay for power users
3. **Progressive** — remove on mobile, keep on desktop (responsive CSS)

Recommendation: option 1 (remove). One location for controls reduces confusion and simplifies the mobile layout. The toolbar reclaims space for CAD-specific tools (select, transform, sketch).

### 3. Render Targets — One Manifest, Many Surfaces

The unified manifest (`cf-versions.json`) is the **single source of truth** for all URL surfaces. Instead of hardcoding URLs in multiple places, every surface reads from or is generated from the manifest.

| Surface | Format | How it consumes the manifest |
|---------|--------|------------------------------|
| **Browser GUI** | HTML (Web Component) | `<cf-control-plane>` fetches manifest at runtime |
| **Pages Docs** | HTML (Web Component) | Same component, fetches from Worker URL (CORS) |
| **GitHub Release** | Markdown | `cf-versions-json.ts --release-notes` generates markdown at tag time |
| **README.md** | Markdown | `cf-versions-json.ts --readme-urls` generates URL table, spliced into README |
| **MCP / AI agents** | JSON | `/api/health` enriched with deploy info (Hono route, not WASM) |
| **CLI / Shell** | Env vars | `cf-versions-json.ts --latest-env` (existing, for promote/smoke tasks) |
| **JSON / API** | JSON | `cf-versions-json.ts --latest` (existing, for programmatic access) |

#### GitHub Release Notes (generated)

Currently `deploy:tag` has a hardcoded heredoc template with URLs assembled from Task vars. Instead, the manifest generator produces the release notes:

```bash
# Before (hardcoded in Taskfile):
BODY=$(cat <<NOTES
## Try this version
**Preview URL**: https://v0-7-0-truck-cad.gedw99.workers.dev
| Endpoint | URL |
|----------|-----|
| This version | https://v0-7-0-truck-cad.gedw99.workers.dev |
| Production | https://cad.ubuntusoftware.net |
...
NOTES
)

# After (generated from manifest):
BODY=$(bun scripts/cf-versions-json.ts --release-notes)
```

The `--release-notes` subcommand reads `cf-versions.json` and generates markdown:

```markdown
## v0.7.0

| | Worker | Pages |
|--|--------|-------|
| **This version** | [v0-7-0-truck-cad.gedw99.workers.dev](...) | [v0-7-0.cad-docs.pages.dev](...) |
| **Production** | [cad.ubuntusoftware.net](...) | [docs.ubuntusoftware.net](...) |

### Endpoints

| Endpoint | URL |
|----------|-----|
| API Health | https://cad.ubuntusoftware.net/api/health |
| MCP | https://cad.ubuntusoftware.net/mcp |
| Schema | https://cad.ubuntusoftware.net/api/cad/schema |
| Docs | https://docs.ubuntusoftware.net |

### Verify
```sh
curl -sf https://v0-7-0-truck-cad.gedw99.workers.dev/api/health
# {"version":"0.7.0"}
```
```

#### README URL Table (generated)

The README has a `## URLs` section with a manually maintained table. A `--readme-urls` subcommand generates the table from the manifest + endpoint config, and a task splices it into the README between markers:

```markdown
<!-- cf-urls:start -->
| | URL |
|--|-----|
| **Production** | |
| CAD App | https://cad.ubuntusoftware.net |
| Workers (alias) | https://truck-cad.gedw99.workers.dev |
| Docs | https://docs.ubuntusoftware.net |
...
<!-- cf-urls:end -->
```

The `cf:readme:update` task regenerates this section whenever URLs change:

```bash
task cf:readme:update    # reads manifest → updates README between markers
```

#### MCP / AI Agent Surface

Deploy info is **infrastructure state**, not **application state** — it doesn't belong in `cadCommand()`. The `cad-schema.json` is generated from Rust structs, and Rust doesn't know about Cloudflare URLs. Mixing deployment metadata into the Rust-generated schema would be fragile.

Instead, enrich the existing `/api/health` Hono route (pure JS, no WASM). It already returns `{"version":"0.7.0"}` — extend it:

```json
{
  "version": "0.7.0",
  "deploy": {
    "worker": { "url": "https://v0-7-0-truck-cad.gedw99.workers.dev" },
    "pages": { "url": "https://v0-7-0.cad-docs.pages.dev" },
    "endpoints": { "mcp": "/mcp", "schema": "/api/cad/schema", "docs": "https://docs.ubuntusoftware.net" }
  }
}
```

The Worker reads `cf-versions.json` once at startup and caches it. AI agents already call `cad_health` via MCP — they get deploy info for free. No Rust changes, no schema changes.

**Separation of concerns:**
- `cadCommand('get_status')` → application state (mode, objects, sync) — Rust schema
- `/api/health` → infrastructure state (version, deploy URLs, endpoints) — Hono route

### 4. Endpoint Discovery

The version manifest includes endpoint metadata so the component can build links without hardcoding:

```json
{
  "endpoints": {
    "health": "/api/health",
    "mcp": "/mcp",
    "schema": "/api/cad/schema",
    "gui": "/",
    "docs": "https://docs.ubuntusoftware.net"
  }
}
```

These are relative paths (resolved against the Worker URL) plus absolute URLs for external endpoints (docs, GitHub).

### 5. Relationship to ADR-0011 (Application Control Plane)

ADR-0011 defined the **API contract** — `cadCommand()` dispatch for mode switching, undo/redo, document management, sync status. This ADR defines the **GUI surface** that consolidates those controls into a single banner alongside deployment information.

```
ADR-0011: cadCommand('set_mode')    ← defined the API contract
ADR-0028: <cf-control-plane>        ← the GUI that calls it (replaces scattered buttons)
```

Before ADR-0028, ADR-0011's controls were scattered across toolbar, side panel, and status bar. After ADR-0028, they live in one place: the control plane banner's application row. The API is unchanged — only the GUI surface moves.

### 6. Relationship to ADR-0022 (cf-deploy Toolkit)

ADR-0022 proposes extracting the deploy lifecycle into a standalone `cf-deploy` CLI. The control plane component (`<cf-control-plane>`) is the runtime piece of that toolkit — it consumes the manifest that `cf-deploy versions-json` generates. When ADR-0022 is implemented, the component moves into the `cf-deploy` repo as the standard runtime UI.

### 7. Config Extraction (Phase 5)

Currently, project config flows through a 4-hop chain:

```
Taskfile.yml vars → cf: include vars → top-level env: block → process.env → TS scripts
```

This works but is indirect. The Taskfile vars (worker name, domain, production URLs, pages project, endpoints) are effectively a config file already — just embedded in YAML task runner syntax.

Phase 5 extracts these into a standalone `cf-config.json` that both the Taskfile and TS scripts read directly:

```json
{
  "worker": {
    "name": "truck-cad",
    "domain": "gedw99.workers.dev",
    "dir": "systems/truck/worker",
    "production": "https://cad.ubuntusoftware.net"
  },
  "pages": {
    "project": "cad-docs",
    "domain": "cad-docs.pages.dev",
    "dir": "website",
    "production": "https://docs.ubuntusoftware.net"
  },
  "github": "joeblew999/plat-trunk",
  "schema": "web/cad-schema.json",
  "output": "web/gui/cf-versions.json",
  "endpoints": {
    "health": "/api/health",
    "mcp": "/mcp",
    "schema": "/api/cad/schema",
    "docs": "https://docs.ubuntusoftware.net"
  }
}
```

This eliminates the env var proxying chain — TS scripts read `cf-config.json` directly, and the Taskfile reads it for the vars it still needs (directory paths). When ADR-0022 extracts `cf-deploy`, this file becomes `cf-deploy.yml` (or stays JSON) — the natural birth of the config file that ADR-0022 specifies.

## Implementation Phases

### Phase 1: Unified Version Manifest

- Merge `cf-versions-worker.ts` + `cf-versions-pages.ts` into single generation run
- One output file: `cf-versions.json` with both platforms per version
- Remove `--platform` flag from entry point
- Update `--latest-env` to output both Worker and Pages fields
- Single `cf:versions:json` task replaces `cf:worker:versions:json` + `cf:pages:versions:json`
- Add `endpoints` section to manifest

**Files changed:**
- `scripts/lib/cf-versions-common.ts` — new types, unified generate
- `scripts/lib/cf-versions-worker.ts` — return platform-specific result
- `scripts/lib/cf-versions-pages.ts` — return platform-specific result
- `scripts/cf-versions-json.ts` — remove `--platform`, run both
- `taskfiles/Taskfile.cloudflare.yml` — single `versions:json` task
- `Taskfile.yml` — single `OUTPUT_FILE` var

### Phase 2: Control Plane Component (Deployment Layer)

- Replace `cf-versions-picker.js` with `cf-control-plane.js`
- Deployment row: version badge + dropdown, endpoint links, cross-links
- Mobile: compact badge + `≡` expandable menu
- Auto-detect Worker vs Pages context
- DaisyUI light DOM (inherits page CSS)

**Files changed:**
- `web/gui/cf-control-plane.js` — new component (replaces `cf-versions-picker.js`)
- `web/gui/index.html` — swap component tag
- Delete `web/gui/cf-versions-picker.js`

### Phase 2b: Control Plane Component (Application Layer)

- Add application row: object count, undo/redo, mode toggle, wipe, share
- Wire to `cadCommand()` for actions (same calls the toolbar currently makes)
- Remove redundant controls from toolbar, side panel, and status bar footer
- Hide application row when not on Worker (Pages context)
- Enrich `/api/health` Hono route with deploy info from manifest (no Rust/schema changes)
- Update E2E/UI tests that target moved controls (undo/redo buttons, mode toggle, wipe)

**Files changed:**
- `web/gui/cf-control-plane.js` — add application row
- `web/gui/index.html` — remove toolbar undo/redo, side panel mode/wipe, status bar
- `web/gui/state.js` — expose `cadCommand` for the component
- `systems/truck/worker/src/index.ts` — enrich `/api/health` with manifest data
- `tests/e2e/*.spec.ts` — update selectors for relocated controls
- `tests/ui/*.spec.ts` — update selectors for relocated controls

### Phase 3: Generated Markdown Surfaces

- Add `--release-notes` subcommand → markdown for GitHub releases
- Add `--readme-urls` subcommand → URL table for README
- Update `deploy:tag` to use `--release-notes` instead of hardcoded heredoc
- Add `cf:readme:update` task to splice URL table into README between markers
- Add `<!-- cf-urls:start -->` / `<!-- cf-urls:end -->` markers to README.md

**Files changed:**
- `scripts/lib/cf-versions-common.ts` — add `handleReleaseNotes()`, `handleReadmeUrls()`
- `systems/truck/Taskfile.truck.yml` — `deploy:tag` uses `--release-notes`
- `taskfiles/Taskfile.cloudflare.yml` — add `readme:update` task
- `README.md` — add marker comments around URL table

### Phase 4: Pages Integration

- Add `<cf-control-plane>` to VitePress layout
- Configure `worker-url` and `manifest-url` attributes
- CORS: Worker already allows cross-origin `/api/health` and `/cf-versions.json`
- Style integration with VitePress theme

**Files changed:**
- `website/.vitepress/theme/` — custom layout with component
- `website/.vitepress/config.ts` — head script for component

### Phase 5: Config Extraction

- Create `cf-config.json` with all project config (worker, pages, endpoints, github)
- Update TS scripts to read `cf-config.json` directly instead of `process.env`
- Update `Taskfile.yml` cf: include to read vars from `cf-config.json` (via `sh:` directives)
- Remove top-level `env:` block from `Taskfile.cloudflare.yml` (no longer needed)
- Remove per-task `env:` blocks (scripts read config directly)
- This file becomes `cf-deploy.yml` when ADR-0022 extracts the toolkit

**Files changed:**
- `cf-config.json` — NEW, single source of project config
- `scripts/lib/cf-versions-common.ts` — read config from JSON instead of env
- `Taskfile.yml` — cf: include reads vars from JSON
- `taskfiles/Taskfile.cloudflare.yml` — remove env: blocks

## Consequences

### Positive

- **Single source of truth** — one manifest drives GUI, GitHub releases, README, CLI
- **No URL drift** — change a URL in one place (Taskfile vars), regenerate everywhere
- **Single version view** — one glance shows what's deployed on both platforms
- **Cross-platform navigation** — Worker GUI ↔ Docs always one click away
- **Endpoint discovery** — API, MCP, schema URLs always visible (no manual URL construction)
- **Richer GitHub releases** — auto-generated with both Worker + Pages URLs, endpoints, verify commands
- **Mobile-first** — works on phones for quick status checks
- **Context-aware** — same component adapts to Worker (full controls) vs Pages (read-only)
- **Foundation for cf-deploy** — the runtime component that ADR-0022 needs

### Negative

- **CORS dependency** — Pages site fetching from Worker requires CORS headers
- **Larger component** — control plane bar is more complex than the simple version picker
- **Two render modes** — Worker (full) vs Pages (read-only) adds conditional logic
- **README markers** — requires `<!-- cf-urls:start/end -->` markers to stay in place

## Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| **Separate components per site** | Drift, duplication, inconsistent UX |
| **iframe embedding** | Poor mobile experience, styling isolation issues |
| **Server-rendered banner** | Can't share across Worker (Hono) and Pages (VitePress) |
| **Keep version picker, add separate status bar** | Fragments the control plane across multiple components |

## Verification

```bash
# Phase 1: Unified manifest
task cf:versions:json
cat web/gui/cf-versions.json | jq '.versions[0] | {version, worker: .worker.url, pages: .pages.url}'

# Phase 2: Component on Worker
open http://localhost:8788
# Verify: top banner shows version, W/P indicators, endpoint links

# Phase 3: Generated markdown
bun scripts/cf-versions-json.ts --release-notes    # preview GitHub release body
bun scripts/cf-versions-json.ts --readme-urls       # preview README URL table
task cf:readme:update                                # splice into README
git diff README.md                                   # verify URL table updated

# Phase 4: Component on Pages
open http://localhost:5173
# Verify: top banner shows version, links to Worker endpoints

# Phase 5: Config extraction
cat cf-config.json | jq '.worker.name'              # verify config reads correctly
task cf:debug                                         # verify Taskfile reads from config
bun scripts/cf-versions-json.ts --latest | jq .version  # verify TS reads from config
```

## References

- ADR-0011: Control Plane — State Management as API (application-level control plane)
- ADR-0017: Versioned Deployments via Cloudflare Workers (versioning pattern)
- ADR-0022: cf-deploy — Reusable Cloudflare Workers Deploy Toolkit (extraction plan)
- `web/gui/cf-versions-picker.js` — current version picker (to be replaced)
- `scripts/cf-versions-json.ts` — current manifest generator (to be unified)
- `taskfiles/Taskfile.cloudflare.yml` — deploy task definitions
