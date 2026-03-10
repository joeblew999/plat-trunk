// systems/truck/system.mjs — truck-cad system config.
//
// building — declares build steps for the release pipeline (scripts/build.mjs).
// testing  — declares test phases for the test pipeline (scripts/test.mjs).
// When you add a new system, copy this pattern into systems/{name}/system.mjs.

import { DEV_BUILD as SYNC_DEV_BUILD } from '../sync/system.mjs';

// DEV_BUILD chains sync first — used by run.mjs watchers (single rebuild on Rust changes).
// Full ripple: Rust → WASM → schema JSON → generated TS adapters → generated types
export const DEV_BUILD =
  `${SYNC_DEV_BUILD} && cd systems/truck/crate && wasm-pack build --target web --dev --out-dir ../web/pkg-browser-renderer && wasm-pack build --target bundler --dev --no-default-features --out-dir ../worker/pkg && cargo run --bin generate-schema 2>/dev/null > ../cad-schema.json && cd ../../.. && bun run gen:sync-types && bun run gen:adapters`;

// OWN_RELEASE_BUILD is truck-only (no sync prefix) — build.mjs handles ordering.
const OWN_RELEASE_BUILD =
  'cd systems/truck/crate && wasm-pack build --target web --release && rm -rf ../web/pkg-browser-renderer && mv pkg ../web/pkg-browser-renderer && wasm-pack build --target bundler --release --no-default-features && rm -rf ../worker/pkg && mv pkg ../worker/pkg && cargo run --bin generate-schema 2>/dev/null > ../cad-schema.json';

export const workers = [
  {
    name: 'truck-cad',
    dir: 'systems/truck/worker',
    port: 8789,
    inspectorPort: 9230,
    build: DEV_BUILD,
    healthUrl: 'http://localhost:8789/api/health',
    watch: {
      name: 'watch-wasm',
      paths: ['systems/truck/crate/src', 'systems/sync/crate/src'],
      extensions: ['rs'],
      ignore: ['*_generated.rs'],
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

// Build pipeline config — consumed by scripts/build.mjs.
// Each step runs in order. build.mjs sorts systems by `order`.
export const building = {
  name: 'truck',
  order: 1,
  steps: [
    { name: 'wasm+schema', command: OWN_RELEASE_BUILD },
    { name: 'adapters', command: 'bun run gen:adapters' },
    { name: 'sizes', command: 'bun run check:sizes' },
    { name: 'web', command: 'bun run gen:api-types && cd systems/truck/web && bun run build' },
  ],
};

// Test pipeline config — consumed by scripts/test.mjs.
// Each field maps to one phase. Omit a field if the system doesn't have that phase.
export const testing = {
  name: 'truck-cad',
  rust: {
    // Phase 2: innermost — Rust param structs must deep-equal committed cad-schema.json
    schemaContract: 'cargo test -p truck-cad --no-default-features --features native --test contract',
    // Phase 4: geometry domain — HeadlessController, all CAD commands, no GPU
    // --release: boolean ops are 10-20x slower in debug (unoptimized BREP math)
    domain: 'cargo test --release -p truck-cad --no-default-features --features native',
  },
  // Phase 5: TypeScript boundary — api-types.generated.ts derived from schema, catches renames
  typecheck: 'cd systems/truck/worker && bunx tsc --noEmit && cd ../web && bun run typecheck',
  // Phase 6: HTTP/MCP/Sync contract — schema, MCP protocol, model CRUD, sync endpoints,
  // CRDT merge, WASM boundary, replay, dedup, multi-actor, delete cascade
  vitest: 'cd systems/truck/worker && bun x vitest run',
};

// Test registry — single source of truth. check-alignment verifies these files exist.
// When adding tests, update this list. If a file is missing, the build breaks.
export const testFiles = {
  rust: [
    { file: 'systems/truck/crate/src/bool_robustness.rs', covers: 'Boolean ops: try_new, fallback, tessellation, chaining' },
    { file: 'systems/truck/crate/src/sketch.rs', covers: 'Sketch: extrude, constraints, serialization, plane projection' },
    { file: 'systems/truck/crate/tests/contract.rs', covers: 'Schema: Rust build_schema() deep-equals committed JSON' },
    { file: 'systems/truck/crate/tests/boundary.rs', covers: 'Boundary: schema→headless dispatch, WASM exports match' },
    { file: 'systems/truck/crate/tests/golden.rs', covers: 'Golden: mesh output for all primitives + booleans' },
    { file: 'systems/truck/crate/tests/booleans.rs', covers: 'Booleans: union/subtract/intersect/clash via schema params' },
    { file: 'systems/truck/crate/tests/geometry.rs', covers: 'Geometry: add/translate/rotate/scale/duplicate/errors' },
    { file: 'systems/truck/crate/tests/scene.rs', covers: 'Scene: import/export/delete/clear' },
    { file: 'systems/truck/crate/tests/sketch.rs', covers: 'Sketch API: begin/add_point/add_edge/extrude/cancel' },
    { file: 'systems/truck/crate/tests/style.rs', covers: 'Style: rename, get_state, rendering-only errors' },
    { file: 'systems/truck/crate/tests/sync.rs', covers: 'CRDT integration: offline merge, multi-model isolation, replay through geometry' },
  ],
  vitest: [
    { file: 'systems/truck/worker/src/schema.test.ts', covers: 'Schema endpoint: deep-equal, ephemeral/readonly flags, OpenAPI spec' },
    { file: 'systems/truck/worker/src/mcp.test.ts', covers: 'MCP: init, tools/list, data-plane (server-direct), control-plane (browser timeout), SSE, errors' },
    { file: 'systems/truck/worker/src/models.test.ts', covers: 'Models: PUT/GET/DELETE CRUD, thumbnail PNG, 404/400 errors' },
    { file: 'systems/truck/worker/src/sync.test.ts', covers: 'Sync HTTP: POST /ops, POST /sync, merge, dedup, multi-actor, cascade, etag, replay' },
    { file: 'systems/truck/worker/src/url-params.test.ts', covers: 'URL params: parseUrlParams pure function, all path patterns' },
    { file: 'systems/truck/worker/src/sketch.test.ts', covers: 'Sketch MCP: quick_rect_extrude, sketch_extrude, op replay, tools/list boundary' },
  ],
  helpers: [
    'systems/truck/worker/src/test-helpers.ts',
  ],
};
