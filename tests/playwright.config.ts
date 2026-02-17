import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8787';
const IS_SLOW = !!process.env.SLOW;

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: IS_SLOW ? 120_000 : 60_000,
  expect: { timeout: IS_SLOW ? 30_000 : 15_000 },
  fullyParallel: false, // CAD tests are sequential (scene state)
  retries: 0,
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
      testIgnore: [/doc-screenshots\.spec\.ts/, /doc-lessons\.spec\.ts/, /cross-tab-sync\.spec\.ts/],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Cross-tab SSE sync — must run alone (other tests broadcast signals
      // to the same Worker, interfering with expected signal values).
      name: 'sync',
      testMatch: /cross-tab-sync\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Dedicated project for generating doc screenshots
      name: 'screenshots',
      testMatch: /doc-screenshots\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        channel: 'chrome',
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      // Dedicated project for recording lesson videos
      name: 'lessons',
      testMatch: /doc-lessons\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        channel: 'chrome',
        viewport: { width: 1280, height: 800 },
        video: {
          mode: 'on',
          size: { width: 1280, height: 800 },
        },
      },
    },
  ],
});
