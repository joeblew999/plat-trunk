/**
 * @plat-trunk/plugin-types
 *
 * Type definitions for the `plat` global object injected into plugin.ts contexts.
 *
 * This is the ENTIRE plugin API surface. Plugin authors import nothing —
 * they just reference `plat.*` and get full type safety.
 *
 * Mirrors Penpot's @penpot/plugin-types pattern.
 *
 * Usage in plugin.ts:
 *   /// <reference types="@plat-trunk/plugin-types" />
 *   plat.ui.open("My Plugin", "", { width: 300, height: 400 });
 */

// ── Permissions ──────────────────────────────────────────────────────────────

type PlatPermission =
  | 'model:read'       // read object list, properties, names
  | 'model:write'      // dispatch CAD commands that mutate the scene
  | 'selection:read'   // read current selection
  | 'selection:write'  // change selection
  | 'camera:read'      // read viewport camera state
  | 'camera:write'     // set camera position/target
  | 'history:read'     // read undo/redo history
  | 'allow:storage'    // access plugin-scoped key-value storage (host-managed)
  | 'allow:export'     // trigger file export (download)

// ── Scene types ──────────────────────────────────────────────────────────────

interface PlatObject {
  id: string
  name: string
  type?: string
  style?: {
    albedo: [number, number, number, number]
    roughness: number
    reflectance: number
  }
  bim?: {
    ifc_type?: string
    global_id?: string
  }
  [key: string]: unknown
}

interface PlatCadResult {
  objectId?: string
  objectIds?: string[]
  objectCount?: number
  selectedId?: string
  error?: string
  success?: boolean
  [key: string]: unknown
}

// ── UI API ────────────────────────────────────────────────────────────────────

interface PlatUiOptions {
  width?: number
  height?: number
}

interface PlatUi {
  /**
   * Open the plugin panel. Renders index.html (or the path in manifest.ui)
   * in a sandboxed iframe inside the CAD host.
   *
   * @param name   Panel title shown in the host chrome
   * @param url    URL of the HTML to load ('' = use manifest ui path)
   * @param opts   Panel dimensions (default 300×400)
   */
  open(name: string, url: string, opts?: PlatUiOptions): void

  /**
   * Send a message from plugin.ts to the plugin's iframe UI.
   * Received via: window.addEventListener("message", (e) => { e.data })
   */
  sendMessage(message: unknown): void

  /**
   * Register a callback to receive messages from the plugin's iframe UI.
   * The iframe sends messages via: parent.postMessage(data, "*")
   */
  onMessage<T = unknown>(callback: (message: T) => void): void

  /** Close the plugin panel programmatically. */
  close(): void
}

// ── Model API ────────────────────────────────────────────────────────────────

interface PlatModel {
  /**
   * Get all objects currently in the scene.
   * Requires 'model:read' permission.
   */
  getObjects(): PlatObject[]

  /**
   * Get a single object by ID.
   * Requires 'model:read' permission.
   */
  getObject(id: string): PlatObject | null

  /**
   * Get the current model ID.
   */
  getModelId(): string

  /**
   * Get the scene object count.
   * Requires 'model:read' permission.
   */
  getObjectCount(): number
}

// ── CAD API ───────────────────────────────────────────────────────────────────

interface PlatCad {
  /**
   * Dispatch a CAD command. Goes through the full pipeline:
   * WASM execute → Automerge record → reconcile → broadcast.
   *
   * Requires 'model:write' permission.
   *
   * @example
   *   const result = await plat.cad.dispatch("add_cube", { size: 1.0 })
   *   console.log(result.objectId)
   */
  dispatch(command: string, params?: Record<string, unknown>): Promise<PlatCadResult>
}

// ── Selection API ─────────────────────────────────────────────────────────────

interface PlatSelection {
  /**
   * Get currently selected object IDs.
   * Requires 'selection:read' permission.
   */
  get(): string[]

  /**
   * Set the current selection.
   * Requires 'selection:write' permission.
   */
  set(objectIds: string[]): void

  /**
   * Clear the current selection.
   * Requires 'selection:write' permission.
   */
  clear(): void
}

// ── Camera API ────────────────────────────────────────────────────────────────

interface PlatCamera {
  /**
   * Get the current camera matrix (4×4 column-major).
   * Requires 'camera:read' permission.
   */
  getMatrix(): number[]

  /**
   * Set the camera using a 4×4 matrix.
   * Requires 'camera:write' permission.
   */
  setMatrix(matrix: number[]): void
}

// ── Storage API ───────────────────────────────────────────────────────────────

interface PlatStorage {
  /**
   * Get a value from plugin-scoped storage.
   * Requires 'allow:storage' permission.
   */
  get(key: string): string | null

  /**
   * Set a value in plugin-scoped storage.
   * Requires 'allow:storage' permission.
   */
  set(key: string, value: string): void

  /**
   * Remove a value from plugin-scoped storage.
   * Requires 'allow:storage' permission.
   */
  remove(key: string): void
}

// ── Event types ───────────────────────────────────────────────────────────────

type PlatEventType =
  | 'selectionchange'   // fired when selection changes
  | 'modelchange'       // fired when any object is added/removed/modified
  | 'themechange'       // fired when host theme switches dark/light
  | 'close'             // fired when the user closes the plugin panel

interface PlatEventMap {
  selectionchange: { objectIds: string[] }
  modelchange: { objectIds: string[]; actorId: string }
  themechange: { theme: 'dark' | 'light' }
  close: Record<string, never>
}

// ── Root plat global ─────────────────────────────────────────────────────────

interface Plat {
  /** Plugin UI management: open panel, send/receive messages. */
  ui: PlatUi

  /** Read scene objects and model metadata. */
  model: PlatModel

  /** Dispatch CAD commands (mutates the scene). */
  cad: PlatCad

  /** Read and set the current selection. */
  selection: PlatSelection

  /** Camera control. */
  camera: PlatCamera

  /** Plugin-scoped key-value storage. */
  storage: PlatStorage

  /**
   * Listen for host events.
   *
   * @example
   *   plat.on("selectionchange", ({ objectIds }) => {
   *     plat.ui.sendMessage({ type: "SELECTION", ids: objectIds })
   *   })
   */
  on<T extends PlatEventType>(
    event: T,
    callback: (data: PlatEventMap[T]) => void
  ): () => void  // returns unsubscribe fn

  /**
   * Remove all listeners registered by this plugin (called automatically on close).
   */
  off(event: PlatEventType): void

  /** The plugin's own ID (from manifest). */
  readonly pluginId: string

  /** The current host theme. */
  readonly theme: 'dark' | 'light'

  /** Current model ID. */
  readonly modelId: string
}

// ── Global injection ──────────────────────────────────────────────────────────

declare const plat: Plat
