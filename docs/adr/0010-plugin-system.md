# ADR-0010: Plugin System Architecture

## Status
Proposed

## Context

plat-trunk needs a plugin system that allows first-party and third-party developers to extend the CAD platform. The key constraints:

1. Plugins must be **sandboxed** — a buggy or malicious plugin cannot corrupt host state
2. Plugins can ship their **own Rust/WASM** for heavy compute (mesh analysis, parametric generation, etc.)
3. Plugins need a **UI panel** — rendered inside the host chrome
4. Plugins need to **call CAD APIs** — dispatch commands, read scene state
5. Everything must work within the **Cloudflare Workers 3MB limit** (plugins are separate workers)

## Decision

Adopt Penpot's plugin architecture exactly. It is proven, simple, and correct.

---

## Architecture

### Two files per plugin. That's it.

```
plugin.js     ← runs in a sandboxed headless context
              ← has ONE injected global: `plat`
              ← NO DOM, NO window, NO fetch — just `plat.*`
              ← can load its own WASM for compute

index.html    ← the visible UI panel
              ← runs in a sandboxed iframe
              ← NO plat access at all
              ← communicates via postMessage only
```

### Message flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Host (truck-cad)                                               │
│                                                                 │
│  ┌─────────────────────────────┐                               │
│  │  PluginManager              │                               │
│  │  - loads plugin.js          │                               │
│  │  - creates sandbox iframe   │                               │
│  │  - creates panel iframe     │                               │
│  │  - broadcasts host events   │                               │
│  └──────┬──────────────┬───────┘                               │
│         │              │                                        │
│  ┌──────▼──────┐  ┌────▼──────────────────────────────────┐   │
│  │  Sandbox    │  │  Panel iframe (index.html)             │   │
│  │  iframe     │  │  sandbox="allow-scripts allow-forms"   │   │
│  │  (hidden)   │  │  NO allow-same-origin                  │   │
│  │             │  │                                        │   │
│  │  plat proxy │  │  window.addEventListener("message")   │   │
│  │  + plugin.js│  │  parent.postMessage(...)              │   │
│  └─────────────┘  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### The plat proxy (what runs inside the sandbox iframe)

The sandbox is a hidden `<iframe sandbox="allow-scripts">` (no `allow-same-origin`). Before `plugin.js` runs, we inject a `plat` global that is a thin message proxy:

```javascript
// Every plat.* call posts to the host
plat.cad.dispatch("add_cube", { size: 1.0 })
  → postMessage({ type: "cad:dispatch", command: "add_cube", params: {size:1}, reqId: 42 })
  ← host executes cadCommand(), posts back { type: "cad:result", reqId: 42, result: {...} }
  → promise resolves with result
```

### WASM in plugins

Plugin WASM is **pure compute** — it has no `extern "C"` host imports. The plugin.ts code:
1. Calls `plat.model.getObjects()` to get data from the host
2. Passes that data to its WASM via `wasmExecute("analyze", JSON.stringify(data))`
3. Gets a result back
4. Sends it to the UI via `plat.ui.sendMessage(result)`

This is the correct separation. WASM = pure function. `plat` = host API.

```
plugin.ts:
  objects = await plat.model.getObjects()   ← host data
  result = wasmExecute("analyze", objects)  ← pure compute (no host access)
  plat.ui.sendMessage(result)               ← push to UI
```

---

## Plugin manifest (manifest.json)

```json
{
  "id": "com.example.my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Does something cool",
  "code": "plugin.js",
  "ui": "index.html",
  "wasm": "plugin_bg.wasm",
  "permissions": ["model:read", "model:write", "selection:read"]
}
```

Hosted anywhere — same as Penpot. Install via URL to `manifest.json`.

---

## Permissions

Declared in manifest, enforced in the plat proxy at call time (not advisory):

| Permission | Grants |
|---|---|
| `model:read` | `plat.model.*`, `plat.on("modelchange")` |
| `model:write` | `plat.cad.dispatch()` |
| `selection:read` | `plat.selection.get()`, `plat.on("selectionchange")` |
| `selection:write` | `plat.selection.set()`, `plat.selection.clear()` |
| `camera:read` | `plat.camera.getMatrix()` |
| `camera:write` | `plat.camera.setMatrix()` |
| `allow:storage` | `plat.storage.*` |
| `allow:export` | export-related commands |

---

## Folder layout

```
systems/plugin/
├── host/
│   ├── plugin-protocol.ts    Internal message type constants (not a plugin SDK)
│   ├── plugin-sandbox.ts     Headless sandbox iframe + plat proxy injection
│   └── plugin-manager.ts     Load/unload, panel iframe, host event broadcast
├── types/
│   └── index.d.ts            @plat-trunk/plugin-types — type defs for `plat` global
│                             Plugin authors reference this. Nothing to import.
└── example-plugin/
    ├── manifest.json
    ├── plugin.ts             Plugin logic (compiled → plugin.js)
    ├── index.html            Plugin UI (the panel)
    └── crate/
        ├── Cargo.toml
        └── src/lib.rs        Pure compute WASM (no host access)
```

---

## What changed from the initial design (and why)

The initial ADR-0010 had a Web Worker layer between the sandbox and the host. This was wrong.

Penpot does not use Web Workers for plugins. After studying the actual Penpot source:

| Initial (wrong) | Correct (Penpot-aligned) |
|---|---|
| 3 layers: UI iframe, Web Worker, host | 2 layers: sandbox iframe (plugin.ts), panel iframe (index.html) |
| Plugin SDK with PluginWorkerSdk, PluginUiSdk | No SDK — just plugin-types for the plat global |
| WASM imports host functions via extern "C" | WASM is pure compute — no host imports |
| Worker owns its own WASM instance | plugin.ts loads WASM, passes data in via JSON |
| Complex message routing | Simple: postMessage host ↔ sandbox ↔ panel |

The Web Worker layer was an over-engineering mistake. The sandbox iframe IS the isolation boundary for the code layer. A Web Worker inside it adds complexity without security benefit.

---

## Consequences

**Good:**
- Identical pattern to Penpot — battle-tested, well-documented
- Plugin authors need zero SDK knowledge: just `plat.*` and `postMessage`
- WASM plugins are pure Rust — no JS imports, no wasm-bindgen complexity for host calls
- Panel UI can use any framework (React, Vue, vanilla) — it's just HTML
- Permissions enforced at the proxy boundary, not advisory
- Works headless (CF Worker) by skipping the iframe layers entirely

**Bad:**
- postMessage serialization cost (negligible in practice)
- Panel UI cannot use host components directly (must style itself)
- Async API (await plat.cad.dispatch()) requires care with error handling
