# Line App Demo

Line apps run as a webview.

LINE MINI App using the LINE Front-end Framework (LIFF)

## How it works

A self-contained CF Worker serving a fullscreen LINE MINI App.
Same observe API routes as demo1/demo2, plus two LINE-specific bindings:

| Binding | How it works |
|---------|-------------|
| Context enrichment | `liff.getContext()` fields (`lineUserId`, `lineRoomType`, `lineRoomId`) are injected into every browser log entry before it's flushed to the worker |
| Chat transport | `POST /api/demo/line-push` sends the last 5 log entries to LINE as a Flex Message via the Messaging API |
| Webhook | `POST /webhook` receives LINE events and logs them into the observe buffer |

With LINE MINI App + Messaging API the transport is bidirectional:

```
CF Worker captures error log
  → POST https://api.line.me/v2/bot/message/push
  → LINE user receives a Flex Message in their MINI App channel
```

Gracefully degrades to observe-only when run locally (no LINE credentials needed for local dev).

## Two dev modes

LINE requires HTTPS — same constraint as Tauri iOS.

| Mode | Command | LINE features |
|------|---------|--------------|
| Local observe dev | `bun run dev` | No — graceful fallback shown |
| LINE dev / prod | `bun run deploy` then `bun run tail` | Yes — CF Worker, live logs |

## Local dev (no LINE)

```bash
# From lib/observe/demo-line/
bun run dev
# → http://localhost:3337
# LIFF SDK loads but shows dev-mode banner — all observe API routes work
```

## Full setup (LINE + Cloudflare) — do once

The order matters: **deploy first, then configure LINE** (LINE needs the live HTTPS URL).

### Step 1 — Cloudflare login

```bash
bunx wrangler login
# Opens browser → authorise
```

### Step 2 — First deploy (LIFF_ID empty is fine)

```bash
# From lib/observe/demo-line/
bun run deploy
# Note the workers.dev URL printed at the end, e.g.:
#   https://log-demo-line.<your-subdomain>.workers.dev
```

### Step 3 — LINE Developers Console

Go to [developers.line.biz](https://developers.line.biz/) and log in with your LINE account.

**3a. Create a Provider** (skip if you already have one)
- Top page → Create → give it a name

**3b. Create a Messaging API channel**
- Your Provider → Create a channel → Messaging API
- Fill in: Channel name, description, category, subcategory
- Agree terms → Create

**3c. Get Channel Secret**
- Channel page → Basic settings tab
- Copy **Channel secret** (32-char hex string)

**3d. Issue a Channel Access Token**
- Channel page → Messaging API tab → scroll to "Channel access token"
- Click **Issue** → copy the long token

**3e. Add a LIFF app**
- Channel page → LIFF tab → Add
  - Name: `observe-demo`
  - Size: **Full** (required for MINI Apps)
  - Endpoint URL: `https://log-demo-line.<your-subdomain>.workers.dev`
  - Scopes: check **profile** and **openid**
  - Bot link feature: Off
- Save → copy the **LIFF ID** (format: `1234567890-xxxxxxxx`)

### Step 4 — Set LIFF_ID in wrangler.toml

Edit `wrangler.toml` line:
```toml
[env.production.vars]
LIFF_ID = "1234567890-xxxxxxxx"   # ← paste your LIFF ID here
```

### Step 5 — Set secrets

```bash
# From lib/observe/demo-line/
bun run secret:token   # paste Channel Access Token when prompted
bun run secret:secret  # paste Channel Secret when prompted
```

### Step 6 — Redeploy with LIFF_ID

```bash
bun run deploy
```

### Step 7 — Register webhook

- LINE Developers Console → your Messaging API channel → Messaging API tab
- Webhook URL: `https://log-demo-line.<your-subdomain>.workers.dev/webhook`
- Toggle **Use webhook** → ON
- Click **Verify** — should return 200

### Step 8 — Open in LINE

```
https://liff.line.me/<LIFF_ID>
```

Or scan the QR code from LINE Developers Console → LIFF tab → your app → QR code icon.

### Step 9 — Stream live logs

```bash
bun run tail
```

## Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Fullscreen MINI App (loads LIFF SDK, inits, shows observe UI) |
| `GET` | `/api/demo/wasm/version` | Rust WASM version (proves WASM loaded) |
| `POST` | `/api/demo/wasm/scrub` | Scrub sensitive fields via Rust |
| `GET` | `/api/demo/wasm/sample` | Sampling decision via Rust |
| `GET` | `/api/demo/health` | Health check |
| `GET` | `/api/demo/timed` | Timed async op (ok) |
| `GET` | `/api/demo/timed-fail` | Timed async op (fails) |
| `GET` | `/api/demo/child` | Child logger scoped to resource |
| `GET` | `/api/demo/throw` | Deliberate throw → structured 500 |
| `GET` | `/api/demo/error` | Manual error log |
| `GET` | `/api/demo/worker-log` | Worker-side subsystem loggers |
| `POST` | `/api/demo/line-push` | Push Flex Message via Messaging API |
| `POST` | `/webhook` | LINE webhook receiver |
| `GET` | `/api/debug/logs` | Log buffer dump |
| `GET` | `/api/debug/logs/tail` | SSE log stream |

## Env vars

| Name | How to set | Description |
|------|-----------|-------------|
| `LIFF_ID` | `wrangler.toml [env.production.vars]` | LIFF app ID — safe to commit |
| `CHANNEL_ACCESS_TOKEN` | `bun run secret:token` | Messaging API token — never commit |
| `CHANNEL_SECRET` | `bun run secret:secret` | Webhook signature key — never commit |
