import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8788';
const IS_SLOW = !!process.env.SLOW;

// Repo root — two levels up from systems/truck/e2e/
const REPO_ROOT = path.resolve(__dirname, '../../..');

// WebGPU requires specific Chrome flags on macOS
const WEBGPU_ARGS = [
  '--enable-unsafe-webgpu',
  '--enable-features=Vulkan',
  '--use-angle=metal',             // macOS Metal backend
  '--disable-dawn-features=disallow_unsafe_apis',
];

// Shared browser config: headed Chrome with WebGPU enabled
const chromeWithWebGPU = {
  ...devices['Desktop Chrome'],
  channel: 'chrome' as const,
  headless: false,
  launchOptions: {
    args: WEBGPU_ARGS,
  },
};

export default defineConfig({
  // Auto-start the full dev stack if not already running.
  // reuseExistingServer: developer has `bun run dev` running → Playwright skips start.
  // Cold start: builds WASM + starts router + truck-cad + Vite (allow 3 min).
  // Skip local dev server when BASE_URL points to a remote host (e.g. CF preview URL).
  // Set BASE_URL=https://... and webServer is not started.
  webServer: BASE_URL.startsWith('http://localhost') ? {
    command: 'bun run dev',
    cwd: REPO_ROOT,
    url: 'http://localhost:8788/api/health',  // via router → confirms full routing chain ready
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  } : undefined,

  testDir: '.',
  outputDir: './test-results',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false, // run serial to avoid overwhelming wrangler dev
  workers: 1,           // single worker for stability
  retries: 0,           // ADR-0026: deterministic tests don't need retries
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10_000,
    screenshot: 'off', // we take manual screenshots for docs
    video: IS_SLOW ? 'on' : 'retain-on-failure',
  },

  projects: [
    {
      name: 'e2e',
      testMatch: ['cad.spec.ts', 'sketch.spec.ts', 'actors.spec.ts', 'bim.spec.ts', 'tier.spec.ts', 'health.spec.ts'],
      testIgnore: [/cross-tab-sync\.spec\.ts/, /cad-ui\.spec\.ts/],
      use: chromeWithWebGPU,
    },
    {
      // UI interaction tests — toolbar clicks, outliner, canvas, data-testid selectors
      name: 'ui',
      testMatch: /cad-ui\.spec\.ts/,
      use: chromeWithWebGPU,
    },
    {
      // Cross-tab sync — must run alone (broadcasts interfere)
      name: 'sync',
      testMatch: /cross-tab-sync\.spec\.ts/,
      use: chromeWithWebGPU,
    },
  ],
});
