// systems/plugins/howick/system.mjs — Howick plugin system config.
// Plugin = Rust WASM kernel + TypeScript bundle → public/plugin.js
// No deployed worker — loaded client-side by truck-cad web UI.

export const workers = [];
export const devServers = [];

// Build pipeline config — consumed by scripts/build.mjs.
export const building = {
  name: 'howick-plugin',
  order: 5, // after truck (1) — depends on WASM toolchain being available
  steps: [
    { name: 'wasm', command: 'cd systems/plugins/howick/crate && wasm-pack build --target web --release' },
    { name: 'bundle', command: 'bun build systems/plugins/howick/plugin.ts --outfile systems/plugins/howick/public/plugin.js --target browser' },
  ],
};

// Test pipeline config — consumed by scripts/test.mjs.
export const testing = {
  name: 'howick-plugin',
  rust: {
    domain: 'cd systems/plugins/howick/crate && cargo test',
  },
};

// Test registry — single source of truth. check-alignment verifies these files exist.
export const testFiles = {
  rust: [
    { file: 'systems/plugins/howick/crate/src/lib.rs', covers: 'Howick WASM kernel: member geometry, stud layout, cut list, CSV' },
    { file: 'systems/plugins/howick/crate/src/frame_extractor.rs', covers: 'FrameExtractor: CSV parsing, member extraction, stud layout' },
  ],
};
