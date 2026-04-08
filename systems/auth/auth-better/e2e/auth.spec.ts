// auth-better/e2e/auth.spec.ts
//
// Phase 1 auth flows — real browser, real better-auth backend.
// No mocking. Every test uses a unique email to avoid state collisions.
//
// createUser() calls window.authClient.signUp.email() via page.evaluate —
// same origin, real browser context, no CSRF hacks.

import { test, expect } from '@playwright/test';

const email = (label: string) => `${label}-${Date.now()}@test.dev`;

async function createUser(page: any, e: string) {
  await page.goto('/');
  const err = await page.evaluate(async (creds: any) => {
    const res = await (window as any).authClient.signUp.email(creds);
    return res.error ?? null;
  }, { email: e, password: 'Password123!', name: 'Test User' });
  if (err) throw new Error(`createUser failed: ${JSON.stringify(err)}`);
  // Sign out so the browser starts unauthenticated for the actual test
  await page.evaluate(async () => (window as any).authClient.signOut());
}

async function signInViaUI(page: any, e: string) {
  await page.goto('/auth/sign-in');
  await page.locator('input[name="email"], input[placeholder*="email" i], input[placeholder*="username" i]').first().fill(e);
  await page.getByRole('textbox', { name: /password/i }).fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/sign-in/);
}

test.beforeAll(async ({ request }) => {
  const WORKER = process.env.WORKER_URL ?? 'http://127.0.0.1:8792';
  const res = await request.post(`${WORKER}/auth/migrate`);
  expect(res.ok()).toBeTruthy();
});

// ── Sign-up ───────────────────────────────────────────────────────────────────

test('sign-up with email + password', async ({ page }) => {
  const e = email('signup');
  await page.goto('/auth/sign-up');
  await page.locator('input[name="name"]').fill('Test User');
  await page.locator('input[name="email"]').fill(e);
  await page.getByRole('textbox', { name: /password/i }).first().fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/sign-up/);
});

// ── Sign-in ───────────────────────────────────────────────────────────────────

test('sign-in with email + password', async ({ page }) => {
  const e = email('signin');
  await createUser(page, e);
  await signInViaUI(page, e);
});

// ── Sign-out ──────────────────────────────────────────────────────────────────

test('sign-out', async ({ page }) => {
  const e = email('signout');
  await createUser(page, e);
  await signInViaUI(page, e);
  await page.goto('/auth/sign-out');
  await expect(page).toHaveURL(/sign-in/);
});

// ── Forgot password ───────────────────────────────────────────────────────────

test('forgot password screen renders', async ({ page }) => {
  await page.goto('/auth/forgot-password');
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

test('reset password page renders', async ({ page }) => {
  await page.goto('/auth/reset-password');
  await expect(page.getByRole('textbox', { name: /password/i }).first()).toBeVisible();
});

test('UserButton visible in nav when signed in', async ({ page }) => {
  const e = email('userbutton');
  await createUser(page, e);
  await signInViaUI(page, e);
  await expect(page.locator('header').getByRole('button').first()).toBeVisible();
});
