/**
 * @plat/sync/worker — Server-side sync for Cloudflare Workers.
 *
 * Simple (handler only):
 *   import { createSyncHandler, createWasmAdapter } from '@plat/sync/worker';
 *   const handler = createSyncHandler(await createWasmAdapter(wasm, glue));
 *   export default { fetch: (req, env) => handler(req, env.SYNC_R2, '/api') };
 *
 * Full (application loop with op execution):
 *   import { SyncWorker, createWasmAdapter } from '@plat/sync/worker';
 *   const sync = new SyncWorker(await createWasmAdapter(wasm, glue), {
 *     onExecute: async (op) => myEngine.run(op),
 *   });
 *   export default { fetch: (req, env) => sync.fetch(req, env.SYNC_R2, '/api') };
 */

export { createSyncHandler, createWasmAdapter, mergeWithRetry, R2DocStore, type R2Like, type MergeResult, type DocWithEtag } from './handler';
export { SyncWorker, type SyncWorkerOptions } from './sync-worker';
