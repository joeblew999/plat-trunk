# auth

Consolidated from two systems:
- **Identity** — [better-auth v1.5](https://github.com/better-auth/better-auth): sign-in, sign-up, sessions, OAuth 2.1, MFA, organizations
- **Permissions + filesystem** — [zanzojs](https://github.com/GonzaloJeria/zanzojs): Zanzibar-style ReBAC tuples + permissioned `@cloudflare/shell` file storage

---


**Stack**: better-auth v1.5 · zanzojs · @cloudflare/shell · OpenAPIHono · Zod · D1 · KV · R2 · DaisyUI v5 (CDN)

**Web UI**: server-side rendered TypeScript templates — no Vite, no build step, no static files

## Generic

Its a generic system, and so the E2e folder seeds and then tests it.


## Grants

Users can grant other others rights.

## Domains

Domains can use the Zanzibar-style ReBAC tuples system.

## File System 

Think of it as **Google Drive with authentication** — users sign in, every file they create is stored under their identity, and ReBAC permissions control exactly who can read, write, or share each file. Built entirely on Cloudflare primitives.

---

## Architecture

```
Client → plat-router (port 8788)
  /auth/api/*  → auth-worker (port 8790) — better-auth handler
  /auth/*      → auth-worker (port 8790) — server-side rendered pages
  /zano/*      → auth-worker (port 8790) — ReBAC permissions + filesystem
  /openapi.json → OpenAPI 3.0 spec
  /doc          → Swagger UI

Other workers → auth-worker via Service Binding (AuthZanoRPC)
```

`getActor()` resolution order (same on client and server):
1. `?actor=` query param — dev/test override (highest priority)
2. `x-actor` header — service-to-service
3. Better Auth session cookie — production path
4. `User:anonymous` fallback

---

## What is `@cloudflare/shell`?

`@cloudflare/shell` is part of the [Cloudflare Agents SDK](https://github.com/cloudflare/agents). It provides a `Workspace` abstraction — a virtual filesystem for a user or agent — backed entirely by Cloudflare primitives:

| Layer | Cloudflare primitive | What it stores |
|-------|---------------------|----------------|
| **Metadata + small files** | D1 (SQLite) — `AUTH_DB` | File paths, directory structure, stat info, file content under ~1 MB |
| **Large file content** | R2 — `FILES` bucket | File content over the D1 threshold (automatically spills to R2) |

This is the same `AUTH_DB` D1 database used by better-auth for user tables — the two share one database with no schema conflicts. The `zanzo_tuples` table (also in `AUTH_DB`) is the permission layer on top.

**The result is Google Drive semantics on Cloudflare infrastructure:**

```
Sign in (better-auth) → User:abc123
  ↓
Write /projects/demo/notes.txt (PermissionedBackend)
  ↓ check: can User:abc123 write to Directory:/projects/demo?
  ↓ yes (they own it) → write via Workspace
  ↓ small file → stored in AUTH_DB (D1)
  ↓ large file → metadata in AUTH_DB, content in FILES (R2)

Share with User:bob
  → PUT /zano/grant { subject:"User:bob", relation:"viewer", type:"File", id:"/projects/demo/notes.txt" }
  → tuple stored in zanzo_tuples (AUTH_DB)
  → Bob can now GET /zano/files/projects/demo/notes.txt
```

The `PermissionedBackend` wraps every filesystem operation with a permission check before executing — actors are resolved from their Better Auth session cookie, so all file operations are automatically tied to an authenticated identity.

---

## Quick Start

```bash
# 1. Provision Cloudflare resources (MacBook, one-time)
wrangler d1 create auth-db
wrangler kv namespace create AUTH_KV
wrangler r2 bucket create auth-files
# → paste IDs into systems/auth/worker/wrangler.toml

# 2. Local dev (from systems/auth/)
mise run dev    # auth-worker :8790

# 3. Migrations run automatically on first request, or manually:
curl -X POST http://localhost:8790/auth/migrate
curl -X POST http://localhost:8790/zano/migrate

# 4. Run tests (seeds fixtures + runs all 51 Playwright tests)
mise run test:e2e
```

---

## Permission API (`/zano/*`)

Actor is resolved from the Better Auth session. In dev, pass `?actor=User:alice` to override.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/zano/health` | Health check |
| `POST` | `/zano/migrate` | Create `zanzo_tuples` table (idempotent) |
| `GET` | `/zano/check` | `?actor=&action=&type=&id=` — permission check |
| `PUT` | `/zano/grant` | `{ subject, relation, type, id }` — grant tuple |
| `DELETE` | `/zano/revoke` | `{ subject, relation, type, id }` — revoke tuple |
| `GET` | `/zano/snapshot` | All permissions for current actor |
| `GET` | `/zano/tuples` | Debug — all tuples in DB |

## Filesystem API (`/zano/files/*`, etc.)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/zano/files/*path` | Read file |
| `PUT` | `/zano/files/*path` | Write file |
| `DELETE` | `/zano/files/*path` | Delete file |
| `POST` | `/zano/append/*path` | Append to file |
| `GET` | `/zano/ls/*path` | List directory |
| `GET` | `/zano/exists/*path` | Check path exists |
| `GET` | `/zano/stat/*path` | File/directory stat |
| `POST` | `/zano/mkdir/*path` | Create directory (recursive) |
| `DELETE` | `/zano/rmdir/*path` | Delete directory (recursive) |
| `GET` | `/zano/glob` | `?pattern=` glob |
| `POST` | `/zano/cp` | `{ from, to }` copy file |
| `POST` | `/zano/mv` | `{ from, to }` move file |
| `POST` | `/zano/cpdir` | `{ from, to }` copy directory |
| `POST` | `/zano/mvdir` | `{ from, to }` move directory |
| `GET` | `/zano/fs` | Debug — glob all stored files |

---

## Permission Schema

Permissions cover **two dimensions** — filesystem paths AND application domain objects. Both use the same zanzo tuple store (`zanzo_tuples` in `AUTH_DB`).

Two schema files merged by `mergeSchemas()` into a single `ZanzoEngine`:

### Filesystem permissions (`schema-fs.ts`)

Driven by `@cloudflare/shell`. Every read/write/delete on a file or directory is checked against these relations before the operation executes.

| Entity | Relations | Actions |
|--------|-----------|---------|
| `File` | `owner`, `editor`, `viewer` | `read`, `write`, `delete`, `share` |
| `Directory` | `owner`, `editor`, `viewer` | `read`, `write`, `delete`, `share` |

Ownership on a `Directory` implies permission on its contents — owning `/projects/demo` means you can write `/projects/demo/notes.txt`.

### Domain permissions (`schema-domain.ts`)

Application-level resources that are **not files** — CAD models, drones, projects. Other workers check these via the `AuthZanoRPC` service binding (e.g. the truck-cad worker checks `execute_command` before running a CAD command from an MCP agent).

| Entity | Relations | Actions |
|--------|-----------|---------|
| `User` | — | actor type only |
| `Agent` | — | actor type (MCP agents — ADR-0039) |
| `Service` | — | actor type (pipeline service accounts) |
| `Project` | `owner`, `editor`, `viewer` | `read`, `edit`, `delete`, `manage` |
| `CadModel` | `owner`, `editor`, `viewer`, `agent`, `project` | `read`, `edit`, `delete`, `execute_command` |
| `Drone` | `operator`, `viewer`, `agent`, `project` | `read_telemetry`, `execute_command` |

Permission inheritance: a `CadModel` linked to a `Project` via the `project` relation inherits the project's permissions — `project.viewer` can `read`, `project.owner` can `delete`.

**Example tuples — both filesystem and domain in the same store:**
```
# Filesystem
User:alice   owner    Directory:/projects/demo
User:bob     viewer   File:/projects/demo/notes.txt

# Domain
User:gerard  operator  Drone:123
Agent:claude editor    CadModel:abc
User:max     owner     Project:xyz
```

**The same `AUTH_DB` stores everything.** Identity tables (better-auth), filesystem metadata (@cloudflare/shell), and permission tuples (zanzo) all share one SQLite database — queried together, migrated together, backed up together.

---

## Service Binding RPC (`AuthZanoRPC`)

Other workers can call auth-worker directly via a Service Binding:

```typescript
// In wrangler.toml:
// [[services]]
// binding    = "AUTH"
// service    = "auth-worker"
// entrypoint = "AuthWorker"

import type { AuthZanoRPC } from 'auth-worker/zano-types';
interface Env { AUTH: AuthZanoRPC }

// Check permission
const allowed = await env.AUTH.check('User:alice', 'edit', 'CadModel', '123');

// Grant access
await env.AUTH.grant('User:alice', 'owner', 'Project', 'xyz');

// Write a file (permission-checked)
await env.AUTH.writeFile('/projects/xyz/notes.txt', 'hello', 'User:alice');
```

---

## Identity Plugins

Configured in `worker/src/plugins.ts` — comment/uncomment to toggle. Run `POST /auth/migrate` after changes.

**Enabled:**
`twoFactor` · `magicLink` · `emailOTP` · `organization` · `admin` · `multiSession` · `anonymous` · `bearer` · `jwt` · `oauthProvider` · `oneTimeToken`

**Commented out (ready to enable):**
`passkey` · `apiKey` · `phoneNumber` · `genericOAuth` · `haveIBeenPwned` (disabled — blocks test passwords)

---

## Identity API (`/auth/*`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/health` | Health check |
| `POST` | `/auth/migrate` | Run better-auth DB migrations |
| `GET` | `/auth/api/get-session` | Current session |
| `POST` | `/auth/api/sign-up/email` | Register |
| `POST` | `/auth/api/sign-in/email` | Sign in |
| `POST` | `/auth/api/sign-out` | Sign out |
| `POST` | `/auth/api/forget-password` | Request reset email |
| `POST` | `/auth/api/reset-password` | Reset via token |
| `GET/POST` | `/auth/api/oauth/*` | OAuth 2.1 flows |

---

## Bindings

One D1 database (`AUTH_DB`) serves three purposes — no schema conflicts, all tables are `IF NOT EXISTS`:

| Binding | Type | What lives inside |
|---------|------|-------------------|
| `AUTH_DB` | D1 (SQLite) | **better-auth tables** (users, sessions, accounts, verifications…) + **zanzo_tuples** (permission tuples) + **@cloudflare/shell metadata** (file paths, stat, small file content) |
| `AUTH_KV` | KV | Session cache + rate limit counters (better-auth) |
| `FILES` | R2 | Large file content — `@cloudflare/shell` spills files here when they exceed the D1 inline threshold |
| `ASSETS` | Static assets | Web UI pages (sign-in, sign-up, demo, consent…) |

---

## Demo

After signing in, visit `/auth/demo` — a live page showing:
- Your session actor (real `User:{id}` from Better Auth)
- Grant/revoke/check permissions interactively
- Read/write files with permission enforcement
- All tuples in the DB

---

## Ports

| Service | Port | Inspector |
|---------|------|-----------|
| auth-worker | 8790 | 9231 |

---

## Tests

51 Playwright tests — real requests against a live worker, no mocks.

```bash
# Start worker (if not already running)
mise run dev

# Run all tests (seeds fixtures automatically via globalSetup)
mise run test:e2e

# Full self-contained CI gate (starts worker, runs tests, stops)
mise run ci
```

`e2e/global-setup.ts` seeds all accounts and permission tuples via the public API before any test runs. `e2e/fixtures.ts` is the single source of truth for all actors and Zanzibar tuples.

Test coverage:
- Worker health + OpenAPI spec
- Fixture state — all seeded permissions verified
- Sign-up / sign-in API + UI forms
- Demo page — actor override, permission check/grant, filesystem via UI
- Domain permissions (CadModel, Drone, Project, Agent)
- Filesystem API — read/write, permission enforcement, stat, mkdir, append, glob, cp, mv, cpdir, mvdir, deleteDir, large file R2 spill
