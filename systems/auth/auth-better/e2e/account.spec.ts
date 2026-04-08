// auth-better/e2e/account.spec.ts
//
// ADR-001 Phase 1 — account screens.
// Signs in via UI then navigates the browser to account pages.
// Tests cover: settings, security, sessions.

import { test, expect } from '@playwright/test';

const WORKER = process.env.WORKER_URL ?? 'http://localhost:8792';
const email = (label: string) => `${label}-${Date.now()}@test.dev`;

async function signInViaUI(page: any, e: string) {
  await page.goto('/auth/sign-in');
  await page.locator('input[name="email"], input[placeholder*="email" i], input[placeholder*="username" i]').first().fill(e);
  await page.getByRole('textbox', { name: /password/i }).fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/sign-in/);
}

// Uses native fetch (outside Playwright context) so session cookies from sign-up
// are never stored in the browser's cookie jar — works for both dev and wrangler mode.
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
  const res = await request.post(`${WORKER}/auth/migrate`);
  expect(res.ok()).toBeTruthy();
});

// ── Settings ──────────────────────────────────────────────────────────────────

test('account settings page renders', async ({ page }) => {
  const e = email('acct-settings');
  await createUser(e);
  await signInViaUI(page, e);

  await page.goto('/account/settings');
  // UpdateNameCard renders a "Name" input
  await expect(page.getByRole('textbox', { name: /^name$/i })).toBeVisible();
});

test('account settings — update name', async ({ page }) => {
  const e = email('acct-name');
  await createUser(e);
  await signInViaUI(page, e);

  await page.goto('/account/settings');
  const nameInput = page.getByRole('textbox', { name: /^name$/i });
  await nameInput.clear();
  await nameInput.fill('Updated Name');
  await page.locator('button[type="submit"]').first().click();
  // No error — form stays or shows success
  await expect(page.getByRole('textbox', { name: /^name$/i })).toBeVisible();
});

// ── Security ──────────────────────────────────────────────────────────────────

test('account security page renders change-password form', async ({ page }) => {
  const e = email('acct-security');
  await createUser(e);
  await signInViaUI(page, e);

  await page.goto('/account/security');
  // ChangePasswordCard heading
  await expect(page.getByText(/change password/i)).toBeVisible();
  // Sessions card heading (exact match to avoid strict mode violation)
  await expect(page.getByText('Sessions', { exact: true }).first()).toBeVisible();
});

// ── Nav ───────────────────────────────────────────────────────────────────────

test('account sidebar nav links to security', async ({ page }) => {
  const e = email('acct-nav');
  await createUser(e);
  await signInViaUI(page, e);

  await page.goto('/account/settings');
  // AccountView sidebar nav: Link wraps Button, click navigates to /account/security
  // On desktop the sidebar is visible; find the Security link by its text
  await page.getByRole('link', { name: /^security$/i }).first().click();
  await expect(page).toHaveURL(/security/);
});

test('account sessions list visible', async ({ page }) => {
  const e = email('acct-sessions');
  await createUser(e);
  await signInViaUI(page, e);
  await page.goto('/account/security');
  // SecuritySettingsCards includes SessionsCard
  await expect(page.getByText('Sessions', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  // At least one session row visible (current session)
  await expect(page.locator('[data-slot="card-content"]').first()).toBeVisible();
});
