# ADR-003: Project Structure — web + worker split

**Status:** Planned
**Date:** 2026-04-08
**Depends on:** ADR-001

---

## Problem

The current structure has `web/` and `worker/` as separate folders with the worker
depending on `../web/dist` via the `[assets]` binding in wrangler.toml.

This causes friction:
- Phase 2 (wrangler bundle check) requires a `bun run build` in `web/` before the worker starts
- Production deploy requires building web first
- Worker unit tests (ADR-005) run inside `worker/` via `@cloudflare/vitest-pool-workers` but
  the `[assets]` binding pointing to `../web/dist` is irrelevant noise — tests don't need the SPA
- The better-auth cloudflare fixture (`.src/better-auth/e2e/smoke/test/fixtures/cloudflare/`)
  has no separate web folder — everything in one worker

## Options

### Option A: Keep current split (do nothing)

Worker unit tests work around the assets binding — vitest ignores it or we stub it.

**Pro:** No migration work  
**Con:** Assets binding noise in tests, build step required before worker tests

---

### Option B: Merge web into worker (monorepo style)

Move `web/src/` into `worker/` and configure Vite to output to `worker/dist/`.
Worker becomes the single deployable unit — builds SPA and serves it.

**Pro:** One folder, one deploy unit, no cross-folder deps  
**Con:** Significant restructure, worker package.json gets web deps, blurs concerns

---

### Option C: Worker serves API only, web is standalone (clean split)

Remove `[assets]` from worker entirely. Worker is pure API.
Web is deployed separately (Cloudflare Pages or separate worker).

**Pro:** Clean separation — worker tests have zero SPA concerns  
**Con:** Two deploy targets, CORS between web origin and worker origin, more complex

---

### Option D: Stub assets in vitest config (pragmatic workaround)

Keep current structure. In `vitest.config.ts`, override the assets binding to a stub
so worker unit tests don't need `../web/dist` to exist.

**Pro:** Minimal change, unblocks ADR-005 immediately  
**Con:** Doesn't fix the Phase 2 build step friction

---

## Decision

**Not yet made.** Options ranked by preference:

1. Option D — unblocks ADR-005 with minimal risk
2. Option C — cleanest architecture long-term
3. Option A — acceptable if Option D is too fiddly
4. Option B — last resort, blurs concerns

## Impact on other ADRs

- ADR-004 (E2E tests): no impact — Playwright tests already handle all three phases
- ADR-005 (Worker unit tests): blocked until this is resolved — assets binding must not
  prevent vitest from starting the worker
