import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      input: {
        'sign-in':        'sign-in.html',
        'sign-up':        'sign-up.html',
        'reset-password': 'reset-password.html',
        'verify-email':   'verify-email.html',
        'consent':        'consent.html',
      },
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/auth/api/': { target: 'http://localhost:8790', changeOrigin: true },
    },
  },
});
