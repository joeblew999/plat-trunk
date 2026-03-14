# CLAUDE.md — Claude Session Bootstrap

General project context, architecture, and commands are in **[AGENT.md](AGENT.md)**.

This file covers what Claude needs at session start, and what needs to run on your MacBook.

---

## Session Setup (Claude does this every time)

### 1. Clone + authenticate

```bash
git clone https://github.com/joeblew999/plat-trunk /home/claude/plat-trunk
cd /home/claude/plat-trunk
git remote set-url origin https://{GITHUB_PAT}@github.com/joeblew999/plat-trunk.git
git config user.email "claude@anthropic.com"
git config user.name "Claude"
```

GitHub PAT is in Claude's memory. Repo is public — PAT only needed for push.

### 2. Install tools

```bash
# mise not available in container — install manually
npm install -g wrangler bun
apt-get install -y rustc cargo
```

### 3. Cloudflare credentials (if running wrangler commands)

Credentials are in Claude's memory. Write `.mise.local.toml`:

```bash
cat > .mise.local.toml << 'EOF'
[env]
CLOUDFLARE_API_TOKEN  = "{CF_API_TOKEN}"
CLOUDFLARE_ACCOUNT_ID = "7384af54e33b8a54ff240371ea368440"
EOF
```

Note: `api.cloudflare.com` is blocked in Claude's container — wrangler deploy/provision must run on MacBook.

### 4. Checkout the right branch

```bash
git branch -r        # see all remote branches
git log --oneline -5 # recent commits
```

Active branches:
- `main` — stable
- `feat/auth-system` — auth worker, tested locally, pending MacBook steps before merge

---

## MacBook Steps — Must Run Locally

These commands are blocked in Claude's container (network or tool restrictions).
Run these on your MacBook, then tell Claude the output so it can update config and push.

### auth-system branch — before merging to main

**1. Provision Cloudflare resources (one-time)**
```bash
cd plat-trunk && git checkout feat/auth-system
export CLOUDFLARE_API_TOKEN=MF39iEfiAnCLmBVcmtMLBO46yb3_2vbK7lfwaLig

wrangler d1 create auth-db
# → paste database_id into systems/auth/worker/wrangler.toml

wrangler kv namespace create AUTH_KV
# → paste id into systems/auth/worker/wrangler.toml
```

**2. Generate canonical auth schema**
```bash
cd systems/auth/worker
bun install
bun run auth:generate
# → commits src/db/auth.schema.ts (replaces hand-written version)
# → tell Claude what changed so migrations can be updated if needed
```

**3. Apply migrations to Cloudflare D1**
```bash
bun run auth:migrate:prod
```

**4. Deploy auth worker**
```bash
cd ../../..   # repo root
bun run deploy
```

**5. Test in browser**
```
https://cad.ubuntusoftware.net/auth/sign-in
https://cad.ubuntusoftware.net/auth/sign-up
```

**6. Merge to main**
Once working in prod — tell Claude and it will merge the PR.

---

## What Claude can do

- Read, write, commit, push on any branch
- Run wrangler dev (miniflare) locally — D1 + KV work in local mode
- Run `bun run build:auth`, typecheck, tests (no live CF bindings needed)
- Run full auth flow locally: sign-up, sign-in, get-session, sign-out all verified ✅

## What needs MacBook

- `wrangler d1 create` / `wrangler kv namespace create` (api.cloudflare.com blocked)
- `bun run auth:generate` (npm CDN for CLI blocked)
- `bun run deploy` (same)
- `wrangler d1 migrations apply --remote` (same)
- Rust/WASM builds (rustup blocked, apt gives 1.75 vs pinned 1.93.1)

---

## Key URLs

| | URL |
|--|-----|
| **Repo** | https://github.com/joeblew999/plat-trunk |
| **Branch** | https://github.com/joeblew999/plat-trunk/tree/feat/auth-system |
| **Production** | https://cad.ubuntusoftware.net |
| **Cloudflare dash** | https://dash.cloudflare.com |
| **Upstream issue** | https://github.com/zpg6/better-auth-cloudflare/issues/49 |

## Memory

Claude stores across sessions: repo URL, GitHub PAT, Cloudflare API token + account ID.
If memory seems stale, ask Claude to view its memory.
