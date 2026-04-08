# auth-better — better-auth reference system

Backend: https://github.com/better-auth/better-auth (Cloudflare Worker)
Frontend: https://github.com/better-auth-ui/better-auth-ui (React SPA)



## Run it

```sh
mise install          # install tools (pitchfork, bun, node, wrangler)
mise run 1-install    # install npm deps — first time only
mise run 2-start      # start worker (:8792) + web (:5174)
mise run 3-migrate    # create DB schema — first time only
```

Open http://localhost:5174

```sh
mise run 5-stop       # stop everything
```

## Test it

```sh
mise run 4-test       # run Playwright tests (services must be running)
mise run ci           # full CI: kill → install → start → migrate → test → stop

# Against production (after deploy):
AUTH_BETTER_PROD_URL=https://auth-better-worker.your-account.workers.dev mise run 6-test-prod
```

## Deploy (MacBook only)

```sh
# One-time: provision Cloudflare resources
wrangler d1 create auth-better-db
wrangler kv namespace create AUTH_BETTER_KV
wrangler secret put BETTER_AUTH_SECRET   # openssl rand -base64 32
# Fill in real IDs in worker/wrangler.toml [env.production.*] blocks

mise run deploy                          # build + deploy to Cloudflare
```

## URLs (dev)

| | URL |
|--|-----|
| Frontend | http://localhost:5174 |
| Sign-in | http://localhost:5174/auth/sign-in |
| Sign-up | http://localhost:5174/auth/sign-up |
| Account | http://localhost:5174/account/settings |
| Worker health | http://localhost:8792/health |

No email needed — sign up with any address. Magic link / OTP codes print to `pitchfork logs worker`.

## CLAUDE

.src/ contains the upstream repos — use them as reference, do not reinvent.


Keep Mise files (https://mise.jdx.dev)  and Pitchfork files (https://pitchfork.jdx.dev) correct - you and devs use this to run things.

All tasks in Mise to be numbered, so the natural order is of what to run when is obvious. 

Keep README up to date with Mise.

All e2e tests must pass. 

Dog food everything yourself.
