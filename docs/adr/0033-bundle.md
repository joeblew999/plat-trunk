# ADR 0032 - Bundling.

We have a multi worker architecture.

We need to be able to run on Any Desktop and Server without Cloudflare.

We need to be able to run with or / without source code, without any changes to the wranglers, etc.

The idea is that i can let me users run system locally OR on Cloudflare.

My understanding is that all they need is bun and wrangler, because inside wrangler is miniflare.

Yes, you can absolutely maintain one setup that handles both. You don't need a different `wrangler` installation, but you will use **Wrangler Environments** to toggle between "Source Mode" (for your own development) and "Bundle Mode" (for distribution or production).

By defining these in your `wrangler.toml`, you create a single source of truth that behaves differently depending on which flag you pass.

---

### 1. The "Dual-Mode" `wrangler.toml`

You can use the top-level configuration for your active source-based development and an `[env.bundle]` section for your compiled WASM distribution.

```toml
#:schema node_modules/wrangler/config-schema.json
name = "my-hono-wasm-worker"
compatibility_date = "2024-03-01"

# --- DEFAULT: SOURCE MODE (For You) ---
# Wrangler will look at your TS files and handle the Rust/WASM build automatically
main = "src/index.ts"

[build]
command = "wasm-pack build --target web"

# --- BUNDLE MODE: FOR USERS / PRODUCTION ---
[env.bundle]
# We point directly to the pre-built artifacts
main = "dist/index.js"

[env.bundle.build]
# No build command needed here because it's already compiled!
command = ""

[[env.bundle.rules]]
type = "CompiledWasm"
globs = ["**/*.wasm"]

```

---

### 2. How to Run Each Mode

Since you are using **Bun**, you can map these to simple scripts in your root `package.json`:

| Scenario | Command | What happens? |
| --- | --- | --- |
| **Your Dev** | `bunx wrangler dev` | Uses `src/index.ts`, watches for Rust/TS changes, and re-compiles. |
| **Testing Bundle** | `bunx wrangler dev --env bundle` | Ignores `src`, runs only the `dist/index.js` and `module.wasm` files. |
| **Deploying** | `bunx wrangler deploy --env bundle` | Uploads your "Black Box" bundle to the Cloudflare edge. |

---

### 3. Strategy for Distribution

When you want to give this to other devs without source access, you don't give them your whole folder. You give them a "Distribution Kit":

1. **Run your build:** `bun run build` (produces the `dist/` folder).
2. **Clean the `wrangler.toml`:** Provide a version of the TOML that *only* contains the `bundle` settings as the default.
3. **Ship:** They get `dist/`, the simplified `wrangler.toml`, and a `package.json`.

### 4. Pro-Tip: The "Internal" vs "External" Service Binding

If your worker architecture relies on other workers, remember that Service Bindings need to exist in the environment you are running.

In your `wrangler.toml`, you should include the bindings in both sections:

```toml
# Your bindings for dev
services = [ { binding = "AUTH", service = "auth-worker-dev" } ]

[env.bundle]
# Their bindings for local use
services = [ { binding = "AUTH", service = "auth-worker-bundled" } ]

```

---

### Why this is the "Golden Path"

* **Consistency:** You are using the same `wrangler` logic for everything.
* **Speed:** Switching from source to bundle is just a `--env` flag away.
* **Isolation:** You can verify that your bundle actually works (and that you didn't miss a file) before you ever send it to a user or deploy it.

**Would you like me to show you how to write a Bun script that "vacuums" only the necessary files into a ZIP for your users automatically?**