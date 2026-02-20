import { defineConfig, devices } from '@playwright/test';

// Dev server must be running before tests start.
// Start it with: task truck:test:serve:start
// Or run the full pipeline: task truck:test:all
const BASE_URL = process.env.BASE_URL || 'http://localhost:8787';
const IS_SLOW = !!process.env.SLOW;

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: IS_SLOW ? 120_000 : 60_000,
  expect: { timeout: IS_SLOW ? 30_000 : 15_000 },
  fullyParallel: false, // run serial to avoid overwhelming wrangler dev
  workers: 1,           // single worker for stability
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    // WebGPU needs a real browser — use headed Chrome
    headless: false,
    channel: 'chrome',
    viewport: { width: 1280, height: 800 },
    actionTimeout: IS_SLOW ? 20_000 : 10_000,
    screenshot: 'off', // we take manual screenshots for docs
    video: IS_SLOW ? 'on' : 'retain-on-failure',
  },

  projects: [
    {
      name: 'e2e',
      testMatch: ['cad.spec.ts', 'sketch.spec.ts', 'actors.spec.ts', 'bim.spec.ts'],
      testIgnore: [/cross-tab-sync\.spec\.ts/, /doc-videos\.spec\.ts/, /cad-ui\.spec\.ts/],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // UI interaction tests — toolbar clicks, outliner, canvas, data-testid selectors
      name: 'ui',
      testMatch: /cad-ui\.spec\.ts/,
      retries: 1,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Cross-tab sync — must run alone (broadcasts interfere)
      name: 'sync',
      testMatch: /cross-tab-sync\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Doc video recording — always records, runs serial (one browser at a time)
      name: 'docs',
      testMatch: /doc-videos\.spec\.ts/,
      timeout: 120_000,
      fullyParallel: false,
      use: {
        ...devices['Desktop Chrome'],
        video: 'on',
        actionTimeout: 20_000,
      },
    },
  ],
});
