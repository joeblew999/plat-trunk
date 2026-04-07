# auth-zano — CONSOLIDATED INTO systems/auth

> **This system has been merged into [`systems/auth`](../auth/README.md).**
>
> All code, routes, tests, and documentation now live in `systems/auth`.
> This directory is kept as a reference only — the source files here are no longer active.

---

## What was here

ReBAC permission API + filesystem worker, built on [zanzojs](https://github.com/GonzaloJeria/zanzojs).

- **Permission API** — `zanzoPlugin` (grant/revoke/check/snapshot) backed by D1 `zanzo_tuples`
- **Filesystem API** — `PermissionedBackend` wrapping `@cloudflare/shell` `Workspace` (D1 + R2)
- **Service Binding RPC** — `AuthZanoRPC` interface for other workers

## Where everything went

| Was | Now |
|-----|-----|
| `systems/auth-zano/worker/src/lib/` | `systems/auth/worker/src/lib/` |
| `systems/auth-zano/worker/src/schema*.ts` | `systems/auth/worker/src/schema*.ts` |
| `systems/auth-zano/worker/src/types.ts` | `systems/auth/worker/src/zano-types.ts` |
| `systems/auth-zano/worker/src/index.ts` | merged into `systems/auth/worker/src/index.ts` |
| `systems/auth-zano/test.sh` | `systems/auth/test.sh` |
| `systems/auth-zano/web/` | `systems/auth/web/demo.html` + `src/demo.ts` |
| Port 8791 | Port 8790 (auth-worker handles both) |
| ZANO service binding | AUTH service binding (`/zano/*` routes to AUTH) |

## Why consolidated

One worker, one D1 database (`AUTH_DB` holds both better-auth tables and `zanzo_tuples`), real demo:
- `getActor()` reads from the Better Auth session cookie — no more `?actor=` required in production
- Sign in → get a real session → permission checks use your actual user ID
- `?actor=` query param still works as a dev/test override (used by `test.sh`)

## Routes (now served by auth-worker at port 8790)

All `/zano/*` routes are unchanged — the plat-router now forwards them to AUTH instead of ZANO.

See [`systems/auth/README.md`](../auth/README.md) for the full route list.
