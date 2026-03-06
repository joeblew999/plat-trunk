// systems/truck/system.mjs — truck-cad system config.
// Owns TRUCK_DEV_BUILD (chains sync build first, then geometry WASM).
//
// testing — declares what phases this system contributes to the test pipeline.
// scripts/test.mjs reads this to loop generically over all registered systems.
// When you add a new system, copy this pattern into systems/{name}/system.mjs.

import { DEV_BUILD as SYNC_DEV_BUILD } from '../sync/system.mjs';

export const DEV_BUILD =
  `${SYNC_DEV_BUILD} && cd systems/truck/crate && wasm-pack build --target web --dev --out-dir ../web/pkg-browser-renderer && cargo run --bin generate-schema 2>/dev/null > ../cad-schema.json`;

export const workers = [
  {
    name: 'truck-cad',
    dir: 'systems/truck/worker',
    port: 8789,
    inspectorPort: 9230,
    build: DEV_BUILD,
    migrate: 'bunx wrangler d1 migrations apply cad-op-log --local',
    healthUrl: 'http://localhost:8789/api/health',
    watch: {
      name: 'watch-wasm',
      paths: ['systems/truck/crate/src'],
      extensions: ['rs'],
      command: DEV_BUILD,
      debounce: 3000,
    },
  },
];

export const devServers = [
  {
    name: 'truck-web-dev',
    dir: 'systems/truck/web',
    build: 'cd systems/truck/web && bun run build',
    command: 'cd systems/truck/web && bun x vite',
  },
];

// Test pipeline config — consumed by scripts/test.mjs.
// Each field maps to one phase. Omit a field if the system doesn't have that phase.
export const testing = {
  name: 'truck-cad',
  rust: {
    // Phase 2: innermost — Rust param structs must deep-equal committed cad-schema.json
    schemaContract: 'cargo test -p truck-webgpu-gui --no-default-features --features native --test schema_contract',
    // Phase 3: CRDT math — merge commutativity, replay determinism, model isolation
    crdt: 'cargo test -p truck-sync',
    // Phase 4: geometry domain — HeadlessController, all CAD commands, no GPU
    domain: 'cargo test -p truck-webgpu-gui --no-default-features --features native',
  },
  // Phase 5: TypeScript boundary — api-types.ts derived from schema, catches renames
  typecheck: 'cd systems/truck/worker && bunx tsc --noEmit && cd ../web && bun run typecheck',
  // Phase 6: HTTP/MCP contract — worker serves exactly the committed schema (deep equality)
  vitest: 'cd systems/truck/worker && bun x vitest run',
};
