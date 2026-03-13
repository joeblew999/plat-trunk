# observe-tauri

Desktop shell for lib/observe demos. Opens demo1 and demo2 side-by-side in native windows. The demos run unchanged — Tauri just wraps them.

## Run

```bash
# From lib/observe/demo-tauri/

# Install JS deps (once)
bun install

# Start the app
bun run dev
```

This does three things automatically:
1. Starts demo1 (`:3333`) and demo2 (`:3334`) bun workers via `beforeDevCommand`
2. Opens two native windows loading each worker's UI
3. Opens a control panel window with native parity buttons

## TypeScript bindings — fully automatic

`src/bindings.ts` is **generated automatically** on every `cargo tauri dev` (debug build).

You never call it manually. The flow is:

```
src-tauri/src/commands.rs   ← define commands with #[tauri::command] #[specta::specta]
       ↓  (cargo tauri dev triggers a debug build)
src/bindings.ts             ← generated — typed invoke() wrappers
       ↓
src/main.ts                 ← imports commands.listWorkers(), commands.nativeScrub(), etc.
```

The committed `src/bindings.ts` is a stub so TypeScript compiles before first build. The real file is identical in shape — tauri-specta just replaces it with the generated version on first run.

## What each window does

| Window | URL | Purpose |
|--------|-----|---------|
| demo1  | http://localhost:3333 | Observe demo — browser + worker patterns |
| demo2  | http://localhost:3334 | Same demo, independent worker — proves multi-worker |
| shell  | tauri://localhost     | Control panel — start/stop workers, native parity |

## Native parity panel

The shell window runs `plat-observe` **natively** (no WASM). The demo windows run it as **WASM in the browser**. Both are testable in the same session — same Rust code, two runtimes.

```
Native (Tauri process)   ←→   WASM (browser in webview)
  native_scrub()                /api/demo/wasm/scrub
  native_sample()               /api/demo/wasm/sample
  native_version()              /api/demo/wasm/version
```

## References

- [specta-rs org](https://github.com/specta-rs) — Rust → TypeScript type generation ecosystem
- [tauri-specta](https://github.com/specta-rs/tauri-specta) — Tauri command bindings using specta (v2 used here)
- [specta](https://github.com/specta-rs/specta) — core type export library

## Quick reference

| Command | What it does |
|---------|-------------|
| `bun run dev` | Desktop dev — hot-reload, bindings regenerated on each compile |
| `bun run build` | Desktop release — bindings + icons + native app bundle |
| `bun run run:prod` | Launch the last desktop release build (macOS only) |
| `bun run ios:init` | One-time iOS project scaffold (needs Xcode) |
| `bun run ios:runtime` | One-time iOS simulator runtime download (~5GB, needs fat wifi) |
| `bun run ios:dev` | iOS simulator dev mode |
| `bun run ios:build` | iOS release build |
| `bun run ios:open` | Open Xcode project (for signing, capabilities, manual run) |

## Build for distribution

```bash
# From lib/observe/demo-tauri/
bun run build
```

Runs in order: `gen:bindings` (fresh `src/bindings.ts`) → `gen:icons` (all platform icon sizes) → `cargo tauri build`.

Produces a native app bundle in `src-tauri/target/release/bundle/`.

Individual steps:

```bash
bun run gen:bindings   # regenerate src/bindings.ts from Rust command signatures
bun run gen:icons      # regenerate all icon sizes from src-tauri/icons/icon-source.png
```

To replace the icon: put a new 1024×1024 RGBA PNG at `src-tauri/icons/icon-source.png` and run `bun run gen:icons`.

## iOS

Prerequisites: Xcode, Apple Developer account. CocoaPods is installed automatically by `ios:init`.

```bash
# 1. One-time — scaffolds Xcode project in src-tauri/gen/apple/
bun run ios:init

# 2. One-time — download iOS simulator runtime (needs fat wifi, ~5GB)
bun run ios:runtime

# 3. Apple Team ID is already set in tauri.conf.json (9Z237BG9S9 — gedw99 personal team)
#    Override with: export APPLE_DEVELOPMENT_TEAM=XXXXXXXXXX if needed

# 4. Set deployed CF worker base URL (iOS can't run local bun processes)
export OBSERVE_BASE_URL=https://your-worker.workers.dev

# 5. Dev on simulator
bun run ios:dev

# 6. Release build
bun run ios:build

# Open Xcode project directly (for signing, capabilities, etc.)
bun run ios:open
```

iOS shows a single window (demo1). Process commands (`start_worker`, `stop_worker`, `ping_worker`) return errors on mobile — workers must be deployed to Cloudflare.

`OBSERVE_BASE_URL` defaults to `http://localhost` on desktop.

## Cross-platform builds

`bun run build` only produces bundles for the **current OS** — you cannot build a `.exe` on macOS or vice versa.

For CI/CD multi-platform distribution use [tauri-apps/tauri-action](https://github.com/tauri-apps/tauri-action) with a GitHub Actions matrix:

```yaml
strategy:
  matrix:
    os: [macos-latest, windows-latest, ubuntu-latest]
```

Each runner calls `bun run build` and uploads its bundle as an artifact.
