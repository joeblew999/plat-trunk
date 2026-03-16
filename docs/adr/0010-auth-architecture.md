# ADR 0010 — Auth Architecture: base better-auth v1.5 as a Dedicated Worker

**Status:** Accepted
**Date:** 2026-03-14
**Updated:** 2026-03-16
**Deciders:** Gerard Webb

---

## Context

The CAD platform needs authentication — user identity, sessions, and protected routes. The question is how to integrate auth into the existing multi-worker architecture without coupling it to `truck-cad` or the router.

The repo follows a strict pattern: each system is a separate Cloudflare Worker connected via Service Bindings. Auth as a shared concern needs to be accessible by any current or future worker without duplicating logic.

### Options considered

**Option A: Auth inside truck-cad**
Add auth directly to the truck-cad worker. Simple to start, but couples auth to CAD logic, breaks single-responsibility, and makes it impossible for future workers to share sessions.

**Option B: Auth in the root router**
Handle `/auth/*` in `src/router.ts`. The router is meant to be a passthrough, not a business logic layer. Also hits the 3MB worker size limit faster.

**Option C: better-auth-cloudflare wrapper** *(evaluated, rejected)*
Tried this first. The wrapper adds geolocation fields that caused schema drift, has peer dependency conflicts with drizzle-orm, and doesn't expose the full plugin ecosystem cleanly.

**Option D: Base better-auth v1.5 as a dedicated worker** ✅
Run `better-auth` directly as its own isolated worker (`systems/auth/`). D1 is passed natively (first-class support since v1.5). No wrapper needed. Full plugin ecosystem available. Other workers reach it via a Cloudflare Service Binding.

This implements the service-bindings pattern described in [zpg6/better-auth-cloudflare#49](https://github.com/zpg6/better-auth-cloudflare/issues/49).

---

## Decision

Use **base better-auth v1.5** as a dedicated isolated worker, consistent with the existing system pattern. The router forwards `/auth/*` traffic to it. All other workers verify sessions via the `AUTH` service binding.

Key properties of better-auth v1.5:
- D1 binding passed directly — no ORM adapter needed
- Programmatic migrations via `getMigrations()` — no CLI required in CF Workers
- Rich plugin ecosystem — add a plugin, run `POST /auth/migrate`, done

---

## Architecture

```
Client → plat-router (port 8788)
  /auth/api/*  → auth-worker — better-auth handler (sign-in, sign-up, session, etc.)
  /auth/*      → auth-worker — static web UI (sign-in, sign-up, reset, verify, consent)

truck-cad → AUTH service binding → auth-worker (getSession — internal only)
future-worker → AUTH service binding → auth-worker (getSession — internal only)
```

Auth worker owns exclusively:
- `AUTH_DB` — D1 SQLite (all plugin tables, auto-managed by better-auth)
- `AUTH_KV` — KV namespace (session cache, rate limit counters via `secondaryStorage`)

---

## Plugins

Configured in `systems/auth/worker/src/plugins.ts` — single file, comment/uncomment to toggle.
Schema updates on next `POST /auth/migrate`.

**Enabled by default:**

| Plugin | Purpose |
|--------|---------|
| `twoFactor` | TOTP authenticator app |
| `magicLink` | Passwordless sign-in via email |
| `emailOTP` | One-time password via email |
| `organization` | Multi-tenant teams sharing CAD models |
| `admin` | User management, ban/unban |
| `multiSession` | Multiple devices per user |
| `anonymous` | Guest sessions → upgrade to full account |
| `bearer` | Bearer token auth for MCP + API clients |
| `jwt` | Stateless tokens |
| `oauthProvider` | Full OAuth 2.1 + OIDC server — MCP agent auth |

**Commented out (ready to enable):**
`passkey`, `apiKey`, `phoneNumber`, `oidcProvider`, `oneTimeToken`, `haveibeenpwned`, `username`

**Social providers** (all commented out in `SOCIAL_PROVIDERS`):
Google, GitHub, Discord, Microsoft

---

## MCP Auth

The `/mcp` endpoint in truck-cad is protected by a feature flag:

```toml
# systems/truck/worker/wrangler.toml
[vars]
MCP_AUTH_ENABLED = "false"  # "true" to require auth, "false" (default) to keep open
```

**Off (default):** MCP endpoint is open. Best for local dev and AI agent testing.
**On:** Requires a valid session cookie or Bearer token via the AUTH service binding.

Toggling does not require a code change — only a wrangler var update and redeploy.

---

## Session Verification Pattern

Any worker adds auth checking via the `AUTH` service binding:

```typescript
async function getSession(c: { env: { AUTH: Fetcher }; req: { raw: Request } }) {
  if (!c.env.AUTH) return null; // graceful degradation in dev
  try {
    const res = await c.env.AUTH.fetch(
      new Request('https://auth/api/get-session', {
        headers: c.req.raw.headers, // forward cookies + Bearer token
      })
    );
    if (!res.ok) return null;
    const data = await res.json<{ user?: { id: string; email: string } }>();
    return data?.user ?? null;
  } catch {
    return null;
  }
}
```

Adding to a new worker: add `[[services]] binding = "AUTH" service = "auth-worker"` to its `wrangler.toml` and `AUTH: Fetcher` to its `Bindings` type.

---

## Migrations

better-auth manages its own schema. No hand-written SQL needed.

```bash
# Programmatic — works in CF Workers, no CLI needed
curl -X POST https://cad.ubuntusoftware.net/auth/migrate

# Or via wrangler CLI (MacBook)
bun run auth:migrate:prod
```

Adding a plugin: uncomment in `plugins.ts`, then `POST /auth/migrate` — new tables/fields added automatically.

---

## Stack

| Concern | Choice | Reason |
|---------|--------|--------|
| Auth framework | `better-auth v1.5` | D1 native, rich plugins, active development |
| DB | D1 (SQLite) | Native CF, no external dep, auto-managed schema |
| Session cache | KV (`secondaryStorage`) | Fast session lookup, rate limiting |
| HTTP layer | Hono | Consistent with truck-cad and router |
| Web UI | Vite + Datastar + DaisyUI | Consistent with truck web UI pattern |

---

## Consequences

**Good:**
- Auth isolated — D1, KV, session logic all owned by one worker
- Any new system worker gets session checking with two lines of config
- Service Bindings are in-process — no latency, no egress cost
- MCP auth is a flag, not hardwired — easy to toggle per environment
- Programmatic migrations — no CLI dependency in prod
- Full plugin ecosystem — add a plugin, migrate, done

**Tradeoffs:**
- One more worker to deploy and maintain
- D1 + KV must be provisioned before first run
- `POST /auth/migrate` must be called after each plugin addition

---

## Setup (one-time, MacBook)

```bash
wrangler d1 create auth-db
wrangler kv namespace create AUTH_KV
# Paste IDs into systems/auth/worker/wrangler.toml

bun run deploy
curl -X POST https://cad.ubuntusoftware.net/auth/migrate
```
