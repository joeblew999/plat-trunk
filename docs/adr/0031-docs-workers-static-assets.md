# ADR-0031: Migrate Docs from Cloudflare Pages to Workers Static Assets

**Author**: Claude (Anthropic) + Joe
**Date**: 2026-02-26

## Status

**Proposed** — can be implemented immediately, independent of ADR-0030 (Router Worker).

## Problem

The docs site (`systems/docs/website/`) currently deploys to **Cloudflare Pages** as project `cad-docs`. This works but creates asymmetry with the rest of the platform:

| Issue | Impact |
|-------|--------|
| **Two deploy models** | Worker uses `wrangler deploy` with versions/promote/rollback; Pages uses `wrangler pages deploy` with branch aliases — different mental model, different tooling |
| **Pages can't be service-bound** | ADR-0030 Router Worker requires service bindings (Worker-to-Worker). Pages can't participate — blocking the unified URL namespace |
| **Separate wrangler invocation path** | Pages deploy runs wrangler from `systems/truck/worker/` (where it's installed) with absolute paths to dist — fragile cross-system dependency |
| **No `cf-deploy.ts` lifecycle** | Worker gets versioned deploy (upload → promote → rollback → smoke). Pages gets branch-based deploy with no equivalent lifecycle |
| **Pages is legacy-track** | Cloudflare's direction is [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) (GA 2025) — Pages is maintenance mode |

## Decision: Workers Static Assets

Replace the Cloudflare Pages deployment with a **Workers Static Assets** deployment. The VitePress build pipeline is unchanged — only the deploy target changes.

### What is Workers Static Assets?

A Worker with an `[assets]` directive in `wrangler.toml` that serves static files directly from Cloudflare's edge. Key behaviors:

1. **Exact asset match** → serve file directly (no Worker code executed)
2. **No match + Worker code** → Worker handles (API routes, redirects, etc.)
3. **No match + no Worker** → 404

For a static site like VitePress, the Worker code is minimal or empty — assets do all the work.

### Architecture

```
Before (Pages):
  VitePress build → .vitepress/dist/ → wrangler pages deploy → cad-docs.pages.dev

After (Workers Static Assets):
  VitePress build → .vitepress/dist/ → wrangler deploy → docs-worker.gedw99.workers.dev
                                                        → docs.ubuntusoftware.net (custom domain)
```

### Configuration

```toml
# systems/docs/worker/wrangler.toml
name = "docs-worker"
main = "src/index.ts"
compatibility_date = "2025-10-08"
compatibility_flags = ["nodejs_compat"]

# Custom domain (same as current Pages custom domain)
routes = [
  { pattern = "docs.ubuntusoftware.net/*", zone_name = "ubuntusoftware.net" }
]

[assets]
directory = "../website/.vitepress/dist"
not_found_handling = "404-page"          # VitePress generates 404.html
```

The `not_found_handling = "404-page"` setting serves VitePress's generated `404.html` for missing paths. VitePress is a static site generator (not an SPA), so every page has its own HTML file — no SPA fallback needed.

### Worker Code (Minimal)

```typescript
// systems/docs/worker/src/index.ts
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // Workers Static Assets handles all static files automatically.
    // This Worker code only runs for paths that DON'T match a static file.
    //
    // Future: add API routes, auth, redirects, analytics here.
    // For now, fall through to assets (which will return 404.html for missing).
    return env.ASSETS.fetch(request);
  },
};
```

## File Layout

```
systems/docs/
  worker/                          ← NEW
    wrangler.toml                  ← Static assets config
    src/
      index.ts                     ← Minimal Worker (falls through to assets)
    package.json                   ← wrangler dependency
    tsconfig.json
  website/                         ← UNCHANGED
    .vitepress/
      config.ts
      dist/                        ← Build output (referenced by [assets].directory)
    docs/
    public/
    scripts/
    package.json
  Taskfile.vitepress.yml           ← UPDATED: deploy tasks change
```

## What Changes

### 1. New: `systems/docs/worker/`

Minimal Worker project — wrangler.toml + ~5 line index.ts + package.json with wrangler dep.

### 2. Updated: Deploy Tasks

Current Pages deploy tasks in `taskfiles/Taskfile.cloudflare.yml`:

```yaml
# BEFORE (Pages)
"pages:_deploy":
  cmds:
    - cd {{.WORKER_DIR}} && bun x wrangler pages deploy {{.PAGES_DIR}}/.vitepress/dist
        --project-name={{.PAGES_PROJECT}} --branch {{.BRANCH}} --commit-dirty=true

"pages:upload":
  cmds:
    - task: "pages:_deploy"
      vars: { BRANCH: 'v{{.VERSION_SLUG}}' }
```

```yaml
# AFTER (Workers Static Assets)
"docs:deploy":
  dir: '{{.DOCS_WORKER_DIR}}'
  cmds:
    - bun x wrangler deploy

"docs:upload":
  dir: '{{.DOCS_WORKER_DIR}}'
  cmds:
    - bun x wrangler versions upload --tag "v{{.APP_VERSION}}" --message "v{{.APP_VERSION}}"
```

The docs Worker gets the **same versioned deploy lifecycle** as truck-cad: upload → promote → rollback → smoke. This is the `cf-deploy.ts` pattern from ADR-0022.

### 3. Updated: `cf-deploy.json`

```jsonc
// BEFORE
"pages": {
  "project": "cad-docs",
  "domain": "cad-docs.pages.dev",
  "dir": "systems/docs/website",
  "production": "https://docs.ubuntusoftware.net"
}

// AFTER — becomes a second worker entry
"docs": {
  "name": "docs-worker",
  "domain": "gedw99.workers.dev",
  "dir": "systems/docs/worker",
  "production": "https://docs.ubuntusoftware.net"
}
```

### 4. Updated: VitePress Config

```typescript
// BEFORE (systems/docs/website/.vitepress/config.ts)
import cfDeploy from '../../cf-deploy.json'

// AFTER — reads from docs-specific config or shared config
// (exact approach depends on cf-deploy.json split decision — see ADR-0022)
```

### 5. Retired: Cloudflare Pages Project

After cutover, delete the `cad-docs` Pages project from the Cloudflare dashboard. The custom domain `docs.ubuntusoftware.net` moves from Pages to the Worker's route.

## What Stays the Same

- **VitePress source** — all markdown, config, theme unchanged
- **Build pipeline** — `bun run build` still outputs to `.vitepress/dist/`
- **LLM docs generation** — `build-llm-docs.ts` still runs as prebuild
- **Local dev** — `vitepress dev` on port 5173, no change
- **Content** — all docs, screenshots, videos in same locations
- **Custom domain** — `docs.ubuntusoftware.net` (DNS record changes from Pages to Worker route)

## Benefits

### Immediate

| Benefit | Detail |
|---------|--------|
| **Unified deploy model** | Same `wrangler deploy` / `wrangler versions` pattern as truck-cad |
| **Versioned rollback** | `cf-deploy.ts rollback` works for docs too — no more branch-based deploy |
| **Own wrangler install** | `systems/docs/worker/` has its own `node_modules/wrangler`, no cross-system dependency |
| **Smoke testing** | `cf-deploy.ts smoke` works against docs Worker the same way |
| **Simpler CI** | One deploy model to maintain in GitHub Actions |

### Enables (Future)

| Benefit | Detail |
|---------|--------|
| **Service-bindable** | Router Worker (ADR-0030) can bind to `docs-worker` |
| **Edge logic** | Add auth, analytics, A/B testing, redirects in Worker code |
| **API co-location** | Docs search API, feedback endpoint can live in the same Worker |
| **Per-system config** | Docs Worker reads its own `cf-deploy.json` (when per-system split lands) |

## Implementation Plan

### Phase 1: Create Worker Scaffold

1. Create `systems/docs/worker/` with wrangler.toml, index.ts, package.json, tsconfig.json
2. Point `[assets].directory` at `../website/.vitepress/dist`
3. Run `bun install` to get wrangler
4. Test locally: `wrangler dev` serves VitePress dist

### Phase 2: Deploy & Verify

1. Build VitePress: `task vitepress:build`
2. Deploy Worker: `cd systems/docs/worker && bun x wrangler deploy`
3. Verify at `docs-worker.gedw99.workers.dev`
4. Smoke test: health, llms.txt, navigation, screenshots/videos load

### Phase 3: DNS Cutover

1. Add Worker route for `docs.ubuntusoftware.net`
2. Verify custom domain works
3. Remove Pages custom domain
4. Delete `cad-docs` Pages project from dashboard

### Phase 4: Update Taskfiles

1. Add `Taskfile.docs-worker.yml` or extend `Taskfile.vitepress.yml` with deploy tasks
2. Replace `cf:pages:*` tasks with `cf:docs:*` Worker-based tasks
3. Update `cf-deploy.json` (pages section → docs worker section)
4. Update any imports that read `cfDeploy.pages.*`

## Alternatives Considered

### A: Keep Pages (Current)

- **Pro**: Works, zero effort
- **Con**: Can't service-bind, different deploy model, Pages is legacy-track
- **Verdict**: Technical debt that grows with each new system

### B: Merge Docs into Truck Worker

Serve VitePress dist from truck-cad Worker's `[assets]` at `/docs/*`.

- **Pro**: One fewer Worker to manage
- **Con**: Couples unrelated concerns, truck-cad already serves its own SPA, asset conflicts
- **Verdict**: Wrong direction — systems should be independent

### C: Use Cloudflare Workers for Platforms (Custom Domains)

- **Pro**: Enterprise routing features
- **Con**: Massive overkill for serving a docs site
- **Verdict**: Right for multi-tenant SaaS, wrong for internal system composition

## References

- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) — the `[assets]` directive
- [Workers Static Assets: Configuration](https://developers.cloudflare.com/workers/static-assets/configuration/) — `not_found_handling`, `run_worker_first`
- [Migrate from Pages to Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/microfrontends/) — Cloudflare's own guidance
- ADR-0027: VitePress docs (current setup)
- ADR-0030: Vertical microfrontends via Router Worker (service binding requirement)
- ADR-0022: cf-deploy toolkit (versioned deploy lifecycle)
