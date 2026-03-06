# kkrpc — RPC Library Reference

Typed bidirectional RPC library. Used as a reference for the platform's RPC patterns.

## Current Status

The truck-cad WASM boundary uses **direct wasm-bindgen calls** (synchronous `moduleRouter.execute()`), not kkrpc. This is simpler and sufficient for the current single-thread browser execution model.

kkrpc remains a reference for future multi-transport scenarios (SharedWorker, WebSocket, stdio).

## Where kkrpc Patterns Apply

The project uses kkrpc-style patterns in the MCP bridge:

| Component | Pattern |
|---|---|
| `scripts/mcp-bridge.ts` | stdio ↔ HTTP proxy (JSON-RPC 2.0) |
| Worker `/mcp` endpoint | JSON-RPC request/response |
| SSE command relay | Async request → event → response |

## WASM Boundary (Actual)

The current WASM boundary is thin and synchronous:

```typescript
// moduleRouter.execute() — direct wasm-bindgen call
const result = moduleRouter.execute('add_cube', { size: 1 });
// Returns WasmResult immediately (no RPC overhead)
```

Three dispatch paths (schema-driven via `dispatch.ts`):
1. **JS Control Plane** — undo, redo, save — pure TypeScript
2. **WASM Control Plane** — select, get_state — sync wasm-bindgen call
3. **WASM Data Plane** — add_cube, translate — sync call + Automerge record

## CF Workers Limits

Design constraints that apply to all WASM modules:
- 3 MB compressed WASM per worker
- 128 MB memory
- Separate workers for heavy WASM (truck-cad geometry is browser-only)

## References

- https://docs.kkrpc.kunkun.sh
- LLM reference: `docs/llms/kkrpc-llms-full.txt`
