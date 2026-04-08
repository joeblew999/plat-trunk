// auth-better/e2e/organization.spec.ts
//
// ADR-001 Phase 1 — organization screens.
// Tests cover: organizations list in account, create org via UI, org settings.
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

// ── Organizations list ────────────────────────────────────────────────────────

test('account organizations tab renders create button', async ({ page }) => {
  const e = email('org-list');
  await createUser(page, e);
  await signInViaUI(page, e);
  await page.goto('/account/organizations');
  await expect(page.getByRole('button', { name: /create organization/i })).toBeVisible();
});

// ── Create organization ───────────────────────────────────────────────────────

test('create organization via UI then navigate to org view', async ({ page }) => {
  const e = email('org-create');
  await createUser(page, e);
  await signInViaUI(page, e);

  await page.goto('/account/organizations');
  await page.getByRole('button', { name: /create organization/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const ts = Date.now();
  await page.getByRole('textbox', { name: /^name$/i }).fill(`TestOrg-${ts}`);
  await page.getByRole('textbox', { name: /slug/i }).fill(`testorg-${ts}`);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/organization');
  await expect(page.getByText('Members', { exact: true })).toBeVisible();
});

test('org members tab renders after org created', async ({ page }) => {
  const e = email('org-members');
  await createUser(page, e);
  await signInViaUI(page, e);

  await page.goto('/account/organizations');
  await page.getByRole('button', { name: /create organization/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const ts = Date.now();
  await page.getByRole('textbox', { name: /^name$/i }).fill(`OrgM-${ts}`);
  await page.getByRole('textbox', { name: /slug/i }).fill(`orgm-${ts}`);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  await page.goto('/organization/members');
  await expect(page).toHaveURL(/members/);
  await expect(page.getByRole('link', { name: /^members$/i }).first()).toBeVisible();
});

// ── Org settings ──────────────────────────────────────────────────────────────

test('org settings page shows name card', async ({ page }) => {
  const e = email('org-settings');
  await createUser(page, e);
  await signInViaUI(page, e);

  await page.goto('/account/organizations');
  await page.getByRole('button', { name: /create organization/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const ts = Date.now();
  await page.getByRole('textbox', { name: /^name$/i }).fill(`Org-${ts}`);
  await page.getByRole('textbox', { name: /slug/i }).fill(`org-${ts}`);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  await page.goto('/organization/settings');
  await expect(page.getByText(/organization/i).first()).toBeVisible();
});
