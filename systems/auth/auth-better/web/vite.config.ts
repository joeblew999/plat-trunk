import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Only proxy /auth/api/* to the worker — NOT /auth/sign-in, /auth/sign-up etc.
// Those are client-side SPA routes that Vite must serve as index.html.
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5174,
    proxy: {
      '/auth/api': {
        target: 'http://localhost:8792',
        changeOrigin: true,
      },
    },
  },
});
