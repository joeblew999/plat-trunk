/**
 * <cad-gallery> — Lit Web Component: cloud model gallery.
 *
 * Fetches saved models from /api/models and renders a card grid.
 * Each card shows the model name, object count, and thumbnail.
 * Click to open, long-press or button to delete.
 */
import { LitElement, html } from './vendor/lit.js';
import { api } from './api-client.js';

export class CadGallery extends LitElement {
  static properties = {
    models: { state: true },
    loading: { state: true },
    error: { state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.models = [];
    this.loading = true;
    this.error = '';
  }

  connectedCallback() {
    super.connectedCallback();
    this.refresh();
  }

  async refresh() {
    this.loading = true;
    this.error = '';
    try {
      const res = await api.models.$get();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.models = await res.json();
    } catch (err) {
      this.error = err.message || 'Failed to load models';
      this.models = [];
    }
    this.loading = false;
  }

  async _delete(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await window.cadCommand('delete_model', { id });
    } catch (err) {
      this.error = `Delete failed: ${err.message}`;
    }
  }

  _open(id) {
    window.location.href = `/model/${id}`;
  }

  _thumbnailUrl(model) {
    return model.hasThumbnail ? `/api/models/${model.id}/thumbnail` : null;
  }

  render() {
    if (this.loading) {
      return html`<div class="text-xs opacity-50 py-2">Loading models...</div>`;
    }

    if (this.error) {
      return html`<div class="text-xs text-error py-2">${this.error}
        <button class="btn btn-xs btn-ghost ml-1" @click=${() => this.refresh()}>Retry</button>
      </div>`;
    }

    if (this.models.length === 0) {
      return html`<div class="text-xs opacity-40 py-2">No saved models yet. Use "Save Cloud" or MCP to save one.</div>`;
    }

    return html`
      <div class="grid grid-cols-2 gap-1 py-1">
        ${this.models.map(m => html`
          <div class="card card-compact bg-base-200 cursor-pointer hover:bg-base-300 transition-colors"
               @click=${() => this._open(m.id)}>
            ${this._thumbnailUrl(m)
              ? html`<figure class="h-16 overflow-hidden"><img src=${this._thumbnailUrl(m)} alt=${m.name} class="w-full h-full object-cover" loading="lazy" /></figure>`
              : html`<figure class="h-16 bg-base-300 flex items-center justify-center"><span class="text-2xl opacity-20">3D</span></figure>`
            }
            <div class="card-body !p-1.5">
              <h4 class="text-xs font-medium truncate">${m.name}</h4>
              <div class="flex justify-between items-center">
                <span class="text-[10px] opacity-50">${m.objectCount} obj${m.objectCount !== 1 ? 's' : ''}</span>
                <button class="btn btn-xs btn-ghost btn-square opacity-40 hover:opacity-100 hover:text-error"
                        title="Delete" @click=${(e) => { e.stopPropagation(); this._delete(m.id, m.name); }}>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        `)}
      </div>
    `;
  }
}

customElements.define('cad-gallery', CadGallery);
