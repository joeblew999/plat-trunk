/**
 * doc-store.ts — Re-exports R2DocStore from @plat/sync.
 * Truck-specific extensions (manifest, scene, thumbnail) stay here.
 */

export { R2DocStore, type DocWithEtag } from '../../../sync/ts/worker/handler';
