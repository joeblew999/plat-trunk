import { defineConfig, devices } from '@playwright/test';

// Test against the auth worker directly (server-side rendered — no build step needed).
// Requires the worker running: mise --cd systems/auth run dev
// Fixtures seeded by e2e/global-setup.ts via globalSetup — see e2e/fixtures.ts for accounts + grants.
const BASE_URL    = process.env.BASE_URL    || 'http://localhost:8790';
const WORKER_URL  = process.env.WORKER_URL  || 'http://localhost:8790';

export default defineConfig({
  testDir: '.',
  globalSetup: './global-setup.ts',
  outputDir: './test-results',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,   // auth state is shared — serial
  workers: 1,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'auth-e2e',
      testMatch: ['*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        headless: true,   // no WebGPU needed — auth is pure HTTP + DOM
      },
    },
  ],
});

export { WORKER_URL };
