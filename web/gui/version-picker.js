/**
 * <cad-version-picker> — Lit Web Component: version badge + dropdown.
 *
 * Self-contained: fetches /api/health and /versions.json on connect,
 * renders a DaisyUI dropdown with all deployed versions and links.
 *
 * Usage:
 *   <cad-version-picker></cad-version-picker>
 */
import { LitElement, html } from './vendor/lit.js';

export class CadVersionPicker extends LitElement {
  static properties = {
    _label: { state: true },
    _title: { state: true },
    _versions: { state: true },
    _previews: { state: true },
    _production: { state: true },
    _current: { state: true },
    _isLocal: { state: true },
    _loaded: { state: true },
  };

  // Light DOM — inherits page styles (DaisyUI classes)
  createRenderRoot() { return this; }

  constructor() {
    super();
    this._label = '...';
    this._title = '';
    this._versions = [];
    this._previews = [];
    this._production = 'https://cad.ubuntusoftware.net';
    this._current = '?';
    this._isLocal = false;
    this._loaded = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this._isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    this._fetchData();
  }

  async _fetchData() {
    try {
      const [health, manifest] = await Promise.all([
        fetch('/api/health').then(r => r.json()).catch(() => ({})),
        fetch('/versions.json').then(r => r.json()).catch(() => ({ versions: [] })),
      ]);
      this._current = health.version || '?';
      this._label = this._isLocal ? 'local' : 'v' + this._current;
      this._title = (this._isLocal ? 'Local dev' : 'v' + this._current) + ' — click to switch versions';
      this._versions = manifest.versions || [];
      this._previews = manifest.previews || [];
      this._production = manifest.production || this._production;
      this._loaded = true;
    } catch { /* silent — badge stays "..." */ }
  }

  render() {
    return html`
      <div class="dropdown dropdown-bottom">
        <div tabindex="0" role="button"
             class="badge badge-sm badge-outline opacity-40 hover:opacity-80 cursor-pointer font-mono"
             title=${this._title}>${this._label}</div>
        ${this._loaded && this._versions.length > 0 ? html`
          <ul tabindex="0" class="dropdown-content menu bg-base-200 rounded-box z-50 w-64 p-2 shadow-xl text-xs">
            <li class="menu-title">Releases</li>
            ${this._versions.map(v => {
              const isCurrent = v.version === this._current;
              const date = v.date ? new Date(v.date).toLocaleDateString() : '';
              const meta = [date, v.commitSha ? v.commitSha.slice(0, 7) : '', v.commandCount ? v.commandCount + ' cmds' : ''].filter(Boolean).join(' · ');
              return html`<li>
                <a href=${v.url}
                   target=${isCurrent ? '' : '_blank'}
                   class="${isCurrent ? 'active font-bold' : ''} flex justify-between items-center gap-2">
                  <span>
                    <span>v${v.version}${isCurrent ? ' ✓' : ''}</span>
                    ${meta ? html`<br><span class="opacity-50" style="font-size:0.65rem">${meta}</span>` : ''}
                  </span>
                  ${v.previewUrl ? html`<a href=${v.previewUrl} target="_blank" title="Immutable preview URL"
                    class="opacity-30 hover:opacity-80" @click=${(e) => e.stopPropagation()}>⧉</a>` : ''}
                </a>
              </li>`;
            })}
            ${this._previews.length > 0 ? html`
              <li class="menu-title mt-2 pt-2 border-t border-base-300">PR Previews</li>
              ${this._previews.map(p => html`
                <li><a href=${p.url} target="_blank">${p.label}</a></li>
              `)}
            ` : ''}
            <li class="menu-title mt-2 pt-2 border-t border-base-300">Links</li>
            <li><a href="http://localhost:8788" class=${this._isLocal ? 'active font-bold' : ''}>
              Local Dev${this._isLocal ? ' (current)' : ''}
            </a></li>
            <li><a href=${this._production} target="_blank">Production</a></li>
            <li><a href="https://github.com/joeblew999/plat-trunk/releases" target="_blank">GitHub Releases</a></li>
          </ul>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('cad-version-picker', CadVersionPicker);
