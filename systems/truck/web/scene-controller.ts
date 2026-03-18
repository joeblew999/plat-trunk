// scene-controller.ts — Module singleton for the WASM SceneController instance.
//
// SceneController is created by <cad-viewport> in firstUpdated() — asynchronously
// after the canvas element exists in the DOM and WebGPU is available.
//
// All modules that need the controller import getSceneController() from here
// instead of reading window.sceneController.
//
// window.sceneController is still set for E2E tests and HTML onclick handlers.

type SceneController = any; // WASM class — no TS bindings available from wasm-bindgen

let _controller: SceneController | null = null;
let _resolve: ((c: SceneController) => void) | null = null;

/** Promise that resolves when the SceneController is ready. */
export const sceneControllerReady: Promise<SceneController> = new Promise(resolve => {
  _resolve = resolve;
});

/**
 * Called once by <cad-viewport> after WASM init completes.
 * Resolves sceneControllerReady and sets window.sceneController for compat.
 */
export function setSceneController(controller: SceneController): void {
  _controller = controller;
  window.sceneController = controller; // kept for E2E tests + HTML handlers
  _resolve?.(controller);
  _resolve = null;
}

/**
 * Synchronous getter — returns null if called before WASM init completes.
 * Most call sites guard with `if (!ctrl) return` — this matches that pattern.
 */
export function getSceneController(): SceneController | null {
  return _controller;
}
