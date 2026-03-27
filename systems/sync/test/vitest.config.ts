import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import { resolve } from 'path';

const SYNC_ROOT = resolve(__dirname, '..');

export default defineWorkersConfig({
  test: {
    globals: true,
    include: ['client/**/*.test.ts'],
    exclude: ['integration/**', 'worker/**', 'node_modules/**'],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        main: 'client/index.ts',
      },
    },
  },
  resolve: {
    alias: {
      '@plat/sync/client': resolve(SYNC_ROOT, 'ts/client/sync-client.ts'),
      '@plat/sync/adapters': resolve(SYNC_ROOT, 'ts/client/adapters.ts'),
      '@plat/sync/types': resolve(SYNC_ROOT, 'ts/shared/types.ts'),
      '@plat/sync/wasm-adapter': resolve(SYNC_ROOT, 'ts/shared/wasm-adapter.ts'),
      '@plat/sync/worker': resolve(SYNC_ROOT, 'ts/worker/index.ts'),
    },
  },
});
