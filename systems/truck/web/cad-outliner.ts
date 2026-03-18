/**
 * <cad-outliner> — Lit Web Component: reactive scene object list (ADR-0019 Phase 8).
 *
 * Replaces imperative renderObjectList() with a reactive Lit component.
 * Receives state via Datastar → Lit data-attr bridge (same pattern as <cad-viewport>).
 *
 * Usage:
 *   <cad-outliner data-attr:object-ids="JSON.stringify($litState.objectIds)"
 *                 data-attr:selected-id="$selectedId"
 *                 data-attr:bool-sel-a="$boolSelA"
 *                 data-attr:bool-sel-b="$boolSelB">
 *   </cad-outliner>
 */
import { LitElement, html } from 'lit';
import { moduleRouter } from './core/module-router';

export class CadOutliner extends LitElement {
  static properties = {
    objectIds: { type: Array, attribute: 'object-ids' },
    selectedId: { type: String, attribute: 'selected-id' },
    boolSelA: { type: String, attribute: 'bool-sel-a' },
    boolSelB: { type: String, attribute: 'bool-sel-b' },
  };

  // Light DOM — styles from page stylesheet (same as cad-viewport)
  createRenderRoot() { return this; }

  // TypeScript property declarations
  declare objectIds: string[];
  declare selectedId: string;
  declare boolSelA: string;
  declare boolSelB: string;
  declare _names: Record<string, string>;

  constructor() {
    super();
    this.objectIds = [];
    this.selectedId = '';
    this.boolSelA = '';
    this.boolSelB = '';
    this._names = {};
  }

  willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has('objectIds')) {
      // Refresh object names from WASM when list changes
      try {
        const router = moduleRouter;
        if (router?.ready) {
          const state = router.query('getState');
          this._names = state.objectNames || {};
        }
      } catch { /* no-op */ }
    }
  }

  render() {
    if (!this.objectIds || this.objectIds.length === 0) {
      return html`<span class="opacity-50">Scene empty</span>`;
    }

    return html`${this.objectIds.map((id, i) => {
      const isA = id === this.boolSelA;
      const isB = id === this.boolSelB;
      const cls = isA ? 'obj-item obj-sel-a' : isB ? 'obj-item obj-sel-b' : 'obj-item';
      const label = isA ? 'A' : isB ? 'B' : '';
      const name = this._names[id] || id.slice(0, 6);
      return html`
        <div class="flex items-center gap-1 group">
          <button class="${cls} flex-1" data-testid="outliner-item" data-oid="${id}"
                  title="${id}" @click=${() => this._select(id)}>
            ${i}: ${name}${label ? html` <b>${label}</b>` : ''}
          </button>
          <button class="btn btn-ghost btn-xs opacity-0 group-hover:opacity-50 hover:!opacity-100 p-0.5 h-auto min-h-0"
                  title="Focus object" @click=${(e: Event) => { e.stopPropagation(); this._focus(id); }}>
            <svg xmlns="http://www.w3.org/2000/svg" class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
          </button>
        </div>`;
    })}`;
  }

  _select(id: string): void {
    window.cadCommand?.('select', { id });
  }

  _focus(id: string): void {
    (document.getElementById('viewport') as any)?.zoomTo(id);
  }
}

customElements.define('cad-outliner', CadOutliner);
