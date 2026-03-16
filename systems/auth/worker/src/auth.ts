// systems/auth/worker/src/auth.ts
//
// Base better-auth v1.5 — no better-auth-cloudflare wrapper.
// D1 passed directly (first-class support since v1.5).
// KV used as secondary storage for session caching.
//
// One auth instance per request via createAuth(env) factory.
// Never create a singleton — D1 bindings are request-scoped in CF Workers.
//
// Plugins included:
//   twoFactor     — TOTP for secure accounts
//   magicLink     — passwordless sign-in via email
//   emailOTP      — one-time password via email
//   organization  — multi-tenant teams (sharing CAD models)
//   admin         — user management, ban/unban
//   multiSession  — multiple devices per user
//   anonymous     — guest sessions → upgrade to full account
//   bearer        — Bearer token auth for MCP + API clients
//   jwt           — stateless tokens
//   oauthProvider — full OAuth 2.1 server (MCP agent auth)
//
// Plugins requiring separate packages (add when ready):
//   passkey  → @better-auth/passkey  (WebAuthn)
//   apiKey   → @better-auth/api-key  (API key management)

import { betterAuth } from 'better-auth';
import {
  twoFactor,
  magicLink,
  organization,
  admin,
  bearer,
  jwt,
  multiSession,
  anonymous,
  emailOTP,
} from 'better-auth/plugins';
import { oauthProvider } from '@better-auth/oauth-provider';

export type CloudflareBindings = {
  AUTH_DB: D1Database;
  AUTH_KV: KVNamespace;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
};

export function createAuth(env: CloudflareBindings) {
  return betterAuth({
    // D1 binding — first-class support in better-auth v1.5
    database: env.AUTH_DB,

    baseURL: env.BETTER_AUTH_URL,
    basePath: '/auth/api',
    secret: env.BETTER_AUTH_SECRET,

    trustedOrigins: [
      'http://localhost:8788',
      'http://localhost:5174',
      'https://cad.ubuntusoftware.net',
    ],

    // KV as secondary storage — session cache + rate limiting
    secondaryStorage: {
      get: async (key) => {
        const val = await env.AUTH_KV.get(key);
        return val ? JSON.parse(val) : null;
      },
      set: async (key, value, ttl) => {
        await env.AUTH_KV.put(key, JSON.stringify(value), {
          expirationTtl: ttl ?? 86400,
        });
      },
      delete: async (key) => {
        await env.AUTH_KV.delete(key);
      },
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },

    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        // TODO: wire Cloudflare Email Routing or Resend
        console.log(`[auth] verify: ${user.email} → ${url}`);
      },
    },

    socialProviders: {
      google: {
        clientId: (env as any).GOOGLE_CLIENT_ID ?? '',
        clientSecret: (env as any).GOOGLE_CLIENT_SECRET ?? '',
      },
      github: {
        clientId: (env as any).GITHUB_CLIENT_ID ?? '',
        clientSecret: (env as any).GITHUB_CLIENT_SECRET ?? '',
      },
    },

    plugins: [
      // ── Multi-factor ──────────────────────────────────────────
      twoFactor(),

      // ── Passwordless ──────────────────────────────────────────
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          console.log(`[auth] magic link: ${email} → ${url}`);
        },
      }),
      emailOTP({
        sendVerificationOTP: async ({ email, otp }) => {
          console.log(`[auth] OTP: ${email} → ${otp}`);
        },
      }),

      // ── Multi-tenant ──────────────────────────────────────────
      // Teams sharing CAD models — critical for collaboration
      organization(),

      // ── Access control ────────────────────────────────────────
      admin(),
      multiSession(),
      anonymous(),

      // ── API / agent access ────────────────────────────────────
      // MCP clients + service-to-service calls
      bearer(),
      jwt(),

      // ── OAuth 2.1 provider ────────────────────────────────────
      // Turns this auth worker into a full OAuth 2.1 server.
      // MCP agents authenticate against your CAD platform via this.
      oauthProvider({
        loginPage: '/auth/sign-in',
        consentPage: '/auth/consent',
      }),
    ],
  });
}
