# [ADR-006] WASM Boundary

## Status

**Superseded** for single-module. Originally proposed kkrpc as the JS ↔ WASM boundary layer. Direct `wasm-bindgen` + `execute()` proved sufficient for one module. However, multi-module WASM composition is now planned (see [ADR-0018 WASM Modularity](../0018-code-mode-mcp.md#wasm-modularity--multi-module-composition)) — the `execute(cmd, params_json)` interface becomes the module boundary contract, with MCP as the unifying dispatch layer across modules.

## Original Proposal: kkrpc

[kkrpc](https://github.com/kunkunsh/kkrpc) is a TypeScript bidirectional RPC library supporting multiple transports (stdio, WebSocket, HTTP, Workers, SharedWorker). The original plan was to use it as a typed bridge between JS and WASM across all target platforms (browser, native webviews, CF Workers, bare metal).

The key ideas were:
- One typed interface definition for calling into WASM modules everywhere
- Transport swapped per target: SharedWorker (browser), Web Worker (native webviews), direct call (CF), stdio (bare metal)
- Same API contract regardless of deployment target

## What We Actually Built

Direct `wasm-bindgen` with a single entry point:

```javascript
// JS side (executeWasm in state.js)
function executeWasm(ctrl, type, params) {
  return JSON.parse(ctrl.execute(type, JSON.stringify(params)));
}

// Rust side (wasm_app.rs)
#[wasm_bindgen]
pub fn execute(&mut self, cmd_type: &str, params_json: &str) -> String {
    // dispatch to typed command handler, return JSON result
}
```

### Why This Works

1. **Single module**: We only have one WASM module (truck). No multi-module orchestration needed.
2. **Coarse operations**: `execute(type, json)` is one call per user action. The boundary crossing cost is negligible.
3. **JSON is fine**: Command params are small (a few fields). Mesh data stays in WASM linear memory and goes directly to WebGPU buffers.
4. **Schema-driven**: `cad-schema.json` (generated from Rust structs) serves as the type contract. No RPC layer needed when the schema is the API.

### The Boundary in Practice

```
Browser JS → executeWasm('add_cube', {size: 1}) → Rust execute() → JSON result
           → executeWasm('translate', {objectId, dx, dy, dz}) → Rust execute() → JSON result
           → ctrl.begin_gizmo_drag(ndcX, ndcY) → direct WASM call (latency-sensitive)
```

Most operations go through the `execute()` dispatch. Gizmo drag (60fps) stays as direct method calls for latency.

## When kkrpc Would Be Needed

The original kkrpc proposal would become relevant if:
- **Multiple WASM modules**: Adding a second kernel (mesh analysis, FEA simulation) that needs orchestration
- **SharedWorker**: Moving the kernel to a SharedWorker for multi-tab memory sharing
- **Native webview targets**: Different transports per platform (Web Worker, stdio)
- **Server-side WASM**: Running the kernel headless via wasmtime/wasmer

For now, direct `wasm-bindgen` + `cad-schema.json` covers 100% of our needs.

## References

- kkrpc: https://docs.kkrpc.kunkun.sh
- wasm-bindgen: https://rustwasm.github.io/wasm-bindgen/
- See [ADR-005](0005-schema-driven-unified-api.md) for the schema contract.
