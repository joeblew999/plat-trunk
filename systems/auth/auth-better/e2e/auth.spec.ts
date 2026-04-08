// auth-better/e2e/auth.spec.ts — auth flows

import { test, expect } from '@playwright/test';
import { createUser, signInViaUI, email } from './helpers';

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

// ── Forgot / reset password ───────────────────────────────────────────────────

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
