// workers.mjs — Single source of truth for all workers in dev.
//
// Used by: run.mjs (bun run dev)
//
// Each worker gets:
//   - wrangler dev process (auto-reloads on .ts changes)
//   - optional build + watch for non-TS assets (e.g. Rust → WASM)
//
// To add a new worker:
//   1. Create systems/{name}/worker/ with wrangler.toml + src/index.ts
//   2. Add an entry here (unique port + inspectorPort)
//   3. Add a [[services]] binding in root wrangler.toml
//   4. Add routing in src/router.ts
//   5. Add an entry in cf-deploy.json (before "router")
//
// To remove a worker: reverse the steps above.

// Dev build command for truck WASM. Uses --dev (no wasm-opt) for:
//   - Fast rebuilds (~2s vs ~6s)
//   - No race condition with wrangler asset watcher
// Deploy uses bun run build:truck (--release with wasm-opt).
const TRUCK_DEV_BUILD = 'cd systems/truck/crate && wasm-pack build --target web --dev --out-dir ../web/pkg-browser-renderer && cargo run --bin generate-schema 2>/dev/null > ../cad-schema.json';

export const workers = [
  {
    name: 'plat-router',
    dir: '.',
    port: 8788,
    inspectorPort: 9229,
  },
  {
    name: 'truck-cad',
    dir: 'systems/truck/worker',
    port: 8789,
    inspectorPort: 9230,
    build: TRUCK_DEV_BUILD,
    watch: {
      name: 'watch-wasm',
      paths: ['systems/truck/crate/src'],
      extensions: ['rs'],
      command: TRUCK_DEV_BUILD,
      debounce: 3000,
    },
  },
  {
    name: 'test-worker',
    dir: 'systems/test/worker',
    port: 5175,
    inspectorPort: 9231,
  },
];

// Dev servers — run alongside workers but aren't workers themselves.
export const devServers = [
  {
    name: 'docs-dev',
    command: 'cd systems/docs/website && bun x vitepress dev --port 5176',
  },
  {
    // Vite dev server for truck web UI (HMR at localhost:5173)
    // Proxies /api and /mcp to truck-cad worker (localhost:8789)
    // Use localhost:5173 for dev — .ts changes reload without restart
    //
    // build: initial Vite production build — creates dist/ so wrangler dev can start.
    // wrangler.toml [assets] directory = "../web/dist" requires this to exist.
    // After this one-time build, Vite dev server handles HMR at :5173 (no restart needed).
    name: 'truck-web-dev',
    dir: 'systems/truck/web',
    build: 'cd systems/truck/web && bun run build',
    command: 'cd systems/truck/web && bun x vite',
  },
];
