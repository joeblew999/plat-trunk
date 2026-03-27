/* tslint:disable */
/* eslint-disable */

/**
 * Apply one op (JSON string matching Op schema). Returns updated doc bytes.
 */
export function apply_op(doc: Uint8Array, op_json: string): Uint8Array;

/**
 * Create a new empty Automerge doc. Returns raw bytes.
 */
export function create_doc(): Uint8Array;

/**
 * Blake3 hash of doc bytes — for change detection and storage integrity.
 * Returns hex-encoded hash string (64 chars).
 */
export function doc_hash(doc: Uint8Array): string;

/**
 * Export ops since a given index (incremental sync). Returns JSON array string.
 */
export function export_ops_since(doc: Uint8Array, since_index: number): string;

/**
 * Get the model name from the Automerge doc.
 */
export function get_name(doc: Uint8Array): string;

/**
 * Count ops without JSON serialization.
 */
export function get_op_count(doc: Uint8Array): number;

/**
 * Get all ops as a JSON array string.
 */
export function get_ops(doc: Uint8Array): string;

/**
 * Return ops ready for replay: index order, disabled ops excluded.
 * Returns JSON array string — the geometry layer executes each in order.
 */
export function get_replay_ops(doc: Uint8Array): string;

/**
 * CRDT merge. Returns merged doc bytes.
 */
export function merge_docs(local: Uint8Array, remote: Uint8Array): Uint8Array;

/**
 * CRDT merge with diff info.
 * Returns { doc: Uint8Array, localOpCount: number, mergedOpCount: number, hadNewOps: boolean }.
 */
export function merge_docs_with_info(local: Uint8Array, remote: Uint8Array): any;

/**
 * Rollback actor's ops to a given index.
 */
export function rollback_to(doc: Uint8Array, actor_id: string, to_index: number): Uint8Array;

/**
 * Set `enabled` on all ops in a group.
 */
export function set_group_enabled(doc: Uint8Array, group_id: string, enabled: boolean): Uint8Array;

/**
 * Set the model name in the Automerge doc. Returns updated doc bytes.
 */
export function set_name(doc: Uint8Array, name: string): Uint8Array;

/**
 * Set `enabled` on one op by ID.
 */
export function set_op_enabled(doc: Uint8Array, op_id: string, enabled: boolean): Uint8Array;

export function start(): void;

/**
 * Validate op JSON.
 */
export function validate_op(op_json: string): boolean;
