/**
 * WASM loader and typed API for lib/observe/crate.
 *
 * This file re-exports from wasm.generated.ts — do not add logic here.
 * To regenerate after changing Rust exports: bun dev/gen-wasm.ts
 * To verify in CI: bun dev/gen-wasm.ts --check
 */
export { loadObserveWasm, scrubEntry, sampleKeep } from './wasm.generated'
export type { ObserveWasm } from './wasm.generated'
