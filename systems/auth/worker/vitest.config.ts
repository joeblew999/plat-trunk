import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['default', 'module', 'import'],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts'],
  },
});
