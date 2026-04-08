// auth-better/worker/src/plugins.ts
//
// All better-auth plugins — full parity with auth-client.ts per ADR-002.
// Email sending is logged to console — no real provider needed for local dev.
// Magic links and OTPs appear in wrangler dev output.

import { apiKey } from '@better-auth/api-key';
import { passkey } from '@better-auth/passkey';
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
  username,
} from 'better-auth/plugins';

export const SOCIAL_PROVIDERS = {
  // Uncomment + add env vars to enable:
  // google:  { clientId: '', clientSecret: '' },
  // github:  { clientId: '', clientSecret: '' },
} as const;

export function getPlugins() {
  return [
    // 2FA — TOTP authenticator app
    twoFactor(),

    // Magic link — click link in email to sign in
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        console.log(`[auth] magic link: ${email} → ${url}`);
      },
    }),

    // Email OTP — 6-digit code
    emailOTP({
      sendVerificationOTP: async ({ email, otp }) => {
        console.log(`[auth] OTP: ${email} → ${otp}`);
      },
    }),

    // Organizations — teams, roles (owner / admin / member)
    organization({
      teams: {
        enabled: true,
      },
    }),

    // Admin — user management, ban, impersonate
    admin(),

    // Multiple active sessions
    multiSession(),

    // Guest sessions that upgrade on sign-up
    anonymous(),

    // Bearer tokens for CLI / MCP clients
    bearer(),

    // JWT stateless tokens
    jwt(),

    // Short-lived share tokens
    oneTimeToken(),

    // Username login
    username(),

    // API keys
    apiKey(),

    // Passkeys (WebAuthn)
    passkey(),
  ];
}
