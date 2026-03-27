import { defineConfig } from 'vite';
import path from 'path';

const parentDir = path.resolve(__dirname, '..');
const nm = (pkg: string) => path.resolve(parentDir, 'node_modules', pkg);

export default defineConfig({
  root: parentDir,
  server: {
    port: 5199,
    strictPort: true,
    fs: {
      allow: [path.resolve(parentDir, '../../../')],
    },
  },
  resolve: {
    alias: {
      '@automerge/automerge-repo': nm('@automerge/automerge-repo'),
      '@automerge/automerge/slim': path.resolve(parentDir, 'node_modules/@automerge/automerge/dist/mjs/entrypoints/slim.js'),
      '@automerge/automerge': nm('@automerge/automerge'),
      'cborg': nm('cborg'),
    },
  },
});
