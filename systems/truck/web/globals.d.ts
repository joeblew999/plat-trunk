// globals.d.ts — Declares custom window properties set by inline scripts and modules.

declare global {
  interface Window {
    // Set by inline script in index.html before modules load
    __cadLocalMode: boolean;
    __redirecting: boolean;
    __resetRequested: boolean;
    __modelId: string;
    __cadSyncDisabled: boolean;

    // Set by boot.ts
    __wasmInit: any;
    __SceneController: any;
    __appReady: boolean;

    // Set by WASM / cad-viewport.ts
    sceneController: any;

    // Set by history.ts (Automerge)
    cadDocManager: any;
    resetTierState: (() => void) | undefined;

    // Set by core/module-router.ts
    moduleRouter: any;
    __moduleRouter: any;

    // Set by state.ts
    cadCommand: (type: string, params?: any, opts?: any) => Promise<any>;
    cadQuery: (method: string, ...args: any[]) => any;
    reconcile: (data: any, mgr?: any) => void;
    cadUI: any;
    showFeedbackSignal: any;
    addShape: (type: string, params?: any) => void;
    setSelection: (id: string) => void;
    __loadStyle: any;

    // Set by tier-manager.ts
    __warmCount: number;

    // Set by worker-relay.ts
    __workerRelay: any;

    // Set by Datastar (public/datastar.js)
    _ds: { root: any; mergePatch: any; beginBatch: any; endBatch: any };

    // Set by sketch.ts
    __sketch: any;

    // Set by ui.ts
    __applyStyle: (commit: boolean) => void;
  }
}

export {};
