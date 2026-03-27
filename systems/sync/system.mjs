// systems/sync/system.mjs — sync system config.
// Owns the WASM build for systems/sync/crate.
// Primary outputs go to systems/sync/pkg/ (sync-local).
// Consumers (truck) copy from there in their own build steps.

// Build to sync-local pkg dirs, then copy to consumer locations.
// Three WASM targets: web (browser ESM), bundler (CF worker), bundler (tests).
const SYNC_BUILD_CORE = (mode) =>
  `(cd systems/sync/crate && ` +
  `wasm-pack build --target web ${mode} --out-dir ../pkg/web && ` +
  `wasm-pack build --target bundler ${mode} --out-dir ../pkg/bundler && ` +
  `wasm-pack build --target bundler ${mode} --out-dir ../test/pkg-sync && ` +
  `cargo run --bin generate-sync-schema > ../sync-schema.json 2>/dev/null)`;

// After building, copy to truck's expected locations.
const COPY_TO_CONSUMERS =
  'cp -r systems/sync/pkg/web/* systems/truck/web/pkg-sync/ 2>/dev/null || true && ' +
  'cp -r systems/sync/pkg/bundler/* systems/truck/worker/pkg-sync/ 2>/dev/null || true';

export const DEV_BUILD = `${SYNC_BUILD_CORE('--dev')} && ${COPY_TO_CONSUMERS}`;
export const RELEASE_BUILD = `${SYNC_BUILD_CORE('--release')} && ${COPY_TO_CONSUMERS}`;

// Sync has no deployed worker — it's a WASM library consumed by other systems.
// The test/ directory provides vitest-pool-workers context for TS tests.
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
    crdt: 'cd systems/sync/crate && cargo test',
  },
  vitest: 'cd systems/sync/test && bun x vitest run',
};

// Test registry — single source of truth. check-alignment verifies these files exist.
// When adding tests, update this list. If a file is missing, the build breaks.
export const testFiles = {
  rust: [
    { file: 'systems/sync/crate/src/lib.rs', covers: 'CRDT math: merge, dedup, replay, rollback, Blake3 hash' },
  ],
  // client/ — tests @plat/sync/client + adapters in CF Workers runtime (vitest-pool-workers)
  client: [
    { file: 'systems/sync/test/client/wasm.test.ts', covers: '@plat/sync/wasm-adapter boundary: create, apply, merge, dedup, names, hash' },
    { file: 'systems/sync/test/client/sync-client.test.ts', covers: '@plat/sync/client + adapters: protocol, retry, presence, compaction, debounce, loadAndSync' },
  ],
  // integration/ — tests all boundaries (Playwright: real browser + real CF Worker + R2)
  integration: [
    { file: 'systems/sync/test/integration/gui-basics.spec.ts', covers: 'GUI boot, add op, sync via real server + R2, log events' },
    { file: 'systems/sync/test/integration/cross-tab.spec.ts', covers: 'BroadcastChannel: cross-tab op delivery, undo propagation' },
    { file: 'systems/sync/test/integration/presence.spec.ts', covers: 'Presence: setPresence renders in GUI' },
    { file: 'systems/sync/test/integration/offline.spec.ts', covers: 'Offline/online: toggle, disabled sync button, local ops while offline' },
    { file: 'systems/sync/test/integration/server-api.spec.ts', covers: 'SyncWorker API: POST /ops, GET /ops, GET /replay, DELETE, health' },
  ],
  // Cross-references: truck's server-side sync tests (sync library has no deployed worker)
  crossRefs: [
    { file: 'systems/truck/worker/src/sync.test.ts', covers: 'Server-side HTTP: POST /sync merge, dedup, name propagation, replay' },
  ],
};
