// systems/test/system.mjs — test-worker system config.

export const workers = [
  {
    name: 'test-worker',
    dir: 'systems/test/worker',
    port: 5175,
    inspectorPort: 9231,
  },
];

export const devServers = [];
