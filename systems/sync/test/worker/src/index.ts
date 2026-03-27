/**
 * Standalone sync test worker — what a real consumer writes.
 */
import { createSyncHandler, createWasmAdapter } from '../../../ts/worker/handler';
import wasmModule from '../pkg-sync/plat_sync_bg.wasm';
import * as glue from '../pkg-sync/plat_sync_bg.js';

interface Env { SYNC_R2: R2Bucket; }

let handler: ReturnType<typeof createSyncHandler> | null = null;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!handler) {
      handler = createSyncHandler(await createWasmAdapter(wasmModule, glue));
    }
    return handler(request, env.SYNC_R2, '/api');
  },
};
