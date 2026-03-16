/**
 * plugin-protocol.ts
 *
 * Message type constants shared between plugin-sandbox.ts (host)
 * and the plat proxy code (sandbox).
 *
 * This is NOT a plugin SDK. Plugin authors never import this.
 * It's an internal contract between the sandbox and the host.
 */

// ── Plugin manifest ───────────────────────────────────────────────────────────

export interface PluginManifest {
  /** Reverse-domain plugin identifier: "com.example.my-plugin" */
  id: string
  name: string
  version: string
  description: string
  permissions: string[]
  /** Path to plugin logic entry (compiled JS). Default: "plugin.js" */
  code?: string
  /** Path to plugin UI (HTML). Opened via plat.ui.open(). Default: "index.html" */
  ui?: string
  /** Path to plugin WASM binary. Loaded by plugin.ts. Optional. */
  wasm?: string
  icon?: string
  host?: string  // base URL where plugin assets are served
}

// ── Message tag ───────────────────────────────────────────────────────────────

/** Every message crossing the sandbox boundary carries _plat: true */
export interface SandboxMessage {
  _plat: true
  type: string
  [key: string]: unknown
}

export type HostMessage = SandboxMessage

// ── Message type constants ────────────────────────────────────────────────────

export const MSG = {
  // Sandbox → Host  (plugin.ts calling plat.*)
  UI_OPEN:            'ui:open',
  UI_SEND:            'ui:send',
  UI_CLOSE:           'ui:close',
  UI_MESSAGE_HANDLER: 'ui:message-handler',

  CAD_DISPATCH:       'cad:dispatch',

  MODEL_GET_OBJECTS:  'model:get-objects',
  MODEL_GET_OBJECT:   'model:get-object',

  SELECTION_GET:      'selection:get',
  SELECTION_SET:      'selection:set',
  SELECTION_CLEAR:    'selection:clear',

  STORAGE_GET:        'storage:get',
  STORAGE_SET:        'storage:set',
  STORAGE_REMOVE:     'storage:remove',

  PLUGIN_ERROR:       'plugin:error',

  // Host → Sandbox  (responses + host-initiated events)
  CAD_RESULT:         'cad:result',
  MODEL_RESULT:       'model:result',
  SELECTION_RESULT:   'selection:result',
  STORAGE_RESULT:     'storage:result',

  UI_TO_PLUGIN:       'ui:to-plugin',   // UI iframe → plugin.ts

  // Host events pushed into sandbox
  EVENT_SELECTION:    'selectionchange',
  EVENT_MODEL:        'modelchange',
  EVENT_THEME:        'themechange',
  EVENT_CLOSE:        'close',
} as const

export type MsgType = typeof MSG[keyof typeof MSG]
