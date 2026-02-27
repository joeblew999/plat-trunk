/**
 * <cf-control-plane> — Vanilla Web Component: deployment control plane banner.
 *
 * Zero dependencies. Light DOM (inherits page CSS / DaisyUI classes).
 * Replaces <cf-versions-picker> (which depended on Lit).
 *
 * Shows:
 *   - Version badge with Worker/Docs deploy indicators [W● D●]
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

      this._version = health.version || '?';
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

    // W/P indicators for current version
    const hasWorker = !!current?.worker?.id;
    const hasDocs = !!current?.docs?.id;
    const indicators = this._isLocal ? '' :
      ` <span class="opacity-40" style="font-size:0.6rem; letter-spacing:1px">${hasWorker ? 'W' : '·'}${hasDocs ? 'D' : '·'}</span>`;

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
    const workerProd = m.production?.worker || '';
    const docsProd = m.production?.docs || '';
    const github = m.github || '';

    // --- Versions section ---
    const versionItems = (m.versions || []).map(v => {
      const isCurrent = v.version === currentVersion;
      const w = v.worker?.id ? '●' : '○';
      const d = v.docs?.id ? '●' : '○';
      const date = v.date ? new Date(v.date).toLocaleDateString() : '';
      const git = v.git;
      const meta = [date, git?.branch, v.commandCount ? `${v.commandCount} cmds` : ''].filter(Boolean).join(' · ');
      const commitLink = git?.commitSha
        ? `<a href="${git.commitUrl}" target="_blank" title="${this._esc(git.commitMessage || '')}" class="underline" onclick="event.stopPropagation()">${git.commitSha}</a>`
        : '';

      // Primary link: Worker preview URL (or Docs if no Worker)
      const href = v.worker?.url || v.docs?.url || '#';

      return `<li>
        <a href="${href}" ${isCurrent ? '' : 'target="_blank"'}
           class="${isCurrent ? 'active font-bold' : ''} flex justify-between items-center gap-2">
          <span>
            <span>v${v.version}${isCurrent ? ' ✓' : ''} <span class="opacity-40" style="font-size:0.6rem">${w}W ${d}D</span></span>
            ${meta || commitLink ? `<br><span class="opacity-50" style="font-size:0.65rem">${meta}${commitLink ? (meta ? ' · ' : '') + commitLink : ''}</span>` : ''}
          </span>
          ${v.worker?.immutableUrl ? `<a href="${v.worker.immutableUrl}" target="_blank" title="Immutable Worker URL" class="opacity-30 hover:opacity-80" onclick="event.stopPropagation()">⧉</a>` : ''}
        </a>
      </li>`;
    }).join('');

    // --- Previews section ---
    const previewItems = (m.previews || []).map(p =>
      `<li><a href="${p.url}" target="_blank">${p.label} <span class="opacity-40" style="font-size:0.6rem">${p.platform}</span></a></li>`
    ).join('');

    // --- Endpoints section ---
    const base = this._workerUrl || workerProd;
    const endpointItems = Object.entries(m.endpoints || {}).map(([name, path]) => {
      const url = String(path).startsWith('http') ? path : `${base}${path}`;
      return `<li><a href="${url}" target="_blank">${name}</a></li>`;
    }).join('');

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
        ${workerProd ? `<li><a href="${workerProd}" target="_blank">Production (Worker)</a></li>` : ''}
        ${docsProd ? `<li><a href="${docsProd}" target="_blank">Production (Docs)</a></li>` : ''}
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
