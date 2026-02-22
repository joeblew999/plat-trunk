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
```sh
task truck:gui:deploy          # Build + upload + tag (does NOT promote)
task truck:deploy:promote      # Promote to production when ready
task truck:deploy:rollback     # Instant rollback
task truck:deploy:list         # Show all versions + PR previews with URLs
task truck:deploy:preview PR_NUMBER=42  # Upload PR preview
```

## ADR Index
See `docs/adr/README.md`.
