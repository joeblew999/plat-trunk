# ADR-0012: Deployment Topologies — Cloud, LAN, Hybrid

**Status:** Proposed  
**Date:** March 2026  
**Author:** Gerard Webb

---

## Context

plat-trunk currently runs exclusively on Cloudflare Workers (cloud). The first
real factory customer (Prin, Si Racha, Thailand) has raised a concrete
requirement: some factories need to run entirely on their local LAN, with no
cloud dependency for production operations. Others want cloud collaboration.
Some want both.

Tauri v2 is already integrated in plat-trunk. Automerge CRDT is already the
sync layer. These two facts make multi-topology deployment achievable without
rewriting the core application.

---

## Decision

plat-trunk SHALL support three deployment topologies using identical code:

### Topology A — Cloud Only (current, default)

```
Designer (browser, anywhere)
        │ HTTPS
        ▼
Cloudflare Worker (Hono + Rust WASM)
        ├── D1 (SQLite) — metadata
        └── R2 — Automerge doc bytes, assets
```

Best for: distributed teams, SaaS model, multiple factories collaborating.

---

### Topology B — LAN Only (new)

```
Designer (browser, same LAN)
        │ localhost / LAN IP
        ▼
Tauri v2 app (desktop machine on factory LAN)
        ├── Hono server (same routes as CF Worker)
        ├── SQLite (local D1 equivalent)
        └── Local filesystem (local R2 equivalent)
```

Best for: air-gapped factories, no internet dependency, full data sovereignty.
The browser UI is byte-for-byte identical — it points to localhost instead of
a CF Worker URL. No changes to the frontend.

---

### Topology C — Hybrid / Offline-First (new)

```
Designer (browser)
        │ localhost (primary)
        ▼
Tauri v2 (local)  ←── Automerge CRDT sync (when online) ──→  Cloudflare
        └── Local Hono + SQLite + FS
```

Best for: factories needing local reliability with optional cloud backup and
cross-site collaboration. Automerge CRDT handles sync naturally — it was
designed for offline-first, sync-on-reconnect, conflict-free merging.

---

## How It Works

### Same code, different runtime

| Component | Cloud (Topology A) | LAN/Hybrid (Topology B/C) |
|-----------|-------------------|--------------------------|
| Hono routes | CF Worker | Tauri sidecar process |
| Rust logic | WASM (CF Worker) | Native binary (no WASM needed) |
| Storage | D1 + R2 | SQLite + local filesystem |
| Auth | CF Access / JWT | Simplified or skip for LAN |
| Sync authority | CF R2 | Local file, sync to CF when online |
| Frontend | CF Pages | Tauri WebView (same HTML/JS) |

The Hono routes, Zod validators, and OpenAPI schema are identical. Storage
adapters are swapped at the dependency injection layer — the business logic
never changes.

### Tauri as the LAN runtime

Tauri v2 does two things in Topology B/C:

1. **Serves the frontend** — same HTML/JS/WASM bundle as the CF deployment,
   loaded in the Tauri WebView
2. **Runs the backend** — Hono server as a Tauri sidecar on a local port,
   with storage adapters pointing to SQLite and local filesystem

The browser (WebView) makes identical HTTP calls. They resolve to localhost
instead of workers.dev. The frontend has zero awareness of which topology
it is running in.

### Automerge as the sync layer

Automerge CRDT is already used for real-time collaboration in Topology A.
In Topology C it additionally handles offline→online sync:

- Local Automerge doc is the source of truth while offline
- On reconnect, local doc merges with CF R2 doc — no conflicts, no manual
  resolution required
- Multiple factory sites automatically stay in sync via CF as the merge point

---

## Consequences

### What must be built

1. **Storage adapter trait** — abstract over (D1+R2) vs (SQLite+local FS)
   so Hono routes are storage-agnostic. Currently routes talk directly to
   CF bindings — this needs an abstraction layer.

2. **Tauri sidecar** — Hono server process launched by Tauri, with local
   storage adapters injected. Tauri already exists; the sidecar config needs
   adding.

3. **Sync bridge** (Topology C only) — when online, push local Automerge
   doc changes to CF R2 and pull remote changes. The existing sync
   architecture (ADR-0008) handles the merge logic; the bridge just needs
   to know when to trigger it.

### What does NOT change

- Frontend code (zero changes)
- Hono route handlers (zero changes)
- Automerge CRDT logic (zero changes)
- Rust geometry / WASM (zero changes)
- OpenAPI schema / MCP tools (zero changes)
- opcua-howick edge agent (topology-agnostic by design — see ADR-0013)

### Factory UX

A factory installing plat-trunk on their LAN:

1. Downloads the Tauri app (single binary, ~50MB)
2. Runs it on a Windows or Mac desktop in the office
3. Designers open a browser and navigate to `http://[machine-ip]:3000`
4. Everything works — design, export CSV, send to machine — with zero cloud
5. If they later want cloud collaboration, they set a CF sync URL in settings
   and Automerge handles the rest

---

## Related

- ADR-0001: Multi-actor sync (Automerge foundation)
- ADR-0008: Sync architecture redesign
- ADR-0013: Factory hardware integration (Howick + OPC UA)
- Tauri v2 docs: https://v2.tauri.app
- opcua-howick repo: https://github.com/joeblew999/opcua-howick
