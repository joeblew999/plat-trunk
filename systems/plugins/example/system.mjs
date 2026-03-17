// systems/plugins/example/system.mjs — Example plugin system config.
// Minimal plugin template — TypeScript bundle only (no WASM).
// No deployed worker — loaded client-side by truck-cad web UI.

export const workers = [];
export const devServers = [];

// Build pipeline config — consumed by scripts/build.mjs.
export const building = {
  name: 'example-plugin',
  order: 5, // alongside other plugins
  steps: [
    { name: 'bundle', command: 'bun build systems/plugins/example/plugin.ts --outfile systems/plugins/example/public/plugin.js --target browser' },
  ],
};

// No Rust tests — example plugin is TypeScript only.
export const testing = null;
export const testFiles = null;
