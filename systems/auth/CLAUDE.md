# CLAUDE.md — systems/auth

## YOU MUST DOG FOOD YOUR OWN SHIT

Before claiming anything works:
1. Start the worker: `mise run dev`
2. Open http://localhost:8790/auth/sign-in in a browser (or use curl)
3. Actually perform the action
4. Verify it works end-to-end

**Do NOT say "this should work" or "tests pass so it works."**
Tests cover happy paths. Real usage finds the bugs.

## Known bugs to fix (in order)

1. **Sign-out is broken** — `<a href="/auth/api/sign-out">` does a GET. better-auth requires POST + Content-Type: application/json. User clicks sign out → nothing happens / error.

2. **Filesystem demo fails for session users** — default write path `/projects/demo/notes.txt` requires owner/editor on Directory `/projects/demo`. Session user (`user@cad.dev`) has no such grant. Result: 403 on every write attempt.

3. **New sign-ups have no home dir** — fresh accounts get no directory grants. The filesystem demo is completely broken for anyone who just signed up.

4. **Email verification is a black hole** — `requireEmailVerification: false` and `sendVerificationEmail` just `console.log`s. Users see `emailVerified: false` with no path to verify.

## Architecture rules

- Worker is SSR only — no Vite, no build step, no static assets
- All HTML is in `worker/src/views/*.ts`
- All routes are in `worker/src/routes/*.ts`
- Tests are in `e2e/` — Playwright only, no vitest
- Run tests: `mise run test:e2e` (worker must be running)
- Run CI: `mise run ci` (self-contained)

## Testing rule

After every change: `mise run ci` must pass.
