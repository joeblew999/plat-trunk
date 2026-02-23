/**
 * Headless truck-webgpu-gui WASM loader for Cloudflare Workers (ADR-0018 Phase 0.5)
 *
 * Loads our own crate (truck-webgpu-gui) compiled without the `rendering` feature.
 * Same execute() dispatch as the browser build, but no wgpu/winit/web-sys deps.
 *
 * Problem: wasm-bindgen --target bundler generates `import * as wasm from "./file.wasm"`
 * which expects bundler-style WASM instantiation. Wrangler imports .wasm as
 * WebAssembly.Module but doesn't auto-instantiate with the JS glue imports.
 *
 * Solution: Lazy init — import the module, instantiate with glue imports on first use.
 */

// Wrangler imports .wasm files as WebAssembly.Module
import wasmModule from '../pkg/truck_webgpu_gui_bg.wasm';
// @ts-expect-error — no .d.ts for the bg.js glue (generated code)
import * as bg from '../pkg/truck_webgpu_gui_bg.js';

let initialized = false;

export async function initHeadlessWasm(): Promise<typeof bg> {
  if (initialized) return bg;

  // Collect all glue functions the WASM module needs.
  // WebAssembly.instantiate ignores extras, so we can pass all bg exports.
  const glueImports: WebAssembly.ModuleImports = {};
  for (const [key, value] of Object.entries(bg)) {
    if (typeof value === 'function') {
      glueImports[key] = value as WebAssembly.ImportValue;
    }
  }

  const imports: WebAssembly.Imports = {
    './truck_webgpu_gui_bg.js': glueImports,
  };

  const instance = await WebAssembly.instantiate(wasmModule, imports);
  bg.__wbg_set_wasm(instance.exports);
  (instance.exports as unknown as { __wbindgen_start: () => void }).__wbindgen_start();
  initialized = true;
  return bg;
}

// Re-export the HeadlessController type
export type { HeadlessController } from '../pkg/truck_webgpu_gui.js';
