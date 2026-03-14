// systems/auth/worker/src/auth.ts
// better-auth configuration, wrapped with withCloudflare for D1 + KV bindings.
// Exported as `auth` for CLI schema generation (no env), and `createAuth` for runtime.

import type { D1Database } from '@cloudflare/workers-types';
import { betterAuth } from 'better-auth';
import { withCloudflare } from 'better-auth-cloudflare';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import * as authSchema from './db/auth.schema';

export type CloudflareBindings = {
  AUTH_DB: D1Database;
  AUTH_KV: KVNamespace;
};

export function createAuth(env?: CloudflareBindings, cf?: IncomingRequestCfProperties) {
  const db = env ? drizzle(env.AUTH_DB, { schema: authSchema }) : ({} as ReturnType<typeof drizzle>);

  return betterAuth({
    ...withCloudflare(
      {
        autoDetectIpAddress: true,
        geolocationTracking: true,
        cf: cf ?? {},
        d1: env
          ? { db, options: { usePlural: true } }
          : undefined,
        kv: env?.AUTH_KV,
      },
      {
        emailAndPassword: { enabled: true },
        emailVerification: {
          sendVerificationEmail: async ({ user, url }) => {
            // TODO: wire up Cloudflare Email or a transactional provider
            console.log(`[auth] verify email for ${user.email}: ${url}`);
          },
        },
        rateLimit: {
          enabled: true,
          window: 60,   // min KV TTL is 60s
          max: 100,
          customRules: {
            '/sign-in/email':  { window: 60, max: 10 },
            '/sign-up/email':  { window: 60, max: 5  },
            '/forget-password':{ window: 60, max: 5  },
          },
        },
      }
    ),
    // Drizzle adapter for CLI schema generation (no env)
    ...(env
      ? {}
      : {
          database: drizzleAdapter({} as D1Database, {
            provider: 'sqlite',
            usePlural: true,
          }),
        }),
  });
}

// For CLI schema generation: `bunx @better-auth/cli generate`
export const auth = createAuth();
