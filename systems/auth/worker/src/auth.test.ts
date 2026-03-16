// systems/auth/worker/src/auth.test.ts
//
// Unit tests using better-auth's getTestInstance().
// Runs in Node with in-memory SQLite — no wrangler, no D1, no credentials needed.
//
// Run: bun x vitest run   (or: cd systems/auth/worker && npx vitest run)

import { describe, it, expect, beforeAll } from 'vitest';
import { getTestInstance } from 'better-auth/test';
import {
  twoFactor,
  magicLink,
  emailOTP,
  organization,
  admin,
  bearer,
  jwt,
  multiSession,
  anonymous,
  oneTimeToken,
  haveIBeenPwned,
} from 'better-auth/plugins';
import {
  twoFactorClient,
  organizationClient,
  adminClient,
  multiSessionClient,
  anonymousClient,
} from 'better-auth/client/plugins';
import { oauthProvider } from '@better-auth/oauth-provider';

// ── Shared instance ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let inst: any;

const USER = { email: 'joe@example.com', password: 'supersecret1234', name: 'Joe' };

beforeAll(async () => {
  inst = await getTestInstance(
    {
      plugins: [
        twoFactor(),
        magicLink({ sendMagicLink: async () => {} }),
        emailOTP({ sendVerificationOTP: async () => {} }),
        organization(),
        admin(),
        multiSession(),
        anonymous(),
        bearer(),
        jwt(),
        oauthProvider({ loginPage: '/auth/sign-in', consentPage: '/auth/consent' }),
        oneTimeToken(),
      ],
      emailAndPassword: { enabled: true },
    },
    {
      testWith: 'sqlite',
      disableTestUser: true,
      clientOptions: {
        plugins: [
          twoFactorClient(),
          organizationClient(),
          adminClient(),
          multiSessionClient(),
          anonymousClient(),
        ],
      },
    }
  );
  // Create test user once
  await inst.client.signUp.email(USER);
});

// ── Email + Password ──────────────────────────────────────────────────────────

describe('emailAndPassword', () => {
  it('sign-up creates a user', async () => {
    const res = await inst.client.signUp.email({
      email: 'new@example.com',
      password: 'password1234',
      name: 'New User',
    });
    expect(res.error).toBeNull();
    expect(res.data?.user.email).toBe('new@example.com');
  });

  it('sign-in returns token', async () => {
    const res = await inst.client.signIn.email(USER);
    expect(res.error).toBeNull();
    expect(res.data?.token).toBeTruthy();
  });

  it('sign-in rejects wrong password', async () => {
    const res = await inst.client.signIn.email({
      email: USER.email,
      password: 'wrongpassword',
    });
    expect(res.error).not.toBeNull();
    expect(res.error?.status).toBe(401);
  });

  it('sign-up rejects duplicate email', async () => {
    const res = await inst.client.signUp.email(USER);
    expect(res.error).not.toBeNull();
  });
});

// ── Session ───────────────────────────────────────────────────────────────────

describe('session', () => {
  it('get-session returns null when unauthenticated', async () => {
    const res = await inst.client.getSession();
    expect(res.data).toBeNull();
  });

  it('get-session returns user after sign-in', async () => {
    await inst.runWithUser(USER.email, USER.password, async (headers: Headers) => {
      const session = await inst.client.getSession({ fetchOptions: { headers } });
      expect(session.data?.user.email).toBe(USER.email);
    });
  });

  it('sign-out clears session', async () => {
    await inst.runWithUser(USER.email, USER.password, async (headers: Headers) => {
      const res = await inst.client.signOut({ fetchOptions: { headers } });
      expect(res.error).toBeNull();
    });
  });
});

// ── Magic Link ────────────────────────────────────────────────────────────────

describe('magicLink', () => {
  it('sends magic link without error', async () => {
    const res = await inst.client.signIn.magicLink({ email: USER.email });
    expect(res.error).toBeNull();
  });
});

// ── Email OTP ─────────────────────────────────────────────────────────────────

describe('emailOTP', () => {
  it('sends OTP without error', async () => {
    const res = await inst.client.emailOtp.sendVerificationOtp({
      email: USER.email,
      type: 'sign-in',
    });
    expect(res.error).toBeNull();
  });
});

// ── Bearer ────────────────────────────────────────────────────────────────────

describe('bearer', () => {
  it('session valid with bearer token', async () => {
    const signIn = await inst.client.signIn.email(USER);
    const token = signIn.data?.token;
    expect(token).toBeTruthy();

    const session = await inst.client.getSession({
      fetchOptions: { headers: { Authorization: `Bearer ${token}` } },
    });
    expect(session.data?.user.email).toBe(USER.email);
  });
});

// ── Anonymous ─────────────────────────────────────────────────────────────────

describe('anonymous', () => {
  it('creates an anonymous session', async () => {
    const res = await inst.client.signIn.anonymous();
    expect(res.error).toBeNull();
    expect(res.data?.user.isAnonymous).toBe(true);
  });
});

// ── Organization ──────────────────────────────────────────────────────────────

describe('organization', () => {
  it('creates an organization', async () => {
    await inst.runWithUser(USER.email, USER.password, async (headers: Headers) => {
      const res = await inst.client.organization.create(
        { name: 'Acme CAD', slug: 'acme-cad' },
        { fetchOptions: { headers } }
      );
      expect(res.error).toBeNull();
      expect(res.data?.name).toBe('Acme CAD');
    });
  });

  it('lists organizations for member', async () => {
    await inst.runWithUser(USER.email, USER.password, async (headers: Headers) => {
      const res = await inst.client.organization.list({ fetchOptions: { headers } });
      expect(res.error).toBeNull();
      expect(Array.isArray(res.data)).toBe(true);
    });
  });
});

// ── Two Factor ────────────────────────────────────────────────────────────────

describe('twoFactor', () => {
  it('enable 2FA returns TOTP URI', async () => {
    await inst.runWithUser(USER.email, USER.password, async (headers: Headers) => {
      const res = await inst.client.twoFactor.enable(
        { password: USER.password },
        { fetchOptions: { headers } }
      );
      expect(res.error).toBeNull();
      expect(res.data?.totpURI).toMatch(/^otpauth:\/\/totp\//);
    });
  });
});

// ── Admin ─────────────────────────────────────────────────────────────────────

describe('admin', () => {
  it('admin client plugin is registered', () => {
    expect(inst.client.admin).toBeDefined();
    expect(typeof inst.client.admin.listUsers).toBe('function');
  });
});

// ── Multi Session ─────────────────────────────────────────────────────────────

describe('multiSession', () => {
  it('lists active sessions', async () => {
    await inst.runWithUser(USER.email, USER.password, async (headers: Headers) => {
      const res = await inst.client.multiSession.listDeviceSessions({
        fetchOptions: { headers },
      });
      expect(res.error).toBeNull();
      expect(Array.isArray(res.data)).toBe(true);
    });
  });
});
