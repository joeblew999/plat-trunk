// systems/test/system.mjs — test-worker system config.

const TEST_PORT      = parseInt(process.env.TEST_PORT      ?? '5175');
const TEST_INSPECTOR  = parseInt(process.env.TEST_INSPECTOR  ?? '9232');

export const workers = [
  {
    name: 'test-worker',
    dir: 'systems/test/worker',
    port: TEST_PORT,
    inspectorPort: TEST_INSPECTOR,
  },
];

export const devServers = [];
