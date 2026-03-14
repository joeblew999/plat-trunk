# ADR 0010 — Auth Architecture: better-auth-cloudflare as a Dedicated Worker

**Status:** Accepted
**Date:** 2026-03-14
**Deciders:** Gerard Webb

---

## Context

The CAD platform needs authentication — user identity, sessions, and protected routes. The question is how to integrate auth into the existing multi-worker architecture without coupling it to `truck-cad` or the router.

The repo already follows a strict pattern: each system is a separate Cloudflare Worker connected via Service Bindings. Adding auth as a shared concern means it needs to be accessible by any current or future worker without duplicating logic.

### Options considered

**Option A: Auth inside truck-cad**
Add `better-auth` directly to the truck-cad worker alongside the CAD API. Simple to start, but couples auth to CAD logic, breaks the single-responsibility pattern, and makes it impossible for future workers (MVT, IFC, etc.) to share sessions without going through the truck worker.

**Option B: Auth in the root router**
Handle `/auth/*` in `src/router.ts`. Keeps the router thin contract — the router is meant to be a passthrough, not a business logic layer. Also hits the 3MB worker size limit faster.

**Option C: Dedicated auth-worker with Service Bindings** ✅
Run `better-auth-cloudflare` as its own isolated worker at `systems/auth/`. Other workers reach it via a Cloudflare Service Binding — zero public HTTP, zero latency overhead, shared sessions across the whole platform.

---

## Decision

Use `better-auth-cloudflare` as a **dedicated isolated worker** (`systems/auth/`), consistent with the existing system pattern. The router forwards `/auth/*` traffic to it. All other workers verify sessions by calling the `AUTH` service binding directly.

This implements the pattern described in [zpg6/better-auth-cloudflare#49](https://github.com/zpg6/better-auth-cloudflare/issues/49).

---

## Architecture

```
Client → plat-router (port 8788)
  /auth/api/*  → auth-worker — better-auth handler (sign-in, sign-up, session, etc.)
  /auth/*      → auth-worker — static web UI (sign-in, sign-up, reset, verify pages)

truck-cad → AUTH service binding → auth-worker (getSession — internal only)
future-worker → AUTH service binding → auth-worker (getSession — internal only)
```

Auth worker owns exclusively:
- `AUTH_DB` — D1 SQLite (users, sessions, accounts, verifications)
- `AUTH_KV` — KV namespace (session cache, rate limit counters)

No other worker touches these bindings directly.

---

## Session Verification Pattern

Any worker adds auth checking via the `AUTH` service binding:

```typescript
// In any consuming worker
async function getSession(c: { env: { AUTH: Fetcher }; req: { raw: Request } }) {
  if (!c.env.AUTH) return null; // graceful degradation in dev
  try {
    const res = await c.env.AUTH.fetch(
      new Request('https://auth/api/get-session', {
        headers: c.req.raw.headers, // forward cookies
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

Adding to a new worker:
1. Add `[[services]] binding = "AUTH" service = "auth-worker"` to its `wrangler.toml`
2. Add `AUTH: Fetcher` to its `Bindings` type
3. Call `getSession(c)` in middleware

---

## Stack

| Concern | Choice | Reason |
|---------|--------|--------|
| Auth framework | `better-auth` | First-class Cloudflare support, email/password + social, built-in rate limiting |
| CF integration | `better-auth-cloudflare` | Wraps better-auth with D1, KV, R2, geolocation |
| HTTP layer | Hono | Consistent with truck-cad and router |
| DB | D1 (SQLite) | Native Cloudflare, no external dependency, Drizzle ORM |
| Session cache | KV | Secondary storage for rate limiting (min TTL 60s) |
| Web UI | Vite + Datastar + DaisyUI | Consistent with truck web UI pattern |

---

## Web UI

Four pages served as static assets from `systems/auth/web/dist/`:

| Page | Route | Purpose |
|------|-------|---------|
| Sign In | `/auth/sign-in` | Email + password login |
| Sign Up | `/auth/sign-up` | Registration |
| Reset Password | `/auth/reset-password` | Forgot + reset via token (dual-mode) |
| Verify Email | `/auth/verify-email` | Auto-verifies token from URL |

The truck-cad UI header shows a sign-in link or user email + sign-out button based on the `$authUser` Datastar signal, populated non-blocking on boot via `/auth/api/get-session`.

---

## Rate Limits

KV enforces a minimum 60s TTL. All rate limit windows are configured at ≥ 60s:

| Route | Window | Max |
|-------|--------|-----|
| `/sign-in/email` | 60s | 10 |
| `/sign-up/email` | 60s | 5 |
| `/forget-password` | 60s | 5 |
| Global | 60s | 100 |

---

## Consequences

**Good:**
- Auth is isolated — D1 schema, KV, session logic all owned by one worker
- Any new system worker gets session checking for free with two lines of config
- Service Bindings are in-process — no latency, no egress cost
- Auth worker is never publicly reachable except via the router's `/auth/*` prefix
- Graceful degradation — `getSession()` returns `null` if AUTH binding is absent (local dev)

**Tradeoffs:**
- One more worker to deploy and maintain
- D1 + KV resources must be provisioned before first run (`wrangler d1 create`, `wrangler kv namespace create`)
- Schema must be regenerated after any auth config change (`bun run auth:generate`)

---

## Setup (one-time)

```bash
wrangler d1 create auth-db
wrangler kv namespace create AUTH_KV
# Paste IDs into systems/auth/worker/wrangler.toml

bun run auth:generate        # Generate D1 schema from auth.ts config
bun run auth:migrate:local   # Apply to local D1 (dev)
bun run auth:migrate:prod    # Apply to Cloudflare D1 (prod)
```
