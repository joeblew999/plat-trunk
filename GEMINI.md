# GEMINI.md
## Source of Truth
Read **CONTEXT.md** first — it has the full stack, commands, deploy workflow, MCP architecture, and ADRs.

## Quick Start
```sh
task deps:install   # Install dependencies
task up             # Start services (localhost:8788)
task down           # Stop all services
```

## Key Commands
- `task truck:test:full` — Run entire test suite (Vitest + Playwright)
- `task truck:gui:schema` — Regenerate API schema from Rust source
- `task truck:ci` — Full build and test check
- `task truck:gui:deploy` — Build + upload versioned deploy (does NOT promote)
- `task truck:deploy:promote` — Promote to production when verified

## ADR Index
See `docs/adr/README.md`.
