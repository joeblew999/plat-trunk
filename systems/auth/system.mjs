// systems/auth/system.mjs — auth system config.
// better-auth-cloudflare on Hono, backed by D1 + KV.
// Serves auth API at /auth/* and static web UI from systems/auth/web/dist.

const AUTH_PORT      = parseInt(process.env.AUTH_PORT      ?? '8790');
const AUTH_INSPECTOR  = parseInt(process.env.AUTH_INSPECTOR  ?? '9231');
const AUTH_WEB_PORT   = parseInt(process.env.AUTH_WEB_PORT   ?? '5174');

export const workers = [
  { name: 'auth-worker', dir: 'systems/auth/worker', port: AUTH_PORT, inspectorPort: AUTH_INSPECTOR },
];

export const devServers = [
  { name: 'auth-web', command: 'cd systems/auth/web && bun x vite', port: AUTH_WEB_PORT },
];

// Build pipeline config — consumed by scripts/build.mjs.
export const building = {
  name: 'auth',
  order: 1,
  steps: [
    { name: 'web', command: 'cd systems/auth/web && bun install && bun run build' },
  ],
};

// Test pipeline config — consumed by scripts/test.mjs.
export const testing = {
  name: 'auth',
  vitest: 'cd systems/auth/worker && bun x vitest run',
};

export const testFiles = {
  vitest: [
    { file: 'systems/auth/worker/src/auth.test.ts', covers: 'Auth routes: sign-in, sign-up, session, sign-out' },
  ],
};
