# auth

Authentication worker for plat-trunk. Base [better-auth v1.5](https://github.com/better-auth/better-auth) running as a dedicated isolated worker, consumed by other workers via Cloudflare Service Bindings.

Implements the service-bindings pattern from [zpg6/better-auth-cloudflare#49](https://github.com/zpg6/better-auth-cloudflare/issues/49).

**Stack**: better-auth v1.5 · Hono · D1 (native) · KV (secondaryStorage) · Datastar · DaisyUI

## Architecture

```
Client → plat-router (port 8788)
  /auth/api/*  → auth-worker (port 8790) — better-auth handler
  /auth/*      → auth-worker (port 8790) — static web UI

Other workers → auth-worker via Service Binding (no public HTTP)
  AUTH.fetch("https://auth/api/get-session", { headers })
```

## Quick Start

```bash
# 1. Provision Cloudflare resources (MacBook, one-time)
wrangler d1 create auth-db
wrangler kv namespace create AUTH_KV
# → paste IDs into systems/auth/worker/wrangler.toml

# 2. Deploy
bun run deploy

# 3. Run migrations (creates all tables automatically)
curl -X POST https://cad.ubuntusoftware.net/auth/migrate

# 4. Local dev (from repo root)
bun run dev    # auth-worker at http://localhost:8790, web at http://localhost:5174
```

## Plugins

All plugins configured in `worker/src/plugins.ts` — single file, comment/uncomment to toggle.
Adding a plugin: uncomment it, then `POST /auth/migrate` — schema updates automatically.

**Enabled:**
`twoFactor` · `magicLink` · `emailOTP` · `organization` · `admin` · `multiSession` · `anonymous` · `bearer` · `jwt` · `oauthProvider`

**Commented out (ready to enable):**
`passkey` · `apiKey` · `phoneNumber` · `oneTimeToken` · `haveibeenpwned`

**Social providers** (in `SOCIAL_PROVIDERS` object, all commented out):
Google · GitHub · Discord · Microsoft

## MCP Auth

The `/mcp` endpoint in truck-cad is gated by a flag:

```toml
# systems/truck/worker/wrangler.toml
[vars]
MCP_AUTH_ENABLED = "false"   # "true" to require auth
```

No code change needed — just update the var and redeploy.

## URLs

| | URL |
|--|-----|
| **Local Dev** | |
| Sign In | http://localhost:8788/auth/sign-in |
| Sign Up | http://localhost:8788/auth/sign-up |
| Reset Password | http://localhost:8788/auth/reset-password |
| Verify Email | http://localhost:8788/auth/verify-email |
| OAuth Consent | http://localhost:8788/auth/consent |
| Session API | http://localhost:8788/auth/api/get-session |
| Health | http://localhost:8788/auth/health |
| Migrate | http://localhost:8788/auth/migrate (POST) |
| **Production** | |
| Sign In | https://cad.ubuntusoftware.net/auth/sign-in |
| Auth API | https://cad.ubuntusoftware.net/auth/api/* |

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/health` | Health check |
| `POST` | `/auth/migrate` | Run DB migrations (call after deploy or plugin change) |
| `GET` | `/auth/api/get-session` | Current session |
| `POST` | `/auth/api/sign-up/email` | Register |
| `POST` | `/auth/api/sign-in/email` | Sign in |
| `POST` | `/auth/api/sign-out` | Sign out |
| `POST` | `/auth/api/forget-password` | Request reset email |
| `POST` | `/auth/api/reset-password` | Reset via token |
| `POST` | `/auth/api/verify-email` | Verify email via token |
| `POST` | `/auth/api/sign-in/magic-link` | Send magic link |
| `POST` | `/auth/api/sign-in/anonymous` | Guest session |
| `GET/POST` | `/auth/api/oauth/*` | OAuth 2.1 flows |

## Service Binding Usage

```typescript
// In any consuming worker
app.use('/api/*', async (c, next) => {
  const res = await c.env.AUTH.fetch(
    new Request('https://auth/api/get-session', {
      headers: c.req.raw.headers, // forward cookies + Bearer
    })
  );
  const session = await res.json<{ user?: { id: string; email: string } }>();
  if (!session?.user) return c.json({ error: 'Unauthorized' }, 401);
  c.set('user', session.user);
  return next();
});
```

Add to the consuming worker's `wrangler.toml`:
```toml
[[services]]
binding = "AUTH"
service = "auth-worker"
```

## Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `AUTH_DB` | D1 (SQLite) | All auth tables (auto-managed by better-auth) |
| `AUTH_KV` | KV namespace | Session cache + rate limit counters |
| `ASSETS` | Static assets | Web UI pages |

## Commands

```bash
bun run auth:generate          # Regenerate Drizzle schema (MacBook — needs npx)
bun run auth:migrate:local     # Apply migrations to local D1
bun run auth:migrate:prod      # Apply migrations to Cloudflare D1
bun x vitest run               # Run unit tests (in-memory SQLite, no credentials needed)
```

## Tests

16 unit tests covering all active plugins. Uses `better-auth/test` `getTestInstance()` with in-memory SQLite — no wrangler, no credentials, runs anywhere including CI.

```bash
cd systems/auth/worker && bun x vitest run
```
