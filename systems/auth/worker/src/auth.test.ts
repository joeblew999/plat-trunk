// systems/auth/worker/src/auth.test.ts
// Auth route contract tests — verifies the worker responds correctly
// to sign-in, sign-up, session, and health endpoints.
//
// These run inside a real Worker via vitest-pool-workers (wrangler.toml bindings active).

import { describe, it, expect } from 'vitest';
import worker from './index';
import { env } from 'cloudflare:test';

const BASE = 'http://localhost';

function req(path: string, options?: RequestInit) {
  return new Request(`${BASE}${path}`, options);
}

describe('health', () => {
  it('GET /auth/health returns ok', async () => {
    const res = await worker.fetch(req('/auth/health'), env, {} as ExecutionContext);
    expect(res.status).toBe(200);
    const body = await res.json<{ ok: boolean; service: string }>();
    expect(body.ok).toBe(true);
    expect(body.service).toBe('auth-worker');
  });
});

describe('session', () => {
  it('GET /auth/api/get-session returns null session when unauthenticated', async () => {
    const res = await worker.fetch(req('/auth/api/get-session'), env, {} as ExecutionContext);
    // better-auth returns 200 with null session, or 401 — both are valid unauthenticated responses
    expect([200, 401]).toContain(res.status);
  });
});

describe('sign-up', () => {
  it('POST /auth/api/sign-up/email rejects missing fields', async () => {
    const res = await worker.fetch(
      req('/auth/api/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bad' }), // missing name + password
      }),
      env,
      {} as ExecutionContext
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('sign-in', () => {
  it('POST /auth/api/sign-in/email rejects unknown user', async () => {
    const res = await worker.fetch(
      req('/auth/api/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong' }),
      }),
      env,
      {} as ExecutionContext
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('routing', () => {
  it('GET /auth redirects to /auth/sign-in', async () => {
    const res = await worker.fetch(req('/auth'), env, {} as ExecutionContext);
    expect([301, 302]).toContain(res.status);
    expect(res.headers.get('location')).toContain('/auth/sign-in');
  });
});
