# plat-trunk

https://github.com/joeblew999/plat-trunk

Rust CAD kernel platform using [truck](https://github.com/ricosjp/truck).

## URLs

| Environment | URL |
|-------------|-----|
| **Production** | https://cad.ubuntusoftware.net |
| **Workers Dev** | https://truck-cad.gedw99.workers.dev |
| **Local Dev** | http://localhost:8787 |

## Quick Start

```bash
# Install xplat (one-time)
curl -fsSL https://github.com/joeblew999/ubuntu-website/releases/latest/download/install.sh | bash

# Install dependencies
xplat task deps:install

# Build WASM + run local dev server
xplat task truck:gui:build    # Build WASM module
xplat task truck:gui:serve    # Start local dev (localhost:8787)
xplat task truck:gui:deploy   # Deploy to Cloudflare
```

## Commands

```bash
# CAD GUI (browser)
xplat task truck:gui:build    # Build WASM → web/gui/pkg-browser-renderer/
xplat task truck:gui:serve    # Local dev via wrangler (localhost:8787)
xplat task truck:gui:deploy   # Deploy to Cloudflare Workers

# Process Compose (uses PC_PORT_NUM from .env)
xplat process up              # Start with TUI
xplat process up -D -t=false  # Start detached
xplat process down            # Stop
xplat process attach          # Attach to TUI
xplat process list            # List processes

# Truck examples (visual - opens window)
xplat task truck:run:shape-viewer    # View JSON shapes (drag & drop)
xplat task truck:run:obj-viewer      # View OBJ meshes (drag & drop)
xplat task truck:run:rotate          # Rotating objects demo
xplat task truck:run:materials       # Material properties grid
xplat task truck:run:textured        # Textured cube
xplat task truck:run:bsp             # NURBS tessellation animation
xplat task truck:run:collision       # Sphere collision demo
xplat task truck:run:shader          # WGSL shader playground

# Truck examples (generate JSON to stdout)
xplat task truck:make:cube
xplat task truck:make:sphere
xplat task truck:make:cylinder
xplat task truck:make:torus
xplat task truck:make:bottle

# Build & Test (Rust)
xplat task truck:build     # Build truck library
xplat task truck:test      # Run tests
xplat task truck:ci        # Full CI (check + test)

# E2E Tests + Doc Screenshots (Playwright)
xplat task truck:test:install      # Install Playwright + Chromium
xplat task truck:test:e2e          # Run E2E tests (needs local server)
xplat task truck:test:screenshots  # Generate doc screenshots
xplat task truck:test:all          # Run everything

# GitHub
xplat task gh:login        # Login to GitHub
xplat task gh:release:create -- v1.0.0   # Create release

# Debug
xplat task debug           # Show vars
xplat task debug:all       # Show all system vars
```

## Requirements

- [xplat](https://github.com/joeblew999/ubuntu-website) (bundles task + process-compose)
- Rust (for truck)
- Go 1.23+ (for gh CLI)

## Configuration

- `.env` - Default config (tracked), includes `PC_PORT_NUM=8000`
- `.env.local` - Secrets (not tracked)
- `xplat.yaml` - Manifest (source of truth for processes)
- `pc.generated.yaml` - Generated from manifest (auto-detected by xplat process)

```bash
# Regenerate pc.generated.yaml from xplat.yaml
xplat manifest gen-process
```
