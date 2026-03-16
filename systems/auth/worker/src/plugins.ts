// systems/auth/worker/src/plugins.ts
//
// Feature flags for better-auth plugins.
// Comment out a plugin to disable it — schema auto-updates on next POST /auth/migrate.
//
// When enabling a new plugin:
//   1. Uncomment it here
//   2. Install any required package (noted on each plugin)
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
  oneTimeToken,
  haveIBeenPwned,
  genericOAuth,
} from 'better-auth/plugins';
import { oauthProvider } from '@better-auth/oauth-provider';

// ─── Social Providers ────────────────────────────────────────────────────────
// Uncomment + add env vars to enable. Each needs clientId + clientSecret.
// Set via: wrangler secret put GOOGLE_CLIENT_ID (never commit secrets)
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
  // apple: {
  //   clientId: '',      // APPLE_CLIENT_ID
  //   clientSecret: '',  // APPLE_CLIENT_SECRET
  // },
} as const;

// ─── Plugins ─────────────────────────────────────────────────────────────────

export function getPlugins() {
  return [

    // ═══════════════════════════════════════════════════════════════════════
    // ENABLED — active in production
    // ═══════════════════════════════════════════════════════════════════════

    // ── Multi-factor auth ─────────────────────────────────────────────────
    // TOTP authenticator app (Google Authenticator, Authy, etc.).
    // Adds: twoFactor table.
    twoFactor(),

    // ── Passwordless ──────────────────────────────────────────────────────
    // Magic link via email — click to sign in, no password needed.
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // TODO: wire email provider (Resend, Cloudflare Email Routing, etc.)
        console.log(`[auth] magic link: ${email} → ${url}`);
      },
    }),

    // OTP via email — 6-digit code, good for mobile/CLI flows.
    emailOTP({
      sendVerificationOTP: async ({ email, otp }) => {
        // TODO: wire email provider
        console.log(`[auth] OTP: ${email} → ${otp}`);
      },
    }),

    // ── Multi-tenant ──────────────────────────────────────────────────────
    // Teams sharing CAD models. Roles: owner / admin / member.
    // Adds: organization, member, invitation tables.
    organization(),

    // ── Access control ────────────────────────────────────────────────────
    // User management — list users, ban/unban, impersonate, set roles.
    admin(),

    // Multiple active sessions per user (desktop + mobile + browser).
    multiSession(),

    // Guest sessions that upgrade to full accounts on sign-up.
    anonymous(),

    // ── Token auth ────────────────────────────────────────────────────────
    // Bearer token for MCP clients, CLI tools, CI/CD scripts.
    bearer(),

    // JWT stateless tokens — useful for cross-service auth.
    jwt(),

    // ── OAuth 2.1 provider ────────────────────────────────────────────────
    // Turns this worker into a full OAuth 2.1 + OIDC authorization server.
    // MCP agents (Claude Code, Cursor, etc.) authenticate via this.
    // Consent page: /auth/consent
    oauthProvider({
      loginPage: '/auth/sign-in',
      consentPage: '/auth/consent',
    }),

    // ═══════════════════════════════════════════════════════════════════════
    // COMMENTED OUT — uncomment to enable
    // ═══════════════════════════════════════════════════════════════════════

    // ── API key management ────────────────────────────────────────────────
    // Long-lived API keys for MCP clients, CI/CD, programmatic access.
    // Users create keys in their profile; keys are hashed in D1.
    // Priority: HIGH — Claude Code / Cursor users need this.
    //
    // Install: bun add @better-auth/api-key
    // import { apiKey } from '@better-auth/api-key';
    // apiKey(),

    // ── Passkeys / WebAuthn ───────────────────────────────────────────────
    // Biometric / hardware key login (Touch ID, Face ID, YubiKey).
    // Professional tool users expect this. No password needed.
    // Priority: MEDIUM
    //
    // Install: bun add @better-auth/passkey
    // import { passkey } from '@better-auth/passkey';
    // passkey(),

    // ── One-time token ────────────────────────────────────────────────────
    // Short-lived tokens for sharing CAD model links and invite flows.
    // e.g. "Click here to view this model" — auto-authenticates recipient.
    // Priority: MEDIUM
    //
    oneTimeToken(),

    // ── Have I Been Pwned ─────────────────────────────────────────────────
    // Checks passwords against known data breach databases on sign-up
    // and password change. Zero friction — just rejects breached passwords.
    // Priority: MEDIUM — easy win for security.
    //
    haveIBeenPwned(),

    // ── Generic OAuth ─────────────────────────────────────────────────────
    // Any OAuth2/OIDC provider: Auth0, Keycloak, Okta, Slack, etc.
    // Add providers to the config array as needed.
    // Priority: LOW — add when enterprise SSO customers ask for it.
    //
    // genericOAuth({
    //   config: [
    //     // Slack example:
    //     // slack({ clientId: '', clientSecret: '' }),
    //     //
    //     // Custom OIDC provider:
    //     // {
    //     //   providerId: 'my-provider',
    //     //   clientId: '',
    //     //   clientSecret: '',
    //     //   discoveryUrl: 'https://auth.example.com/.well-known/openid-configuration',
    //     // },
    //   ],
    // }),

    // ── Polar (billing) ───────────────────────────────────────────────────
    // Subscription billing integrated with better-auth.
    // Supports organization plugin — bill per team, not just per user.
    // Use for paid tiers of the CAD platform.
    //
    // Install: bun add @polar-sh/better-auth @polar-sh/sdk
    // import { polar, checkout, portal } from '@polar-sh/better-auth';
    // import { Polar } from '@polar-sh/sdk';
    //
    // const polarClient = new Polar({ accessToken: env.POLAR_ACCESS_TOKEN });
    // polar({
    //   client: polarClient,
    //   use: [
    //     checkout({ successUrl: '/dashboard?checkout=success' }),
    //     portal(),
    //   ],
    // }),

    // ── Phone number ──────────────────────────────────────────────────────
    // SMS OTP login. Needs Twilio or similar.
    // Priority: LOW — email OTP covers most cases.
    //
    // phoneNumber({
    //   sendOTP: async ({ phoneNumber, code }) => {
    //     // TODO: wire SMS provider (Twilio, Vonage, etc.)
    //   },
    // }),

    // ── OIDC provider ─────────────────────────────────────────────────────
    // Full OpenID Connect provider — alternative to oauthProvider.
    // Note: oauthProvider (above) is preferred — oidcProvider is being
    // deprecated in favour of oauthProvider in a future release.
    //
    // import { oidcProvider } from 'better-auth/plugins';
    // oidcProvider({
    //   loginPage: '/auth/sign-in',
    //   consentPage: '/auth/consent',
    // }),

    // ── Email validation (community) ──────────────────────────────────────
    // Blocks 55,000+ disposable/temporary email domains on sign-up.
    // Prevents throwaway accounts on a professional tool.
    // Priority: MEDIUM
    //
    // Install: bun add better-auth-harmony
    // import { harmony } from 'better-auth-harmony';
    // harmony(),

    // ── Username ──────────────────────────────────────────────────────────
    // Username-based login in addition to email.
    // Probably not needed — email is cleaner for a professional tool.
    //
    // import { username } from 'better-auth/plugins';
    // username(),

  ].filter(Boolean);
}
