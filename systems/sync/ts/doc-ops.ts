/**
 * doc-ops.ts — Shared pure operations on Automerge doc bytes (ADR-0001 Part A0).
 *
 * Platform-agnostic: no IDB, no R2, no BroadcastChannel.
 * Both browser (history-domain.ts) and worker (index.ts) import from here.
 * WASM backend is injected via the SyncWasm interface.
 */

import type { CadOperation } from './sync-types.generated';

// Re-export for convenience
export type { CadOperation };

/** WASM function signatures — same on web and bundler targets. */
export interface SyncWasm {
  create_doc(): Uint8Array;
  apply_op(doc: Uint8Array, opJson: string): Uint8Array;
  merge_docs(local: Uint8Array, remote: Uint8Array): Uint8Array;
  get_ops(doc: Uint8Array): string;
  get_replay_ops(doc: Uint8Array): string;
  set_op_enabled(doc: Uint8Array, opId: string, enabled: boolean): Uint8Array;
  set_group_enabled(doc: Uint8Array, groupId: string, enabled: boolean): Uint8Array;
  rollback_to(doc: Uint8Array, actorId: string, toIndex: number): Uint8Array;
  get_name(doc: Uint8Array): string;
  set_name(doc: Uint8Array, name: string): Uint8Array;
}

/** Storage adapter — platform provides load/save. */
export interface DocStorage {
  load(modelId: string): Promise<Uint8Array | null>;
  save(modelId: string, bytes: Uint8Array): Promise<void>;
}

// ── Pure doc operations (no side effects) ────────────────────────────────

export function recordOp(bytes: Uint8Array, op: CadOperation, wasm: SyncWasm): Uint8Array {
  return wasm.apply_op(bytes, JSON.stringify(op));
}

export function mergeRemote(local: Uint8Array, remote: Uint8Array, wasm: SyncWasm): Uint8Array {
  return wasm.merge_docs(local, remote);
}

export function undoOp(bytes: Uint8Array, opId: string, wasm: SyncWasm): Uint8Array {
  return wasm.set_op_enabled(bytes, opId, false);
}

export function redoOp(bytes: Uint8Array, opId: string, wasm: SyncWasm): Uint8Array {
  return wasm.set_op_enabled(bytes, opId, true);
}

export function getOps(bytes: Uint8Array, wasm: SyncWasm): CadOperation[] {
  return JSON.parse(wasm.get_ops(bytes));
}

export function getReplayOps(bytes: Uint8Array, wasm: SyncWasm): CadOperation[] {
  return JSON.parse(wasm.get_replay_ops(bytes));
}

export function getName(bytes: Uint8Array, wasm: SyncWasm): string {
  return wasm.get_name(bytes);
}

export function setName(bytes: Uint8Array, name: string, wasm: SyncWasm): Uint8Array {
  return wasm.set_name(bytes, name);
}

export function undoGroup(bytes: Uint8Array, groupId: string, wasm: SyncWasm): Uint8Array {
  return wasm.set_group_enabled(bytes, groupId, false);
}

export function redoGroup(bytes: Uint8Array, groupId: string, wasm: SyncWasm): Uint8Array {
  return wasm.set_group_enabled(bytes, groupId, true);
}

export function rollbackTo(bytes: Uint8Array, actorId: string, toIndex: number, wasm: SyncWasm): Uint8Array {
  return wasm.rollback_to(bytes, actorId, toIndex);
}
