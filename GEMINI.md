# GEMINI.md
## Source of Truth
Read **CONTEXT.md** first for the core stack, ADRs, and essential commands.

## 🚀 Quick Start
```sh
task deps:install   # Install dependencies
task up             # Start services (localhost:8788)
task down           # Stop all services
```

## 🛠️ Commands
- `task truck:test:full` - Run entire test suite (Vitest + Playwright).
- `task truck:gui:schema` - Regenerate API schema from Rust source.
- `task truck:ci` - Full build and test check.

## 📜 ADR Index
See `docs/adr/README.md`.
