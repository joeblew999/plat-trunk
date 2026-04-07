// systems/auth/worker/src/auth.ts
//
// Base better-auth v1.5 — D1 native, KV secondary storage.
// One instance per request via createAuth(env) — never a singleton.
//
// To add/remove plugins: edit src/plugins.ts
// To add social providers: uncomment in SOCIAL_PROVIDERS in src/plugins.ts

import { betterAuth } from 'better-auth';
import { SOCIAL_PROVIDERS, getPlugins } from './plugins';
import { getZanzo } from './zano-state';

export type CloudflareBindings = {
  AUTH_DB: D1Database;
  AUTH_KV: KVNamespace;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
};

export function createAuth(env: CloudflareBindings) {
  return betterAuth({
    // D1 — first-class support in better-auth v1.5, no adapter needed
    database: env.AUTH_DB,

    baseURL: env.BETTER_AUTH_URL,
    basePath: '/auth/api',
    secret: env.BETTER_AUTH_SECRET,

    trustedOrigins: [
      'http://localhost:8788',
      'http://localhost:8790',
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
      requireEmailVerification: false, // set true once email sending is wired
    },

    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        // TODO: wire email provider (Resend, Cloudflare Email Routing)
        console.log(`[auth] verify: ${user.email} → ${url}`);
      },
    },

    socialProviders: SOCIAL_PROVIDERS,

    plugins: getPlugins(),

    // Auto-grant new users owner access to their home directory.
    // Without this, fresh sign-ups can't write any files.
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              await getZanzo(env.AUTH_DB).grant(
                `User:${user.id}`, 'owner', 'Directory', `/home/${user.id}`
              );
            } catch (e) {
              console.error('[auth] home dir grant failed:', e);
            }
          },
        },
      },
    },
  });
}
