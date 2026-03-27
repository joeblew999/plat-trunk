/**
 * WASM loader for client tests (workerd runtime).
 * Wraps the sync WASM into a SyncWasmAdapter.
 */

// Wrangler: default import is WebAssembly.Module.
// vitest (vite-plugin-wasm): default is undefined, namespace has instantiated exports.
import wasmDefault from '../pkg-sync/plat_sync_bg.wasm';
import * as wasmStar from '../pkg-sync/plat_sync_bg.wasm';
// @ts-expect-error — generated glue, no .d.ts for bg.js
import * as bg from '../pkg-sync/plat_sync_bg.js';

import type { SyncWasmAdapter } from '@plat/sync/wasm-adapter';

let initialized = false;

async function init(): Promise<void> {
  if (initialized) return;
  if (wasmDefault instanceof WebAssembly.Module) {
    const imports: WebAssembly.ModuleImports = {};
    for (const [k, v] of Object.entries(bg)) {
      if (typeof v === 'function') imports[k] = v as WebAssembly.ImportValue;
    }
    const instance = await WebAssembly.instantiate(wasmDefault, { './plat_sync_bg.js': imports });
    bg.__wbg_set_wasm(instance.exports);
  } else {
    bg.__wbg_set_wasm(wasmStar as unknown as WebAssembly.Exports);
  }
  initialized = true;
}

/** SyncWasmAdapter backed by real WASM — for use in all client tests. */
export async function createTestWasm(): Promise<SyncWasmAdapter> {
  await init();
  return {
    create_doc: () => Promise.resolve(bg.create_doc()),
    apply_op: (d: Uint8Array, j: string) => Promise.resolve(bg.apply_op(d, j)),
    merge_docs: (a: Uint8Array, b: Uint8Array) => Promise.resolve(bg.merge_docs(a, b)),
    get_ops: (d: Uint8Array) => Promise.resolve(bg.get_ops(d)),
    get_op_count: (d: Uint8Array) => Promise.resolve(bg.get_op_count(d)),
    set_op_enabled: (d: Uint8Array, id: string, e: boolean) => Promise.resolve(bg.set_op_enabled(d, id, e)),
    set_group_enabled: (d: Uint8Array, id: string, e: boolean) => Promise.resolve(bg.set_group_enabled(d, id, e)),
    rollback_to: (d: Uint8Array, a: string, i: number) => Promise.resolve(bg.rollback_to(d, a, i)),
    get_replay_ops: (d: Uint8Array) => Promise.resolve(bg.get_replay_ops(d)),
    get_name: (d: Uint8Array) => Promise.resolve(bg.get_name(d)),
    set_name: (d: Uint8Array, n: string) => Promise.resolve(bg.set_name(d, n)),
    doc_hash: (d: Uint8Array) => Promise.resolve(bg.doc_hash(d)),
  };
}

// Raw WASM functions for low-level tests (wasm.test.ts)
export async function rawCreate(): Promise<Uint8Array> { await init(); return bg.create_doc(); }
export async function rawApplyOp(d: Uint8Array, j: string): Promise<Uint8Array> { await init(); return bg.apply_op(d, j); }
export async function rawGetOps(d: Uint8Array): Promise<string> { await init(); return bg.get_ops(d); }
export async function rawMergeDocs(a: Uint8Array, b: Uint8Array): Promise<Uint8Array> { await init(); return bg.merge_docs(a, b); }
export async function rawGetOpCount(d: Uint8Array): Promise<number> { await init(); return bg.get_op_count(d); }
export async function rawSetName(d: Uint8Array, n: string): Promise<Uint8Array> { await init(); return bg.set_name(d, n); }
export async function rawGetName(d: Uint8Array): Promise<string> { await init(); return bg.get_name(d); }
export async function rawGetReplayOps(d: Uint8Array): Promise<string> { await init(); return bg.get_replay_ops(d); }
export async function rawDocHash(d: Uint8Array): Promise<string> { await init(); return bg.doc_hash(d); }
