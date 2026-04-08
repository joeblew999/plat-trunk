# ADR-004: Worker Unit Tests

**Status:** Planned
**Date:** 2026-04-08
**Depends on:** ADR-003

---

## What

Add Vitest unit tests to the worker that test plugins which can't be tested via Playwright
(magicLink, emailOTP, twoFactor, multiSession, username, apiKey, anonymous).

## How

Use code from `.src/better-auth` directly — do not reinvent.

### Test runner
`@cloudflare/vitest-pool-workers` — runs tests inside the real workerd runtime via Miniflare.
Same pattern as `.src/better-auth/e2e/smoke/test/fixtures/cloudflare/`.

### OTP / token capture
`testUtils({ captureOTP: true })` from `better-auth/plugins` — intercepts DB writes to
capture OTP codes and magic link tokens in memory. Same plugin better-auth uses for its own tests.
Works in Cloudflare Workers (Web Standard APIs only, no Node deps).

### Gating — test-only
Add `testUtils` plugin conditionally so it never runs in production:

```ts
// worker/src/plugins.ts
plugins: [
  ...(env.BETTER_AUTH_TEST_MODE === 'true' ? [testUtils({ captureOTP: true })] : []),
  // ... other plugins
]
```

Add to `wrangler.toml` for local/test only — NOT in `[env.production]`:
```toml
[vars]
BETTER_AUTH_TEST_MODE = "false"  # overridden to "true" in vitest.config.ts miniflare bindings
```

### D1 migrations for tests
`readD1Migrations` + `applyD1Migrations` from `@cloudflare/vitest-pool-workers/config` and
`cloudflare:test`. Same pattern as the cloudflare fixture.

But: our worker uses better-auth's own migration endpoint (`POST /auth/migrate`) not Drizzle.
Need to decide: call `SELF.fetch('/auth/migrate')` in setup, or use `readD1Migrations`.
**Decision needed before implementation.**

### Test calls
`SELF.fetch()` from `cloudflare:test` — HTTP requests to the running worker. Same as cloudflare fixture.
Access `auth.$context.test` for helpers (createUser, login, getOTP, etc.).

---

## Files to create

| File | Purpose |
|------|---------|
| `worker/vitest.config.ts` | Test runner setup — copy from cloudflare fixture |
| `worker/test/setup.ts` | Apply migrations before tests |
| `worker/test/auth.test.ts` | email+password (smoke) |
| `worker/test/plugins.test.ts` | magicLink, emailOTP, twoFactor, username, apiKey, anonymous, multiSession |

## Files to modify

| File | Change |
|------|--------|
| `worker/src/plugins.ts` | Add testUtils conditionally on BETTER_AUTH_TEST_MODE |
| `worker/src/auth.ts` | Pass env.BETTER_AUTH_TEST_MODE to getPlugins() |
| `worker/wrangler.toml` | Add BETTER_AUTH_TEST_MODE = "false" to [vars] |
| `worker/package.json` | Add vitest + @cloudflare/vitest-pool-workers devDeps |
| `mise.toml` | Add numbered test task for worker unit tests |

---

## Open question

Migration setup: our worker uses `POST /auth/migrate` (better-auth's built-in migration runner)
not Drizzle migrations. The cloudflare fixture uses `readD1Migrations` which expects SQL files
in a directory. Need to check if better-auth generates SQL files we can point to, or if calling
`SELF.fetch('/auth/migrate')` in test setup is cleaner.
