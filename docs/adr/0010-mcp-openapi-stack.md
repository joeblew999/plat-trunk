# [ADR-010] MCP, OpenAPI, and the Application Stack

We aim for a standard, high-performance web stack that is isomorphic across browsers, Cloudflare Workers, and bare metal servers.

## Status

**Accepted** (Implemented).

## The Stack

- **Framework**: [Hono](https://hono.dev) — chosen for its lightweight footprint and first-class support for Edge (Cloudflare Workers).
- **Validation**: [Zod](https://zod.dev) — the industry standard for type-safe schema validation in TypeScript.
- **Documentation**: **`@hono/zod-openapi`** — automatically generates OpenAPI 3.1 specifications from Zod schemas.
- **AI Agent Access**: **`@hono/mcp`** — exposes our internal CAD commands as Model Context Protocol (MCP) tools for AI agents like Claude.
- **Persistence**: **Cloudflare R2** — for storing Automerge document snapshots and doc-videos.

## Why this Stack?

1.  **Isomorphic**: The same Hono application runs in the browser (for local dev and Tier 1 rendering) and on Cloudflare Workers (for sync and coordination).
2.  **Schema-Driven**: By using Zod-OpenAPI, we avoid manually writing `openapi.json`. The documentation stays in sync with the code.
3.  **AI-First**: Integrating `@hono/mcp` allows AI agents to have native, typed access to the CAD modeling kernel with zero additional glue code.

## Unified Route Pattern

All CAD routes are model-scoped to allow multi-tenant or multi-document workflows:
- `/api/cad/{modelId}/exec` — Async queue
- `/api/cad/{modelId}/exec-wait` — Sync execution (10s timeout)
- `/api/cad/{modelId}/events` — SSE stream for the browser GUI
- `/api/cad/{modelId}/state` — Scene state (UUIDs, object count, selection)
