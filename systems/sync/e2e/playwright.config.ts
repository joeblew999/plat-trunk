// systems/sync/e2e/playwright.config.ts — Playwright config for sync e2e tests.
//
// Tests cross-tab and multi-device sync behaviour using the real app.
// Requires `bun run dev` (or mise run dev) to be running.
//
// Run: cd systems/sync/e2e && bunx playwright test
// Or:  mise --cd systems/sync run test:e2e

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8788';

// Repo root — three levels up from systems/sync/e2e/
const REPO_ROOT = path.resolve(__dirname, '../../..');

const chromeWithWebGPU = {
  ...devices['Desktop Chrome'],
  channel: 'chrome' as const,
  headless: false,
  launchOptions: {
    args: [
      '--enable-unsafe-webgpu',
      '--enable-features=Vulkan',
      '--use-angle=metal',
      '--disable-dawn-features=disallow_unsafe_apis',
    ],
  },
};

export default defineConfig({
  // Reuse existing dev server if running — sync tests need the full stack.
  webServer: {
    command: 'bun run dev',
    cwd: REPO_ROOT,
    url: 'http://localhost:8788/api/health',
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  testDir: '.',
  outputDir: './test-results',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false, // cross-tab tests must not run in parallel
  workers: 1,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10_000,
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'sync',
      testMatch: /cross-tab-sync\.spec\.ts/,
      use: chromeWithWebGPU,
    },
  ],
});
