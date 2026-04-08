import { defineConfig, devices } from '@playwright/test';

// Tests run against the Vite dev server at :5174.
// Both worker (:8792) and web (:5174) must be running before tests start.
// Use `mise run ci` which handles start/stop automatically.

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5174';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  // WORKERS=4 for production (each test is isolated — unique email + fresh page).
  // Default 1 for local dev (simpler to debug, less load on local servers).
  fullyParallel: process.env.WORKERS ? parseInt(process.env.WORKERS) > 1 : false,
  workers: process.env.WORKERS ? parseInt(process.env.WORKERS) : 1,
  timeout: 30_000,
  expect: { timeout: 15_000 },  // production has higher latency than local dev
  retries: process.env.WORKERS ? 1 : 0,  // one retry for transient prod failures

  use: {
    baseURL: WEB_URL,
    headless: true,
    // Keep cookies between steps within a test
    storageState: undefined,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-save-password-bubble', '--disable-features=PasswordManagerOnboarding'],
        },
      },
    },
  ],

  reporter: [['list'], ['html', { open: 'never' }]],
});
