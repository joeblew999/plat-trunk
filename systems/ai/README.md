# systems/ai — AI Chat Agent

Cloudflare Agents SDK chat panel served at `/ai/*`.

## Setup

This system is scaffolded from `cloudflare/agents-starter`. Run once:

```bash
cd systems/ai
npx create-cloudflare@latest -- . --template cloudflare/agents-starter
```

Then:
1. In `worker/src/server.ts` — replace demo tools with truck-cad MCP tools:
   ```ts
   async onChatMessage(onFinish, options) {
     await this.mcp.connect('http://localhost:8789/mcp'); // TRUCK binding in prod
     const result = streamText({
       model: ...,
       tools: { ...this.mcp.getAITools() },
     });
   }
   ```
2. The iframe at `/ai/?model=<modelId>` receives the active model ID — pass it
   as context to the agent system prompt so geometry tools target the right model.

## Architecture

```
Browser (/ai iframe)
  ↕ WebSocket
Agents DO (plat-ai worker)
  ↕ MCP tools via this.mcp
truck-cad Worker (TRUCK service binding)
  ↕ executeServerDirect → Ops DO → SSE → viewport
```
