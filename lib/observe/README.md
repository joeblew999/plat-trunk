# lib/observe — Platform Observability

Structured logging, tracing, and scrubbing for all Cloudflare Workers.
Browser logs flush through the worker so CF captures everything in one pipeline.

## PORTS 

Make sure your dont have port clashing with other stuff first.

We use the following ports: 

???

## Local Commands

```bash
# --- keep these running in 2 terminals ---

# start all 3 workers
bun run dev

# stream logs from local workers
bun run tail

# --- run against the running workers ---

# integration tests (6/6)
bun run test

# playwright e2e
bun run test:e2e
```

## Remote Commands

These MUST be the same commands with with ENVS !!

```bash
# deploy all 3 workers
bun run deploy

# --- keep this running ---

# stream logs from CF
ROUTER_URL=https://observe-router.gedw99.workers.dev bun run tail

# --- run against deployed workers ---

# integration tests (4/4)
LOG_URL=https://log-demo.gedw99.workers.dev bun run test

# playwright e2e
ROUTER_URL=https://observe-router.gedw99.workers.dev bun run test:e2e
```

## 3 Workers

We have 3 because its the bare minimum to prove the architetcure works !

The package.json commands call into:

`dev/wrangler.sh` runs one `wrangler dev` with three configs:

```
demo-main/  (primary — router on :8686, service bindings to both demos)
demo1/      (secondary — log-demo, routed via /demo1/*)
demo2/      (secondary — log-demo-2, routed via /demo2/*)
```

All three workers run in a single process.

Service bindings show **"not connected"** on startup — this is normal. Wrangler connects them lazily on the first request. After the first hit they show "connected".

## Add to your worker

```ts
import { setupLog, type LogEnv } from '../../lib/observe'

const app = new Hono<LogEnv>()
const { createLogger } = setupLog(app, 'truck-cad')

// In request handlers — auto-gets traceId, requestId
app.get('/api/health', (c) => {
  c.var.log.info('health-check')
  return c.json({ ok: true })
})

// Outside requests — standalone logger
const sync = createLogger('sync')
sync.info('merge', { modelId, opCount })
```

## Add to your browser

```ts
import { setupBrowserLog } from '../../lib/observe/browser'

const { createLogger } = setupBrowserLog({
  flushUrl: '/api/debug/logs/ingest',
  captureErrors: true,
})
const ui = createLogger('ui')
ui.info('click', { button: 'save' })
```

Browser logs queue in localStorage and flush to the worker every 2s.
The worker `console.log`s them as structured JSON — CF captures from there.

## How data flows

```
Browser (local or user device)
  → POST /api/debug/logs/ingest
  → Worker console.log(JSON)
  → CF captures → Workers Observability (production pipeline)

Worker also writes to:
  ring buffer → GET /logs (local dev debug only)
             → SSE /tail → tail.ts (local aggregator)
```

- **Production**: `console.log(JSON.stringify(entry))` → CF Workers Observability dashboard + `wrangler tail`
- **Local dev only**: ring buffer + `/api/debug/logs` + SSE `/tail` — debug API, single process, single isolate
- **Ring buffer is NOT available in production** — CF runs distributed isolates; use Workers Observability instead

## wrangler.toml

Every worker needs this:

```toml
[observability]
enabled = true
head_sampling_rate = 1

[observability.logs]
invocation_logs = true
```

## Files

| File | Purpose |
|------|---------|
| `index.ts` | LogBuffer, Logger, types, scrubbing |
| `setup.ts` | `setupLog()` one-liner |
| `endpoint.ts` | Debug routes: `/logs`, `/logs/tail`, `/logs/ingest` |
| `middleware.ts` | Request tracing + error handler |
| `browser.ts` | `setupBrowserLog()` for browser-side |
| `config.ts` | CF dashboard URL builder |
| `trace.ts` | W3C traceparent helpers |
| `dev/wrangler.sh` | Start local multi-config wrangler dev |
| `dev/deploy.sh` | Deploy all 3 workers to CF |
| `dev/tail.sh` | Live logs from deployed workers |
| `dev/orchestrate.ts` | Wrangler lifecycle (start/stop workers for tests) |
| `dev/tail.ts` | Terminal log aggregator |
| `dev/run.mjs` | Command runner |
| `demo-main/` | Primary router (multi-config) |
| `demo1/` | Sync/truck service demo |
| `demo2/` | Auth/session service demo |
| `tests/` | Integration + e2e tests |
