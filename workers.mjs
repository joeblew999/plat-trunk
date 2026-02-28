// workers.mjs — Single source of truth for all workers.
// Used by: run.mjs (dev/deploy)

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
    build: 'npm run build:truck',
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
    command: 'watchexec -w systems/truck/crate/src -e rs -- npm run build:truck',
  },
  {
    name: 'watch-docs',
    command: 'cd systems/docs/website && bun run dev',
  },
];
