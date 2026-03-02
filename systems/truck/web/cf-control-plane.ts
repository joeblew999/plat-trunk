/**
 * <cf-control-plane> — Vanilla Web Component: deployment control plane banner.
 *
 * Zero dependencies. Light DOM (inherits page CSS / DaisyUI classes).
 *
 * Shows:
 *   - Version badge with per-worker deploy indicators
 *   - Dropdown with all versions + preview URLs
 *   - Endpoint links (API, MCP, Schema, Docs)
 *   - Cross-links (Worker GUI ↔ Docs ↔ GitHub)
 *
 * Usage:
 *   <cf-control-plane></cf-control-plane>
 *
 *   <!-- On docs worker (deployment info only, links to Worker) -->
 *   <cf-control-plane
 *     worker-url="https://cad.ubuntusoftware.net"
 *     manifest-url="https://cad.ubuntusoftware.net/cf-versions.json"
 *   ></cf-control-plane>
 *
 * See ADR-0022 (v2) for design rationale.
 */

class CfControlPlane extends HTMLElement {
  declare _isLocal: boolean;
  declare _workerUrl: string;
  declare _manifestUrl: string;
  declare _healthUrl: string;
  declare _version: string;
  declare _manifest: any;

  connectedCallback() {
    this._isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    this._workerUrl = this.getAttribute('worker-url') || '';
    this._manifestUrl = this.getAttribute('manifest-url') || '/cf-versions.json';
    this._healthUrl = this._workerUrl ? `${this._workerUrl}/api/health` : '/api/health';

    // Render placeholder immediately
    this.innerHTML = this._renderBadge('...', '');
    this._fetchData();
  }

  async _fetchData() {
    try {
      const [health, manifest] = await Promise.all([
        fetch(this._healthUrl).then(r => r.json()).catch(() => ({})),
        fetch(this._manifestUrl).then(r => r.json()).catch(() => ({ versions: [], previews: [] })),
      ]);

      this._version = (health as any).version || '?';
      this._manifest = manifest;
      this._render();
    } catch {
      // silent — badge stays "..."
    }
  }

  _render() {
    const m = this._manifest;
    const v = this._version;
    const current = m.versions?.find(ver => ver.version === v);

    // Per-worker indicators from platforms map
    const platforms = current?.platforms || {};
    const indicatorParts = Object.keys(platforms).map(name => {
      const initial = name.charAt(0).toUpperCase();
      return platforms[name]?.id ? initial : '·';
    });
    const indicators = this._isLocal || !indicatorParts.length ? '' :
      ` <span class="opacity-40" style="font-size:0.6rem; letter-spacing:1px">${indicatorParts.join('')}</span>`;

    const label = this._isLocal ? 'local' : `v${v}`;
    const title = (this._isLocal ? 'Local dev' : `v${v}`) + ' — click for versions & links';

    this.innerHTML = `
      <div class="dropdown dropdown-bottom">
        <div tabindex="0" role="button"
             class="badge badge-sm badge-outline opacity-40 hover:opacity-80 cursor-pointer font-mono flex items-center gap-1"
             title="${title}">${label}${indicators}</div>
        ${m.versions?.length ? this._renderDropdown(m, v) : ''}
      </div>
    `;
  }

  _renderDropdown(m, currentVersion) {
    const production = m.production || {};
    const github = m.github || '';
    const platformNames = Object.keys(production);

    // --- Versions section ---
    const versionItems = (m.versions || []).map(v => {
      const isCurrent = v.version === currentVersion;
      const platforms = v.platforms || {};

      // Build per-platform indicators
      const pIndicators = platformNames.map(name => {
        const initial = name.charAt(0).toUpperCase();
        return (platforms[name]?.id ? '●' : '○') + initial;
      }).join(' ');

      const date = v.date ? new Date(v.date).toLocaleDateString() : '';
      const git = v.git;
      const meta = [date, git?.branch, v.commandCount ? `${v.commandCount} cmds` : ''].filter(Boolean).join(' · ');
      const commitLink = git?.commitSha
        ? `<a href="${git.commitUrl}" target="_blank" title="${this._esc(git.commitMessage || '')}" class="underline" onclick="event.stopPropagation()">${git.commitSha}</a>`
        : '';

      // Primary link: first platform with a URL
      const firstPlatformWithUrl = platformNames.find(n => platforms[n]?.url);
      const href = firstPlatformWithUrl ? platforms[firstPlatformWithUrl].url : '#';

      // Immutable link: first platform with an immutable URL
      const firstWithImmutable = platformNames.find(n => platforms[n]?.immutableUrl);
      const immutableUrl = firstWithImmutable ? platforms[firstWithImmutable].immutableUrl : null;

      return `<li>
        <a href="${href}" ${isCurrent ? '' : 'target="_blank"'}
           class="${isCurrent ? 'active font-bold' : ''} flex justify-between items-center gap-2">
          <span>
            <span>v${v.version}${isCurrent ? ' ✓' : ''} <span class="opacity-40" style="font-size:0.6rem">${pIndicators}</span></span>
            ${meta || commitLink ? `<br><span class="opacity-50" style="font-size:0.65rem">${meta}${commitLink ? (meta ? ' · ' : '') + commitLink : ''}</span>` : ''}
          </span>
          ${immutableUrl ? `<a href="${immutableUrl}" target="_blank" title="Immutable URL" class="opacity-30 hover:opacity-80" onclick="event.stopPropagation()">⧉</a>` : ''}
        </a>
      </li>`;
    }).join('');

    // --- Previews section ---
    const previewItems = (m.previews || []).map(p =>
      `<li><a href="${p.url}" target="_blank">${p.label} <span class="opacity-40" style="font-size:0.6rem">${p.platform}</span></a></li>`
    ).join('');

    // --- Endpoints section ---
    const base = this._isLocal ? '' : (this._workerUrl || production.router || production[platformNames[0]] || '');
    const endpointItems = Object.entries(m.endpoints || {}).map(([name, path]) => {
      const url = String(path).startsWith('http') ? path : `${base}${path}`;
      return `<li><a href="${url}" target="_blank">${name}</a></li>`;
    }).join('');

    // --- Production links ---
    const prodLinks = platformNames.map(name => {
      const label = name.charAt(0).toUpperCase() + name.slice(1);
      return production[name] ? `<li><a href="${production[name]}" target="_blank">Production (${label})</a></li>` : '';
    }).filter(Boolean).join('');

    return `
      <ul tabindex="0" class="dropdown-content menu bg-base-200 rounded-box z-50 w-72 p-2 shadow-xl text-xs">
        <li class="menu-title">Versions</li>
        ${versionItems}
        ${previewItems ? `
          <li class="menu-title mt-2 pt-2 border-t border-base-300">Previews</li>
          ${previewItems}
        ` : ''}
        <li class="menu-title mt-2 pt-2 border-t border-base-300">Endpoints</li>
        ${endpointItems}
        <li class="menu-title mt-2 pt-2 border-t border-base-300">Links</li>
        <li><a href="${this._isLocal ? location.origin : 'http://localhost:8788'}" class="${this._isLocal ? 'active font-bold' : ''}">Local Dev${this._isLocal ? ' (current)' : ''}</a></li>
        ${prodLinks}
        ${github ? `<li><a href="${github}/releases" target="_blank">GitHub Releases</a></li>` : ''}
      </ul>
    `;
  }

  _renderBadge(label, title) {
    return `<div class="badge badge-sm badge-outline opacity-40 font-mono" title="${title}">${label}</div>`;
  }

  _esc(s) {
    return s.replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
}

customElements.define('cf-control-plane', CfControlPlane);

// Make this file a module (required for dynamic import() in boot.ts)
export {};
