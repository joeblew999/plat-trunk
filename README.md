# plat-trunk

Rust CAD kernel platform using [truck](https://github.com/ricosjp/truck).

## Quick Start

```bash
# Install xplat (one-time)
curl -fsSL https://github.com/joeblew999/ubuntu-website/releases/latest/download/install.sh | bash

# Install dependencies
xplat task deps:install

# Run examples
xplat task truck:run:shape-viewer
xplat task truck:run:obj-viewer
```

## Commands

```bash
# Services
xplat task up              # Start services with TUI
xplat task up:detached     # Start in background
xplat task down            # Stop services
xplat task attach          # Attach to TUI

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

# Build & Test
xplat task truck:build     # Build truck library
xplat task truck:test      # Run tests
xplat task truck:ci        # Full CI (check + test)

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
