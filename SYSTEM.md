# Systems

This project uses **Taskfile** and **Process Compose** to orchestrate services.

## Quick Start

```sh
task up             # Start everything (gui-worker, shape-viewer)
task down           # Stop everything
task attach         # Attach to running TUI
```

## Architecture

```
Taskfile.yml → process-compose.yml → Taskfile tasks
```

- `Taskfile.yml` — Main entry point, includes all system Taskfiles
- `process-compose.yml` — Service orchestration (gui-worker, shape-viewer)
- `systems/` — Each subsystem has its own Taskfile

## Systems

| Folder | Description |
|--------|-------------|
| `truck/` | Rust CAD kernel: WASM build, Worker, tests |
| `envsubst/` | Environment variable substitution |
| `gh/` | GitHub CLI tools |
| `ezpz/` | External dependency |
| `docs/` | Documentation generation |

## Standard Tasks

Each system provides:

```sh
task <system>:deps:install  # Install dependencies
task <system>:deps:clean    # Remove dependencies
task <system>:debug:self    # Print debug info
```

## Directories

```
.bin/    # Binaries (simple-shape-viewer)
.data/   # Runtime data
.src/    # Cloned repos (truck, ifc-lite, ezpz)
```

## Configuration

`.env` is tracked with defaults. Create `.env.local` for secrets (gitignored).

```env
PC_PORT_NUM=8000
```

Both Taskfile and Process Compose load from `.env`.
