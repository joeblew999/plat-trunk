/**
 * truck-js WASM loader for Cloudflare Workers (ADR-0018 Phase 0)
 *
 * Problem: wasm-bindgen --target bundler generates `import * as wasm from "./file.wasm"`
 * which expects bundler-style WASM instantiation. Wrangler imports .wasm as
 * WebAssembly.Module but doesn't auto-instantiate with the JS glue imports.
 *
 * Solution: Lazy init — import the module, instantiate with glue imports on first use.
 */

// Wrangler imports .wasm files as WebAssembly.Module
import wasmModule from '../pkg/truck_js_bg.wasm';
import * as bg from '../pkg/truck_js_bg.js';

let initialized = false;

export async function initTruckWasm(): Promise<typeof bg> {
  if (initialized) return bg;

  // Collect the JS functions that WASM imports from the glue code
  const imports = {
    './truck_js_bg.js': {
      __wbg___wbindgen_string_get_72fb696202c56729: bg.__wbg___wbindgen_string_get_72fb696202c56729,
      __wbg___wbindgen_throw_be289d5034ed271b: bg.__wbg___wbindgen_throw_be289d5034ed271b,
      __wbg_error_3c7d958458bf649b: bg.__wbg_error_3c7d958458bf649b,
      __wbindgen_cast_0000000000000001: bg.__wbindgen_cast_0000000000000001,
      __wbindgen_init_externref_table: bg.__wbindgen_init_externref_table,
    }
  };

  const instance = await WebAssembly.instantiate(wasmModule, imports);
  bg.__wbg_set_wasm(instance.exports);
  // @ts-expect-error — __wbindgen_start exists on the WASM exports
  (instance.exports.__wbindgen_start as Function)();
  initialized = true;
  return bg;
}

// Re-export types for convenience
export type { AbstractShape, Edge, Face, Shell, Solid, Vertex, Wire, PolygonMesh, PolygonBuffer } from '../pkg/truck_js.js';
