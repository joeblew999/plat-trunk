// systems/sync/system.mjs — sync system config.
// Owns the WASM build for systems/sync/crate (two targets: web + bundler).

export const DEV_BUILD =
  'cd systems/sync/crate && wasm-pack build --target web --dev --out-dir ../../truck/web/pkg-sync && wasm-pack build --target bundler --dev --out-dir ../../truck/worker/pkg-sync';

export const RELEASE_BUILD =
  'cd systems/sync/crate && wasm-pack build --target web --release --out-dir ../../truck/web/pkg-sync && wasm-pack build --target bundler --release --out-dir ../../truck/worker/pkg-sync';

// Sync has no worker of its own — it's a WASM library consumed by truck.
export const workers = [];
export const devServers = [];
