# Global mise setup

mise supports a global config at `~/.config/mise/config.toml` that applies
across all repos on your machine. This is the right place to pin tool versions
that are shared across all plat-trunk systems (and any other repos you work in).

## Why

Each system (`sync`, `truck`, `auth`) pins its own `[tools]` in its `.mise.toml`
so it is **standalone** — runnable in CI or as a submodule without the root.
But on your dev machine, you only want one copy of `bun`, `node`, `wasm-pack` etc.

The global config is the single source of truth for your machine. Per-repo
`.mise.toml` versions override it when they differ.

## Setup

```bash
mkdir -p ~/.config/mise
```

Then create `~/.config/mise/config.toml`:

```toml
# ~/.config/mise/config.toml — global mise config for plat-trunk dev machine
# https://mise.jdx.dev/configuration.html#global-config
#
# These versions match root .mise.toml and all systems/*.mise.toml [tools].
# Update here first, then propagate to the per-system files.

[tools]
bun               = "1.3.10"   # JS runtime + package manager
node              = "22"       # Node.js 22 — vitest-pool-workers requirement
"cargo:wasm-pack" = "0.14.0"  # Rust → WASM
doppler           = "latest"  # Secrets manager
gh                = "2.87.3"  # GitHub CLI
"cargo:tauri-cli" = "2"       # Tauri CLI (macOS/iOS builds)
xcodegen          = "latest"  # Xcode project gen (Tauri iOS)
ruby              = "3.3"     # cocoapods dependency (Tauri iOS)
"gem:cocoapods"   = "latest"  # Tauri iOS

# Rust: do NOT pin here — let rust-toolchain.toml in each repo control it.
# mise respects rust-toolchain.toml automatically when you cd into a repo.
```

## Install all tools globally

```bash
mise install --global
```

## Keeping versions in sync

When you bump a tool version, update in this order:

1. `~/.config/mise/config.toml` (global — your machine)
2. `/.mise.toml` (repo root)
3. Each `systems/*/.mise.toml` `[tools]` block that pins it

The per-system pins exist for CI/standalone use. They should always match root.
