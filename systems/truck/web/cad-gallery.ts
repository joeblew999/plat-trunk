/**
 * <cad-gallery> — Lit Web Component: cloud model gallery.
 *
 * Fetches saved models from /api/models and renders a card grid.
 * Each card shows the model name, object count, and thumbnail.
 * Click to open, long-press or button to delete.
 */
import { LitElement, html } from 'lit';
import { client } from './api-client';
import type { components } from './api-types.generated';
import { cadDocManager } from './cad-doc-manager-ui';
import { MODEL_ID } from './app-config';

type ModelManifest = components['schemas']['ModelManifest'];

export class CadGallery extends LitElement {
  static properties = {
    models: { state: true },
    loading: { state: true },
    error: { state: true },
  };

  // TypeScript property declarations (Lit manages reactivity via static properties above)
  declare models: ModelManifest[];
  declare loading: boolean;
  declare error: string;
  declare _deletingId: string | null;

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.models = [];
    this.loading = true;
    this.error = '';
    this._deletingId = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.refresh();
  }

  async refresh() {
    this.loading = true;
    this.error = '';
    try {
      const { data, error } = await client.GET('/api/models', {});
      if (error) throw new Error(JSON.stringify(error));
      this.models = data ?? [];
    } catch (err) {
      this.error = (err as Error).message || 'Failed to load models';
      this.models = [];
    }
    this.loading = false;
  }

  async _delete(id: string, name: string): Promise<void> {
    if (!confirm(`Delete "${name}"?`)) return;
    this._deletingId = id;
    this.requestUpdate();
    try {
      await window.cadCommand('delete_model', { id });
    } catch (err) {
      this.error = `Delete failed: ${(err as Error).message}`;
    }
    this._deletingId = null;
    this.requestUpdate();
  }

  _open(id: string): void {
    // Skip if already on this model
    if (id === MODEL_ID) return;
    // Dirty check: warn if there are ops recorded since last cloud save
    const mgr = cadDocManager;
    if (mgr?.isDirty && !confirm('You have unsaved changes. Leave this model?')) return;
    window.location.href = `/model/${id}`;
  }

  _thumbnailUrl(model: ModelManifest): string | null {
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
          <div class="card card-xs bg-base-200 cursor-pointer hover:bg-base-300 transition-colors"
               @click=${() => this._open(m.id)}>
            ${this._thumbnailUrl(m)
              ? html`<div class="h-16 overflow-hidden rounded-t-box"><img src=${this._thumbnailUrl(m)} alt=${m.name} class="w-full h-full object-cover" loading="lazy" /></div>`
              : html`<div class="h-16 bg-base-300 flex items-center justify-center rounded-t-box"><span class="text-2xl opacity-20">3D</span></div>`
            }
            <div class="card-body">
              <h4 class="text-xs font-medium truncate">${m.name}</h4>
              <div class="flex justify-between items-center">
                <span class="text-[10px] opacity-50">${m.objectCount} obj${m.objectCount !== 1 ? 's' : ''}</span>
                ${this._deletingId === m.id
                  ? html`<span class="loading loading-spinner loading-xs"></span>`
                  : html`<button class="btn btn-xs btn-ghost btn-square opacity-40 hover:opacity-100 hover:text-error"
                        title="Delete" @click=${(e: Event) => { e.stopPropagation(); this._delete(m.id, m.name); }}>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                </button>`}
              </div>
            </div>
          </div>
        `)}
      </div>
    `;
  }
}

customElements.define('cad-gallery', CadGallery);
