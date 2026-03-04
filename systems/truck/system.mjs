// systems/truck/system.mjs — truck-cad system config.
// Owns TRUCK_DEV_BUILD (chains sync build first, then geometry WASM).

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
