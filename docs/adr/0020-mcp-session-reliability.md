# [ADR-020] MCP Session Reliability — Startup, Health, and Self-Healing

Our MCP bridge and Worker endpoint work correctly in isolation, but agent sessions (Claude Code, Gemini, Cursor) intermittently fail to load tools. The bridge starts, the endpoint responds with 29 tools, yet `mcp__truck_cad__*` never appears in the agent's tool list. No existing ADR addresses the gap between "MCP server works" and "agent session has tools."

## Status

**Proposed**

## Problem

### What We Observe

1. `task up` succeeds — Worker healthy at `localhost:8788`
2. `task truck:mcp:bootstrap` succeeds — `.mcp.json` correctly configured
3. Bridge starts and proxies `tools/list` → 29 tools returned
4. **Agent session has zero `mcp__truck_cad__*` tools** — must restart session and hope

### Root Causes (Investigated)

| Cause | Likelihood | Evidence |
|-------|------------|----------|
| **Bridge startup latency** — bun cold start + `resolveBaseUrl()` health check adds 1.5–3s before first `tools/list` response | High | `resolveBaseUrl()` does a fetch + timeout, then `pollVersion()` does another fetch before the server is ready for MCP traffic |
| **Client timeout** — Claude Code / Cursor may timeout MCP server init if first response is too slow | High | No documented timeout, but empirically sessions fail silently |
| **Race condition** — Worker not ready when bridge tries to connect during session init | Medium | Dev server restarts (Wrangler HMR) can cause a window where `/mcp` returns errors |
| **Silent failure** — bridge crashes or throws but agent client swallows stderr | Medium | Bridge logs to stderr; unclear if Claude Code surfaces these |
| **Config not read** — `.mcp.json` not picked up from project root | Low | Works in most sessions; intermittent |

### What mcpmon Does NOT Fix

We evaluated [mcpmon](https://github.com/neilopet/mcpmon) ("nodemon for MCP"). It wraps an MCP server with file-watching and auto-restart. **It does not solve our problem** because:

- mcpmon solves: server code changed → restart without disconnecting the client
- Our problem: client never loads tools in the first place
- Our bridge already handles: retry (6 attempts, exponential backoff), hot-reload (schema version polling every 30s, `tools/list_changed` notifications)
- Adding mcpmon would wrap a proxy in a proxy with no benefit for the init-time failure

## Decision

### 1. Fast Startup: Deferred URL Resolution

The bridge currently blocks on `resolveBaseUrl()` before calling `server.connect(transport)`. This means the stdio transport isn't listening until the HTTP health check completes (up to 1.5s timeout + PR detection via `gh` CLI). The fix: connect stdio first, resolve URL lazily.

```typescript
// BEFORE (current): blocks stdio on HTTP check
async function start() {
  BASE_URL = await resolveBaseUrl();  // 1.5s+ blocking
  await server.connect(transport);     // stdio not listening until here
}

// AFTER: stdio listens immediately, URL resolved on first request
async function start() {
  await server.connect(transport);     // stdio listening instantly
  // URL resolved lazily on first tools/list or tools/call
}
```

**Why this matters**: MCP clients send `initialize` immediately after spawning the bridge process. If the bridge isn't listening on stdio yet, the client may timeout and mark the server as failed.

### 2. Startup Health Probe: Immediate Feedback

Add a `cad_bridge_status` tool that responds instantly (no HTTP proxy needed) with bridge connectivity state. This gives agents a way to verify the bridge is alive and diagnose connection issues without guessing.

```typescript
{
  name: "cad_bridge_status",
  description: "Check bridge connectivity to the CAD Worker",
  inputSchema: { type: "object", properties: {} }
}
```

Returns:
```json
{
  "bridge": "connected",
  "worker_url": "http://localhost:8788",
  "worker_reachable": true,
  "schema_version": "0.6.0",
  "tools_count": 29,
  "uptime_ms": 12345
}
```

If the Worker is unreachable:
```json
{
  "bridge": "connected",
  "worker_url": "http://localhost:8788",
  "worker_reachable": false,
  "last_error": "ECONNREFUSED",
  "hint": "Run: task up"
}
```

This tool is served locally by the bridge — zero latency, always works, provides actionable diagnostics.

### 3. Graceful Degradation on `tools/list`

If the Worker is unreachable when `tools/list` is called (during init), return `cad_bridge_status` as the only tool instead of throwing an error. This ensures:

- The MCP server always initializes successfully (no silent failure)
- The agent sees at least one tool (proof the bridge is alive)
- The agent can call `cad_bridge_status` to get diagnostics
- When the Worker comes up, `tools/list_changed` notification triggers a re-fetch

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    const response = await proxy({ ... });
    return { tools: [bridgeStatusTool, ...response.result.tools] };
  } catch {
    // Worker down — return bridge-only tool so session doesn't fail
    return { tools: [bridgeStatusTool] };
  }
});
```

### 4. Startup Logging to File

Write bridge startup diagnostics to a log file that can be inspected after a failed session:

```
~/.cache/truck-cad/mcp-bridge.log
```

Contents:
```
[2026-02-23T10:15:03Z] Bridge starting (bun v1.2.3)
[2026-02-23T10:15:03Z] stdio transport connected
[2026-02-23T10:15:03Z] Resolving URL... CAD_URL=http://localhost:8788
[2026-02-23T10:15:03Z] Health check: OK (2ms)
[2026-02-23T10:15:03Z] tools/list: 29 tools, schema v0.6.0
[2026-02-23T10:15:03Z] Ready
```

Or on failure:
```
[2026-02-23T10:15:03Z] Bridge starting (bun v1.2.3)
[2026-02-23T10:15:03Z] stdio transport connected
[2026-02-23T10:15:03Z] Resolving URL... CAD_URL=http://localhost:8788
[2026-02-23T10:15:05Z] Health check: ECONNREFUSED (1502ms)
[2026-02-23T10:15:05Z] tools/list: returning bridge-only (Worker unreachable)
[2026-02-23T10:15:05Z] Waiting for Worker...
```

### 5. Task Integration: `task truck:mcp:doctor`

A diagnostic task that validates the entire MCP chain end-to-end:

```yaml
truck:mcp:doctor:
  desc: Diagnose MCP connectivity issues
  cmds:
    - echo "1. Worker health..."
    - curl -sf http://localhost:8788/api/health && echo " OK" || echo " FAIL — run: task up"
    - echo "2. MCP endpoint..."
    - >-
      curl -sf -X POST http://localhost:8788/mcp
      -H 'Content-Type: application/json'
      -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
      | jq '.result.tools | length' && echo " tools" || echo " FAIL"
    - echo "3. Bridge stdio..."
    - >-
      echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"doctor","version":"1.0.0"}}}'
      | timeout 5 bun scripts/mcp-bridge.ts 2>/dev/null
      | head -1 | jq -r '.result.serverInfo.name' && echo " OK" || echo " FAIL"
    - echo "4. .mcp.json..."
    - test -f .mcp.json && jq -r '.mcpServers["truck-cad"].command' .mcp.json || echo " MISSING"
    - echo "5. Log file..."
    - tail -5 ~/.cache/truck-cad/mcp-bridge.log 2>/dev/null || echo " No log file yet"
```

## Architecture: Before and After

### Before (Current)

```
Agent session starts
  → Claude Code reads .mcp.json
  → Spawns: bun scripts/mcp-bridge.ts
  → Bridge: resolveBaseUrl() [1.5s+ blocking]
  → Bridge: server.connect(transport) [stdio starts listening]
  → Claude Code: sends initialize → bridge may not be listening yet
  → TIMEOUT → tools not loaded → session broken (silent)
```

### After (This ADR)

```
Agent session starts
  → Claude Code reads .mcp.json
  → Spawns: bun scripts/mcp-bridge.ts
  → Bridge: server.connect(transport) [stdio listening INSTANTLY]
  → Claude Code: sends initialize → bridge responds immediately
  → Claude Code: sends tools/list
    → Worker reachable? Return 29 tools + cad_bridge_status
    → Worker unreachable? Return cad_bridge_status only (no error)
  → Tools loaded (always at least 1)
  → Worker comes online → pollVersion() detects → tools/list_changed
  → Claude Code re-fetches tools/list → full 29 tools available
```

## Implementation Plan

| Phase | Deliverable | Effort | Impact |
|-------|-------------|--------|--------|
| **A** | Deferred URL resolution — `server.connect()` before `resolveBaseUrl()` | Tiny | Eliminates startup timeout (root cause) |
| **B** | `cad_bridge_status` tool + graceful `tools/list` degradation | Small | Sessions never fail silently |
| **C** | Startup log file (`~/.cache/truck-cad/mcp-bridge.log`) | Tiny | Post-mortem debugging |
| **D** | `task truck:mcp:doctor` diagnostic task | Small | Self-service troubleshooting |
| **E** | Bridge integration test (CI) — spawn bridge, send `initialize` + `tools/list`, assert response under 500ms | Small | Regression prevention |

Phase A alone likely fixes the immediate problem. Phases B–E add defense in depth.

## Consequences

### Benefits

- **Sessions always initialize** — graceful degradation means the bridge never fails silently
- **Sub-100ms init** — stdio transport connects before any HTTP work
- **Diagnosable** — log file + `cad_bridge_status` + `task truck:mcp:doctor` give three levels of troubleshooting
- **Self-healing** — `tools/list_changed` notification brings full tools online when Worker becomes available
- **Zero new dependencies** — all changes are in the existing bridge script

### Risks

- **`cad_bridge_status` is an extra tool** — adds one tool to the 29 (minimal context cost)
- **Log file location** — `~/.cache/truck-cad/` may not exist; bridge must `mkdir -p` on first write
- **Graceful degradation may mask Worker failures** — mitigated by `cad_bridge_status` returning clear error state

## References

### Internal
- [ADR-010: MCP & OpenAPI Stack](./done/0010-mcp-openapi-stack.md) — MCP implementation this extends
- [ADR-018: Code Mode MCP](./0018-code-mode-mcp.md) — Code-mode tools (same bridge)
- [scripts/mcp-bridge.ts](../../scripts/mcp-bridge.ts) — Bridge implementation to modify

### External
- [mcpmon](https://github.com/neilopet/mcpmon) — Evaluated, does not solve our problem (see above)
- [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) — Official debugging tool
- [MCP Specification](https://modelcontextprotocol.io/) — Protocol standard
