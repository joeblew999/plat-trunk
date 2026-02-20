# [ADR-005] Schema-Driven Unified API (Single Source of Truth)

To ensure consistency between our Rust modeling kernel and our Cloudflare Worker API/MCP tools, we use a single schema-driven pipeline.

## Status

**Accepted** (Implemented).

## Context

The system has a complex data flow:
1.  **Rust**: Implements the actual modeling logic (`truck`).
2.  **Worker**: Acts as an asynchronous command relay/queue.
3.  **Browser**: Executes the commands in a WASM-based modeling environment.
4.  **AI Agents**: Control the system via MCP.

Manually maintaining separate Zod schemas (Worker), JSON schemas (Browser), and OpenAPI documentation (API Docs) is error-prone and leads to "API drift," where the AI or a client tries to call a command that the kernel no longer supports or expects different parameters for.

## Decision: Rust as the Single Source of Truth

We will define all CAD commands and their parameter types exactly **once** in the Rust modeling layer.

### The Pipeline

1.  **Rust Command Structs (`crates/truck-webgpu-gui/src/commands.rs`)**:
    - Every command has a dedicated Rust `struct`.
    - These structs are annotated with `serde::Deserialize` and `schemars::JsonSchema`.
2.  **Schema Generation**:
    - A dedicated binary in the same crate (`generate-schema`) runs `schemars` to build a single, unified `cad-schema.json`.
    - This file is automatically committed and serves as the bridge between languages.
3.  **Worker Integration (`systems/truck/worker/src/index.ts`)**:
    - The Cloudflare Worker imports `cad-schema.json`.
    - It uses **`@hono/zod-openapi`** to automatically:
        - Generate Zod validators for the `/exec` and `/exec-wait` routes.
        - Register MCP tools with full parameter documentation for AI agents.
        - Generate the standard OpenAPI 3.1 specification.
4.  **Browser Integration (`web/gui/cadCommand`)**:
    - The browser-side modeling app uses the same `cad-schema.json` to route incoming commands from the Worker's SSE stream to the correct WASM functions.

## Benefits

- **Zero Documentation Overhead**: API docs and MCP tools are updated automatically when Rust code changes.
- **Type Safety Across the Boundary**: Both the Worker (TypeScript) and the Modeling App (Rust) share the same underlying JSON schema.
- **AI Agent Reliability**: AI agents (Claude, etc.) always have the most up-to-date tool definitions because they are derived directly from the kernel source code.

## Consequences

- Any change to command parameters **must** start with a change to the Rust structs followed by a schema regeneration (`task truck:gui:schema`).
- The Worker must be re-deployed (or restarted in dev mode) to pick up changes to `cad-schema.json`.
