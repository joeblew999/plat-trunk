// app-config.ts — Typed read-once wrapper for inline-script window globals.
//
// index.html runs an inline script BEFORE any ES module loads. That script:
//   - Parses the URL and sets window.__modelId
//   - Sets window.__cadLocalMode from ?local param
//   - Sets window.__resetRequested from ?reset=1
//   - Sets window.__redirecting during /model/new → /model/<id> redirect
//   - Sets window.__cadSyncDisabled from ?nosync param
//
// This module reads those values ONCE at import time and exports them as
// typed constants. All TS modules import from here instead of window.__*.
// window.__* are kept for E2E tests and HTML onclick handlers.

const w = window as any;

/** The model ID from the URL — always non-null by the time modules load. */
export const MODEL_ID: string = w.__modelId || 'default';

/** True when ?local is in the URL — disables server sync. */
export const LOCAL_MODE: boolean = !!w.__cadLocalMode;

/** True when ?reset=1 — wipes IDB before loading (E2E test isolation). */
export const RESET_REQUESTED: boolean = !!w.__resetRequested;

/** True during /model/new → /model/<id> redirect (don't load old doc). */
export const REDIRECTING: boolean = !!w.__redirecting;

/** True when ?nosync — disables Automerge CRDT sync. */
export const SYNC_DISABLED: boolean = !!w.__cadSyncDisabled;
