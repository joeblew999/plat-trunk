# kkrpc — WASM Boundary Layer <Badge type="warning" text="Planned" />

Typed bidirectional RPC for JS/TS ↔ WASM communication.

::: info Status
Not yet implemented. The current WASM boundary uses direct wasm-bindgen calls. kkrpc is planned as the typed RPC layer for future multi-transport support.
:::

## Role

kkrpc is the typed boundary layer between JavaScript and WASM modules. Same API, transport swapped per target:

| Target | Transport |
|---|---|
| Browser | SharedWorker (one WASM shared across tabs) |
| Native webviews | Web Worker |
| CF Workers | Direct call (same isolate) |
| Bare metal | stdio (Node/Bun/Deno) |

## WASM Compilation Strategy

Two builds, not three:

| Build | Target | Used By |
|---|---|---|
| `wasm32-unknown-unknown` | Browser + CF Workers | wasm-bindgen |
| `wasm32-wasip1` | Bare metal | WASI runtime |

## Key Principles

- **Thin boundary**: Coarse operations, not fine-grained calls
- **Typed arrays**: For bulk data transfer (mesh vertices, etc.)
- **Lazy init**: WASM modules initialized on first use
- **Zero-copy**: Where possible, share memory instead of copying

## CF Workers Limits

Design to these constraints:
- 3 MB compressed WASM
- 128 MB memory
- 1s startup time

## References

- https://docs.kkrpc.kunkun.sh
- LLM reference: `docs/llms/kkrpc-llms-full.txt` (221KB)
