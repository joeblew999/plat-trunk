# lib/log — Platform Structured Logger

Full Logging, Tracing and Observability fully using the native Cloudflare system.

Browser-side logging queues in localStorage when offline, flushes to the CF Worker when back online. The worker re-emits every ingested entry as structured JSON so CF Logpush/Traces/Analytics Engine captures everything — browser and worker logs unified in one pipeline.

CLaude MUST be able to see all the logs, traces, etc for local and remote easily !!! so must a human !!

Why ?

The sync system is really hard to understand when it goes wrong, and so this started because of that and must allow use to see whqats going on everywhere.  

Once we get the logging systme fully working we can then start to us it in Sync and then other systems. BUT it must alwaas be able to be run in isolations so that we can fix the logging when needed.


## Scripts

```bash
# Demo — run locally
bun run log:demo            # Bun demo: browser + worker on :3333
bun run log:demo:cf         # CF Worker demo: wrangler on :3335 (real miniflare runtime)

# Deploy — push to CF
bun run log:deploy          # deploy log-demo worker to CF

# Tail — see logs (wrangler native)
bun run log:tail            # live tail deployed worker (structured JSON, both browser + worker)

# Tests
bun run log:test              # 30 unit + endpoint tests (no wrangler)
bun run log:test:integration  # 24 integration + fuzz (wrangler + Playwright)
bun run log:test:prod         # same against deployed worker
bun run log:test:all          # everything
```

## Structure

```
lib/log/
  index.ts          — core: createLogger, startLogFlush, _internal
  endpoint.ts       — Hono routes + viewer (mount in any worker)
  config.ts         — buildLogConfig(): reads cf-deploy.json, reusable by any system
  demo/
    worker.ts       — CF Worker entry (wrangler demo)
    bun.ts          — Bun demo (browser + worker in one process)
    browser.ts      — browser entry (bundled by bun.ts)
    wrangler.toml   — CF config: logpush + observability
  tests/
    test.test.ts         — 30 unit + endpoint tests
    integration.test.ts  — 24 integration + fuzz (wrangler + Playwright, local + prod)
```

## Usage (when wiring into a system)

```ts
import { createLogger } from '../../lib/log'
import { createLogRoutes } from '../../lib/log/endpoint'
import { buildLogConfig } from '../../lib/log/config'

// In worker setup — config auto-reads account + domain from cf-deploy.json:
app.route('/api/debug', createLogRoutes(buildLogConfig('truck-cad')))

// With custom production URL (e.g. custom domain):
app.route('/api/debug', createLogRoutes(buildLogConfig('plat-router', 'https://cad.ubuntusoftware.net')))

// Anywhere:
const log = createLogger('sync')
log.info('merge', { modelId, opCount })
```

## URLs

All worker identity (name, account, domain) lives in **`cf-deploy.json`** at repo root — single source of truth. `lib/log/config.ts` reads it and provides `buildLogConfig(workerName)` for any system.

URLs are shown in three places — all derived from that config:
- **`bun run log:demo`** console output (printed at startup)
- **Viewer sticky bar** (clickable links at top of `/api/debug/logs/viewer`)
- **`/api/debug/logs/urls`** endpoint (JSON, for scripts)

### Local (dev)

| What | URL |
|------|-----|
| Demo page | http://localhost:3335/ |
| Log viewer | http://localhost:3335/api/debug/logs/viewer |
| SSE tail | `curl -N http://localhost:3335/api/debug/logs/tail` |
| JSON API | http://localhost:3335/api/debug/logs |
| All URLs | http://localhost:3335/api/debug/logs/urls |

## Viewing Logs — Three Layers

### 1. Our viewer (custom, built-in)
- **Web viewer**: `/api/debug/logs/viewer` — live SSE stream, filters, both browser + worker entries merged
- **JSON API**: `curl /api/debug/logs` — filterable (`?source=browser&system=sync&level=warn`)
- **SSE tail**: `curl -N /api/debug/logs/tail` — like `tail -f` for logs
- **URLs endpoint**: `/api/debug/logs/urls` — JSON of all local/prod/CF URLs (for scripts + agents)

### 2. Wrangler CLI (native CF tooling)
```bash
# Live tail deployed worker — structured JSON, browser + worker entries
bun run log:tail

# Or directly:
cd lib/log/demo && bunx wrangler tail log-demo --format json

# Filter by specific fields:
cd lib/log/demo && bunx wrangler tail log-demo --format json --search "sync"
cd lib/log/demo && bunx wrangler tail log-demo --format json --status error

# Local dev with live logs in terminal:
bun run log:demo:cf    # wrangler dev — logs print to terminal as structured JSON
```

### 3. CF Dashboard (native web UI)
Links auto-generated from `cf-deploy.json` — shown in viewer sticky bar and `/urls` endpoint:
- **Live Logs**: real-time stream in CF dashboard
- **Traces**: request traces with timing
- **Analytics**: aggregate worker metrics

## CF Observability

Each worker using this logger needs in its `wrangler.toml`:
```toml
logpush = true

[observability]
enabled = true
head_sampling_rate = 1
```

Because we re-emit browser entries to `console.log(JSON.stringify(entry))` in the ingest handler, **CF Logpush captures browser logs too** — not just worker-generated logs. `wrangler tail` shows both.

## Status

Isolated and working — not wired into any system worker yet. Wire in when ready by following the Usage section above.
