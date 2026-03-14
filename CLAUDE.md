# CLAUDE.md — Claude Session Bootstrap

General project context, architecture, and commands are in **[AGENT.md](AGENT.md)**.

This file covers what Claude specifically needs to do at the start of every session.

---

## Session Setup (do this every time)

### 1. Clone + authenticate

```bash
git clone https://github.com/joeblew999/plat-trunk /home/claude/plat-trunk
cd /home/claude/plat-trunk
git remote set-url origin https://{GITHUB_PAT}@github.com/joeblew999/plat-trunk.git
git config user.email "claude@anthropic.com"
git config user.name "Claude"
```

GitHub PAT is stored in Claude's memory. Repo is public — PAT only needed for push.

### 2. Install tools via mise

```bash
mise install   # pins bun 1.x + node 22 from .mise.toml
               # rust handled by rust-toolchain.toml
```

### 3. Cloudflare credentials (if running wrangler commands)

Ask the user to provide `.mise.local.toml` contents, then write to `/home/claude/plat-trunk/.mise.local.toml`.
See `.mise.local.toml.example` for the required format.

### 4. Checkout the right branch

Ask the user which branch to work on, or check what's in flight:

```bash
git branch -r        # see all remote branches
git log --oneline -5 # see recent commits on current branch
```

Active branches:
- `main` — stable
- `feat/auth-system` — auth worker (better-auth-cloudflare), in progress

---

## Key URLs

| | URL |
|--|-----|
| **Repo** | https://github.com/joeblew999/plat-trunk |
| **Active PR** | https://github.com/joeblew999/plat-trunk/pull/new/feat/auth-system |
| **Production** | https://cad.ubuntusoftware.net |
| **Docs** | https://cad.ubuntusoftware.net/docs/ |
| **Cloudflare dash** | https://dash.cloudflare.com |
| **Upstream issue** | https://github.com/zpg6/better-auth-cloudflare/issues/49 |

---

## What Claude can do in this repo

- Read, write, and push code on any branch
- Run `bun`, `wrangler`, `cargo`, `mise` commands in the container
- Provision Cloudflare resources (D1, KV, R2) if `.mise.local.toml` is present
- Run tests: `bun run test:auth`, `bun run test:api`, `bun run test:sync`
- Build: `bun run build:auth`, `bun run build:truck`, `bun run build`
- Deploy: `bun run deploy` (requires Cloudflare credentials)

## What Claude cannot do

- Persist files between sessions — clone fresh each time
- Access GitHub without the PAT (stored in memory)
- Run wrangler deploys without `.mise.local.toml` credentials

## Memory

Claude stores the following in persistent memory across sessions:
- Repo URL + GitHub PAT
- Active branch and feature context

If memory seems stale, ask the user to confirm the current branch and any new context.
