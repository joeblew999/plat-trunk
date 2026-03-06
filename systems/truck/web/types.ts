// types.ts — Shared TypeScript interfaces for WASM result handling and schema introspection.
// These replace `any` at WASM boundaries, making accidental field name typos
// and wrong return type assumptions compile errors instead of silent runtime bugs.

/**
 * Typed result from moduleRouter.execute() / cadCommand() / cadQuery().
 *
 * All fields are optional because different WASM commands return different subsets.
 * The index signature [key: string]: unknown allows safe spreading with other WasmResult
 * values and future commands without requiring a type update every time.
 *
 * Declared fields (e.g. objectId?: string) provide autocomplete and type safety.
 * Undeclared fields are `unknown` — you must narrow before using them.
 */
export interface WasmResult {
  // ── Object identity ───────────────────────────────────────────
  objectId?: string;
  objectIds?: string[];
  objectCount?: number;
  objectNames?: Record<string, string>;

  // ── Selection ─────────────────────────────────────────────────
  selectedId?: string | null;
  pickedId?: string;
  boolSelA?: string;
  boolSelB?: string;

  // ── Errors / status ───────────────────────────────────────────
  error?: string;
  success?: boolean;

  // ── Control plane ─────────────────────────────────────────────
  mode?: string;
  enabled?: boolean;
  automergeReady?: boolean;
  automergeEnabled?: boolean;
  warmCount?: number;
  modelId?: string;
  url?: string;

  // ── Reconcile state (returned by reconcile()) ─────────────────
  ready?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;

  // ── Scene / geometry ──────────────────────────────────────────
  scene?: string;
  hierarchy?: unknown;

  // ── Style ─────────────────────────────────────────────────────
  style?: {
    albedo: [number, number, number, number];
    roughness: number;
    reflectance: number;
  };

  // ── BIM metadata ──────────────────────────────────────────────
  bim?: {
    ifc_type?: string;
    global_id?: string;
  };

  // ── Clash detection ───────────────────────────────────────────
  clash?: boolean;

  // ── Sketch operations ─────────────────────────────────────────
  sketchId?: string;
  pointId?: string;
  edgeId?: string;
  constraintId?: string;
  sketchJson?: string;
  solved?: Array<{ id: string; x: number; y: number }>;

  // ── Gizmo translate drag ──────────────────────────────────────
  dx?: number;
  dy?: number;
  dz?: number;

  // ── Camera ────────────────────────────────────────────────────
  camera?: {
    matrixWorld: number[];
    fovDeg: number;
    near: number;
    far: number;
  };

  // ── Catch-all for future/undeclared WASM fields ───────────────
  // `unknown` not `any` — callers must narrow before using undeclared fields.
  [key: string]: unknown;
}

// ── Command dispatch options ───────────────────────────────────────────────────

/**
 * Options for cadCommand() / cadQuery() — controls Automerge recording and broadcast.
 * Exported here so history-domain.ts can type REPLAY without a circular import.
 */
export interface CadOptions {
  record?: boolean;
  broadcast?: boolean;
  reconcile?: boolean;
  source?: string;
  groupId?: string;
  _internal?: boolean;
}

// ── Minimal manager interface ──────────────────────────────────────────────────

/**
 * Fields of CadDocumentManagerBase used by reconcileMetadata in state.ts.
 * Avoids a circular import: history-domain.ts imports state.ts at runtime,
 * so state.ts cannot import CadDocumentManagerBase back.
 */
export interface DocManagerMeta {
  canUndo: boolean;
  canRedo: boolean;
  enabled: boolean;
}

// ── Scene entry ────────────────────────────────────────────────────────────────

/**
 * A single object entry from an export_scene JSON array.
 * WASM returns `id` plus opaque geometry/style fields.
 */
export interface SceneEntry {
  id: string;
  bounding_sphere?: [number, number, number, number];
  style?: { albedo?: [number, number, number, number]; roughness?: number; reflectance?: number };
  [key: string]: unknown;
}

// ── Schema types ──────────────────────────────────────────────────────────────

/** A single param property from a JSON Schema object in cad-schema.json. */
export interface SchemaProperty {
  type?: string;
  default?: unknown;
  format?: string;
  maximum?: number;
  minimum?: number;
  description?: string;
  enum?: unknown[];
}

/** A single command definition from the commands map in cad-schema.json. */
export interface CadCommandDef {
  description?: string;
  domain: string;
  ephemeral: boolean;
  readonly: boolean;
  params?: {
    $schema?: string;
    properties?: Record<string, SchemaProperty>;
    required?: string[];
    title?: string;
    type?: string;
  };
  returns?: string;
}

/** A control-plane command definition (JS layer) from cad-schema.json. */
export interface CadControlPlaneDef {
  layer: string;
  description?: string;
}

/**
 * The full cad-schema.json structure served at /api/cad/schema.
 * Enables schema-driven dispatch without runtime `any` access.
 */
export interface CadSchema {
  commands: Record<string, CadCommandDef>;
  controlPlane: Record<string, CadControlPlaneDef>;
}
