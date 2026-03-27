// systems/sync/system.mjs — sync system config.
// Owns the WASM build for systems/sync/crate.
// Primary outputs go to systems/sync/pkg/ (sync-local).
// Consumers (truck) copy from there in their own build steps.

// Build to sync-local pkg dirs, then copy to consumer locations.
// Two WASM targets: web (browser ESM), bundler (CF worker).
const SYNC_BUILD_CORE = (mode) =>
  `(cd systems/sync/crate && ` +
  `wasm-pack build --target web ${mode} --out-dir ../pkg/web && ` +
  `wasm-pack build --target bundler ${mode} --out-dir ../pkg/bundler && ` +
  `cargo run --bin generate-sync-schema > ../sync-schema.json 2>/dev/null)`;

// After building, copy to truck's expected locations.
const COPY_TO_CONSUMERS =
  'cp -r systems/sync/pkg/web/* systems/truck/web/pkg-sync/ 2>/dev/null || true && ' +
  'cp -r systems/sync/pkg/bundler/* systems/truck/worker/pkg-sync/ 2>/dev/null || true';

export const DEV_BUILD = `${SYNC_BUILD_CORE('--dev')} && ${COPY_TO_CONSUMERS}`;
export const RELEASE_BUILD = `${SYNC_BUILD_CORE('--release')} && ${COPY_TO_CONSUMERS}`;

// Sync has no deployed worker — it's a WASM library + PartyKit integration.
export const workers = [];
export const devServers = [];

// Build pipeline config — consumed by scripts/build.mjs.
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
  partykit: 'cd systems/sync && mise run test:partykit',
};

// Test registry — single source of truth. check-alignment verifies these files exist.
export const testFiles = {
  rust: [
    { file: 'systems/sync/crate/src/lib.rs', covers: 'CRDT math: merge, dedup, replay, rollback, Blake3 hash' },
  ],
  partykit: [
    { file: 'systems/sync/test/partykit/sync.test.ts', covers: 'automerge-repo transport: connect, handshake, sync, two-peer convergence' },
    { file: 'systems/sync/test/partykit/sync-doc.test.ts', covers: 'SyncDoc E2E: add, undo, redo, group, name, two-peer convergence' },
  ],
  crossRefs: [
    { file: 'systems/truck/worker/src/sync.test.ts', covers: 'Server-side HTTP: POST /sync merge, dedup, name propagation, replay' },
  ],
};
