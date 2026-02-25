# ADR-0027: Migrate Documentation from Hugo to VitePress

- **Status**: Proposed
- **Date**: 2026-02-25
- **Deciders**: Joe
- **Supersedes**: Hugo + hugo-book theme setup
- **Reference**: `.src/honojs-website/` (cloned from https://github.com/honojs/website)

## Context

Our CAD Worker is built on **Hono** and deployed to **Cloudflare Workers/Pages**.
Hono's own documentation site ([hono.dev](https://hono.dev)) is built with
**VitePress** and deployed to Cloudflare Pages — the exact same stack we already use.

Our documentation is currently built with Hugo, a Go binary with its own ecosystem
(Go templates, git submodule themes, separate install). This is the one part of our
toolchain that doesn't align with the rest of the stack.

**Simple logic: we use Hono → Hono uses VitePress for docs → we use VitePress for docs.**

The `honojs/website` repo (cloned at `.src/honojs-website/`) gives us a working
reference: config, theme, Cloudflare Pages deploy, LLM docs generation — all proven
in production. We copy the structure and adapt it to our content.

## Decision

Replace Hugo with **VitePress** — the same framework and setup used by
[hono.dev](https://github.com/honojs/website).

### Why this works

| Concern | Hugo (current) | VitePress (proposed) |
|---------|---------------|---------------------|
| Install | `brew install hugo` (Go binary) | `npm add -D vitepress` (in existing toolchain) |
| Theme | hugo-book git submodule (90+ partials) | Built-in default theme + CSS overrides |
| Code highlighting | Chroma (Hugo built-in) | Shiki + Twoslash (inline TypeScript types) |
| Dev server | Hugo serve (fast, but separate process) | Vite HMR (instant, same toolchain) |
| Markdown | Goldmark | markdown-it + Vue SFC components |
| Search | Fuse.js (client-side, basic) | Algolia DocSearch or built-in local search |
| Deploy | `wrangler pages deploy public/` | `wrangler pages deploy .vitepress/dist/` |
| Content location | Copies from `docs/` → `docs/hugo/content/` | Reads directly from `website/docs/` (no sync step) |
| Customization | Go templates | Vue components |
| LLM docs | Not available | `llms.txt` generation + MCP tools (from honojs/website) |

### What we get from honojs/website

The [honojs/website](https://github.com/honojs/website) repo provides a battle-tested VitePress setup:

1. **`.vitepress/config.ts`** — sidebar generation, nav, Algolia search, clean URLs, edit links
2. **`.vitepress/theme/`** — minimal custom theme extending DefaultTheme (CSS overrides only)
3. **`scripts/build-llm-docs.ts`** — generates `llms.txt`, `llms-full.txt`, `llms-small.txt` for AI consumption
4. **Cloudflare Pages deployment** — `_redirects` file, same `wrangler pages deploy` pattern
5. **Twoslash integration** — `@shikijs/vitepress-twoslash` for inline TypeScript type hints in code blocks
6. **Group icons plugin** — `vitepress-plugin-group-icons` for runtime/platform tabs in code blocks

### Key dependencies (from honojs/website)

```json
{
  "devDependencies": {
    "vitepress": "^1.6.3",
    "vue": "^3.3.4",
    "@shikijs/vitepress-twoslash": "^1.23.0",
    "vitepress-plugin-group-icons": "^1.0.4"
  }
}
```

## Migration Plan

### Phase 1 — Scaffold VitePress site

Mirror the [honojs/website](https://github.com/honojs/website) layout exactly.
New `website/` directory at the project root:

```
website/                           # NEW — mirrors honojs/website structure
  .vitepress/                      #   copied from .src/honojs-website/
    config.ts                      #   adapted: our sidebar, nav, title
    theme/
      index.ts
      custom.css
  docs/                            #   user-facing documentation (copied from docs/)
    user/
      getting-started.md
      creating-shapes.md
      ...
    technical/
      architecture.md
      sketch.md
      ...
    ROADMAP.md
  public/                          #   static assets
    screenshots/
    videos/
    llms/                          #   third-party LLM reference docs (copied from docs/llms/)
  scripts/
    build-llm-docs.ts             #   ported from .src/honojs-website/
  index.md                         #   landing page
  package.json                     #   vitepress + vue deps

docs/                              # UNCHANGED — internal, not part of website
  adr/                             #   architectural decision records (for devs, not users)
```

ADRs (`docs/adr/`) are **not** part of the website — they're internal architectural
records for the development team. They stay in `docs/adr/` and are never copied to
`website/`.

This is a 1:1 mirror of honojs/website:
- `.vitepress/` at project root
- `docs/` subdirectory for content
- `public/` for static assets
- `scripts/` for build tooling
- `index.md` as landing page

**Bootstrap manifest — what we copy from `.src/honojs-website/`:**

| Source (`.src/honojs-website/`) | Target (`website/`) | Adapt |
|--------------------------------|---------------------|-------|
| `.vitepress/config.ts` | `.vitepress/config.ts` | Sidebar items → our sections (user, technical). Nav → our links. Title/description → CAD. Remove Hono-specific Algolia keys. |
| `.vitepress/theme/index.ts` | `.vitepress/theme/index.ts` | Keep as-is — Twoslash + group-icons setup is what we want |
| `.vitepress/theme/custom.css` | `.vitepress/theme/custom.css` | Change brand colors from Hono orange to our palette |
| `scripts/build-llm-docs.ts` | `scripts/build-llm-docs.ts` | Change `docsDir` path, project name ("CAD" not "Hono"), add `public/llms/` copy step for third-party refs |
| `package.json` (devDependencies + scripts) | `package.json` | Same deps (`vitepress`, `vue`, `@shikijs/vitepress-twoslash`, `vitepress-plugin-group-icons`). Same scripts (`dev`, `prebuild`, `build`, `preview`). Change name/description. |
| `public/_redirects` | `public/_redirects` | Replace with our redirect rules (old Hugo URLs → new VitePress URLs) |
| `index.md` | `index.md` | Replace content: CAD hero, our tagline, our features. Keep the VitePress `layout: home` front matter structure. |

Everything else in `.src/honojs-website/` (their `docs/`, `examples/`, `bun.lock`, etc.) is
Hono-specific content — we don't copy it, we write our own.

Steps:
1. `mkdir -p website && cd website`
2. Copy the 7 files above from `.src/honojs-website/`, adapting each as noted
3. `npm init -y && npm add -D vitepress vue @shikijs/vitepress-twoslash vitepress-plugin-group-icons`
4. Add `website/.vitepress/dist/`, `website/.vitepress/cache/`, `website/node_modules/` to `.gitignore`
5. `npx vitepress dev` — verify empty site loads

### Phase 2 — Content migration

Copy user-facing documentation from `docs/` into `website/docs/`:

```
docs/user/*        → website/docs/user/
docs/technical/*   → website/docs/technical/
docs/ROADMAP.md    → website/docs/ROADMAP.md
docs/llms/*        → website/public/llms/     (static files, not markdown)
```

**NOT copied** (internal, not user-facing):
- `docs/adr/` — stays in place, architectural records for developers only

**No markdown changes needed.** Verified: zero Hugo shortcodes exist in source markdown.
The only shortcodes were in `docs/hugo/content/_index.md` (Hugo landing page) and the
hugo-book theme's example site — both get deleted.

The Hugo `weight` front matter in `_index.md` files is only in the Hugo content copies,
not the source markdown. VitePress sidebar order is configured in `.vitepress/config.ts`.

Image paths: `/screenshots/foo.png` resolves to `website/public/screenshots/`.

After copying, `website/docs/` is the canonical location for user-facing documentation.
Future user/technical docs are written there directly — no sync step.

### Phase 3 — Taskfile update

Replace `Taskfile.docs.yml`:

```yaml
vars:
  WEBSITE_DIR: '{{.ROOT_DIR}}/website'

tasks:
  serve:
    desc: Start VitePress dev server (http://localhost:5173)
    dir: '{{.WEBSITE_DIR}}'
    cmds:
      - npx vitepress dev

  build:
    desc: Build VitePress static site
    dir: '{{.WEBSITE_DIR}}'
    cmds:
      - npm run build

  deploy:
    desc: Deploy to Cloudflare Pages
    deps: [build]
    dir: '{{.WEBSITE_DIR}}'
    cmds:
      - npx wrangler pages deploy .vitepress/dist --project-name=cad-docs

  screenshots:
    desc: Generate doc screenshots + videos from E2E tests
    cmds:
      - cd {{.ROOT_DIR}}/tests && DOCS=1 npx playwright test --project=e2e
```

No more `sync:content` task — VitePress reads `website/docs/` directly.
No more `deps:install` task — VitePress is an npm package, not a system binary.

### Phase 4 — Screenshots & video pipeline

Currently screenshots and videos are generated by Playwright (ADR-0026 `docCapture()`)
into `web/gui/docs/screenshots/` and `web/gui/docs/lessons/`, then the Hugo `sync:content`
task copies them to `docs/hugo/static/`. Two-step, fragile, disconnected.

With VitePress, wire them properly:

1. **Playwright outputs → `website/public/`** — VitePress serves anything in `public/` as-is.
   Update `helpers.ts` paths:
   ```ts
   export const SCREENSHOTS_DIR = path.resolve(__dirname, '../../website/public/screenshots');
   export const VIDEOS_DIR = path.resolve(__dirname, '../../website/public/videos');
   ```
   No more copy step — Playwright writes directly where VitePress reads.

2. **Markdown references** — standard image/video syntax, resolved against `public/`:
   ```md
   ![Initial scene](/screenshots/01-initial-scene.png)
   <video src="/videos/getting-started.webm" controls />
   ```

3. **`task docs:screenshots`** — runs Playwright with `DOCS=1` to produce all 12
   screenshots + 7 videos in one pass, directly into `website/public/`.

4. **Build-time validation** — a VitePress `buildEnd` hook that checks all referenced
   screenshot/video files exist, so broken image links fail the build instead of
   silently 404-ing in production.

### Phase 5 — LLM docs generation

Port the `build-llm-docs.ts` script from honojs/website
(`.src/honojs-website/scripts/build-llm-docs.ts`, ~110 lines). The script:

1. Globs all `**/*.md` files under the docs directory
2. Strips YAML front matter
3. Concatenates into plain text files for AI agent consumption
4. Writes output to `public/` so they're served as static files

**Three output tiers:**

| File | Contents | Use case |
|------|----------|----------|
| `llms.txt` | Index with links to each doc page | AI agent discovers available docs |
| `llms-full.txt` | All user + technical docs concatenated | Full context dump for deep questions |
| `llms-small.txt` | User docs only (excludes technical) | Fits in smaller context windows |

**Integration with existing `docs/llms/`:**

We already have hand-curated LLM reference docs for third-party libraries:
- `docs/llms/automerge-llms.txt` / `automerge-llms-full.txt` (~3,600 lines)
- `docs/llms/kkrpc-llms-full.txt` / `kkrpc-llms-small.txt` (~8,750 lines)

These are external library references (not our docs). They are:
- Copied once during Phase 2 (`docs/llms/*` → `website/public/llms/`)
- Committed in `website/public/llms/` — that's their canonical location going forward
- Linked from `llms.txt` as supplementary references by the build script
- Kept separate from the auto-generated project docs

**Resulting URL structure** (served from Cloudflare Pages):
```
https://cad-docs.pages.dev/llms.txt                    # Index
https://cad-docs.pages.dev/llms-full.txt                # Full project docs
https://cad-docs.pages.dev/llms-small.txt               # Compact project docs
https://cad-docs.pages.dev/llms/automerge-llms-full.txt # Automerge reference
https://cad-docs.pages.dev/llms/kkrpc-llms-full.txt     # kkrpc reference
```

**Build wiring** — runs as a prebuild step in `package.json`:
```json
{
  "scripts": {
    "prebuild": "bun ./scripts/build-llm-docs.ts",
    "build": "vitepress build"
  }
}
```

This follows the same `prebuild` pattern Hono uses — build-time generation, deployed as
static files.

### Phase 6 — MCP documentation tools

Since our Hono Worker already has an MCP endpoint (`/mcp`) with 29 tools, we add
documentation tools so AI agents can query docs **through MCP** — not just by fetching
static URLs.

**New MCP tools:**

| Tool | Description | Input | Returns |
|------|-------------|-------|---------|
| `cad_docs_index` | List available doc sections | none | Parsed `llms.txt` — section names + page links |
| `cad_docs_search` | Search docs by keyword | `{ query: string }` | Matching sections from `llms-full.txt` |
| `cad_docs_read` | Read a specific doc page | `{ section: string }` | Content of one page (split by `# ` headers) |
| `cad_docs_reference` | Get third-party library docs | `{ library: "automerge" \| "kkrpc" }` | Content from `llms/` reference files |

**Why MCP instead of just static files:**
- Agents already have the MCP bridge connected — no extra config to fetch docs
- `cad_docs_search` does keyword matching server-side, returning only relevant
  sections instead of dumping 2,000+ lines into the context window
- Tools appear in `tools/list` alongside the CAD tools — agents discover docs
  naturally, same as they discover `add_cube` or `select`
- Works through the existing bridge (`scripts/mcp-bridge.ts`) — no new transport needed

**Implementation:** The `llms*.txt` files are built into `website/public/` and deployed as
static assets on the docs Cloudflare Pages project (`cad-docs.pages.dev`). The CAD
Worker MCP tools fetch them from that URL:

```ts
// In the Worker's MCP tool handler:
const docsUrl = 'https://cad-docs.pages.dev';
const full = await fetch(`${docsUrl}/llms-full.txt`).then(r => r.text());
```

The Worker already has `fetch()` — no new bindings needed. The docs Pages project
is on the same Cloudflare account, so fetch is fast (same datacenter). Results are
cached in the Worker's isolate for the duration of the request.

### Phase 7 — Cleanup (only after `website/` is fully verified)

**Do not delete anything from `docs/` until `website/` is proven working:**
- `task docs:serve` renders all pages
- `task docs:build` produces a complete site
- `task docs:deploy` succeeds to `cad-docs.pages.dev`
- MCP tools return correct content

Once verified:
1. Delete `docs/hugo/` entirely (hugo.toml, themes/, content/, public/, resources/, layouts/, assets/)
2. Delete `docs/user/`, `docs/technical/`, `docs/llms/`, `docs/ROADMAP.md` (now in `website/docs/`)
3. Keep `docs/adr/` — ADRs stay as the canonical location for architectural records (internal only)
4. Remove `hugo` from any tool-versions / brew deps
5. Update AGENT.md references (`docs/adr/` stays, everything else → `website/docs/`)
6. Update CI if applicable

### Phase 8 — Versioned Pages deploys (aligned with Worker versioning)

Currently the Worker uses a sophisticated upload → promote → canary lifecycle
(`taskfiles/Taskfile.cloudflare.yml`), while docs deploy directly to production
with no versioning. This creates a gap: rolling back the Worker doesn't roll back
docs, there's no way to correlate which docs version paired with which Worker
version, and PR previews only exist for the Worker.

**Goal:** mirror the Worker's versioned deploy pattern for Cloudflare Pages so
both products are tagged, previewable, and promotable from the same commit.

#### How Cloudflare Pages branch deploys work

Every `wrangler pages deploy` creates an **immutable deployment** with a unique
URL (`<hash>.cad-docs.pages.dev`). The `--branch` flag creates a stable alias:

```bash
# Tagged release: v0-7-0.cad-docs.pages.dev
wrangler pages deploy .vitepress/dist --project-name=cad-docs --branch v0-7-0

# PR preview: pr-42.cad-docs.pages.dev
wrangler pages deploy .vitepress/dist --project-name=cad-docs --branch pr-42
```

The `production` branch (typically `main`) is what the custom domain
(`docs.ubuntusoftware.net`) resolves to. Promoting a version means deploying
it with `--branch main`.

#### Lifecycle tasks

Add to `systems/docs/Taskfile.docs.yml`, mirroring the Worker tasks:

| Task | What it does |
|------|-------------|
| `docs:upload` | Build + deploy with `--branch v{{VERSION_SLUG}}` → creates `v0-7-0.cad-docs.pages.dev` |
| `docs:promote` | Re-deploy latest version with `--branch main` → updates production |
| `docs:preview` | Deploy with `--branch pr-{{PR_NUMBER}}` → creates `pr-42.cad-docs.pages.dev` |
| `docs:smoke` | Curl the preview URL, check HTTP 200 + page title |
| `docs:versions:json` | Write `website/docs-versions.json` (git SHA, version, URLs) |

#### `docs-versions.json`

Parallel structure to `web/gui/versions.json`:

```json
[
  {
    "version": "0.7.0",
    "commit": "e4e28b8",
    "commitHash": "e4e28b8abc123...",
    "commitMessage": "feat: complete docs system tightening",
    "url": "https://v0-7-0.cad-docs.pages.dev",
    "productionUrl": "https://docs.ubuntusoftware.net",
    "createdAt": "2026-02-25T12:00:00Z"
  }
]
```

#### CI alignment

Update `.github/workflows/ci.yml` to use the versioned flow:

```yaml
# Main push: upload tagged docs version (does NOT update production)
- if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  run: task docs:upload

# PR: upload per-PR docs preview
- if: github.event_name == 'pull_request'
  run: task docs:preview PR_NUMBER=${{ github.event.pull_request.number }}
```

Production promotion is manual (`task docs:promote`), same as the Worker.

#### PR comment update

Add docs preview URL alongside the Worker preview:

```markdown
| Preview (App) | https://pr-42-truck-cad.gedw99.workers.dev |
| Preview (Docs) | https://pr-42.cad-docs.pages.dev |
```

#### Version coupling

The Worker and docs share the same `APP_VERSION` (from
`crates/truck-webgpu-gui/src/commands/mod.rs`). Both get the same version tag
and git SHA, but promote independently. This means:

- **Same commit, same tag** — `v0-7-0` Worker + `v0-7-0` docs, both from the same CI run
- **Independent promotion** — fix a docs typo without re-promoting the Worker
- **Independent rollback** — revert docs without touching the Worker
- **No asset size limits** — Pages has no cap (unlike Workers assets at 25/100 MB)
- **Audit trail** — `docs-versions.json` + `web/gui/versions.json` together show exactly what's deployed

#### Definition of Done (Phase 8)

- [ ] `task docs:upload` creates a versioned Pages deployment with branch alias
- [ ] `task docs:promote` deploys to production (`--branch main`)
- [ ] `task docs:preview PR_NUMBER=42` creates PR preview
- [ ] `task docs:smoke` validates a deployed URL
- [ ] `docs-versions.json` generated alongside `web/gui/versions.json`
- [ ] CI uses `docs:upload` (main) and `docs:preview` (PR) instead of direct deploy
- [ ] PR comments include docs preview URL
- [ ] `task docs:deploy` still works as a shortcut (upload + promote in one step)

### Staying in sync with honojs/website

The `.src/honojs-website/` clone is our upstream reference. When Hono updates their
VitePress setup (new plugins, config changes, theme improvements), we catch up:

```bash
# Pull latest from Hono
git -C .src/honojs-website pull

# Diff the 7 bootstrap files against our copies
diff .src/honojs-website/.vitepress/config.ts website/.vitepress/config.ts
diff .src/honojs-website/.vitepress/theme/     website/.vitepress/theme/
diff .src/honojs-website/scripts/              website/scripts/
diff .src/honojs-website/package.json          website/package.json
# → Cherry-pick relevant changes (new plugins, dep bumps, etc.)
```

This is **not** a hard dependency — if Hono changes something we don't want, we skip it.
The `.src/` clone is a reference, not a submodule. We own our copies.

## Scope

### What changes
- NEW: `website/` — self-contained VitePress project (mirrors honojs/website)
- Content copied from `docs/` → `website/docs/` (user, technical, ROADMAP) + `docs/llms/` → `website/public/llms/`
- `Taskfile.docs.yml` — points to `website/`, simplified (no sync, no Hugo binary)
- `systems/truck/worker/src/index.ts` — 4 new MCP tools (`cad_docs_*`)
- `tests/e2e/helpers.ts` — `SCREENSHOTS_DIR` / `VIDEOS_DIR` → `website/public/`
- New deps: `vitepress`, `vue`, `@shikijs/vitepress-twoslash`, `vitepress-plugin-group-icons` (dev only, in `website/package.json`)
- Phase 7 (after verification): delete `docs/hugo/`, `docs/user/`, `docs/technical/`, `docs/llms/`
- `docs/adr/` stays forever — canonical ADR location

### What stays the same
- `docs/adr/` — unchanged, canonical location for ADRs
- Deployment target: Cloudflare Pages at `cad-docs.pages.dev`
- URL structure: `/docs/user/getting-started`, `/docs/technical/architecture`, etc.
- Playwright generates screenshots + videos (ADR-0026 `docCapture()`)

### What we gain
- **No Hugo dependency** — pure Node/Bun toolchain
- **No content sync step** — VitePress reads markdown in-place
- **No asset copy step** — Playwright writes to `website/public/`, VitePress serves it
- **Build-time broken link detection** — missing screenshots fail the build, not silently 404
- **Twoslash code blocks** — TypeScript type hints in documentation
- **LLM docs via MCP** — agents call `cad_docs_search` alongside `add_cube`, no extra config
- **LLM docs via static** — `llms.txt` convention for agents without MCP
- **Vite HMR** — instant dev server updates
- **Same stack as Hono** — familiar patterns, community support

## Content Inventory (current)

| Section | Pages | Lines | Notes |
|---------|-------|-------|-------|
| User docs | 8 | ~380 | Getting started, shapes, sketch, transforms, booleans, save/load |
| Technical docs | 11 | ~630 | Architecture, truck, sketch, gizmo, undo-redo, automerge, MCP |
| ADRs | 22 | ~2,500+ | Architecture decisions (0001–0027, growing) — **internal only, NOT on website** |
| LLM refs | 4 files | ~12,350 | Automerge + kkrpc third-party reference docs |
| Other | 1 | ~68 | Roadmap |
| **Website total** | **~20 pages** | **~1,080+** | User + technical + roadmap → `website/docs/` |

Static assets: 12 screenshots (~1.3 MB), 7 tutorial videos (~2.6 MB).

## Risks

1. **Hugo shortcodes** — **Not a risk.** Verified: zero Hugo shortcodes in source markdown.
   Only the Hugo landing page (`docs/hugo/content/_index.md`) and theme examples use them —
   both get deleted.
2. **URL breakage** — if URL structure changes, existing bookmarks break. Mitigate with
   `_redirects` file on Cloudflare Pages (same pattern as honojs/website).
3. **Vue dependency** — adds Vue to the docs toolchain (dev dependency only, in
   `website/package.json`, does not affect the CAD app or Worker).
4. **MCP docs fetch latency** — Worker fetches `llms-full.txt` (~3,600 lines) from the
   docs Pages project on first MCP tool call. Mitigate: cache the response in the
   Worker isolate; `llms-small.txt` for lighter queries.

## Definition of Done

- [x] `task docs:serve` starts VitePress dev server with all content visible
- [x] `task docs:build` produces static site in `.vitepress/dist/`
- [x] `task docs:deploy` deploys to `cad-docs.pages.dev`
- [x] All markdown pages render correctly (user, technical, roadmap)
- [x] `task docs:screenshots` generates all screenshots + videos into `website/public/`
- [x] Screenshots and videos render in docs pages (no broken images)
- [ ] Build fails if a referenced screenshot/video is missing
- [x] Search works (built-in local search minimum)
- [x] Dark mode works
- [x] `llms.txt`, `llms-full.txt`, `llms-small.txt` generated on build
- [x] Third-party LLM refs live at `website/public/llms/` and linked from `llms.txt`
- [ ] `cad_docs_index`, `cad_docs_search`, `cad_docs_read`, `cad_docs_reference` MCP tools work
- [ ] MCP `tools/list` includes doc tools (agents discover them automatically)
- [x] Playwright `SCREENSHOTS_DIR` / `VIDEOS_DIR` point to `website/public/` (no copy step)
- [x] (Phase 7, after verification) `docs/hugo/` directory deleted
- [x] (Phase 7, after verification) Hugo removed from dependencies
- [ ] (Phase 8) `task docs:upload` creates versioned Pages deployment with branch alias
- [ ] (Phase 8) `task docs:promote` deploys to production
- [ ] (Phase 8) `docs-versions.json` generated alongside `web/gui/versions.json`
- [ ] (Phase 8) CI uses versioned flow (upload on main, preview on PR)
- [ ] (Phase 8) PR comments include docs preview URL
- [ ] `docs/adr/` unchanged — still in place, not part of website
