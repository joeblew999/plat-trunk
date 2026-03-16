/**
 * plugin-sandbox.ts
 *
 * Creates the sandboxed execution context for plugin.ts code.
 *
 * Penpot pattern: plugin.ts runs in a headless context that has ONE global:
 * the `plat` API object. No DOM. No window. No fetch. Just `plat.*`.
 *
 * Implementation: We use a sandboxed <iframe sandbox="allow-scripts"> with no
 * src, inject the plat implementation as a script, then eval() the plugin code
 * inside it. This gives us:
 *   - A clean JS heap (no host globals leak in)
 *   - postMessage as the only communication channel
 *   - The iframe can be terminated by removing it from the DOM
 *
 * The injected `plat` global is a thin proxy. All its methods post messages
 * back to the host (this file), which executes them against the real CAD APIs.
 */

import type { PluginManifest, SandboxMessage, HostMessage } from './plugin-protocol'
import { MSG } from './plugin-protocol'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SandboxOptions {
  manifest: PluginManifest
  pluginCode: string        // compiled plugin.js content (fetched by manager)
  onUiOpen: (url: string, name: string, opts: { width: number; height: number }) => void
  onUiMessage: (data: unknown) => void  // plugin→UI relay
  onClose: () => void
}

// ── PluginSandbox ─────────────────────────────────────────────────────────────

export class PluginSandbox {
  private _iframe: HTMLIFrameElement
  private _opts: SandboxOptions
  private _listeners: Map<string, Set<(data: unknown) => void>> = new Map()
  private _uiMessageCallback: ((msg: unknown) => void) | null = null

  constructor(opts: SandboxOptions) {
    this._opts = opts

    // Create the sandbox iframe — no src, no allow-same-origin
    // allow-scripts is the only required permission
    this._iframe = document.createElement('iframe')
    this._iframe.sandbox.add('allow-scripts')
    this._iframe.style.cssText = 'display:none;width:0;height:0;border:none;position:absolute;'
    this._iframe.setAttribute('aria-hidden', 'true')
    document.body.appendChild(this._iframe)

    // Listen for messages from the sandbox
    window.addEventListener('message', this._handleSandboxMessage)
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    const { manifest, pluginCode } = this._opts

    // Build the plat proxy script that runs inside the sandbox
    const platProxy = buildPlatProxy(manifest)

    // Inject plat + plugin code into the blank iframe document
    const doc = this._iframe.contentDocument
    if (!doc) throw new Error('[plugin-sandbox] iframe document not available')

    doc.open()
    doc.write(`<!DOCTYPE html><html><head></head><body><script>
${platProxy}

// ── Plugin code ──────────────────────────────────────────────────
try {
  ${pluginCode}
} catch (err) {
  window.parent.postMessage({ _plat: true, type: '${MSG.PLUGIN_ERROR}', error: String(err) }, '*');
}
<\/script></body></html>`)
    doc.close()
  }

  destroy(): void {
    window.removeEventListener('message', this._handleSandboxMessage)
    this._iframe.remove()
    this._listeners.clear()
  }

  // ── Host → Sandbox messages ───────────────────────────────────────────────

  /** Push a host event into the sandbox (e.g. selectionchange, modelchange). */
  emit(type: string, data: unknown): void {
    this._postToSandbox({ _plat: true, type, data })
  }

  /** Deliver a message from the plugin's UI iframe back to plugin.ts code. */
  deliverUiMessage(data: unknown): void {
    this._postToSandbox({ _plat: true, type: MSG.UI_TO_PLUGIN, data })
  }

  // ── Sandbox → Host handler ────────────────────────────────────────────────

  private _handleSandboxMessage = async (ev: MessageEvent): Promise<void> => {
    if (ev.source !== this._iframe.contentWindow) return
    const msg = ev.data as SandboxMessage
    if (!msg?._plat) return

    switch (msg.type) {

      case MSG.UI_OPEN: {
        const { url, name, width, height } = msg as any
        this._opts.onUiOpen(url, name, { width: width ?? 300, height: height ?? 400 })
        break
      }

      case MSG.UI_SEND: {
        // plugin.ts → UI: relay to the panel iframe via plugin-manager
        this._opts.onUiMessage((msg as any).data)
        break
      }

      case MSG.UI_CLOSE: {
        this._opts.onClose()
        break
      }

      case MSG.UI_MESSAGE_HANDLER: {
        // plugin.ts registered plat.ui.onMessage() — store the handler token
        // (the actual delivery uses MSG.UI_TO_PLUGIN above)
        break
      }

      case MSG.CAD_DISPATCH: {
        const { reqId, command, params } = msg as any
        try {
          const result = await window.cadCommand(command, params ?? {}, {
            source: `plugin:${this._opts.manifest.id}`,
          })
          this._postToSandbox({ _plat: true, type: MSG.CAD_RESULT, reqId, result })
        } catch (err) {
          this._postToSandbox({ _plat: true, type: MSG.CAD_RESULT, reqId, result: { error: String(err) } })
        }
        break
      }

      case MSG.MODEL_GET_OBJECTS: {
        const { reqId } = msg as any
        const ids = (window.moduleRouter?.query('objectIds') ?? []) as string[]
        const objects = ids.map(id => ({ id, name: id }))  // minimal — extend as needed
        this._postToSandbox({ _plat: true, type: MSG.MODEL_RESULT, reqId, objects })
        break
      }

      case MSG.MODEL_GET_OBJECT: {
        const { reqId, id } = msg as any
        const result = window.moduleRouter?.execute('get_state', { objectId: id }) ?? null
        this._postToSandbox({ _plat: true, type: MSG.MODEL_RESULT, reqId, objects: result ? [result] : [] })
        break
      }

      case MSG.SELECTION_GET: {
        const { reqId } = msg as any
        const selectedId = (window as any)._ds?.root?.selectedId ?? ''
        this._postToSandbox({ _plat: true, type: MSG.SELECTION_RESULT, reqId, objectIds: selectedId ? [selectedId] : [] })
        break
      }

      case MSG.SELECTION_SET: {
        const { objectIds } = msg as any
        const ds = (window as any)._ds
        if (ds?.root) ds.root.selectedId = objectIds?.[0] ?? ''
        break
      }

      case MSG.SELECTION_CLEAR: {
        const ds = (window as any)._ds
        if (ds?.root) ds.root.selectedId = ''
        break
      }

      case MSG.STORAGE_GET: {
        const { reqId, key } = msg as any
        const value = _getStorage(this._opts.manifest.id, key)
        this._postToSandbox({ _plat: true, type: MSG.STORAGE_RESULT, reqId, value })
        break
      }

      case MSG.STORAGE_SET: {
        const { key, value } = msg as any
        _setStorage(this._opts.manifest.id, key, value)
        break
      }

      case MSG.STORAGE_REMOVE: {
        const { key } = msg as any
        _removeStorage(this._opts.manifest.id, key)
        break
      }

      case MSG.PLUGIN_ERROR: {
        console.error(`[plugin:${this._opts.manifest.id}] runtime error:`, (msg as any).error)
        break
      }
    }
  }

  private _postToSandbox(msg: unknown): void {
    this._iframe.contentWindow?.postMessage(msg, '*')
  }
}

// ── Build the plat proxy script ───────────────────────────────────────────────

/**
 * Returns a JS string that, when eval'd inside the sandbox iframe, creates the
 * `plat` global with the correct API surface.
 *
 * Every API call posts a message to the host (parent window) and, for async
 * calls, waits for a response message with a matching reqId.
 */
function buildPlatProxy(manifest: PluginManifest): string {
  // Permissions set as a JS literal — evaluated inside sandbox
  const perms = JSON.stringify(manifest.permissions ?? [])

  return `
(function() {
  'use strict';

  const _permissions = new Set(${perms});
  let _reqId = 0;
  const _pending = new Map();
  let _uiMessageCallback = null;
  const _eventListeners = new Map();

  // ── Internal messaging helpers ───────────────────────────────

  function _post(type, extra) {
    window.parent.postMessage(Object.assign({ _plat: true, type }, extra), '*');
  }

  function _request(type, extra) {
    return new Promise((resolve) => {
      const reqId = ++_reqId;
      _pending.set(reqId, resolve);
      _post(type, Object.assign({ reqId }, extra));
    });
  }

  function _check(perm) {
    if (!_permissions.has(perm)) throw new Error('Plugin missing permission: ' + perm);
  }

  // Receive responses from host
  window.addEventListener('message', function(ev) {
    const msg = ev.data;
    if (!msg || !msg._plat) return;

    // Resolve pending async requests
    if (msg.reqId && _pending.has(msg.reqId)) {
      const resolve = _pending.get(msg.reqId);
      _pending.delete(msg.reqId);
      resolve(msg);
      return;
    }

    // Host-initiated events (selectionchange, modelchange, etc.)
    const handlers = _eventListeners.get(msg.type);
    if (handlers) handlers.forEach(function(h) { try { h(msg.data); } catch(e) {} });

    // UI → plugin messages
    if (msg.type === '${MSG.UI_TO_PLUGIN}' && _uiMessageCallback) {
      try { _uiMessageCallback(msg.data); } catch(e) {}
    }
  });

  // ── plat global ──────────────────────────────────────────────

  const plat = {

    // ── plat.ui ────────────────────────────────────────────────
    ui: {
      open: function(name, url, opts) {
        _post('${MSG.UI_OPEN}', {
          name: name,
          url: url || '',
          width: (opts && opts.width) || 300,
          height: (opts && opts.height) || 400,
        });
      },
      sendMessage: function(data) {
        _post('${MSG.UI_SEND}', { data: data });
      },
      onMessage: function(cb) {
        _uiMessageCallback = cb;
      },
      close: function() {
        _post('${MSG.UI_CLOSE}', {});
      },
    },

    // ── plat.model ─────────────────────────────────────────────
    model: {
      getObjects: async function() {
        _check('model:read');
        const r = await _request('${MSG.MODEL_GET_OBJECTS}', {});
        return r.objects || [];
      },
      getObject: async function(id) {
        _check('model:read');
        const r = await _request('${MSG.MODEL_GET_OBJECT}', { id: id });
        return (r.objects && r.objects[0]) || null;
      },
      getModelId: function() {
        return '${manifest.id}';
      },
      getObjectCount: async function() {
        _check('model:read');
        const r = await _request('${MSG.MODEL_GET_OBJECTS}', {});
        return (r.objects || []).length;
      },
    },

    // ── plat.cad ───────────────────────────────────────────────
    cad: {
      dispatch: async function(command, params) {
        _check('model:write');
        const r = await _request('${MSG.CAD_DISPATCH}', { command: command, params: params || {} });
        return r.result || {};
      },
    },

    // ── plat.selection ─────────────────────────────────────────
    selection: {
      get: async function() {
        _check('selection:read');
        const r = await _request('${MSG.SELECTION_GET}', {});
        return r.objectIds || [];
      },
      set: function(objectIds) {
        _check('selection:write');
        _post('${MSG.SELECTION_SET}', { objectIds: objectIds });
      },
      clear: function() {
        _check('selection:write');
        _post('${MSG.SELECTION_CLEAR}', {});
      },
    },

    // ── plat.camera ─────────────────────────────────────────────
    camera: {
      getMatrix: async function() {
        _check('camera:read');
        const r = await _request('${MSG.CAD_DISPATCH}', { command: 'get_state', params: {} });
        return (r.result && r.result.camera && r.result.camera.matrixWorld) || [];
      },
      setMatrix: async function(matrix) {
        _check('camera:write');
        await _request('${MSG.CAD_DISPATCH}', { command: 'set_camera', params: { matrix: matrix } });
      },
    },

    // ── plat.storage ───────────────────────────────────────────
    storage: {
      get: async function(key) {
        _check('allow:storage');
        const r = await _request('${MSG.STORAGE_GET}', { key: key });
        return r.value !== undefined ? r.value : null;
      },
      set: function(key, value) {
        _check('allow:storage');
        _post('${MSG.STORAGE_SET}', { key: key, value: value });
      },
      remove: function(key) {
        _check('allow:storage');
        _post('${MSG.STORAGE_REMOVE}', { key: key });
      },
    },

    // ── plat.on / off ──────────────────────────────────────────
    on: function(event, callback) {
      if (!_eventListeners.has(event)) _eventListeners.set(event, new Set());
      _eventListeners.get(event).add(callback);
      return function() {
        var handlers = _eventListeners.get(event);
        if (handlers) handlers.delete(callback);
      };
    },
    off: function(event) {
      _eventListeners.delete(event);
    },

    // ── plat.* readonly props ──────────────────────────────────
    get pluginId() { return ${JSON.stringify(manifest.id)}; },
    get theme() { return document.documentElement.getAttribute('data-theme') || 'dark'; },
    get modelId() { return window.__modelId || ''; },
  };

  // Inject as global
  Object.defineProperty(window, 'plat', { value: plat, writable: false, configurable: false });
})();
`
}

// ── Plugin-scoped storage (session-level, host-managed) ───────────────────────
// Uses the host's sessionStorage namespaced by plugin ID.
// For persistence across sessions, plugins need allow:storage + a backend endpoint.

function _storageKey(pluginId: string, key: string): string {
  return `plat-plugin:${pluginId}:${key}`
}

function _getStorage(pluginId: string, key: string): string | null {
  try { return sessionStorage.getItem(_storageKey(pluginId, key)) }
  catch { return null }
}

function _setStorage(pluginId: string, key: string, value: string): void {
  try { sessionStorage.setItem(_storageKey(pluginId, key), value) }
  catch {}
}

function _removeStorage(pluginId: string, key: string): void {
  try { sessionStorage.removeItem(_storageKey(pluginId, key)) }
  catch {}
}
