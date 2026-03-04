import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [wasm(), tailwindcss()],
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  server: {
    port: 5173,
    proxy: {
      '/api/': { target: 'http://localhost:8789', changeOrigin: true },
      '/mcp': { target: 'http://localhost:8789', changeOrigin: true },
    },
  },
});
