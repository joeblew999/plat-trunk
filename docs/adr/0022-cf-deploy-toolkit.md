# ADR-0022: cf-deploy — Cloudflare Deploy Toolkit (v2)

**Author**: Claude (Anthropic) + Joe
**Date**: 2026-02-24 (revised 2026-02-26)

## Status

**Superseded** — see AGENT.md deploy section for current model. The 3-file architecture (cf-deploy.json + cf-deploy.ts + web component) remains, but the alias model changed: aliases only at release/PR time, not every upload.

## Problem

Both plat-trunk and remy-sport deploy to Cloudflare Workers + Pages using the same pattern: wrangler versions upload with tags, promote, smoke test, rollback, versions.json manifest, version picker UI. This pattern is currently embedded in plat-trunk's go-task infrastructure across 7+ files:

```
taskfiles/Taskfile.cloudflare.yml    ← 35+ tasks, ~500 lines
scripts/cf-versions-json.ts          ← entry point
scripts/lib/cf-versions-common.ts    ← shared types + generate
scripts/lib/cf-versions-worker.ts    ← Worker adapter
scripts/lib/cf-versions-pages.ts     ← Pages adapter
web/gui/cf-versions-picker.js        ← Lit Web Component
web/gui/vendor/lit.js                ← Lit framework vendor
```

The original ADR-0022 proposed extracting this into a separate repo with 12+ files (`bin/`, `lib/` with 8 modules, `web/`, YAML config). That's the same architecture in a different location — a code move, not a simplification.

Meanwhile, ADR-0028 identified that the same URLs are duplicated across GUI, GitHub releases, README, and docs — and that the application control plane (undo/redo, mode, wipe) is scattered across the GUI with no cohesive surface.

### What's wrong with the current approach

| Issue | Impact |
|-------|--------|
| **7+ files for one concern** | Deploy lifecycle is spread across taskfile, 4 TS files, component, vendor |
| **Env var proxying** | `Taskfile vars → env: block → process.env → TS` — 4 hops to get config to scripts |
| **Worker + Pages tracked separately** | Two output files, no unified view of "is v0.7.0 on both?" |
| **Lit dependency** | Version picker vendors Lit.js (~26KB) where none is needed |
| **URL duplication** | Same URLs hardcoded in GUI, GitHub release heredoc, README table |
| **Scattered application controls** | Undo/redo in toolbar, mode in side panel, wipe in side panel, status in footer |
| **No mobile control plane** | Application controls buried in menus on small screens |

## Decision: Three Files

If building from scratch, the answer is 3 files — not 12:

```
cf-deploy.json            ← config (~20 lines)
scripts/cf-deploy.ts      ← CLI (~500 lines, single file)
web/gui/cf-control-plane.js  ← Web Component (~200 lines, zero dependencies)
```

The Taskfile becomes a thin wrapper (~10 lines of task definitions calling the CLI). Everything else is deleted.

### 1. Config: `cf-deploy.json`

Single JSON file, checked into git. Replaces the Taskfile vars + env proxying chain:

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
  "version": {
    "source": "web/cad-schema.json"
  },
  "output": "web/gui/cf-versions.json",
  "endpoints": {
    "health": "/api/health",
    "mcp": "/mcp",
    "schema": "/api/cad/schema",
    "gui": "/",
    "docs": "https://docs.ubuntusoftware.net"
  },
  "smoke": {
    "extra": "task truck:smoke:extra"
  }
}
```

**Why JSON not YAML**: The stack is Bun/TS — `JSON.parse()` is zero-dependency. YAML needs a parser.

**Why not env vars**: `cf-deploy.json` is self-documenting and checked into git. The 4-hop chain (`Taskfile vars → cf: include vars → env: block → process.env → TS`) disappears.

### 2. CLI: `scripts/cf-deploy.ts`

Single Bun TypeScript file (~500 lines). All subcommands inline — no separate modules. Reads `cf-deploy.json` for all config.

```sh
bun scripts/cf-deploy.ts upload [--version 0.7.0] [--tag pr-42]
bun scripts/cf-deploy.ts promote
bun scripts/cf-deploy.ts rollback
bun scripts/cf-deploy.ts smoke [URL]
bun scripts/cf-deploy.ts versions          # generate unified cf-versions.json
bun scripts/cf-deploy.ts release-notes     # markdown for GitHub releases
bun scripts/cf-deploy.ts readme-urls       # URL table for README
bun scripts/cf-deploy.ts status            # current deployment info
bun scripts/cf-deploy.ts list              # all versions + previews
bun scripts/cf-deploy.ts whoami            # Cloudflare auth info
```

Key design choices:

- **Single file**: ~500 lines is small enough for one file. Eight 50-line modules with import boilerplate is worse.
- **Unified manifest**: `versions` subcommand queries both `wrangler versions list` AND `wrangler pages deployment list`, merges by version number, writes one `cf-versions.json` with per-version `worker` + `pages` sub-objects.
- **Render targets**: `release-notes` generates markdown for `gh release create`. `readme-urls` generates the README URL table. One manifest → many surfaces.
- **Config-first**: Reads `cf-deploy.json` directly — no env var proxying.

#### Unified Manifest Output

The `versions` subcommand produces a single `cf-versions.json`:

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

Either platform can fail gracefully — not all projects use both Workers and Pages.

#### Render Targets

One manifest drives 7 surfaces:

| Surface | Format | How |
|---------|--------|-----|
| **Browser GUI** | HTML | `<cf-control-plane>` fetches manifest at runtime |
| **Pages Docs** | HTML | Same component, fetches from Worker URL (CORS) |
| **GitHub Release** | Markdown | `cf-deploy.ts release-notes` at tag time |
| **README.md** | Markdown | `cf-deploy.ts readme-urls` spliced between markers |
| **MCP / AI** | JSON | `/api/health` enriched with deploy info (Hono route) |
| **CLI / Shell** | Env vars | `cf-deploy.ts status --env` for promote/smoke scripts |
| **JSON / API** | JSON | `cf-versions.json` served as static asset |

### 3. Web Component: `<cf-control-plane>`

Vanilla Web Component — zero dependencies (no Lit, no framework). ~200 lines. Renders a persistent top banner with two layers:

```
┌──────────────────────────────────────────────────────────────────────┐
│ v0.7.0 [W● P●]  │  API · MCP · Schema · Docs  │  ● Online  │  ≡   │  ← deployment
├──────────────────────────────────────────────────────────────────────┤
│ 3 objects │ ⤺ Undo  ⤻ Redo │ Mode: Local │ Wipe │ Share            │  ← application
└──────────────────────────────────────────────────────────────────────┘
```

| Layer | Content |
|-------|---------|
| **Deployment** | Version badge + dropdown (W/P status per version), endpoint links (API, MCP, Schema, Docs), cross-links (Worker GUI ↔ Docs ↔ GitHub) |
| **Application** | Object count, undo/redo (`cadCommand`), mode toggle, wipe, share (ADR-0011 API) |

Key design choices:

- **No Lit** — `HTMLElement` + `innerHTML`. Eliminates the vendor dependency.
- **Light DOM** — inherits page CSS (DaisyUI classes). No shadow DOM isolation.
- **Context-aware** — detects Worker (both layers visible) vs Pages (deployment only, app row hidden).
- **Mobile** — collapses to compact badge + hamburger menu.
- **Separation of concerns**:
  - Deploy info: fetched from `/api/health` (Hono route, pure JS) and `/cf-versions.json`
  - App state: calls `cadCommand()` (Rust schema, ADR-0011)
  - These are independent — deploy info is infrastructure state, app state is application state

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

### 4. Taskfile Integration

The Taskfile becomes a thin wrapper:

```yaml
# taskfiles/Taskfile.cloudflare.yml (simplified)
tasks:
  "worker:upload":
    cmds: [bun scripts/cf-deploy.ts upload]
  "worker:promote":
    cmds: [bun scripts/cf-deploy.ts promote]
  "worker:rollback":
    cmds: [bun scripts/cf-deploy.ts rollback]
  "worker:smoke":
    cmds: [bun scripts/cf-deploy.ts smoke]
  "versions":
    cmds: [bun scripts/cf-deploy.ts versions]
  # ... etc
```

No `vars:` block, no `env:` block — the CLI reads `cf-deploy.json` directly.

## What Gets Deleted

| File | Reason |
|------|--------|
| `scripts/cf-versions-json.ts` | Replaced by `cf-deploy.ts versions` |
| `scripts/lib/cf-versions-common.ts` | Inlined into `cf-deploy.ts` |
| `scripts/lib/cf-versions-worker.ts` | Inlined into `cf-deploy.ts` |
| `scripts/lib/cf-versions-pages.ts` | Inlined into `cf-deploy.ts` |
| `web/gui/cf-versions-picker.js` | Replaced by `cf-control-plane.js` |
| `web/gui/vendor/lit.js` | No longer needed (zero-dependency component) |

The Taskfile stays but shrinks from ~500 lines to ~80 (thin wrappers + D1/R2 tasks that don't relate to deploy).

## How This Differs from Original ADR-0022

| Aspect | Original ADR-0022 | This revision |
|--------|-------------------|---------------|
| **Files** | 12+ (`bin/`, `lib/` × 8, `web/`, config, README) | 3 (config + CLI + component) |
| **Config** | YAML (`cf-deploy.yml`) | JSON (`cf-deploy.json`) — zero-dependency parse |
| **Architecture** | Many modules with imports | Single file, all inline |
| **Location** | Separate repo (`.src/cf-deploy/`) | In-project (`scripts/cf-deploy.ts`) |
| **Web component** | Version picker only | Full control plane (deployment + application) |
| **Manifest** | Worker only | Unified Worker + Pages |
| **Render targets** | None | GitHub releases, README, MCP, CLI |
| **Scope** | Deploy lifecycle only | Deploy lifecycle + control plane GUI (absorbs ADR-0028) |

### Why not a separate repo?

The original ADR-0022 proposed a separate `joeblew999/cf-deploy` GitHub repo. That made sense when the toolkit was 12+ files with its own module structure. With 3 files, the overhead of a separate repo (clone step, version sync, `.src/` pattern) exceeds the value. Keep it in-project until a third consumer appears.

When a second project (remy-sport) needs it, the 3 files can be copied directly or extracted then. A single 500-line CLI is easy to copy — a 12-file module tree is not.

## Relationship to Other ADRs

| ADR | Relationship |
|-----|-------------|
| **ADR-0011** (Control Plane API) | Defines the `cadCommand()` API contract that `<cf-control-plane>` calls for app controls |
| **ADR-0017** (Versioned Deployments) | The pattern being simplified — same concepts, simpler implementation |
| **ADR-0028** (Control Plane GUI) | **Absorbed** — the web component design from 0028 is now Section 3 of this ADR |

## Implementation Order

1. **Create `cf-deploy.json`** — config file in repo root
2. **Build `scripts/cf-deploy.ts`** — start with `versions` subcommand (unified manifest), then `upload`, `promote`, `rollback`, `smoke`, `release-notes`, `readme-urls`, `status`, `list`, `whoami`
3. **Build `web/gui/cf-control-plane.js`** — vanilla Web Component, deployment layer first, then application layer
4. **Update Taskfile** — thin wrappers calling CLI
5. **Delete old files** — scripts/lib/cf-versions-*, cf-versions-picker.js, vendor/lit.js
6. **Update index.html** — swap `<cf-versions-picker>` → `<cf-control-plane>`

## Verification

```sh
# Config
cat cf-deploy.json | jq '.worker.name'

# CLI
bun scripts/cf-deploy.ts versions
bun scripts/cf-deploy.ts release-notes
bun scripts/cf-deploy.ts readme-urls
bun scripts/cf-deploy.ts status
bun scripts/cf-deploy.ts smoke

# Unified manifest
cat web/gui/cf-versions.json | jq '.versions[0] | {version, worker: .worker.url, pages: .pages.url}'

# Web component
open http://localhost:8788
# Verify: top banner shows version, W/P indicators, endpoint links, app controls

# Full deploy cycle
bun scripts/cf-deploy.ts upload
bun scripts/cf-deploy.ts smoke
bun scripts/cf-deploy.ts promote

# Render targets
bun scripts/cf-deploy.ts release-notes    # preview GitHub release markdown
bun scripts/cf-deploy.ts readme-urls       # preview README URL table
```

## Consequences

### Positive

- **3 files instead of 7+** — drastically simpler to understand and maintain
- **Zero-dependency config** — JSON.parse, no YAML parser
- **No env var proxying** — scripts read config directly
- **Unified manifest** — one glance shows Worker + Pages deploy status per version
- **One manifest → 7 surfaces** — GUI, docs, GitHub releases, README, MCP, CLI, API
- **Zero-dependency component** — no Lit, no vendor files
- **Consolidated controls** — deployment + application in one banner
- **Mobile-first** — works on phones
- **Easy to copy** — 3 files, not 12

### Negative

- **Single file limit** — if the CLI grows past ~800 lines, consider splitting
- **In-project** — not yet reusable by other projects without copying
- **CORS dependency** — Pages fetching from Worker requires CORS headers

## References

- ADR-0011: Control Plane — State Management as API
- ADR-0017: Versioned Deployments via Cloudflare Workers
- ADR-0028: Control Plane GUI (absorbed into this ADR)
- `taskfiles/Taskfile.cloudflare.yml` — current implementation (to be simplified)
- `scripts/cf-versions-json.ts` — current manifest generator (to be replaced)
- `web/gui/cf-versions-picker.js` — current version picker (to be replaced)
