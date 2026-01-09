# CLAUDE.md

Groupware platform with mail (Stalwart), search (SeekStorm), and real-time messaging (NATS).

## Quick Start

```sh
task pc:up      # Start all services
task pc:down    # Stop all services
task pc:attach  # Attach to TUI
```

## Systems

| System | Port | Description |
|--------|------|-------------|
| NATS | 4222 | Message broker |
| Narun | 8081 | HTTP/gRPC gateway to NATS |
| nats2sse | 8083 | SSE bridge for browsers |
| Stalwart | 8085 | Mail server (SMTP/IMAP/JMAP) |
| SeekStorm | 8086 | Full-text search engine |

## Key Tasks

```sh
# Dependencies
task deps:install     # Install all (requires Rust + Go)
task deps:clean       # Remove all

# Individual services
task stalwart:start   # Start mail server
task seekstorm:start  # Start search engine
task nats-server:start # Start NATS

# Debug
task debug            # Show env vars
task debug:all        # Debug all systems
```

## Binaries

Installed to `.bin/` with cross-platform names (`.exe` on Windows):

| Binary | Description |
|--------|-------------|
| envsubst | Template processor |
| stalwart | Mail server |
| stalwart-cli | Mail server CLI |
| seekstorm_server | Search engine |
| nats-server | Message broker |
| nats | NATS CLI |
| process-compose | Process orchestrator |

## Configuration

- `.env` - Default ports and URLs (tracked)
- `.env.local` - Secrets (not tracked)

Required secrets in `.env.local`:
```sh
STALWART_ADMIN_PASSWORD=your-password
MASTER_KEY_SECRET=seekstorm-key
SEEKSTORM_API_KEY=your-api-key
```

## Environment Variables

When adding new env vars:
1. Add to `.env` with default value
2. Update `task debug` in root Taskfile.yml
3. Update relevant `debug:self` task in system Taskfile

Current vars in debug output:
- NATS_PORT, NATS_URL
- NARUN_PORT, PC_PORT, NATS2SSE_PORT
- STALWART_HTTP_PORT, STALWART_SMTP_PORT, STALWART_IMAP_PORT
- SEEKSTORM_PORT

## Build Requirements

- **Rust** - For Stalwart and SeekStorm
- **Go** - For envsubst, NATS tools, process-compose
- **Task** - Task runner (https://taskfile.dev)
