import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { readdirSync, statSync, existsSync } from 'fs';

// Discover first-party plugin public dirs and map them to /plugins/{name}/
// e.g. systems/plugins/howick/public/ → /plugins/howick/
function pluginPublicDirs(): Record<string, string> {
  const pluginsRoot = resolve(__dirname, '../../plugins');
  if (!existsSync(pluginsRoot)) return {};
  return Object.fromEntries(
    readdirSync(pluginsRoot)
      .filter(name => {
        const p = resolve(pluginsRoot, name);
        return statSync(p).isDirectory() && existsSync(resolve(p, 'public'));
      })
      .map(name => [`/plugins/${name}/`, resolve(pluginsRoot, name, 'public')])
  );
}

const pluginDirs = pluginPublicDirs();

export default defineConfig({
  plugins: [
    wasm(),
    tailwindcss(),
    // Serve each plugin's public/ dir at /plugins/{name}/ in dev
    {
      name: 'plugin-static',
      configureServer(server) {
        for (const [urlPath, fsPath] of Object.entries(pluginDirs)) {
          server.middlewares.use(urlPath, (req, res, next) => {
            // Strip the url prefix and serve from fsPath
            const { createReadStream } = require('fs');
            const { join, extname } = require('path');
            const filePath = join(fsPath, req.url ?? '/');
            if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
              return next();
            }
            const mime: Record<string, string> = {
              '.js': 'application/javascript',
              '.wasm': 'application/wasm',
              '.json': 'application/json',
              '.html': 'text/html',
              '.css': 'text/css',
            };
            res.setHeader('Content-Type', mime[extname(filePath)] ?? 'application/octet-stream');
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            createReadStream(filePath).pipe(res);
          });
        }
      },
    },
  ],
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
