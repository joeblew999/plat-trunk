# CLAUDE.md

Rust CAD kernel platform using [truck](https://github.com/ricosjp/truck) with collaborative editing via Automerge and RPC via kkrpc.

## Quick Start

```sh
xplat task deps:install   # Install dependencies
xplat process up          # Start all services
xplat process down        # Stop all services
xplat process attach      # Attach to TUI
```

## Commands

```sh
# Truck examples (visual)
xplat task truck:run:shape-viewer
xplat task truck:run:obj-viewer

# Build & Test
xplat task truck:build
xplat task truck:test
xplat task truck:ci

# Debug
xplat task debug
xplat task debug:all
```

## Configuration

- `.env` - Default config (tracked), includes `PC_PORT_NUM=8000`
- `.env.local` - Secrets (not tracked)
- `xplat.yaml` - Manifest (source of truth for processes)
- `pc.generated.yaml` - Generated from manifest

## Build Requirements

- **Rust** - For truck B-Rep kernel
- **Go 1.23+** - For gh CLI, orchestrator
- **xplat** - Bundles task + process-compose

## Architecture Docs

See `docs/adr/` for architecture decision records:
- `docs/adr/automerge.md` - CRDT-based collaborative editing (op log, R2 storage)
- `docs/adr/kkrpc.md` - TypeScript RPC across multiple transports
- `docs/adr/webgpu.md` - GPU rendering architecture (Tier 1 browser / Tier 3 server)

## LLM Context (for AI assistants)

### Automerge
Local-first CRDT sync engine for collaborative apps. Used for the op log enabling concurrent editing.

Reference docs for AI use:
- `docs/llms/automerge-llms.txt` - Index of all Automerge docs
- `docs/llms/automerge-llms-full.txt` - Complete Automerge documentation (~166KB)
- Upstream: https://automerge.org/llms-full.txt

Key concepts:
- Documents are the unit of collaboration (like JSON + git)
- Repositories manage connections and storage (DocHandles)
- Document URLs: `automerge:<base58>`
- JS: `@automerge/automerge` (core) + `@automerge/automerge-repo` (networking/storage)
- Rust: `automerge` crate (also compiles to WASM)
- API docs: https://docs.rs/automerge/latest/automerge/

### kkrpc
TypeScript bidirectional RPC library supporting stdio, WebSocket, HTTP, Workers, iframes, Chrome extensions, Electron, and message queues (RabbitMQ, Kafka, Redis Streams, NATS).

Reference docs for AI use:
- `docs/llms/kkrpc-llms-full.txt` - Complete kkrpc documentation (~221KB)
- `.claude/skills/kkrpc/SKILL.md` - Claude skill for TypeScript kkrpc usage
- `.claude/skills/interop/SKILL.md` - Claude skill for cross-language interop (Go, Python, Rust, Swift)
- Upstream: https://docs.kkrpc.kunkun.sh/llms-full.txt

Key concepts:
- `RPCChannel` is the main class for bidirectional communication
- Transport adapters (IoInterface): `NodeIo`, `DenoIo`, `BunIo`, `WebSocketClientIO`, `HTTPClientIO`, `NatsIO`, etc.
- Supports callbacks as arguments, property access, enhanced error preservation
- For interop: use `serialization: { version: "json" }` (not superjson)
- Protocol: line-delimited JSON with message types: request, response, callback, get, set
