import fs from 'fs';
import { type Page, type APIRequestContext, expect } from '@playwright/test';
import { ACCOUNTS, type SeededState } from './fixtures';

export const WORKER = process.env.WORKER_URL || 'http://localhost:8790';

// ── Seeded accounts ───────────────────────────────────────────────────────────
// Credentials from fixtures.ts — same source as global-setup.ts

export const ADMIN = ACCOUNTS.admin;
export const USER  = ACCOUNTS.user;

// ── Seeded state (actor IDs resolved by global-setup) ─────────────────────────

export function getSeededState(): SeededState {
  const path = '/tmp/auth-seed-state.json';
  if (!fs.existsSync(path)) {
    throw new Error(`Seed state not found at ${path}. Run globalSetup first.`);
  }
  return JSON.parse(fs.readFileSync(path, 'utf8')) as SeededState;
}

// ── Safe JSON parse ───────────────────────────────────────────────────────────

async function safeJson(res: Response | { status(): number; text(): Promise<string> }) {
  const text = await res.text();
  const status = typeof (res as any).status === 'function'
    ? (res as any).status()
    : (res as Response).status;
  try { return { status, body: text ? JSON.parse(text) : {} }; }
  catch { return { status, body: { raw: text } }; }
}

// ── API helpers ───────────────────────────────────────────────────────────────

/**
 * Sign up via native fetch.
 * Uses fetch() not request.post() — Playwright 1.59+ has a bug where SameSite=Lax
 * cookies returned by POST endpoints cause "cannot be parsed as a URL" errors.
 * Origin header required — better-auth CSRF check validates against trustedOrigins.
 */
export async function apiSignUp(
  _request: APIRequestContext | null,
  email: string, password: string, name: string,
) {
  const res = await fetch(`${WORKER}/auth/api/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': WORKER },
    body: JSON.stringify({ email, password, name }),
  });
  return safeJson(res);
}

/**
 * Sign in via API. Sets the session cookie in the request context.
 * When called via page.request, the cookie is shared with the browser page.
 */
export async function apiSignIn(
  request: APIRequestContext,
  email: string, password: string,
) {
  const res = await request.post(`${WORKER}/auth/api/sign-in/email`, {
    data: { email, password },
  });
  return safeJson(res);
}

export async function apiGrantPermission(
  request: APIRequestContext,
  subject: string, relation: string, type: string, id: string,
) {
  const res = await request.put(`${WORKER}/zano/grant`, {
    data: { subject, relation, type, id },
  });
  return safeJson(res);
}

export async function apiCheckPermission(
  request: APIRequestContext,
  actor: string, action: string, type: string, id: string,
) {
  const res = await request.get(
    `${WORKER}/zano/check?actor=${encodeURIComponent(actor)}&action=${action}&type=${type}&id=${encodeURIComponent(id)}`,
  );
  return safeJson(res);
}

// ── Browser helpers ───────────────────────────────────────────────────────────

export async function waitForPage(page: Page) {
  await page.locator('#authForm').waitFor({ state: 'visible', timeout: 10_000 });
}

export async function fillInput(page: Page, selector: string, value: string) {
  const el = page.locator(selector);
  await el.waitFor({ state: 'visible' });
  await el.fill(value);
  await expect(el).toHaveValue(value);
}

export async function uiSignIn(page: Page, email: string, password: string) {
  await page.goto('/auth/sign-in');
  await waitForPage(page);
  await fillInput(page, '#email', email);
  await fillInput(page, '#password', password);
  await page.locator('#submitBtn').click();
  await page.waitForURL('**/auth/demo', { timeout: 15_000 });
}

export async function apiSignInAndNavigate(
  page: Page,
  email: string, password: string,
  targetPath = '/auth/demo',
) {
  const { status } = await apiSignIn(page.request, email, password);
  if (status !== 200) throw new Error(`Sign-in failed (${status})`);
  await page.goto(targetPath);
}
