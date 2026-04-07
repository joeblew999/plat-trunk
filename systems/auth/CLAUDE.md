# CLAUDE.md — systems/auth

## YOU MUST DOG FOOD YOUR OWN SHIT

Before claiming anything works:
1. Start the worker: `mise run dev`
2. Open http://localhost:8790/auth/sign-in in a browser (or use curl)
3. Actually perform the action
4. Verify it works end-to-end

**Do NOT say "this should work" or "tests pass so it works."**
Tests cover happy paths. Real usage finds the bugs.

## Fixed bugs (verified working)

- **Sign-out** — was a GET `<a href>`. Fixed to JS POST with `body: '{}'` (better-auth requires Content-Type + body). Tested: sign in → sign out → sign in again ✅
- **Filesystem demo 403** — default path was `/projects/demo/notes.txt` (alice's dir). Fixed to `/home/{userId}/notes.txt` which the session user always owns ✅
- **No home dir on sign-up** — fixed via `databaseHooks.user.create.after` + `global-setup.ts` grants `/home/{userId}` for every seeded user ✅

## Still broken / not implemented

1. **Email verification is a black hole** — `requireEmailVerification: false` and `sendVerificationEmail` just `console.log`s. Users see `emailVerified: false` with no path to verify. Needs: Resend or Cloudflare Email Routing wired in.

2. **GUI needs work** — demo page is functional but rough. No feedback on permission denied, no way to navigate back to sign-in from demo without sign-out button, grant form UX is clunky.

3. **No rate limiting visible to users** — KV rate limiting is configured but errors just return 429 with no friendly message.

4. **RPC entrypoint untested** — `AuthWorker.check()`, `.grant()`, `.readFile()` etc. are defined but no test calls them via the actual service binding RPC path (only via HTTP).

## Architecture rules

- Worker is SSR only — no Vite, no build step, no static assets
- All HTML is in `worker/src/views/*.ts`
- All routes are in `worker/src/routes/*.ts`
- Tests are in `e2e/` — Playwright only, no vitest
- Run tests: `mise run test:e2e` (worker must be running)
- Run CI: `mise run ci` (self-contained)

## Testing rule

After every change: `mise run ci` must pass.
