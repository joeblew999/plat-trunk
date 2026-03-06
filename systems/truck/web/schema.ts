// schema.ts — CAD schema loading and command classification.
//
// The cad-schema.json (served at /api/cad/schema) declares every command:
//   schema.commands      → WASM commands with { readonly, ephemeral, domain }
//   schema.controlPlane  → JS commands with { layer: "js" }
//
// Three classifications drive ALL dispatch and recording decisions:
//   1. JS control plane:   undo, redo, set_mode, etc. (from schema.controlPlane)
//   2. WASM control plane: select, get_state, set_camera (readonly || ephemeral)
//   3. WASM data plane:    add_cube, boolean_union, translate (!readonly && !ephemeral)
//
// Only data plane commands record to Automerge and broadcast to the Worker API.
// Call sites never need to specify { record: false } — the schema decides.

import type { CadSchema } from './types';

let _schema: CadSchema | null = null;
let _jsControlPlane = new Set<string>();

const _schemaReady = fetch('/api/cad/schema')
  .then(r => r.json())
  .then(s => {
    _schema = s;
    _jsControlPlane = new Set(Object.keys(s.controlPlane || {}));
  })
  .catch(() => { _schema = { commands: {}, controlPlane: {} }; });

/** JS control plane: undo, redo, set_mode, etc. — dispatched to handleJsCommand() */
export function isJsControlPlane(type: string) {
  return _jsControlPlane.has(type);
}

/** WASM data plane: mutations that record to Automerge + broadcast */
export function isDataPlane(type: string) {
  const cmd = _schema?.commands?.[type];
  if (!cmd) return false;
  return !cmd.readonly && !cmd.ephemeral;
}

/** Shared access to the loaded schema (for history-ui.ts timeline, etc.) */
export function getSchema() { return _schema; }

/** Promise that resolves once the schema fetch completes. */
export const schemaReady = _schemaReady;

/**
 * Derive blob param key from schema — no hardcoded BLOB_KEYS map needed.
 * Import commands (scene domain, data plane) have one required string param
 * that contains the large payload (json, data, etc.). Returns the key or null.
 */
export function getBlobParam(type: string, params: Record<string, unknown>) {
  const cmd = _schema?.commands?.[type];
  if (!cmd || cmd.domain !== 'scene' || cmd.readonly) return null;
  const required = cmd.params?.required || [];
  const props = cmd.params?.properties || {};
  for (const key of required) {
    if (props[key]?.type === 'string' && params[key]) return key;
  }
  return null;
}
