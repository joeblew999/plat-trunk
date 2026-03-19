# ADR-0020: Tauri v2 as Native Shell Unification Layer

**Status:** Accepted  
**Date:** March 2026  
**Author:** Gerard Webb  
**Proof of concept:** `lib/observe/demo-tauri/` — Tauri shell wrapping the observability experiment

---

## Context

plat-trunk is browser-native — the Truck B-Rep kernel runs as WASM, the frontend
is Lit + Datastar, and the backend is Cloudflare Workers. This is the right
architecture for the core product.

However, there are platform capabilities that a browser cannot access:

- Native file system (not the sandboxed File System Access API)
- ARKit / LiDAR (iOS/macOS only, not available in WebXR)
- OPC UA and raw TCP sockets (factory hardware integration)
- Background process management (spawning local workers, edge agents)
- OS-level notifications and system tray
- App store distribution (iOS App Store, Mac App Store)

A native shell is needed that wraps the existing web frontend without requiring
a rewrite of the CAD platform itself.

Tauri v2 was validated as the right approach through `lib/observe/demo-tauri/`,
a working shell built for the observability experiment (`lib/observe/`). That
experiment confirmed that Tauri v2 can wrap a Cloudflare Workers-backed web app,
the `tauri-specta` typed IPC pattern works correctly across desktop and iOS, and
the `#[cfg(mobile)]` / `#[cfg(desktop)]` compile-time branching is sound.
`lib/observe/` remains an experiment — it is not a production system and not
the reference implementation for plat-trunk's native shell.

---

## Decision

Use **Tauri v2** as the native shell for plat-trunk across desktop (macOS,
Windows, Linux) and mobile (iOS, Android).

The `tauri-specta` IPC pattern was validated in `lib/observe/demo-tauri/` as
part of the observability experiment. The production plat-trunk shell will be
a separate codebase, not derived from that experiment.

---

## Why Tauri v2 over alternatives

| Option | Reuses web frontend | Rust-native | iOS support | Bundle size | No Chromium |
|--------|-------------------|-------------|-------------|------------|-------------|
| Tauri v2 | ✓ | ✓ | ✓ | ~3MB | ✓ uses OS webview |
| Electron | ✓ | ✗ | ✗ | ~150MB | ✗ bundles Chromium |
| Capacitor | ✓ | ✗ | ✓ | medium | ✓ |
| React Native | ✗ requires rewrite | ✗ | ✓ | medium | ✓ |
| Pure native (Swift/Kotlin) | ✗ requires rewrite | ✗ | ✓ | small | ✓ |
| PWA | ✓ | ✗ | △ limited | none | ✓ |

The decisive factors:

- **Existing web frontend is unchanged.** Tauri wraps the WASM app as-is. No
  port, no adapter layer, no duplicate UI code.
- **Rust is already the stack.** Tauri's native side is Rust. Native commands
  share types with the WASM crates — the same `serde` structs work on both sides.
- **tauri-specta** generates TypeScript bindings automatically from Rust command
  signatures. The IPC layer is fully typed with zero manual maintenance.
- **iOS is first-class in Tauri v2.** This is what unlocks ARKit (ADR-0019),
  which requires native Swift and cannot be done in a browser.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Tauri native shell  (Rust + Swift/Kotlin per platform)  │
│                                                          │
│  Native commands (tauri-specta typed IPC):               │
│  • File system access                                    │
│  • ARKit / LiDAR  (iOS/macOS — ADR-0019)                 │
│  • OPC UA / TCP sockets  (factory — ADR-0013)            │
│  • Local process management  (dev workers)               │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │  OS WebView  (WKWebView on Apple, WebView2 on Win) │  │
│  │                                                    │  │
│  │  plat-trunk web frontend (unchanged)               │  │
│  │  Lit + Datastar + Truck WASM                       │  │
│  │  cadCommand() / cadDocManager / sceneController    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

The web frontend has no knowledge of whether it is running inside Tauri or a
plain browser. Native capabilities are injected via Tauri's `window.__TAURI__`
bridge, which is only present in the Tauri context.

---

## tauri-specta pattern

All native commands follow this pattern, validated in `lib/observe/demo-tauri/`:

**1. Define commands in Rust with specta annotations:**
```rust
// src-tauri/src/commands.rs
#[tauri::command]
#[specta::specta]
pub fn my_command(input: MyInput) -> Result<MyOutput, String> { ... }
```

**2. Register commands and export bindings on debug build:**
```rust
// src-tauri/src/lib.rs
let builder = Builder::<tauri::Wry>::new()
    .commands(collect_commands![my_command]);

#[cfg(debug_assertions)]
builder.export(
    specta_typescript::Typescript::default(),
    "../src/bindings.ts",
).expect("failed to generate bindings.ts");
```

**3. TypeScript calls the generated typed wrapper:**
```typescript
// src/main.ts
import { commands } from './bindings'
const result = await commands.myCommand({ ... })
```

`src/bindings.ts` is auto-generated on every debug build and committed as a
stub. It is never edited by hand.

---

## Platform branching

Desktop and mobile share the same codebase. Platform differences are handled
at compile time:

```rust
#[cfg(desktop)]
{
    // Spawn local bun/cargo processes, open multiple windows, file system paths
}

#[cfg(mobile)]
{
    // Single window, point at deployed CF worker URL (no local processes)
}
```

The mobile shell points at a deployed Cloudflare Worker URL set via the
`OBSERVE_BASE_URL` environment variable at build time. Desktop defaults to
`http://localhost`.

---

## Repository layout convention

Each lib or system that needs a Tauri shell gets its own directory following
this structure:

```
lib/<name>/demo-tauri/        (for lib demos)
systems/<name>/tauri/         (for system shells)
lib/arkit/                    (dedicated native capability — ADR-0019)

  src/
    main.ts                   ← frontend entry point
    bindings.ts               ← generated, do not edit
  src-tauri/
    Cargo.toml
    tauri.conf.json
    src/
      lib.rs                  ← tauri::Builder, plugin registration
      commands.rs             ← #[tauri::command] #[specta::specta]
    gen/
      apple/                  ← generated Xcode project (cargo tauri ios init)
```

---

## Versions

| Crate | Version |
|-------|---------|
| tauri | 2.x |
| tauri-plugin-shell | 2.x |
| tauri-specta | =2.0.0-rc.21 |
| specta | =2.0.0-rc.22 |
| specta-typescript | =0.0.9 |

Specta versions are pinned exactly — the rc series has breaking changes between
minor versions.

---

## Apple configuration

| Setting | Value |
|---------|-------|
| Apple Team ID | 9Z237BG9S9 |
| Bundle ID prefix | net.ubuntusoftware |
| Xcode project location | `src-tauri/gen/apple/` |
| iOS simulator runtime | Downloaded once via `bun run ios:runtime` |

---

## Out of scope

- **Android** — Tauri v2 supports Android but it is not a current target.
  Separate ADR when prioritised.
- **visionOS** — not yet supported by Tauri v2.
- **Auto-update** — `tauri-plugin-updater` is available but not yet wired in.

---

## Related

- ADR-0012: Deployment topologies (Cloud, LAN, Hybrid) — Tauri enables LAN topology
- ADR-0013: Factory hardware integration — OPC UA native commands via Tauri
- ADR-0019: ARKit integration — depends on this ADR
- `lib/observe/demo-tauri/` — proof of concept Tauri shell; part of the observability experiment, not a production system
- ADR-0009: Platform observability — the experiment `lib/observe/demo-tauri/` belongs to
- Tauri v2 docs: https://v2.tauri.app
- tauri-specta: https://github.com/specta-rs/tauri-specta
