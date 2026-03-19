# ADR-0022: Chat GUI — Multi-Backend LLM Routing

**Status:** Proposed
**Date:** 2026-03-19
**Author:** Gerard Webb
**Depends on:** ADR-0009 (observability), ADR-0020 (Tauri v2 native shell), ADR-0021 (billing)

---

## Context

plat-trunk needs a chat GUI that:

- Looks and feels exactly like Claude Chat on mobile
- Works for both **users** (AI-assisted CAD) and **developers** (debugging, agent authoring)
- Routes to three distinct LLM backends depending on deployment context
- Streams responses in real time — token by token, not bulk
- Shows MCP tool calls visibly in the UI
- Persists conversation history across sessions
- Supports multiple models (Claude, Qwen3, CF Workers AI)

The GUI must be **identical** regardless of which backend is running.
The backend decides where inference happens. The frontend never knows.

---

## The Three Backends

| Backend | Where it runs | Auth | Protocol |
|---|---|---|---|
| CF Workers AI | CF edge — native binding | CF account binding | OpenAI-compatible |
| Claude Code (OAuth) | MacBook or VPS | `sk-ant-oat01-...` OAuth token | Anthropic Messages API |
| Qwen3 | MacBook (local) or OpenRouter | OpenRouter API key or Ollama | OpenAI-compatible |

Two of three are OpenAI-compatible. CF Workers AI never leaves the CF runtime.
Claude OAuth is the only Anthropic-native backend.

---

## Decision

### GUI Stack

Identical to the rest of plat-trunk — no new dependencies:

- **Lit** — message bubble components, tool call cards, model selector
- **Datastar** — SSE signal binding, real-time token streaming, store
- **Tailwind** — mobile-first styling matching Claude Chat aesthetic
- **Hono** — backend routes

The GUI connects to a **single endpoint** `POST /chat/send`.
The Hono router inspects the `model` field and routes accordingly.

### Routing Architecture

```
GUI (Lit + Datastar + Tailwind)
  ↓ POST /chat/send  { model, messages, stream: true }
  ↓
Hono router (CF Worker — truck-cad or dedicated chat worker)
  ├── model = "cf/*"      → env.AI.run() native binding (stays on CF edge)
  └── model = "remote/*"  → fetch() proxy to local Rust server via Tailscale

Local Rust server (MacBook or VPS — Tauri v2 sidecar)
  ├── model = "claude/*"  → llm crate → Anthropic API (OAuth token)
  └── model = "qwen/*"    → llm crate → OpenRouter or local Ollama
```

The SSE stream format is **identical** from all three paths.
Datastar `patch-signals` events carry token deltas and tool call state.

### CF Workers AI (TypeScript — no Rust crate)

CF Workers AI is a native CF binding. It does not make an HTTP call and does
not require a Rust crate. It stays entirely in the Hono TypeScript layer:

```typescript
// systems/chat/worker/stream-bridge.ts
const stream = await env.AI.run(model, {
  messages,
  stream: true
})
// translate CF AI SSE → Datastar patch-signals events
```

No Rust crate can run here — `wasm32-unknown-unknown` prohibits tokio/async-std
which all multi-provider LLM crates require.

### Local Rust Server (Tauri v2 sidecar)

For Claude OAuth and Qwen3, a native Rust binary runs as a Tauri v2 sidecar
(ADR-0020). The GUI's Hono worker proxies to it via Tailscale when
`model` starts with `remote/`.

**Rust crate: `llm` v1.3.4**

Chosen over `rust-genai` because:
- Stable, not experimental
- Single unified `ChatProvider` trait covers Anthropic and OpenAI-compatible
- OpenRouter support built-in (covers Qwen3 via custom base URL)
- Builder pattern consistent with plat-trunk conventions
- No separate crate needed for each provider

```toml
# lib/chat/crate/Cargo.toml
[dependencies]
llm = { version = "1.3.4", features = ["anthropic", "openai"] }
# anthropic → Claude OAuth token
# openai    → OpenRouter (Qwen3) + any future OpenAI-compatible endpoint
```

```rust
// lib/chat/crate/src/lib.rs
use llm::{LLMBuilder, ChatProvider};

// Claude via OAuth
let claude = LLMBuilder::new()
    .provider("anthropic")
    .model("claude-sonnet-4-6")
    .api_key(&oauth_token)   // sk-ant-oat01-...
    .stream(true)
    .build()?;

// Qwen3 via OpenRouter
let qwen = LLMBuilder::new()
    .provider("openai")
    .model("qwen/qwen3-coder")
    .api_key(&openrouter_key)
    .base_url("https://openrouter.ai/api/v1")
    .stream(true)
    .build()?;
```

The sidecar exposes a simple HTTP server on localhost that the CF Worker
proxies to. The sidecar translates provider SSE → Datastar patch-signals
before returning — identical format to the CF Workers AI path.

### Streaming Format (Datastar signals)

All three backends emit the same Datastar SSE signal format:

```
event: datastar-patch-signals
data: signals {"chat_token":"Hello","chat_done":false}

event: datastar-patch-signals
data: signals {"chat_token":" world","chat_done":false}

event: datastar-patch-signals
data: signals {"chat_done":true,"chat_message_id":"msg_abc123"}
```

Browser template (Lit component with Datastar binding):

```html
<div id="chat-response"
     data-signals="{chat_token:'',chat_done:false}"
     data-on-chat-token__append="$chatContent += $chat_token">
</div>
```

### MCP Tool Calls in UI

When the model emits a `tool_use` block the stream-bridge sends a
`patch-elements` event that inserts a tool call card into the conversation:

```
event: datastar-patch-elements
data: elements <div id="tool-abc123" class="tool-call">
data: elements   <span class="tool-name">sketch_create</span>
data: elements   <pre class="tool-input">{"width":100}</pre>
data: elements </div>
```

When `tool_result` arrives the card is updated in place (same element ID,
Datastar morphs the diff). This matches Claude Chat's collapsible tool UI.

### Conversation History

Stored in D1 — same schema pattern as billing:

```sql
CREATE TABLE conversations (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  title       TEXT,
  model       TEXT NOT NULL,
  backend     TEXT NOT NULL,   -- cf | claude | qwen
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  role            TEXT NOT NULL,   -- user | assistant | tool
  content         TEXT NOT NULL,   -- JSON: content blocks array
  model           TEXT,
  created_at      INTEGER NOT NULL
);
```

History is loaded on conversation open and sent as the full `messages` array
with each API call. Anthropic's API is stateless — the caller maintains history.

### Lib Structure

Follows `lib/observe` and `lib/billing` pattern exactly:

```
lib/
  chat/
    shared/
      schema.ts         ← message types, model enum, backend enum, tool call states
      types.ts          ← generated: Message, Role, Model, Backend, ToolCall
      zod.ts            ← generated: validators
      api-contract.ts   ← Hono route types: send, history, delete

    dev/
      gen-types.ts
      gen-zod.ts
      gen.ts

    crate/              ← Rust — local server binary (Tauri sidecar)
      Cargo.toml
      src/
        lib.rs          ← llm crate wrappers, stream translation
        server.rs       ← HTTP server (axum or tiny_http)
        bridge.rs       ← provider SSE → Datastar signals

    demo-worker/        ← standalone CF Worker demo (test mode)
      worker.ts
      wrangler.toml
      .dev.vars.example

    docs/
      setup.md          ← API keys, Doppler config, local server setup

systems/
  chat/
    routes.ts           ← POST /chat/send, GET /chat/history, DELETE /chat/{id}
    history.ts          ← D1 read/write helpers
    stream-bridge.ts    ← CF Workers AI → Datastar signals
    proxy.ts            ← remote/* → Tailscale → local Rust server
```

---

## Secrets

All secrets follow the Doppler → `.env` → Wrangler pattern (ADR-0021):

| Doppler Key | Description | Used by |
|---|---|---|
| `ANTHROPIC_AUTH_TOKEN` | Claude OAuth token `sk-ant-oat01-...` | Local Rust server |
| `OPENROUTER_API_KEY` | OpenRouter key for Qwen3 + others | Local Rust server |
| `OLLAMA_BASE_URL` | Local Ollama endpoint (optional) | Local Rust server |
| `TAILSCALE_CHAT_SERVER_URL` | Tailscale URL to local Rust server | CF Worker (proxy) |

Add to `mise.toml`:

```toml
[tasks."secrets:set:chat"]
description = "Sync chat secrets from Doppler → CF Worker"
run = """
printf '%s' "$TAILSCALE_CHAT_SERVER_URL" | wrangler secret put TAILSCALE_CHAT_SERVER_URL --name truck-cad
echo "✓ chat secrets synced"
"""
```

Claude OAuth token and OpenRouter key stay on the local Rust server only —
they are never sent to CF Workers.

---

## Use Cases

### UC-1: User — AI-Assisted CAD (plat-trunk)

A Pro user opens the chat panel inside plat-trunk. They ask "create a cube
with 50mm sides and subtract a 20mm sphere from the centre."

```
1. User types → POST /chat/send { model: "cf/llama-3.1-8b", messages, mcp_tools }
2. CF Worker → env.AI.run() with plat-trunk MCP tool definitions attached
3. Model emits tool_use: sketch_create, boolean_subtract
4. Tool call cards appear in chat UI in real time
5. MCP gate checks user tier (ADR-0021) before executing each tool
6. Results stream back → geometry appears in CAD viewport
7. Conversation saved to D1
```

Default model for users: CF Workers AI — lowest latency, no external API call,
cost covered by CF Workers usage.

### UC-2: Developer — Debugging Agent Behaviour

A developer on MacBook uses the chat panel with the local server running.

```
1. Dev selects "claude/claude-sonnet-4-6" in model selector
2. GUI detects remote/* model → CF Worker proxies to local Rust server via Tailscale
3. Local server → llm crate → Anthropic API (OAuth token, Pro subscription quota)
4. Full tool call visibility — all MCP calls shown with inputs and outputs
5. Dev can inspect exact tool call sequence, inputs, outputs, latency
6. Conversation history saved to D1 for later review
```

### UC-3: Developer — Cost Comparison (Qwen3 vs Claude)

```
1. Dev opens two chat windows side by side
2. Left: model = "claude/claude-sonnet-4-6"
3. Right: model = "qwen/qwen3-coder" (OpenRouter)
4. Same prompt sent to both
5. Both stream simultaneously via the same SSE infrastructure
6. Dev compares output quality, latency, tool call accuracy
```

This is the evaluation workflow Gerard uses for deciding bulk Rust work
allocation between Claude and Qwen3-Coder.

### UC-4: Mobile (SSH + Tailscale)

```
1. Gerard on phone, Tailscale connected
2. Opens plat-trunk web app on mobile browser
3. Chat panel available — model defaults to CF Workers AI (no local server needed)
4. If MacBook is awake and local server running:
   → model selector shows claude/* and qwen/* options
5. Conversation history synced to D1 — continues across devices
```

---

## Who Holds What

| Data | Location |
|---|---|
| Conversation history | D1 — owned by plat-trunk |
| Message content | D1 — owned by plat-trunk |
| OAuth token | Local Rust server only — never sent to CF |
| OpenRouter key | Local Rust server only — never sent to CF |
| CF Workers AI credentials | CF account binding — never exposed |
| Model routing config | `lib/chat/shared/schema.ts` — in source |
| Tailscale URL to local server | Wrangler secret — not in source |

---

## Implementation Order

1. **`lib/chat/shared/schema.ts`** — model enum, backend enum, message types
2. **`lib/chat/dev/gen.ts`** — codegen for types, zod, api-contract
3. **D1 migration** — conversations + messages tables
4. **`systems/chat/stream-bridge.ts`** — CF Workers AI → Datastar signals
5. **`systems/chat/routes.ts`** — POST /chat/send (CF path only first)
6. **`systems/chat/history.ts`** — D1 helpers
7. **`lib/chat/demo-worker/`** — standalone demo, CF Workers AI only
8. **GUI** — Lit components: message bubble, tool call card, model selector
9. **`lib/chat/crate/`** — Rust local server (llm crate, axum, stream bridge)
10. **`systems/chat/proxy.ts`** — remote/* → Tailscale → local server
11. **Tauri sidecar** — wire local server as Tauri v2 sidecar (ADR-0020)

Ship steps 1–8 first — CF Workers AI only. Steps 9–11 add the remote backends
without changing the GUI or the CF Worker routes.

---

## Deferred

- Voice input (microphone → transcription → chat)
- Image input (CAD screenshot → chat context)
- Conversation sharing / export
- Agent mode (multi-turn autonomous tool use without human confirmation)
- Cost tracking per conversation (token usage from API responses)

---

## Consequences

**Positive:**
- GUI is fully decoupled from backend — one codebase, three execution paths
- CF Workers AI is the cheapest and lowest-latency path for users
- Claude OAuth uses Pro subscription quota — no per-token billing for dev use
- Qwen3 evaluation is built into the architecture, not bolted on
- `llm` crate covers both remote backends with one dependency
- Datastar SSE handles streaming identically across all three paths
- Conversation history in D1 — searchable, exportable, no third-party

**Negative:**
- Local server must be running and reachable via Tailscale for remote/* models
- Claude OAuth is not for production user traffic — Pro/Max subscription only
- `llm` crate is newer — stream reliability needs validation before relying on it
- Two streaming format translations required (provider → Datastar) — one in TS, one in Rust
