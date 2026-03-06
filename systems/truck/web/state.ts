// state.ts — App initialization: WASM registration + window globals.
//
// This is the entry point that wires everything together.
// Business logic lives in the files it imports:
//   schema.ts    — schema loading + command classification
//   reconcile.ts — WASM state → Datastar signals → DOM
//   dispatch.ts  — cadCommand / cadQuery / addShape routing

import { moduleRouter } from './core/module-router';
import { reconcile, loadStyle } from './reconcile';
import { cadCommand, cadQuery, addShape, applyStyle, showFeedback } from './dispatch';

// If WASM was already initialized before state.ts loaded, register now.
// Normally boot.ts calls moduleRouter.register() after WASM init,
// but on fast loads WASM may already be ready.
if (window.sceneController && !moduleRouter.ready) {
  moduleRouter.register('core', window.sceneController);
}

// Window globals: only what's needed for inline HTML handlers and E2E tests.
// Everything else is imported directly from schema/reconcile/dispatch.
window.cadCommand = cadCommand;
window.cadQuery = cadQuery;
window.addShape = addShape;
window.reconcile = reconcile;
window.__applyStyle = applyStyle;
window.__loadStyle = loadStyle;
window.__moduleRouter = moduleRouter;
window.showFeedbackSignal = showFeedback;
