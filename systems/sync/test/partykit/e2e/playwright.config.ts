import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 30000,
  retries: 0,
  use: {
    // Vite serves from test/partykit/ root, so e2e-index.html is at the root
    baseURL: 'http://localhost:5199',
    headless: true,
  },
  webServer: [
    {
      // Wrangler dev — real DO server on :1999
      command: 'cd .. && npx wrangler dev --port 1999',
      port: 1999,
      reuseExistingServer: true,
      timeout: 15000,
    },
    {
      // Vite dev — serves test/partykit/ on :5199
      command: 'npx vite --config vite.config.ts',
      port: 5199,
      reuseExistingServer: true,
      timeout: 10000,
    },
  ],
});
