// auth-better/e2e/auth.spec.ts
//
// Phase 1 auth flows — real browser, real better-auth backend.
// No mocking. Every test uses a unique email to avoid state collisions.

import { test, expect } from '@playwright/test';

const WORKER = process.env.WORKER_URL ?? 'http://localhost:8792';

const email = (label: string) => `${label}-${Date.now()}@test.dev`;

// Isolated context — does not share cookie storage with the browser page.
// Using the shared `request` fixture leaks session cookies into the browser
// (same-origin in wrangler mode), causing sign-in to redirect before the form renders.
async function createUser(e: string) {
  const url = `${WORKER}/auth/api/sign-up/email`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': WORKER },
    body: JSON.stringify({ email: e, password: 'Password123!', name: 'Test User' }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '<no body>');
    throw new Error(`createUser failed: ${res.status} ${url} — ${body}`);
  }
}

test.beforeAll(async ({ request }) => {
  // Ensure DB is migrated before running tests
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
  // After sign-up: redirected away from sign-up page
  await expect(page).not.toHaveURL(/sign-up/);
});

// ── Sign-in ───────────────────────────────────────────────────────────────────

test('sign-in with email + password', async ({ page }) => {
  const e = email('signin');
  await createUser(e);

  await page.goto('/auth/sign-in');
  await page.locator('input[name="email"], input[placeholder*="email" i], input[placeholder*="username" i]').first().fill(e);
  await page.getByRole('textbox', { name: /password/i }).fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/sign-in/);
});

// ── Sign-out ──────────────────────────────────────────────────────────────────

test('sign-out', async ({ page }) => {
  const e = email('signout');
  await createUser(e);

  await page.goto('/auth/sign-in');
  await page.locator('input[name="email"], input[placeholder*="email" i], input[placeholder*="username" i]').first().fill(e);
  await page.getByRole('textbox', { name: /password/i }).fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/sign-in/);

  // UserButton sign-out link navigates to /auth/sign-out which calls authClient.signOut()
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
  await createUser(e);
  await page.goto('/auth/sign-in');
  await page.locator('input[name="email"], input[placeholder*="email" i], input[placeholder*="username" i]').first().fill(e);
  await page.getByRole('textbox', { name: /password/i }).fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/sign-in/);
  // UserButton renders as an avatar button in the nav
  await expect(page.locator('header').getByRole('button').first()).toBeVisible();
});
