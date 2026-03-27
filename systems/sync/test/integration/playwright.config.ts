import { defineConfig } from '@playwright/test';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  webServer: [
    {
      command: 'npx wrangler dev',
      cwd: `${__dir}/../worker`,
      url: 'http://localhost:5198/api/health',
      reuseExistingServer: true,
      timeout: 30_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'bunx vite',
      cwd: __dir,
      url: 'http://localhost:5199',
      reuseExistingServer: true,
      timeout: 30_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],

  testDir: '.',
  outputDir: './test-results',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:5199',
    viewport: { width: 1024, height: 768 },
    actionTimeout: 10_000,
    video: 'retain-on-failure',
  },

  projects: [{ name: 'sync-integration', testMatch: /\.spec\.ts$/ }],
});
