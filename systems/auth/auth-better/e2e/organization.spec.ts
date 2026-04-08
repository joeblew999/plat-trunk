// auth-better/e2e/organization.spec.ts
//
// ADR-001 Phase 1 — organization screens.
// Tests cover: organizations list in account, create org via UI, org settings.

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
  const res = await request.post(`${WORKER}/auth/migrate`);
  expect(res.ok()).toBeTruthy();
});

// ── Organizations list ────────────────────────────────────────────────────────

test('account organizations tab renders create button', async ({ page }) => {
  const e = email('org-list');
  await createUser(e);
  await signInViaUI(page, e);

  await page.goto('/account/organizations');
  // OrganizationsCard renders a "Create Organization" button when no orgs exist
  await expect(page.getByRole('button', { name: /create organization/i })).toBeVisible({ timeout: 10000 });
});

// ── Create organization ───────────────────────────────────────────────────────

test('create organization via UI then navigate to org view', async ({ page }) => {
  const e = email('org-create');
  await createUser(e);
  await signInViaUI(page, e);

  await page.goto('/account/organizations');
  await page.getByRole('button', { name: /create organization/i }).click();

  // Dialog opens
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  const ts = Date.now();
  await page.getByRole('textbox', { name: /^name$/i }).fill(`TestOrg-${ts}`);
  await page.getByRole('textbox', { name: /slug/i }).fill(`testorg-${ts}`);
  await page.locator('button[type="submit"]').click();

  // Dialog closes — setActive is called internally. Navigate to org view.
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 });
  await page.goto('/organization');

  // OrganizationView with active org shows Settings + Members nav
  await expect(page.getByText('Members', { exact: true })).toBeVisible({ timeout: 10000 });
});

test('org members tab renders after org created', async ({ page }) => {
  const e = email('org-members');
  await createUser(e);
  await signInViaUI(page, e);

  // Create org via UI
  await page.goto('/account/organizations');
  await page.getByRole('button', { name: /create organization/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  const ts = Date.now();
  await page.getByRole('textbox', { name: /^name$/i }).fill(`OrgM-${ts}`);
  await page.getByRole('textbox', { name: /slug/i }).fill(`orgm-${ts}`);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 });

  // Navigate to members tab — URL must stay on /members (not redirect away = no active org)
  await page.goto('/organization/members');
  await expect(page).toHaveURL(/members/, { timeout: 10000 });
  // Desktop sidebar link for Members is visible (not the hidden mobile label)
  await expect(page.getByRole('link', { name: /^members$/i }).first()).toBeVisible({ timeout: 10000 });
});

// ── Org settings ──────────────────────────────────────────────────────────────

test('org settings page shows name card', async ({ page }) => {
  const e = email('org-settings');
  await createUser(e);
  await signInViaUI(page, e);

  // Create org via UI
  await page.goto('/account/organizations');
  await page.getByRole('button', { name: /create organization/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  const ts2 = Date.now();
  await page.getByRole('textbox', { name: /^name$/i }).fill(`Org-${ts2}`);
  await page.getByRole('textbox', { name: /slug/i }).fill(`org-${ts2}`);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 });

  // Navigate to org settings
  await page.goto('/organization/settings');
  // OrganizationSettingsCards includes OrganizationNameCard
  await expect(page.getByText(/organization/i).first()).toBeVisible({ timeout: 10000 });
});
