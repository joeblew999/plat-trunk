// auth-better/e2e/account.spec.ts
//
// ADR-001 Phase 1 — account screens.
// Signs in via UI then navigates the browser to account pages.
// Tests cover: settings, security, sessions.
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

// ── Settings ──────────────────────────────────────────────────────────────────

test('account settings page renders', async ({ page }) => {
  const e = email('acct-settings');
  await createUser(page, e);
  await signInViaUI(page, e);
  await page.goto('/account/settings');
  await expect(page.getByRole('textbox', { name: /^name$/i })).toBeVisible();
});

test('account settings — update name', async ({ page }) => {
  const e = email('acct-name');
  await createUser(page, e);
  await signInViaUI(page, e);
  await page.goto('/account/settings');
  const nameInput = page.getByRole('textbox', { name: /^name$/i });
  await nameInput.clear();
  await nameInput.fill('Updated Name');
  await page.locator('button[type="submit"]').first().click();
  await expect(page.getByRole('textbox', { name: /^name$/i })).toBeVisible();
});

// ── Security ──────────────────────────────────────────────────────────────────

test('account security page renders change-password form', async ({ page }) => {
  const e = email('acct-security');
  await createUser(page, e);
  await signInViaUI(page, e);
  await page.goto('/account/security');
  await expect(page.getByText(/change password/i)).toBeVisible();
  await expect(page.getByText('Sessions', { exact: true }).first()).toBeVisible();
});

// ── Nav ───────────────────────────────────────────────────────────────────────

test('account sidebar nav links to security', async ({ page }) => {
  const e = email('acct-nav');
  await createUser(page, e);
  await signInViaUI(page, e);
  await page.goto('/account/settings');
  await page.getByRole('link', { name: /^security$/i }).first().click();
  await expect(page).toHaveURL(/security/);
});

test('account sessions list visible', async ({ page }) => {
  const e = email('acct-sessions');
  await createUser(page, e);
  await signInViaUI(page, e);
  await page.goto('/account/security');
  await expect(page.getByText('Sessions', { exact: true }).first()).toBeVisible();
  await expect(page.locator('[data-slot="card-content"]').first()).toBeVisible();
});
