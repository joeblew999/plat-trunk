# Systems

This project uses **Taskfile** and **Process Compose** to orchestrate services.

## Quick Start

```sh
task pc:up          # Start everything (NATS, simulator, narun)
task pc:down        # Stop everything
task pc:attach      # Attach to running TUI
```

## Architecture

```
Task → Process Compose → Task
```

- `Taskfile.yml` - Main entry point
- `process-compose.yml` - Service orchestration with health checks
- `systems/` - Each subsystem has its own Taskfile

## Systems

| Folder | Description |
|--------|-------------|
| `nats-server/` | NATS server binary |
| `nats-cli/` | NATS CLI tool |
| `nats/` | Go NATS client (part of main module) |
| `narun/` | HTTP/gRPC gateway to NATS |
| `pc/` | Process Compose |

## Standard Tasks

Each system provides:

```sh
task <system>:start         # Start service
task <system>:stop          # Stop service
task <system>:deps:install  # Install dependencies
task <system>:deps:clean    # Remove dependencies
task <system>:debug:self    # Print debug info
```

## Directories

```
.bin/    # Binaries (nats-server, nats, narun, process-compose)
.data/   # Runtime data (nats-server jetstream, narun config)
.src/    # Cloned repos (narun)
```

## Configuration

`.env` is tracked with defaults. Create `.env.local` for secrets (gitignored).

```env
NATS_PORT=4222
NATS_URL=nats://localhost:4222
NARUN_PORT=8081
NARUN_METRICS_PORT=9091
```

Both Taskfile and Process Compose load from `.env`.
