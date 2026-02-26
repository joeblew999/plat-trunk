# ADR-0030: Vertical Microfrontends via Cloudflare Router Worker

**Author**: Claude (Anthropic) + Joe
**Date**: 2026-02-26

## Status

**Proposed** — design complete, implementation deferred until second system (candle) needs its own Worker.

## Problem

plat-trunk is growing from a single-system repo (truck) into a multi-system platform:

| System | Current Deploy | URL |
|--------|---------------|-----|
| **truck** | Cloudflare Worker (`truck-cad`) | `cad.ubuntusoftware.net` |
| **docs** | Cloudflare Pages (`cad-docs`) | `docs.ubuntusoftware.net` |
| **candle** | Not yet deployed | — |
| **rdk** | Not yet deployed | — |

Each system currently deploys independently to its own subdomain. This works for two systems but creates problems as the platform grows:

| Issue | Impact |
|-------|--------|
| **Subdomain sprawl** | Every new system = new DNS record, new TLS cert, new CORS config |
| **No shared navigation** | Users click between `cad.*` and `docs.*` with full page reloads, no shared chrome |
| **Duplicated cross-cutting concerns** | Auth, rate limiting, observability wired per-system |
| **No unified discovery** | MCP, OpenAPI, `/.well-known/*` endpoints scattered across subdomains |
| **Cookie/session fragmentation** | Different origins = separate cookie jars, no shared auth state |

## Decision: Cloudflare Router Worker with Service Bindings

Deploy a **Router Worker** that maps URL paths to downstream system Workers via [Cloudflare Service Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/). Each system remains an independent Worker — the router is a thin proxy that handles path mapping and URL rewriting.

This follows the **vertical microfrontend** pattern described in:
- [Cloudflare Blog: Vertical Microfrontends](https://blog.cloudflare.com/vertical-microfrontends/)
- [Cloudflare Docs: Microfrontends](https://developers.cloudflare.com/workers/framework-guides/web-apps/microfrontends/)
- [Template: `cloudflare/templates/microfrontend-template`](https://github.com/cloudflare/templates/tree/main/microfrontend-template) (cloned to `.src/cloudflare-templates/`)

### Architecture

```
                          ubuntusoftware.net (or cad.ubuntusoftware.net)
                                       │
                          ┌─────────────┴─────────────┐
                          │    platform-router Worker  │
                          │    (systems/router/)       │
                          │                            │
                          │  ROUTES config:            │
                          │   /        → TRUCK         │
                          │   /docs    → DOCS          │
                          │   /candle  → CANDLE        │
                          └──┬────────┬────────┬───────┘
                             │        │        │
                    service  │        │        │  service
                    binding  │        │        │  binding
                             │        │        │
                     ┌───────┴──┐  ┌──┴───┐  ┌┴────────┐
                     │truck-cad │  │ docs │  │ candle  │
                     │ Worker   │  │Worker│  │ Worker  │
                     │          │  │      │  │         │
                     │ Hono API │  │Static│  │ Candle  │
                     │ WASM CAD │  │Assets│  │ ML API  │
                     │ MCP/SSE  │  │      │  │         │
                     └──────────┘  └──────┘  └─────────┘
```

### What the Router Does (per request)

The router is a single TypeScript file (~1100 lines, from Cloudflare's production-ready template) that handles:

1. **Route matching** — regex-compiled path expressions, longest prefix wins
2. **Path stripping** — `/docs/install` → forwards `/install` to DOCS Worker
3. **HTML rewriting** — `src="/assets/x.png"` → `src="/docs/assets/x.png"` via HTMLRewriter
4. **CSS rewriting** — `url(/assets/bg.jpg)` → `url(/docs/assets/bg.jpg)`
5. **Redirect rewriting** — upstream `Location: /login` → `Location: /docs/login`
6. **Cookie path scoping** — `Path=/` → `Path=/docs/` (prevents cross-system collisions)
7. **Preloading** — Speculation Rules API (Chromium) or fetch script fallback (Firefox/Safari)
8. **View Transitions** — optional CSS injection for smooth cross-Worker navigation

### Route Configuration

Routes are defined as a JSON environment variable in the router's `wrangler.jsonc`:

```jsonc
{
  "services": [
    { "binding": "TRUCK",  "service": "truck-cad" },
    { "binding": "DOCS",   "service": "docs-worker" },
    { "binding": "CANDLE", "service": "candle-worker" }
  ],
  "vars": {
    "ROUTES": "{\"smoothTransitions\":true,\"routes\":[{\"binding\":\"TRUCK\",\"path\":\"/\",\"preload\":true},{\"binding\":\"DOCS\",\"path\":\"/docs\",\"preload\":true},{\"binding\":\"CANDLE\",\"path\":\"/candle\"}]}"
  }
}
```

Path expressions support: static (`/docs`), dynamic params (`/:tenant`), wildcards (`/api/:path*`), and constraints (`/:id(\\d+)`).

### URL Namespace

```
/                       → TRUCK  (CAD SPA — index.html)
/model/:id              → TRUCK  (SPA deep link → /?model=id)
/api/cad/*              → TRUCK  (Hono REST API, SSE, sync/async commands)
/mcp                    → TRUCK  (MCP JSON-RPC endpoint)
/api-docs               → TRUCK  (Scalar OpenAPI viewer)
/.well-known/agent.json → TRUCK  (MCP/A2A discovery)
/llms.txt               → TRUCK  (AI discovery)
/docs                   → DOCS   (VitePress static site)
/docs/guide/*           → DOCS   (documentation pages)
/candle                 → CANDLE (future: ML inference API)
/candle/api/*           → CANDLE (future: model endpoints)
```

The root mount (`/`) acts as catch-all — any path not matched by a more specific route falls through to truck-cad. This means all existing truck URLs (`/api/cad/*`, `/mcp`, etc.) work unchanged.

## File Layout

```
systems/
  router/                          ← NEW: Router Worker
    index.ts                       ← Cloudflare microfrontend router (from template)
    wrangler.jsonc                 ← Service bindings + ROUTES config
    package.json                   ← wrangler + vitest deps
    vitest.config.ts               ← Integration tests with stub workers
    test/
      integration.test.ts          ← Route matching, URL rewriting, redirects, cookies
    Taskfile.router.yml            ← deploy, dev, test tasks
  truck/
    worker/                        ← UNCHANGED: truck-cad Worker
  docs/
    worker/                        ← NEW: thin Worker wrapping VitePress static assets
    website/                       ← UNCHANGED: VitePress source
```

## Key Design Decisions

### 1. Docs: Pages → Workers Static Assets

The current docs site uses Cloudflare Pages. Service bindings only work Worker-to-Worker, so docs must become a Worker. Two options:

| Option | Approach | Verdict |
|--------|----------|---------|
| **A: Workers Static Assets** | New Worker with `[assets]` directive pointing at VitePress dist | **Chosen** — same deploy model as truck, service-bindable |
| **B: Keep Pages on subdomain** | Pages stays at `docs.ubuntusoftware.net`, not routed | Simpler but loses unified URL namespace |

Workers Static Assets (GA 2025) is the Cloudflare-recommended replacement for Pages in the Workers ecosystem. A docs Worker is ~5 lines of config:

```toml
# systems/docs/worker/wrangler.toml
name = "docs-worker"
main = "index.ts"              # minimal pass-through
compatibility_date = "2025-10-08"

[assets]
directory = "../website/.vitepress/dist"
```

### 2. Service Bindings = Zero-Cost Routing

Service bindings invoke Workers within the same Cloudflare data center with no HTTP round-trip, no DNS lookup, no TLS handshake. The router adds effectively zero latency — it's an in-process function call.

### 3. Each System Deploys Independently

The router references systems by name (service binding), not by code. Deploying `truck-cad` doesn't require redeploying the router. The router only needs redeployment when routes change (adding a new system).

### 4. Local Dev: Bypass the Router

For day-to-day development, hit workers directly:
- `http://localhost:8788` — truck-cad (wrangler dev)
- `http://localhost:5173` — docs (vitepress dev)

The router is only needed for integration testing or verifying cross-system navigation. When needed, `wrangler dev` with miniflare stubs (as shown in the template's `vitest.config.ts`) provides local service binding simulation.

### 5. Cross-Cutting Concerns at the Router

The router is the natural place for platform-wide concerns:

| Concern | Implementation |
|---------|---------------|
| **Auth** | Check JWT/cookie before dispatching to service binding |
| **Rate limiting** | Per-path or per-system rate limits |
| **CORS** | Single CORS policy for the whole domain |
| **Observability** | Request logging, tracing headers injected at router |
| **Discovery** | Aggregate `/.well-known/*` and `/llms.txt` from all systems |
| **Feature flags** | Route to different Worker versions per user/tenant |

These are **future possibilities**, not day-1 requirements. The router starts as a pure pass-through proxy.

## Implementation Plan

### Phase 0: Reference Material (Done)

- [x] Clone `cloudflare/templates` to `.src/cloudflare-templates/`
- [x] Read and understand router source (`microfrontend-template/index.ts`)
- [x] Document architecture in this ADR

### Phase 1: Router Worker (When Candle Arrives)

1. Copy `microfrontend-template/` to `systems/router/`
2. Configure `wrangler.jsonc` with truck-cad + docs service bindings
3. Write `Taskfile.router.yml` (dev, deploy, test)
4. Include in root `Taskfile.yml`

### Phase 2: Docs Worker

1. Create `systems/docs/worker/` with Workers Static Assets config
2. Point `[assets]` at VitePress dist directory
3. Update `Taskfile.vitepress.yml` to build + deploy as Worker (not Pages)
4. Retire Cloudflare Pages project

### Phase 3: Per-System Config

1. Split `cf-deploy.json` into per-system configs (see deferred work from ADR-0022)
2. Add `--config <path>` flag to `cf-deploy.ts`
3. Each system's Taskfile passes its own config

### Phase 4: Candle System

1. Create `systems/candle/worker/` with ML inference API
2. Add service binding to router's `wrangler.jsonc`
3. Add route: `{ "binding": "CANDLE", "path": "/candle" }`
4. Redeploy router

## Alternatives Considered

### A: Subdomain per System (Current)

Keep `cad.ubuntusoftware.net`, `docs.ubuntusoftware.net`, `candle.ubuntusoftware.net`.

- **Pro**: Zero infrastructure change, each system fully independent
- **Con**: No shared navigation, cookie fragmentation, subdomain sprawl, duplicated CORS/auth
- **Verdict**: Works today, doesn't scale past 3-4 systems

### B: Monolithic Worker

Merge all systems into one giant Worker.

- **Pro**: Single deploy, single config
- **Con**: Couples unrelated systems, one bad deploy breaks everything, bundle size limits
- **Verdict**: Antithetical to the multi-system architecture

### C: Cloudflare for SaaS (Custom Hostnames)

Use Cloudflare's SaaS routing to map paths to Workers.

- **Pro**: Enterprise-grade, supports custom domains per tenant
- **Con**: Overkill for internal system routing, adds billing complexity
- **Verdict**: Right tool for multi-tenant SaaS, wrong tool for system composition

### D: Client-Side Microfrontends (Module Federation)

Use webpack Module Federation or import maps to compose at the browser level.

- **Pro**: No server-side routing needed
- **Con**: Shared runtime coupling, complex build tooling, doesn't work for API/MCP endpoints
- **Verdict**: Wrong abstraction — our systems are backend-heavy (WASM, ML inference), not just UIs

## References

- [Cloudflare Blog: Building Vertical Microfrontends](https://blog.cloudflare.com/vertical-microfrontends/)
- [Cloudflare Docs: Microfrontends](https://developers.cloudflare.com/workers/framework-guides/web-apps/microfrontends/)
- [Template Source: `cloudflare/templates/microfrontend-template`](https://github.com/cloudflare/templates/tree/main/microfrontend-template)
- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Service Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
- ADR-0022: cf-deploy toolkit (config + deploy lifecycle)
- ADR-0017: Versioned deployments (Worker version management)
- ADR-0029: Candle hybrid edge-container architecture
