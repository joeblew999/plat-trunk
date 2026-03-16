# ADR-0011: Plugin Directory Contract

**Status:** Accepted  
**Date:** 2026-03-16

---

## Context

The platform needs a clear, enforced separation between:

1. The plugin **runtime** (the engine that loads and sandboxes plugins)
2. **First-party plugins** (built by this team, shipped with the platform)
3. **Third-party plugins** (built by end users, installed at runtime)

Getting this wrong means:
- Plugin code ends up coupled to the runtime
- First-party plugins have no consistent structure
- Third-party plugin installation has no clear model

## Decision

### Directory layout

```
systems/
├── plugin/                         ← RUNTIME (engine) — never edited by plugin authors
│   ├── host/
│   │   ├── plugin-manager.ts       ← loads/unloads plugins, creates iframes
│   │   ├── plugin-sandbox.ts       ← sandboxed JS context injecting `plat` global
│   │   └── plugin-protocol.ts      ← internal message types (not part of plugin API)
│   └── types/
│       └── index.d.ts              ← `plat` global type definitions (the public API)
│
└── plugins/                        ← FIRST-PARTY PLUGINS — one subdirectory per plugin
    ├── example/                    ← reference implementation, always kept working
    │   ├── public/manifest.json
    │   ├── plugin.ts
    │   ├── index.html
    │   └── crate/                  ← optional Rust/WASM for this plugin
    │       ├── Cargo.toml
    │       └── src/lib.rs
    │
    └── howick/                     ← Howick cold-formed steel framing plugin
        ├── public/manifest.json
        ├── plugin.ts
        ├── index.html
        └── crate/
            ├── Cargo.toml
            └── src/lib.rs
```

### Third-party plugin installation (runtime, not repo)

Third-party plugins are **not** in the repository. They are:

1. Distributed as a directory of static files (manifest.json + plugin.js + index.html + optional .wasm)
2. Served from **Cloudflare R2** (one bucket per plugin, or a registry bucket)
3. Registered in **Cloudflare KV** as `plugin:{id}` → `{ manifestUrl, enabled, installedBy }`
4. Loaded at runtime by the plugin manager via `fetch(manifestUrl)`

The manifest's `host` field specifies the base URL for all plugin assets:

```json
{
  "id": "com.acme.my-plugin",
  "host": "https://pub-abc123.r2.dev/plugins/my-plugin/",
  "code": "plugin.js",
  "ui":   "index.html",
  "wasm": "my_plugin_bg.wasm"
}
```

### Plugin file contract

Every plugin (first-party or third-party) MUST have:

| File | Purpose |
|------|---------|
| `public/manifest.json` | Plugin identity, entry points, permissions |
| `plugin.ts` / `plugin.js` | Code side — runs in sandbox, accesses `plat.*` |
| `index.html` | UI side — runs in null-origin iframe, no `plat` access |

Every plugin MAY have:

| File | Purpose |
|------|---------|
| `crate/` | Rust crate compiled to WASM via wasm-pack |
| `icon.svg` | 32×32 plugin icon shown in the plugin manager UI |

### Type reference path

Plugin `.ts` files reference the types package using a relative path from their location:

```typescript
/// <reference types="../../plugin/types/index.d.ts" />
```

When published as a third-party plugin, authors use the npm package instead:

```typescript
/// <reference types="@plat-trunk/plugin-types" />
```

### WASM loading

The WASM is loaded by `plugin.ts` (the code side) using a dynamic import relative to where `plugin.js` is served. The WASM binary has **no access to `plat`** — it is pure compute only.

```typescript
const mod = await import('./crate/pkg/howick.js')
await mod.default()          // wasm-pack init
howick = mod.execute         // the single dispatch entry point
```

### Permission model

Permissions are declared in `manifest.json` and enforced by the sandbox. The full permission set:

| Permission | Allows |
|------------|--------|
| `model:read` | Read object list and properties |
| `model:write` | Dispatch CAD commands that mutate the scene |
| `selection:read` | Read current selection |
| `selection:write` | Change selection |
| `camera:read` | Read viewport camera state |
| `camera:write` | Set camera position |
| `history:read` | Read undo/redo history |
| `allow:storage` | Plugin-scoped key-value storage |
| `allow:export` | Trigger file export / download |

## Consequences

- `systems/plugin/` is the engine — never contains plugin implementations
- `systems/plugins/` contains only plugin implementations — never contains engine code
- Third-party plugins have a clear installation model (R2 + KV) without touching the repo
- The `example` plugin in `systems/plugins/example/` is the reference implementation and must always build and run correctly
- New first-party plugins (e.g. IFC exporter, structural analyser) each get their own subdirectory under `systems/plugins/`
