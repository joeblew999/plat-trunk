// workers.mjs — Single source of truth for all workers in dev.
//
// Used by: run.mjs (bun run dev), check-alignment.mjs
//
// To add a new system:
//   1. Create systems/{name}/system.mjs (exports workers, devServers)
//   2. Add one import line below and spread into workers / devServers
//   3. Create systems/{name}/worker/wrangler.toml + src/index.ts
//   4. Add a [[services]] binding in root wrangler.toml
//   5. Add routing in src/router.ts
//   6. Add an entry in cf-deploy.json (before "router")
//
// To remove a system: reverse the steps above.

import { workers as syncWorkers }                                from './systems/sync/system.mjs';
import { workers as truckWorkers, devServers as truckDevServers } from './systems/truck/system.mjs';
import { workers as testWorkers }                                from './systems/test/system.mjs';
import { devServers as docsDevServers }                          from './systems/docs/system.mjs';

export const workers = [
  { name: 'plat-router', dir: '.', port: 8788, inspectorPort: 9229 },
  ...syncWorkers,
  ...truckWorkers,
  ...testWorkers,
];

export const devServers = [
  ...truckDevServers,
  ...docsDevServers,
];
