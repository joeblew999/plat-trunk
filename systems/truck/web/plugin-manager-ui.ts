/**
 * plugin-manager-ui.ts
 *
 * Wires the plugin system into the truck-cad web app.
 *
 * Responsibilities:
 *   1. Instantiate PluginManager with the plugin-panel-root container
 *   2. Bridge pluginManager ↔ cadCommand (window.cadCommand already set by state.ts)
 *   3. Expose window.pluginManager so the toolbar button and HTML handlers work
 *   4. Keep the plugin sidebar list in sync with loaded plugins
 *   5. Provide promptInstall() for the "+ Install plugin…" button
 *
 * Import order matters: this module is imported in boot.ts AFTER state.ts
 * so window.cadCommand is guaranteed to exist.
 */

import { PluginManager } from '../../../systems/plugin/host/plugin-manager'
import type { PluginManifest } from '../../../systems/plugin/host/plugin-protocol'

// ── Extend window globals ─────────────────────────────────────────────────────

declare global {
  interface Window {
    pluginManager: AppPluginManager
  }
}

// ── AppPluginManager: thin app-aware wrapper ──────────────────────────────────

class AppPluginManager {
  private _pm: PluginManager
  private _sidebar: HTMLElement | null
  private _list: HTMLElement | null
  private _sidebarOpen = false

  constructor() {
    const panelRoot = document.getElementById('plugin-panel-root') ?? document.body

    this._pm = new PluginManager({
      panelContainer: panelRoot,
      theme: (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') ?? 'dark',
    })

    this._sidebar = document.getElementById('plugin-sidebar')
    this._list = document.getElementById('plugin-sidebar__list')

    // Bridge: patch window.cadCommand into the PluginManager's sandbox calls.
    // plugin-sandbox.ts calls window.cadCommand(cmd, params, opts) — which is
    // exactly the signature state.ts sets up. Nothing to do: it already works.
    // (The sandbox's _handleSandboxMessage uses window.cadCommand directly.)

    // Keep sidebar in sync when plugins are loaded/unloaded
    this._pm['_plugins'] // access internal map — we observe by overriding load/unload
    this._patchLoadUnload()
  }

  // ── Public API (called from HTML) ───────────────────────────────────────────

  togglePanel(): void {
    this._sidebarOpen = !this._sidebarOpen
    if (this._sidebar) {
      this._sidebar.style.display = this._sidebarOpen ? 'flex' : 'none'
    }
  }

  async load(manifest: PluginManifest): Promise<void> {
    await this._pm.load(manifest)
    this._refreshList()
  }

  unload(pluginId: string): void {
    this._pm.unload(pluginId)
    this._refreshList()
  }

  async promptInstall(): Promise<void> {
    const url = prompt('Plugin manifest URL (manifest.json):')
    if (!url) return
    try {
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const manifest: PluginManifest = await resp.json()
      manifest.host = url.replace(/\/[^/]+$/, '/') // base URL from manifest URL
      await this.load(manifest)
    } catch (err) {
      alert(`Failed to install plugin: ${err}`)
    }
  }

  // Load a first-party plugin by its directory path (relative to origin)
  async loadBuiltin(basePath: string): Promise<void> {
    const manifestUrl = `${basePath}/public/manifest.json`
    try {
      const resp = await fetch(manifestUrl)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const manifest: PluginManifest = await resp.json()
      manifest.host = basePath + '/'
      await this.load(manifest)
    } catch (err) {
      console.error(`[plugin-manager-ui] Failed to load builtin from ${basePath}:`, err)
    }
  }

  // ── Broadcast host events to all loaded plugins ─────────────────────────────

  onSelectionChange(objectIds: string[]): void {
    this._pm.broadcastSelectionChange(objectIds)
  }

  onModelChange(objectIds: string[], actorId: string): void {
    this._pm.broadcastModelChange(objectIds, actorId)
  }

  onThemeChange(theme: 'dark' | 'light'): void {
    this._pm.broadcastThemeChange(theme)
  }

  // ── Sidebar list ────────────────────────────────────────────────────────────

  private _refreshList(): void {
    if (!this._list) return
    const ids = this._pm.loadedIds
    if (!ids.length) {
      this._list.innerHTML = '<div class="text-xs opacity-40 p-3">No plugins loaded.</div>'
      return
    }
    this._list.innerHTML = ids.map(id => `
      <div class="plugin-list-item" data-plugin-id="${escHtml(id)}">
        <div>
          <div class="plugin-list-item__name">${escHtml(id.split('.').pop() ?? id)}</div>
          <div class="plugin-list-item__id">${escHtml(id)}</div>
        </div>
        <button class="btn btn-ghost btn-xs text-error"
                onclick="window.pluginManager.unload('${escHtml(id)}')"
                title="Unload plugin">✕</button>
      </div>
    `).join('')
  }

  // Patch load/unload to auto-refresh sidebar
  private _patchLoadUnload(): void {
    const orig_load = this._pm.load.bind(this._pm)
    const orig_unload = this._pm.unload.bind(this._pm)
    this._pm.load = async (manifest) => {
      const result = await orig_load(manifest)
      this._refreshList()
      return result
    }
    this._pm.unload = (id) => {
      orig_unload(id)
      this._refreshList()
    }
  }
}

function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c))
}

// ── Initialise and expose globally ───────────────────────────────────────────

export function initPluginManager(): AppPluginManager {
  const mgr = new AppPluginManager()
  window.pluginManager = mgr
  return mgr
}
