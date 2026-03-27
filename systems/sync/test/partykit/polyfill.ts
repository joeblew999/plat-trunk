/**
 * Polyfills for miniflare/workerd local dev.
 * Must be loaded BEFORE any automerge-repo imports.
 *
 * Deployed CF Workers have these natively — this is only for local dev.
 */

if (typeof globalThis.FinalizationRegistry === 'undefined') {
  (globalThis as any).FinalizationRegistry = class {
    register() {}
    unregister() {}
    [Symbol.toStringTag] = 'FinalizationRegistry';
  };
}

if (typeof globalThis.WeakRef === 'undefined') {
  (globalThis as any).WeakRef = class {
    #value: any;
    constructor(value: any) { this.#value = value; }
    deref() { return this.#value; }
  };
}
