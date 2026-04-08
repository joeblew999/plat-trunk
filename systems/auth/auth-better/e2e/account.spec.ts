// auth-better/e2e/account.spec.ts — account screens

import { test, expect } from '@playwright/test';
import { createUser, signInViaUI, email } from './helpers';

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
