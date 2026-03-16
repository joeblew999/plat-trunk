# systems/plugins

First-party plugin implementations. One subdirectory per plugin.

See [ADR-0011](../../docs/adr/0011-plugin-directory-contract.md) for the full directory contract.

---

## Structure

```
plugins/
├── example/        ← reference implementation — always kept working
└── howick/         ← Howick cold-formed steel framing
```

## Every plugin contains

| File | Side | Description |
|------|------|-------------|
| `public/manifest.json` | — | Plugin identity, entry points, permissions |
| `plugin.ts` | Code | Runs in sandboxed context. Only access: `plat.*` global |
| `index.html` | UI | Runs in null-origin iframe. Only comms: `postMessage` |
| `crate/` | Compute | Optional Rust crate → WASM via wasm-pack |

## The runtime lives elsewhere

`systems/plugin/` (singular) contains the plugin **engine**:
- `host/plugin-manager.ts` — loads/unloads plugins
- `host/plugin-sandbox.ts` — creates the sandboxed JS context
- `types/index.d.ts` — the `plat` global type definitions

Plugin authors never touch `systems/plugin/`.

## Adding a new first-party plugin

```
systems/plugins/
└── my-plugin/
    ├── public/manifest.json   ← copy from example, update id/name/permissions
    ├── plugin.ts              ← your plugin logic, uses plat.*
    ├── index.html             ← your plugin UI panel
    └── crate/                 ← optional: only if you need Rust/WASM compute
        ├── Cargo.toml
        └── src/lib.rs
```

The type reference at the top of `plugin.ts`:

```typescript
/// <reference types="../../plugin/types/index.d.ts" />
```

## Third-party plugins

Third-party plugins are NOT in this repo. They are:
- Served from Cloudflare R2
- Registered in Cloudflare KV as `plugin:{id}` → `{ manifestUrl, enabled }`
- Loaded at runtime via `fetch(manifestUrl)`

See ADR-0011 for the full third-party installation model.
