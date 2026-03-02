import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [wasm(), tailwindcss()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      // datastar.js lives in public/ and is served at /datastar.js — don't bundle it
      external: ['/datastar.js'],
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8789', changeOrigin: true },
      '/mcp': { target: 'http://localhost:8789', changeOrigin: true },
    },
  },
  optimizeDeps: { exclude: ['@automerge/automerge-wasm'] },
});
