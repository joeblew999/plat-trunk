// systems/auth/system.mjs — auth system config.
//
// Identity (better-auth) + permissions (zanzojs) + filesystem (@cloudflare/shell).
// SSR only — no Vite, no web build step. Worker serves all pages directly.
// Tests run via Playwright (e2e/), not vitest.

const AUTH_PORT      = parseInt(process.env.AUTH_PORT      ?? '8790');
const AUTH_INSPECTOR = parseInt(process.env.AUTH_INSPECTOR ?? '9231');

export const workers = [
  { name: 'auth-worker', dir: 'systems/auth/worker', port: AUTH_PORT, inspectorPort: AUTH_INSPECTOR },
];

// No devServers — auth UI is server-side rendered, no Vite dev server needed.
export const devServers = [];

// Build pipeline config — consumed by scripts/build.mjs.
// Auth worker is SSR + pure TS — only step is typecheck.
export const building = {
  name: 'auth',
  order: 1,
  steps: [
    { name: 'typecheck', command: 'cd systems/auth/worker && bun run typecheck' },
  ],
};

// Test pipeline config — consumed by scripts/test.mjs.
// Auth uses Playwright e2e (mise run test:e2e), not vitest.
// typecheck is covered in the build pipeline above.
export const testing = {
  name: 'auth',
  typecheck: 'cd systems/auth/worker && bun run typecheck',
  vitest: null,   // no vitest — tests are Playwright e2e
};

// No testFiles — auth tests live in e2e/auth.spec.ts (Playwright, not vitest).
export const testFiles = {};
