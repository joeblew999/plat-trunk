// main.ts — App entry point.
// Initializes Datastar, then boots the CAD app.
import { root, mergePatch, beginBatch, endBatch } from './vendor/datastar.js';
window._ds = { root, mergePatch, beginBatch, endBatch };

import { boot } from './boot';
try {
    await boot();
} catch (e: any) {
    if (e?.message !== 'redirect') console.error('Boot failed:', e);
}
