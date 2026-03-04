/**
 * truck-sync WASM loader for Cloudflare Workers.
 *
 * Same lazy-init pattern as truck-wasm.ts (ADR-0018).
 * Built with: wasm-pack --target bundler → worker/pkg-sync/
 */

// Wrangler imports .wasm files as WebAssembly.Module
import wasmModule from '../pkg-sync/truck_sync_bg.wasm';
// @ts-expect-error — generated glue, no .d.ts for bg.js
import * as bg from '../pkg-sync/truck_sync_bg.js';

let initialized = false;

async function initSyncWasm(): Promise<void> {
  if (initialized) return;

  const glueImports: WebAssembly.ModuleImports = {};
  for (const [key, value] of Object.entries(bg)) {
    if (typeof value === 'function') {
      glueImports[key] = value as WebAssembly.ImportValue;
    }
  }

  const instance = await WebAssembly.instantiate(wasmModule, {
    './truck_sync_bg.js': glueImports,
  });
  bg.__wbg_set_wasm(instance.exports);
  initialized = true;
}

export async function syncCreate(): Promise<Uint8Array<ArrayBuffer>> {
  await initSyncWasm();
  return bg.create_doc() as Uint8Array<ArrayBuffer>;
}

export async function syncApplyOp(doc: Uint8Array, opJson: string): Promise<Uint8Array<ArrayBuffer>> {
  await initSyncWasm();
  return bg.apply_op(doc, opJson) as Uint8Array<ArrayBuffer>;
}

export async function syncGetOps(doc: Uint8Array): Promise<string> {
  await initSyncWasm();
  return bg.get_ops(doc) as string;
}

export async function syncMergeDocs(local: Uint8Array, remote: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  await initSyncWasm();
  return bg.merge_docs(local, remote) as Uint8Array<ArrayBuffer>;
}

export async function syncValidateOp(opJson: string): Promise<boolean> {
  await initSyncWasm();
  return bg.validate_op(opJson) as boolean;
}

/** Returns enabled ops in index order — the geometry layer executes each in sequence. */
export async function syncGetReplayOps(doc: Uint8Array): Promise<string> {
  await initSyncWasm();
  return bg.get_replay_ops(doc) as string;
}
