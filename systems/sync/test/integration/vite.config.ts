import { defineConfig } from 'vite';
import { resolve } from 'path';

const SYNC_ROOT = resolve(__dirname, '../..');

export default defineConfig({
  resolve: {
    alias: {
      '@plat/sync/client': resolve(SYNC_ROOT, 'ts/client/sync-client.ts'),
      '@plat/sync/adapters': resolve(SYNC_ROOT, 'ts/client/adapters.ts'),
      '@plat/sync/types': resolve(SYNC_ROOT, 'ts/shared/types.ts'),
      '@plat/sync/wasm-adapter': resolve(SYNC_ROOT, 'ts/shared/wasm-adapter.ts'),
      '@plat/sync/worker': resolve(SYNC_ROOT, 'ts/worker/index.ts'),
    },
  },
  server: {
    port: 5199,
    fs: { allow: [SYNC_ROOT] },
    proxy: {
      '/api': { target: 'http://localhost:5198', changeOrigin: true },
    },
  },
});
