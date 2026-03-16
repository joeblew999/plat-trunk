import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    globals: true,
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.toml',
        },
        main: 'src/index.ts',
        miniflare: {
          // Provide a stub AUTH service so tests run without auth-worker deployed
          serviceBindings: {
            AUTH: async () => new Response(JSON.stringify({ authenticated: false }), {
              status: 401,
              headers: { 'content-type': 'application/json' },
            }),
          },
        },
      },
    },
  },
});
