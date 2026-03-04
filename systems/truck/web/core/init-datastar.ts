// init-datastar.ts — Initialize Datastar and expose it as window._ds.
//
// datastar.js is a vendored ES module (not in /public) so Vite can process it normally.
import { root, mergePatch, beginBatch, endBatch } from '../vendor/datastar.js';
window._ds = { root, mergePatch, beginBatch, endBatch };
