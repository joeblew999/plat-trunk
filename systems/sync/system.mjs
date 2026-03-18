// systems/sync/system.mjs — sync system config.
// Owns the WASM build for systems/sync/crate (three targets: web + 2x bundler).

export const DEV_BUILD =
  '(cd systems/sync/crate && wasm-pack build --target web --dev --out-dir ../../truck/web/pkg-sync && wasm-pack build --target bundler --dev --out-dir ../../truck/worker/pkg-sync && wasm-pack build --target bundler --dev --out-dir ../worker/pkg-sync && cargo run --bin generate-sync-schema > ../sync-schema.json 2>/dev/null)';

export const RELEASE_BUILD =
  '(cd systems/sync/crate && wasm-pack build --target web --release --out-dir ../../truck/web/pkg-sync && wasm-pack build --target bundler --release --out-dir ../../truck/worker/pkg-sync && wasm-pack build --target bundler --release --out-dir ../worker/pkg-sync && cargo run --bin generate-sync-schema > ../sync-schema.json 2>/dev/null)';

// Sync has no deployed worker — it's a WASM library consumed by truck.
// The worker/ directory exists only to provide vitest-pool-workers context for tests.
export const workers = [];
export const devServers = [];

// Build pipeline config — consumed by scripts/build.mjs.
// Each step runs in order. build.mjs sorts systems by `order`.
export const building = {
  name: 'sync',
  order: 0,
  steps: [
    { name: 'wasm+schema', command: RELEASE_BUILD },
    { name: 'types', command: 'bun run gen:sync-types' },
  ],
};

// Test pipeline config — consumed by scripts/test.mjs.
export const testing = {
  name: 'sync',
  rust: {
    crdt: 'cargo test -p truck-sync',
  },
  vitest: 'cd systems/sync/worker && bun x vitest run',
};

// Test registry — single source of truth. check-alignment verifies these files exist.
// When adding tests, update this list. If a file is missing, the build breaks.
export const testFiles = {
  rust: [
    { file: 'systems/sync/crate/src/lib.rs', covers: 'CRDT math: merge, dedup, replay, rollback, enable/disable, names (unit + integration)' },
  ],
  vitest: [
    { file: 'systems/sync/worker/src/wasm.test.ts', covers: 'WASM boundary: JS↔Rust serialization, create/apply/merge/dedup/names' },
    { file: 'systems/sync/worker/src/message-contract.test.ts', covers: 'SSE message format: SyncMessage wire contract, model isolation' },
    { file: 'systems/sync/worker/src/sync-client.test.ts', covers: 'SyncClient protocol: real WASM + MemoryStorage + DirectNetwork adapters' },
  ],
};
