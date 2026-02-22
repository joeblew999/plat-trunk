# CLAUDE.md
## Source of Truth
Read **CONTEXT.md** first for the core stack, ADRs, and essential commands.

## Quick Start
```sh
task deps:install   # Install dependencies
task up             # Start services (localhost:8788)
task down           # Stop all services
```

## Commands
- `task truck:test:full` - Run entire test suite (Vitest + Playwright).
- `task truck:gui:schema` - Regenerate API schema from Rust source.
- `task truck:ci` - Full build and test check.

## MCP Bridge (Auto-Routing)

The bridge (`scripts/mcp-bridge.ts`) auto-detects where to send MCP traffic:
1. **Local dev server** (localhost:8788) — if running, used first (fastest)
2. **PR preview URL** — if current branch has an open PR, uses `pr-{N}-truck-cad.gedw99.workers.dev`
3. **Fallback to local** — retry logic waits for dev server to start

Override: `CAD_URL=https://cad.ubuntusoftware.net` forces a specific target.

**After pushing a branch with a PR**: CI deploys a preview at `pr-{N}-truck-cad.gedw99.workers.dev` with full MCP at `/mcp`. If you stop the local dev server, the bridge auto-falls back to the PR preview.

## Deploy Workflow (Versioned)

**IMPORTANT**: Deploy does NOT auto-promote. Upload first, verify, then promote.

```sh
# Step 1: Build + upload (creates preview URL, no traffic change)
task truck:gui:deploy
# Output tells you the preview URL: https://v0-5-0-truck-cad.gedw99.workers.dev

# Step 2: Verify the preview works
curl -sf https://v0-5-0-truck-cad.gedw99.workers.dev/api/health
# Should return {"version":"0.5.0"}

# Step 3: Only when verified, promote to production
task truck:deploy:promote

# Something wrong? Instant rollback
task truck:deploy:rollback
```

**Other commands:**
```sh
task truck:deploy:list         # Show all versions + PR previews with URLs
task truck:deploy:status       # Current deployment + traffic split
task truck:deploy:preview PR_NUMBER=42  # Upload PR preview (CI does this automatically)
```

**Version bumping** (before deploy):
```sh
task truck:version:bump -- 0.6.0   # Bumps Rust + schema + commit + git tag
task truck:gui:deploy               # Then deploy the new version
```

## ADR Index
See `docs/adr/README.md`.
