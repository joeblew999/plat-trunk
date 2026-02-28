// workers.mjs — Single source of truth for all workers in dev.
//
// Used by: run.mjs (bun run dev)
//
// To add a new worker:
//   1. Create systems/{name}/worker/ with wrangler.toml + src/index.ts
//   2. Add an entry here (unique port + inspectorPort)
//   3. Add a [[services]] binding in root wrangler.toml
//   4. Add routing in src/router.ts
//   5. Add an entry in cf-deploy.json (before "router")
//
// To remove a worker:
//   Reverse the steps above.

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
    build: 'bun run build:truck',
  },
  {
    name: 'test-worker',
    dir: 'systems/test/worker',
    port: 5175,
    inspectorPort: 9231,
  },
];

// File watchers for hot-reload during dev
export const watchers = [
  {
    name: 'watch-gui',
    command: 'watchexec -w systems/truck/crate/src -e rs -- bun run build:truck',
  },
  {
    name: 'watch-docs',
    command: 'cd systems/docs/website && bun run dev',
  },
];
