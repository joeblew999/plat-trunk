# Global mise setup

plat-trunk uses `mise.toml` (no dot, committed) as the shared config at every
level — repo root and each system. This is mise's intended pattern for shared
configs. See: https://mise.jdx.dev/configuration.html

## File conventions

| File | Purpose | Committed |
|---|---|---|
| `mise.toml` | Shared config — tools, env, tasks | ✅ Yes |
| `.mise.toml` | Local overrides (gitignored) | ❌ No |
| `mise.local.toml` | Local overrides (gitignored) | ❌ No |

## Structure

```
mise.toml                        ← repo root — tools, env (ports), all tasks
systems/sync/mise.toml           ← sync system — standalone [tools] + tasks
systems/truck/mise.toml          ← truck system — standalone [tools] + tasks
systems/auth/mise.toml           ← auth system — tasks only
systems/docs/mise.toml           ← docs system — tasks only
systems/plugins/howick/mise.toml ← howick plugin — standalone [tools] + tasks
lib/observe/mise.toml            ← observe lib — standalone [tools] + tasks
```

## Tool version policy

Systems with a WASM build (`sync`, `truck`, `howick`, `lib/observe`) pin their
own `[tools]` so they are **fully standalone** — runnable in CI or as a
submodule without the root. These versions must always match root `mise.toml`.

Systems without WASM (`auth`, `docs`, `test`) inherit tools from the root and
don't need their own `[tools]` block.

## Dev machine setup

```bash
# Install all tools at pinned versions (run once, or after tool version bumps)
mise install

# Verify
mise doctor
```

## Keeping versions in sync

When bumping a tool version, update in this order:

1. Root `mise.toml` `[tools]`
2. `systems/sync/mise.toml`, `systems/truck/mise.toml`, `systems/plugins/howick/mise.toml`, `lib/observe/mise.toml`

All `[tools]` blocks should always have identical versions.
