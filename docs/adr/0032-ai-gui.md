# [ADR-032] AI GUI — Integrated AI Assistance

> **Note**: This ADR supersedes the "intent-only" version. We are adopting the **working system architecture** demonstrated in the [yusukebe/mcp-app-with-hono](https://github.com/yusukebe/mcp-app-with-hono) and [hono-mcp-server](https://github.com/mattzcarey/hono-mcp-server) reference implementations.

## Status

**Proposed** (Implementation Spec).

## Summary

Provide a first-class AI interaction surface within the CAD application. This includes a chat-based assistant that can execute CAD commands via MCP and a natural-language command palette, enabling "low-code" and "no-code" 3D modeling.

## The Working System Architecture

We are not inventing a new AI orchestration layer. We are implementing the **Hono + Workers AI + MCP** pattern found in the reference examples:

### 1. The AI Brain (Cloudflare Workers AI)
The system uses the **Cloudflare Workers AI** REST API (or the `@cloudflare/ai` SDK) to run models like `llama-3-8b-instruct`. 
- **Tool Calling**: We pass our existing MCP tool definitions (derived from `cad-schema.json`) directly to the LLM's `tools` array.
- **Multi-MCP**: The Worker acts as a gateway, fetching schemas from `/api/cad/schema`, `/api/bim/schema`, etc., and presenting them as a single toolset to the LLM.

### 2. The Interaction Loop (SSE Bridge)
Because our CAD kernel (truck) runs in the browser, the "execution" of a tool call must bridge from the Cloudflare Worker back to the user's browser:
1. **Chat UI (Lit/Datastar)**: User sends a prompt to `/api/ai/chat`.
2. **Worker**: Calls Workers AI with the prompt and the tool definitions.
3. **LLM**: Returns a `tool_use` call (e.g., `cad_add_cube { size: 2 }`).
4. **Worker (Execution Bridge)**: The Worker handles the tool call by invoking the existing `enqueueCommand()` logic.
5. **SSE Relay**: The command is pushed to the browser via the active SSE stream (`/api/cad/:modelId/events`).
6. **Browser**: The WASM kernel executes the command, and **Datastar signals update the GUI instantly**.
7. **Feedback**: The command result is returned to the Worker, which feeds it back to the LLM to continue the conversation.

### 3. The Side-Pane GUI (Lit + Datastar)
To minimize maintenance, the GUI will be a "Reference-First" implementation:
- **Component**: `<cad-ai-chat>` (Lit element).
- **State**: Message history stored in Datastar signals (`$aiMessages`).
- **Styling**: Pure DaisyUI/Tailwind, mirroring the [Datastar Lit examples](.src/datastar-lit-examples/).
- **Communication**: Uses `@datastar/hono` or standard `fetch` to stream responses from the worker.

### 4. Code Mode Implementation (Cloudflare Pattern)
Following the [Cloudflare Code Mode](https://blog.cloudflare.com/code-mode-mcp/) approach, we will also provide two "Power Tools":
- `cad_search`: Allows the AI to query the full API surface without loading 30+ tools into every prompt.
- `cad_execute`: Allows the AI to write and run a TypeScript block, executed as an atomic transaction in the browser's WASM sandbox.

## Key Decisions

- **Use what we have**: The AI will talk to the exact same `/mcp` and `/api/cad/sync/*` endpoints we already use.
- **Cloudflare-Native**: No external API keys (OpenAI/Anthropic) are required. Everything runs on Cloudflare infrastructure.
- **Model Identity**: The `modelId` is always passed from the URL to the AI context to ensure it operates on the correct scene.
- **Local Dev**: Use `wrangler dev --remote` or proxy local `/api/ai/chat` to production to test AI logic locally.

## Implementation Plan

1. **Gateway Route**: Add `POST /api/ai/chat` to `systems/truck/worker/src/index.ts`.
2. **Tool Aggregator**: Implement logic to convert our JSON schema tools into the Workers AI tool-calling format.
3. **Lit Component**: Create `cad-ai-chat.js` in `systems/truck/web/` using the reference chat patterns.
4. **Integration**: Add the component to `index.html` as a collapsible side-pane.

## References

- [yusukebe/mcp-app-with-hono](https://github.com/yusukebe/mcp-app-with-hono) — The core architectural reference.
- [honojs/examples (zod-openapi-swaggerui)](https://github.com/honojs/examples/tree/main/zod-openapi-swaggerui) — For tool exploration.
- [Cloudflare Workers AI Tool Calling](https://developers.cloudflare.com/workers-ai/function-calling/) — The technical guide for the LLM-to-MCP bridge.
- [AD-012: AI Surface](0012-ai-surface.md) — How AI discovers us.
- [ADR-018: Code Mode MCP](0018-code-mode-mcp.md) — The power tool pattern.
