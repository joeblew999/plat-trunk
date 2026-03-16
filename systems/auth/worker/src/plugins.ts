// systems/auth/worker/src/plugins.ts
//
// Feature flags for better-auth plugins.
// Comment out a plugin to disable it — schema auto-updates on next POST /auth/migrate.
//
// When enabling a new plugin:
//   1. Uncomment it here
//   2. Install any required package (see note on each plugin)
//   3. POST /auth/migrate  — adds new tables/fields automatically
//   4. bun run auth:generate  (MacBook) — regenerates Drizzle schema if using it
//
// When disabling a plugin:
//   1. Comment it out here
//   2. Old tables stay in D1 (harmless) — no migration needed

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
} from 'better-auth/plugins';
import { oauthProvider } from '@better-auth/oauth-provider';

// ─── Social Providers ────────────────────────────────────────────────────────
// Uncomment + add env vars to enable. Each needs clientId + clientSecret.
// Add to wrangler.toml [vars] and set via wrangler secret put for prod.
export const SOCIAL_PROVIDERS = {
  // google: {
  //   clientId: '',      // GOOGLE_CLIENT_ID
  //   clientSecret: '',  // GOOGLE_CLIENT_SECRET
  // },
  // github: {
  //   clientId: '',      // GITHUB_CLIENT_ID
  //   clientSecret: '',  // GITHUB_CLIENT_SECRET
  // },
  // discord: {
  //   clientId: '',      // DISCORD_CLIENT_ID
  //   clientSecret: '',  // DISCORD_CLIENT_SECRET
  // },
  // microsoft: {
  //   clientId: '',      // MICROSOFT_CLIENT_ID
  //   clientSecret: '',  // MICROSOFT_CLIENT_SECRET
  // },
} as const;

// ─── Plugins ─────────────────────────────────────────────────────────────────

export function getPlugins() {
  return [

    // ── Multi-factor auth ─────────────────────────────────────────────────
    // TOTP authenticator app support. Adds twoFactor table.
    twoFactor(),

    // ── Passwordless ──────────────────────────────────────────────────────
    // Magic link via email. No extra tables.
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // TODO: wire email provider (Resend, Cloudflare Email Routing, etc.)
        console.log(`[auth] magic link: ${email} → ${url}`);
      },
    }),

    // One-time password via email. No extra tables.
    emailOTP({
      sendVerificationOTP: async ({ email, otp }) => {
        // TODO: wire email provider
        console.log(`[auth] OTP: ${email} → ${otp}`);
      },
    }),

    // ── Passwordless — requires separate package ──────────────────────────
    // WebAuthn / passkeys. Run: bun add @better-auth/passkey
    // import { passkey } from '@better-auth/passkey';
    // passkey(),

    // ── Multi-tenant ──────────────────────────────────────────────────────
    // Teams sharing CAD models. Adds organization, member, invitation tables.
    organization(),

    // ── Access control ────────────────────────────────────────────────────
    // User management — ban, impersonate, list users.
    admin(),

    // Multiple active sessions per user (e.g. desktop + mobile).
    multiSession(),

    // Guest sessions that can upgrade to full accounts.
    anonymous(),

    // ── API key management — requires separate package ────────────────────
    // Run: bun add @better-auth/api-key
    // import { apiKey } from '@better-auth/api-key';
    // apiKey(),

    // ── Token auth ────────────────────────────────────────────────────────
    // Bearer token auth for API/MCP clients.
    bearer(),

    // JWT tokens — stateless, useful for cross-service auth.
    jwt(),

    // ── OAuth 2.1 provider ────────────────────────────────────────────────
    // Turns this worker into a full OAuth 2.1 + OIDC authorization server.
    // MCP agents authenticate against your CAD platform via this.
    // Consent page: /auth/consent
    oauthProvider({
      loginPage: '/auth/sign-in',
      consentPage: '/auth/consent',
    }),

    // ── Phone number auth ─────────────────────────────────────────────────
    // SMS OTP. Requires SMS provider (Twilio, etc.)
    // import { phoneNumber } from 'better-auth/plugins';
    // phoneNumber({
    //   sendOTP: async ({ phoneNumber, code }) => {
    //     // TODO: wire SMS provider
    //   },
    // }),

    // ── OIDC provider ─────────────────────────────────────────────────────
    // Full OpenID Connect provider (alternative to oauthProvider).
    // import { oidcProvider } from 'better-auth/plugins';
    // oidcProvider({
    //   loginPage: '/auth/sign-in',
    //   consentPage: '/auth/consent',
    // }),

    // ── One-time token ────────────────────────────────────────────────────
    // Short-lived tokens for sharing CAD model links, invite flows, etc.
    // import { oneTimeToken } from 'better-auth/plugins';
    // oneTimeToken(),

    // ── Have I Been Pwned ─────────────────────────────────────────────────
    // Checks passwords against known data breaches on sign-up/password change.
    // import { haveibeenpwned } from 'better-auth/plugins';
    // haveibeenpwned(),

    // ── Username ──────────────────────────────────────────────────────────
    // Allow username-based login in addition to email.
    // import { username } from 'better-auth/plugins';
    // username(),

    // ── MCP auth client ───────────────────────────────────────────────────
    // Protects MCP endpoint when auth worker is separate from truck-cad.
    // import { createMcpAuthClient } from 'better-auth/plugins/mcp/client';
    // const mcpAuth = createMcpAuthClient({ authURL: env.BETTER_AUTH_URL });

  ];
}
