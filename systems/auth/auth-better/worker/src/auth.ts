// auth-better/worker/src/auth.ts
//
// Minimal clean better-auth v1.5 instance.
// No zanzo, no filesystem, no domain schema.
// One instance per request — never a singleton.

import { betterAuth } from 'better-auth';
import { SOCIAL_PROVIDERS, getPlugins } from './plugins';

export type Bindings = {
  AUTH_DB: D1Database;
  AUTH_KV: KVNamespace;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
};

export function createAuth(env: Bindings) {
  return betterAuth({
    // D1 — first-class support in better-auth v1.5
    database: env.AUTH_DB,

    baseURL: env.BETTER_AUTH_URL,
    basePath: '/auth/api',
    secret: env.BETTER_AUTH_SECRET,

    // In dev: both worker (:8792) and Vite (:5174) are trusted.
    // In prod: BETTER_AUTH_URL is the only origin (same-origin SPA).
    trustedOrigins: [
      env.BETTER_AUTH_URL,
      'http://localhost:8792',
      'http://localhost:5174',
    ],

    // KV — session cache + rate limiting
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
        console.log(`[auth] verify email: ${user.email} → ${url}`);
      },
    },

    socialProviders: SOCIAL_PROVIDERS,

    plugins: getPlugins(),
  });
}
