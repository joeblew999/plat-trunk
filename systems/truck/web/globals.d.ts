// globals.d.ts — Declares custom window properties set by inline scripts and modules.

import type { WasmResult, CadOptions } from './types';
import type { CadDocumentManagerBase } from './history-domain';
import type { sketch } from './sketch';

declare global {
  interface Window {
    // Set by inline script in index.html; mutated at runtime by dispatch.ts set_mode command
    // For initial value use LOCAL_MODE from app-config.ts; for live value read window.__cadLocalMode
    __cadLocalMode: boolean;
    __redirecting: boolean;
    __resetRequested: boolean;
    __modelId: string;
    __cadSyncDisabled: boolean;

    // Set by boot.ts
    __wasmInit: any;         // dynamic WASM module import, no TS bindings
    __SceneController: any;  // WASM class constructor, no TS bindings
    __appReady: boolean;

    // Set by cad-viewport.ts via setSceneController() from scene-controller.ts
    // Prefer: import { getSceneController } from './scene-controller'
    // window.sceneController kept for E2E tests and HTML onclick handlers
    sceneController: any;  // WASM instance, no TS bindings

    // Set by history-ui.ts (module singleton — prefer importing from history-ui.ts
    // in TS modules; window.cadDocManager kept for E2E tests and inline scripts)
    cadDocManager: CadDocumentManagerBase;
    resetTierState: (() => void) | undefined;

    // Prefer: import { moduleRouter } from './core/module-router'
    // window.moduleRouter kept for Datastar HTML attribute handlers
    moduleRouter: any;

    // Set by state.ts (window globals for inline HTML handlers + E2E tests)
    cadCommand: (type: string, params?: Record<string, unknown>, opts?: CadOptions) => Promise<WasmResult>;
    cadQuery: (type: string, params?: Record<string, unknown>, opts?: CadOptions) => WasmResult;
    reconcile: (result: WasmResult) => WasmResult;
    addShape: (type: string, params?: Record<string, unknown>) => Promise<WasmResult>;
    showFeedbackSignal: (msg: string, isError?: boolean) => void;
    __loadStyle: (objectId: string) => void;
    cadUI: any;

    // Set by tier-manager.ts
    __warmCount: number;

    // Set by storage-budget.ts
    __storagePct: number;

    // Set by worker-relay.ts (SSE presence events)
    __presenceActors: Array<[string, string]>;
    __presenceCount: number;

    // Set by worker-relay.ts
    __workerRelay: any;

    // Set by Datastar (public/datastar.js)
    _ds: { root: any; mergePatch: any; beginBatch: any; endBatch: any };

    // Set by sketch.ts
    __sketch: typeof sketch;

    // Set by ui.ts
    __applyStyle: (commit: boolean) => void;

    // Set by plugin-manager-ui.ts
    pluginManager: {
      togglePanel(): void;
      load(manifest: unknown): Promise<void>;
      unload(pluginId: string): void;
      promptInstall(): Promise<void>;
      loadBuiltin(basePath: string): Promise<void>;
      onSelectionChange(objectIds: string[]): void;
      onModelChange(objectIds: string[], actorId: string): void;
      onThemeChange(theme: 'dark' | 'light'): void;
    };
  }
}

// ── Custom element interface declarations ────────────────────────────────────
// Augment HTMLElementTagNameMap so querySelector returns typed instances.

interface CadGalleryElement extends HTMLElement {
  refresh(): void;
}

interface CadViewportElement extends HTMLElement {
  zoomTo(objectId: string): void;
}

declare global {
  interface HTMLElementTagNameMap {
    'cad-gallery': CadGalleryElement;
    'cad-viewport': CadViewportElement;
  }
}

export {};
