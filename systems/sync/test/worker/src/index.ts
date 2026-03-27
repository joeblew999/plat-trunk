/**
 * Standalone sync test worker — uses SyncWorker for the full application loop.
 */
import { SyncWorker } from '../../../ts/worker/sync-worker';
import { createWasmAdapter } from '../../../ts/worker/handler';
import wasmModule from '../pkg-sync/plat_sync_bg.wasm';
import * as glue from '../pkg-sync/plat_sync_bg.js';

interface Env { SYNC_R2: R2Bucket; }

let sync: SyncWorker | null = null;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!sync) {
      sync = new SyncWorker(await createWasmAdapter(wasmModule, glue), {
        onExecute: async (op) => {
          // Test server — just log the op, no real execution
          console.log(`[test-worker] execute: ${op.type}`);
          return { executed: op.type };
        },
      });
    }
    return sync.fetch(request, env.SYNC_R2, '/api');
  },
};
