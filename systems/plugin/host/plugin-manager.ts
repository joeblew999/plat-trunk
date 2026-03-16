/**
 * plugin-manager.ts
 *
 * Host-side Plugin Manager.
 *
 * Responsibilities:
 *   1. Load a plugin: fetch plugin.js, create sandbox, create UI panel iframe
 *   2. Wire sandbox ↔ UI panel iframe (relay messages in both directions)
 *   3. Broadcast host events (scene change, selection, theme) to all loaded plugins
 *   4. Unload plugins cleanly
 *
 * Two iframes per plugin, exactly like Penpot:
 *   - Sandbox iframe:    runs plugin.ts (no DOM, just `plat` global, hidden)
 *   - UI panel iframe:   runs index.html (visible, no plat access, postMessage only)
 */

import type { PluginManifest } from './plugin-protocol'
import { MSG } from './plugin-protocol'
import { PluginSandbox } from './plugin-sandbox'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LoadedPlugin {
  manifest: PluginManifest
  sandbox: PluginSandbox
  panelIframe: HTMLIFrameElement | null
  panelContainer: HTMLElement | null
}

export interface PluginManagerOptions {
  /** Element to mount plugin panels into */
  panelContainer?: HTMLElement
  /** Current theme — injected into panel iframes */
  theme?: 'dark' | 'light'
}

// ── PluginManager ─────────────────────────────────────────────────────────────

export class PluginManager {
  private _plugins: Map<string, LoadedPlugin> = new Map()
  private _opts: Required<PluginManagerOptions>

  constructor(opts: PluginManagerOptions = {}) {
    this._opts = {
      panelContainer: opts.panelContainer ?? document.body,
      theme: opts.theme ?? 'dark',
    }
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  async load(manifest: PluginManifest): Promise<LoadedPlugin> {
    if (this._plugins.has(manifest.id)) {
      console.warn(`[plugin-manager] ${manifest.id} already loaded — unloading first`)
      this.unload(manifest.id)
    }

    const base = manifest.host ?? ''
    const codeUrl = base + (manifest.code ?? 'plugin.js')

    // Fetch the compiled plugin code
    let pluginCode: string
    try {
      const resp = await fetch(codeUrl)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      pluginCode = await resp.text()
    } catch (err) {
      throw new Error(`[plugin-manager] Failed to fetch ${codeUrl}: ${err}`)
    }

    // Placeholders — filled in when sandbox calls plat.ui.open()
    let panelIframe: HTMLIFrameElement | null = null
    let panelContainer: HTMLElement | null = null

    const sandbox = new PluginSandbox({
      manifest,
      pluginCode,

      // sandbox → UI: plugin.ts called plat.ui.open()
      onUiOpen: (url, name, { width, height }) => {
        const resolvedUrl = url || (base + (manifest.ui ?? 'index.html'))
        const { container, iframe } = this._createPanel(manifest, resolvedUrl, name, width, height)
        panelIframe = iframe
        panelContainer = container
        plugin.panelIframe = iframe
        plugin.panelContainer = container

        // Wire UI panel messages back to sandbox
        window.addEventListener('message', (ev) => {
          if (ev.source !== iframe.contentWindow) return
          // Any message from the panel goes to plugin.ts via sandbox
          sandbox.deliverUiMessage(ev.data)
        })
      },

      // sandbox → UI: plugin.ts called plat.ui.sendMessage()
      onUiMessage: (data) => {
        panelIframe?.contentWindow?.postMessage(data, '*')
      },

      onClose: () => {
        this.unload(manifest.id)
      },
    })

    const plugin: LoadedPlugin = { manifest, sandbox, panelIframe, panelContainer }
    this._plugins.set(manifest.id, plugin)

    await sandbox.start()
    return plugin
  }

  // ── Unload ────────────────────────────────────────────────────────────────

  unload(pluginId: string): void {
    const plugin = this._plugins.get(pluginId)
    if (!plugin) return

    plugin.sandbox.emit(MSG.EVENT_CLOSE, {})
    plugin.sandbox.destroy()
    plugin.panelContainer?.remove()

    this._plugins.delete(pluginId)
    console.log(`[plugin-manager] unloaded ${pluginId}`)
  }

  unloadAll(): void {
    for (const id of [...this._plugins.keys()]) {
      this.unload(id)
    }
  }

  get loadedIds(): string[] {
    return [...this._plugins.keys()]
  }

  // ── Host → all plugins: broadcast events ─────────────────────────────────

  broadcastSelectionChange(objectIds: string[]): void {
    for (const p of this._plugins.values()) {
      if (p.manifest.permissions?.includes('selection:read')) {
        p.sandbox.emit(MSG.EVENT_SELECTION, { objectIds })
      }
    }
  }

  broadcastModelChange(objectIds: string[], actorId: string): void {
    for (const p of this._plugins.values()) {
      if (p.manifest.permissions?.includes('model:read')) {
        p.sandbox.emit(MSG.EVENT_MODEL, { objectIds, actorId })
      }
    }
  }

  broadcastThemeChange(theme: 'dark' | 'light'): void {
    this._opts.theme = theme
    for (const p of this._plugins.values()) {
      p.sandbox.emit(MSG.EVENT_THEME, { theme })
      // Also update the visible panel iframe's theme attribute
      p.panelIframe?.contentDocument?.documentElement.setAttribute('data-theme', theme)
    }
  }

  // ── Panel iframe ─────────────────────────────────────────────────────────

  private _createPanel(
    manifest: PluginManifest,
    url: string,
    name: string,
    width: number,
    height: number,
  ): { container: HTMLElement; iframe: HTMLIFrameElement } {
    const container = document.createElement('div')
    container.className = 'plugin-panel'
    container.dataset.pluginId = manifest.id
    container.style.cssText = `width:${width}px;height:${height}px;`

    const header = document.createElement('div')
    header.className = 'plugin-panel__header'
    header.innerHTML = `
      <span class="plugin-panel__title">${escapeHtml(name || manifest.name)}</span>
      <button class="plugin-panel__close" aria-label="Close plugin" data-plugin-id="${escapeHtml(manifest.id)}">✕</button>
    `
    header.querySelector('button')?.addEventListener('click', () => {
      this.unload(manifest.id)
    })

    const iframe = document.createElement('iframe')
    // allow-scripts: plugin UI can run JS
    // allow-forms: plugin UI can submit forms
    // allow-popups: plugin UI can open links
    // Intentionally NO allow-same-origin → null origin → no host storage access
    iframe.sandbox.add('allow-scripts', 'allow-forms', 'allow-popups', 'allow-modals')
    iframe.src = url
    iframe.allow = 'none'
    iframe.title = `Plugin: ${manifest.name}`
    iframe.style.cssText = `width:100%;flex:1;border:none;display:block;`
    iframe.setAttribute('data-theme', this._opts.theme)

    container.appendChild(header)
    container.appendChild(iframe)
    this._opts.panelContainer.appendChild(container)

    return { container, iframe }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c))
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const pluginManager = new PluginManager()
;(window as any).__pluginManager = pluginManager
