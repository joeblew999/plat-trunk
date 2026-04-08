// auth-better/e2e/helpers.ts
//
// Single source of truth for test helpers and URL config.
// All spec files import from here — nothing is duplicated.
//
// URL resolution order (most → least specific):
//   1. WORKER_URL / WEB_URL env vars  (set by mise tasks for wrangler/prod modes)
//   2. AUTH_BETTER_PORT / AUTH_BETTER_WEB_PORT  (set by mise.toml [env] for local dev)
//   3. Hardcoded fallbacks              (only if running outside mise)

import { expect } from '@playwright/test';

export const WORKER_URL =
  process.env.WORKER_URL ??
  `http://127.0.0.1:${process.env.AUTH_BETTER_PORT ?? '8792'}`;

export const email = (label: string) => `${label}-${Date.now()}@test.dev`;

// Creates a user via window.authClient in the browser — same origin, real auth
// client, no CSRF hacks. Matches the pattern in better-auth's own e2e tests.
// Signs out afterwards so the browser starts unauthenticated for the actual test.
export async function createUser(page: any, e: string) {
  await page.goto('/');
  const err = await page.evaluate(async (creds: any) => {
    const res = await (window as any).authClient.signUp.email(creds);
    return res.error ?? null;
  }, { email: e, password: 'Password123!', name: 'Test User' });
  if (err) throw new Error(`createUser failed: ${JSON.stringify(err)}`);
  await page.evaluate(async () => (window as any).authClient.signOut());
}

export async function signInViaUI(page: any, e: string) {
  await page.goto('/auth/sign-in');
  await page.locator('input[name="email"], input[placeholder*="email" i], input[placeholder*="username" i]').first().fill(e);
  await page.getByRole('textbox', { name: /password/i }).fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/sign-in/);
}
