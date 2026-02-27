# [ADR-017] Versioned Deployments via Cloudflare Workers

**Author**: Claude (Anthropic) — implemented as part of deploy pipeline work.
**Date**: 2026-02-22

## Intent

**Every deployment is a tagged, immutable version that can be inspected, gradually rolled out, and instantly rolled back.** The schema version in `cad-schema.json` is the single source of truth for release numbering. Cloudflare Workers native Versions + Gradual Deployments provides the runtime mechanism — no external tooling or registries needed.

## Status

**Superseded** — see AGENT.md deploy section for current model. Key change: aliases are only created at release time, not on every upload. Dev uploads get immutable UUID URLs only.

## Problem

The previous deployment was a bare `wrangler deploy` — a one-shot push to production with:

- **No version tracking**: No way to tell what code is running or when it was deployed
- **No rollback**: Bad deploy means scramble to fix-forward or manually revert and redeploy
- **No gradual rollout**: 100% traffic on every push — risky for a CAD kernel serving real geometry
- **Disconnected versioning**: `cad-schema.json` had a `version` field but it wasn't wired to deployment

## Decision

Use Cloudflare Workers **Versions** (GA since 2024) to make every deployment a tagged, immutable artifact:

1. **`wrangler versions upload`** — creates a version without changing traffic
2. **`wrangler versions deploy`** — promotes a version to serve traffic (supports % split)
3. **`wrangler rollback`** — instantly reverts to the previous version
4. Cloudflare retains the last **100 versions** automatically

### Version Tagging

The version tag comes from `cad-schema.json`:

```json
{ "version": "0.4.0" }
```

This same version string is embedded in the Rust binary (`commands.rs`) and returned by `/api/health`. The deploy pipeline reads it at build time:

```yaml
CAD_VERSION:
  sh: "bun -e \"process.stdout.write(JSON.parse(require('fs').readFileSync('web/cad-schema.json','utf8')).version)\""
```

Every uploaded version is tagged `v{CAD_VERSION}` (e.g., `v0.4.0`).

### Task Commands

| Command | What it does |
|---------|-------------|
| `task truck:gui:deploy` | Build + upload + tag (does NOT promote — preview URL only) |
| `task truck:deploy:upload` | Upload new version only (no traffic change) |
| `task truck:deploy:promote` | Promote latest uploaded version to 100% |
| `task truck:deploy:rollback` | Instantly roll back to previous version |
| `task truck:deploy:versions` | List recent versions with tags |
| `task truck:deploy:status` | Show current deployment and traffic split |

### CI Integration

CI runs on every push/PR:

```
push to main  →  cargo check + test + wasm-pack  →  wrangler versions upload (tagged)
pull request  →  cargo check + test + wasm-pack  →  wrangler deploy (preview Worker)
PR closed     →  preview Worker torn down
```

Key: **CI uploads but does NOT promote**. Production promotion is always manual (`task truck:deploy:promote`). This prevents accidental production pushes from green CI.

### GitHub Releases

Git tags and GitHub releases are created alongside deploys:

```bash
task truck:release    # tag + GitHub release (local, then push)
```

The tag (`v0.4.0`) matches the Cloudflare version tag — one version number across schema, binary, git tag, CF version, and GitHub release.

## URLs

| Environment | URL | Purpose |
|-------------|-----|---------|
| Production | https://cad.ubuntusoftware.net | Custom domain, promoted versions only |
| Staging | https://truck-cad.gedw99.workers.dev | Workers.dev default, same deployment |
| Version preview | `v0-4-0-truck-cad.gedw99.workers.dev` | Per-version preview URL (any uploaded version) |
| Local | http://localhost:8788 | Dev server |
| CF Dashboard | [Deployments tab](https://dash.cloudflare.com/7384af54e33b8a54ff240371ea368440/workers/services/view/truck-cad/production/deployments) | Version history, traffic split, rollback UI |

## Verification

```bash
# What's deployed?
task truck:deploy:status
task truck:deploy:versions

# What version is live?
curl -sf https://cad.ubuntusoftware.net/api/health | jq .version

# Visit a specific version (side-by-side with production)
open https://v0-4-0-truck-cad.gedw99.workers.dev

# Deploy new version
task truck:gui:deploy        # build + upload + promote

# Something wrong? Roll back instantly
task truck:deploy:rollback
```

## Consequences

### Positive

- **Instant rollback** — one command reverts to previous version (sub-second)
- **Auditability** — every version is tagged, timestamped, and retained (100 versions)
- **Safe CI** — merge to main uploads but doesn't deploy; promote is deliberate
- **Version coherence** — schema, binary, git tag, CF version, GH release all share one version string
- **Zero new infra** — native Cloudflare capability, no registries or external services

### Negative

- **Manual promote** — requires human action after CI upload (deliberate trade-off for safety)
- **No automatic canary** — gradual rollout (`wrangler versions deploy` with % split) is available but not automated; would need monitoring integration to auto-promote
- **Version in two places** — `cad-schema.json` and `commands.rs` must stay in sync (mitigated by build-time extraction from schema)

## Preview URLs (Side-by-Side Versions)

Cloudflare Workers **Preview URLs** (GA July 2025) give every uploaded version its own addressable URL. Enabled via `preview_urls = true` in `wrangler.toml`.

When `deploy:upload` runs, the `--preview-alias` flag creates a named URL:

```
v0-4-0-truck-cad.gedw99.workers.dev   ← v0.4.0
v0-3-0-truck-cad.gedw99.workers.dev   ← v0.3.0
```

These URLs are **permanent** (as long as the version exists in Cloudflare) and **independent of the promoted deployment**. You can visit any version side-by-side without affecting production traffic.

The alias format is `v{VERSION_SLUG}` where dots are replaced with dashes (e.g., `0.4.0` → `v0-4-0`).

### GUI Version Picker (Implemented v0.5.0+)

The GUI header includes a version dropdown populated from `/cf-versions.json` (generated at deploy time by `deploy:versions:json`). Users can see all tagged versions and click to visit any preview URL.

**Note**: The version picker only appears in v0.5.0 and later — older versions are immutable snapshots that predate this feature. To switch between versions, visit any version's preview URL directly, or use the picker from the latest deployment.

### Future Enhancements

- **API-driven version query** — `/api/deploy/versions` endpoint returning available versions for programmatic access

## References

- [Cloudflare Workers Versions](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/)
- [Cloudflare Preview URLs](https://developers.cloudflare.com/workers/configuration/previews/)
- [Wrangler versions CLI](https://developers.cloudflare.com/workers/wrangler/commands/#versions)
- `systems/truck/Taskfile.truck.yml` — deploy task definitions
- `web/cad-schema.json` — version source of truth
- `.github/workflows/ci.yml` — CI pipeline
