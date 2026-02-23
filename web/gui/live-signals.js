/**
 * Live Signals Debug Panel — real-time Datastar signal viewer.
 *
 * Adapted from datastar-lit-examples (Yacobolo) for CAD GUI.
 * Shows all Datastar signals in a collapsible tree with change highlighting.
 *
 * Usage: Add <live-signals></live-signals> to index.html
 *        Add <pre data-json-signals style="display:none"></pre> for Datastar
 */
import { LitElement, html, css } from './vendor/lit.js';

export class LiveSignals extends LitElement {
  static properties = {
    _signals:         { type: Object, state: true },
    _previousSignals: { type: String, state: true },
    _expandedPaths:   { type: Object, state: true },
    _changedPaths:    { type: Object, state: true },
    _collapsed:       { type: Boolean, state: true },
    _isFirstLoad:     { type: Boolean, state: true },
  };

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      right: 0;
      width: 320px;
      height: 100vh;
      background: #0f0f17;
      border-left: 1px solid #2a2a3c;
      z-index: 1000;
      font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      transition: transform 0.2s ease;
    }

    :host([collapsed]) {
      transform: translateX(100%);
    }

    .toggle {
      position: absolute;
      top: 50%;
      left: -32px;
      transform: translateY(-50%);
      width: 32px;
      height: 64px;
      background: #1a1a2e;
      border: 1px solid #2a2a3c;
      border-right: none;
      border-radius: 8px 0 0 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      font-size: 14px;
      transition: all 0.15s ease;
    }
    .toggle:hover { background: #2a2a3c; color: #f3f4f6; }
    .toggle svg { width: 16px; height: 16px; transition: transform 0.2s ease; }
    :host([collapsed]) .toggle svg { transform: rotate(180deg); }

    .header {
      padding: 16px;
      border-bottom: 1px solid #2a2a3c;
      background: linear-gradient(180deg, #1a1a2e 0%, #0f0f17 100%);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-icon { width: 20px; height: 20px; color: #818cf8; }
    .header h3 {
      margin: 0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #d1d5db;
      font-weight: 600;
    }

    .content {
      height: calc(100vh - 57px);
      overflow-y: auto;
      overflow-x: hidden;
    }
    .content::-webkit-scrollbar { width: 8px; }
    .content::-webkit-scrollbar-track { background: transparent; }
    .content::-webkit-scrollbar-thumb { background: #2a2a3c; border-radius: 4px; }
    .content::-webkit-scrollbar-thumb:hover { background: #374151; }

    .tree-root { padding: 8px 0; }
    .tree-node { position: relative; }
    .tree-row {
      display: flex;
      align-items: center;
      padding: 4px 12px 4px 0;
      cursor: default;
      transition: background 0.1s ease;
      min-height: 26px;
    }
    .tree-row:hover { background: #1a1a2e; }
    .tree-row.root-level {
      background: #1a1a2e;
      border-bottom: 1px solid #2a2a3c;
      margin-bottom: 2px;
    }
    .tree-row.root-level:hover { background: #2a2a3c; }

    .indent { display: flex; align-items: stretch; align-self: stretch; }
    .indent-guide {
      width: 16px;
      display: flex;
      justify-content: center;
      position: relative;
    }
    .indent-guide::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 1px;
      background: #2a2a3c;
    }

    .expand-btn {
      width: 20px; height: 20px;
      display: flex; align-items: center; justify-content: center;
      background: none; border: none;
      color: #6b7280; cursor: pointer;
      border-radius: 4px; padding: 0; flex-shrink: 0;
      transition: all 0.1s ease;
    }
    .expand-btn:hover { background: #2a2a3c; color: #d1d5db; }
    .expand-btn svg { width: 12px; height: 12px; transition: transform 0.15s ease; }
    .expand-btn.expanded svg { transform: rotate(90deg); }
    .expand-placeholder { width: 20px; flex-shrink: 0; }

    .key { color: #a78bfa; margin-right: 4px; font-weight: 500; }
    .colon { color: #6b7280; margin-right: 6px; }
    .value { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .value.string { color: #a3e635; }
    .value.number { color: #22d3ee; }
    .value.boolean { color: #fb923c; }
    .value.null { color: #6b7280; font-style: italic; }

    .badge {
      font-size: 10px; padding: 1px 6px; border-radius: 10px;
      background: #2a2a3c; color: #9ca3af; margin-left: 6px; font-weight: 500;
    }

    .type-icon { width: 14px; height: 14px; margin-right: 6px; flex-shrink: 0; opacity: 0.7; }
    .type-icon.object { color: #a78bfa; }
    .type-icon.array { color: #22d3ee; }

    .preview { color: #6b7280; font-size: 11px; margin-left: 4px; }

    @keyframes flash-bg {
      0% { background: #854d0e; box-shadow: inset 0 0 0 1px #ca8a04; }
      100% { background: transparent; box-shadow: none; }
    }
    @keyframes flash-text {
      0%, 50% { color: #fef08a; text-shadow: 0 0 8px #eab308; }
      100% { color: inherit; text-shadow: none; }
    }
    .tree-row.changed { animation: flash-bg 1s ease-out forwards; }
    .value.changed { animation: flash-text 1s ease-out forwards; }

    .children { overflow: hidden; }
    .children.collapsed { display: none; }

    .empty { padding: 24px 16px; text-align: center; color: #6b7280; }
    .empty-icon { width: 32px; height: 32px; margin: 0 auto 8px; opacity: 0.5; }
  `;

  constructor() {
    super();
    this._signals = {};
    this._previousSignals = '{}';
    this._expandedPaths = new Set();
    this._changedPaths = new Map();
    this._collapsed = false;
    this._isFirstLoad = true;
  }

  connectedCallback() {
    super.connectedCallback();
    this._startObserving();
  }

  _startObserving() {
    this._updateSignals();
    this._intervalId = setInterval(() => this._updateSignals(), 100);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._intervalId) clearInterval(this._intervalId);
  }

  _updateSignals() {
    const jsonSignalsEl = document.querySelector('[data-json-signals]');
    if (jsonSignalsEl && jsonSignalsEl.textContent) {
      try {
        const newSignals = JSON.parse(jsonSignalsEl.textContent);
        const newJson = JSON.stringify(newSignals);

        if (this._isFirstLoad && Object.keys(newSignals).length > 0) {
          this._isFirstLoad = false;
          this._expandedPaths = new Set(Object.keys(newSignals));
          this._previousSignals = newJson;
          this._signals = newSignals;
          return;
        }

        if (newJson !== this._previousSignals) {
          const changedRoots = this._detectChanges(this._signals, newSignals, '');
          this._previousSignals = newJson;
          this._signals = newSignals;

          if (changedRoots.size > 0) {
            this._autoExpandChanged(changedRoots);
          }

          setTimeout(() => { this._changedPaths = new Map(); }, 1000);
        }
      } catch (e) { /* ignore parse errors */ }
    }
  }

  _detectChanges(oldObj, newObj, path) {
    const timestamp = Date.now();
    const newChanges = new Map();
    const changedRoots = new Set();

    const check = (oldVal, newVal, currentPath) => {
      if (typeof newVal !== 'object' || newVal === null) {
        if (oldVal !== newVal) {
          newChanges.set(currentPath, timestamp);
          const root = currentPath.split('.')[0].split('[')[0];
          changedRoots.add(root);
        }
        return;
      }

      if (Array.isArray(newVal)) {
        if (!Array.isArray(oldVal) || oldVal.length !== newVal.length) {
          newChanges.set(currentPath, timestamp);
          const root = currentPath.split('.')[0].split('[')[0];
          changedRoots.add(root);
        }
        newVal.forEach((item, i) => {
          check(oldVal?.[i], item, `${currentPath}[${i}]`);
        });
      } else {
        const allKeys = new Set([...Object.keys(oldVal || {}), ...Object.keys(newVal)]);
        allKeys.forEach(key => {
          check(oldVal?.[key], newVal[key], currentPath ? `${currentPath}.${key}` : key);
        });
      }
    };

    check(oldObj, newObj, path);
    this._changedPaths = newChanges;
    return changedRoots;
  }

  _getParentPaths(path) {
    const parents = [];
    let current = '';
    let i = 0;
    while (i < path.length) {
      if (path[i] === '.') {
        if (current) parents.push(current);
        current += '.';
      } else if (path[i] === '[') {
        if (current) parents.push(current);
        const end = path.indexOf(']', i);
        current += path.slice(i, end + 1);
        i = end;
      } else {
        current += path[i];
      }
      i++;
    }
    return parents;
  }

  _autoExpandChanged(changedRoots) {
    const newExpanded = new Set();
    for (const root of Object.keys(this._signals)) {
      if (changedRoots.has(root)) {
        newExpanded.add(root);
        for (const changedPath of this._changedPaths.keys()) {
          if (changedPath.startsWith(root)) {
            for (const parentPath of this._getParentPaths(changedPath)) {
              newExpanded.add(parentPath);
            }
          }
        }
      }
    }
    this._expandedPaths = newExpanded;
  }

  _toggleExpand(path) {
    const newExpanded = new Set(this._expandedPaths);
    if (newExpanded.has(path)) { newExpanded.delete(path); }
    else { newExpanded.add(path); }
    this._expandedPaths = newExpanded;
  }

  _toggleCollapsed() {
    this._collapsed = !this._collapsed;
    if (this._collapsed) { this.setAttribute('collapsed', ''); }
    else { this.removeAttribute('collapsed'); }
  }

  _getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  _buildTree(obj, parentPath = '') {
    if (typeof obj !== 'object' || obj === null) return [];
    return Object.entries(obj)
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, value]) => {
        const path = parentPath ? `${parentPath}.${key}` : key;
        const type = this._getType(value);
        const node = { key, value, type, path };

        if (type === 'object') {
          node.children = this._buildTree(value, path);
          node.count = Object.keys(value).length;
        } else if (type === 'array') {
          node.children = value.map((item, i) => {
            const itemPath = `${path}[${i}]`;
            const itemType = this._getType(item);
            const child = { key: String(i), value: item, type: itemType, path: itemPath };
            if (itemType === 'object') {
              child.children = this._buildTree(item, itemPath);
              child.count = Object.keys(item).length;
            } else if (itemType === 'array') {
              child.count = item.length;
            }
            return child;
          });
          node.count = value.length;
        }
        return node;
      });
  }

  _formatValue(value, type) {
    if (type === 'string') return `"${value}"`;
    if (type === 'null') return 'null';
    if (type === 'boolean') return value ? 'true' : 'false';
    return String(value);
  }

  _getPreview(node) {
    if (node.type === 'array' && node.children) {
      const items = node.children.slice(0, 3).map(c => {
        if (c.type === 'object') return '{...}';
        if (c.type === 'array') return '[...]';
        return this._formatValue(c.value, c.type);
      });
      return `[${items.join(', ')}${node.children.length > 3 ? ', ...' : ''}]`;
    }
    if (node.type === 'object' && node.children) {
      const keys = node.children.slice(0, 3).map(c => c.key);
      return `{ ${keys.join(', ')}${node.children.length > 3 ? ', ...' : ''} }`;
    }
    return '';
  }

  _renderIndent(depth) {
    if (depth === 0) return html`<span style="width: 8px"></span>`;
    const guides = [];
    for (let i = 0; i < depth; i++) {
      guides.push(html`<span class="indent-guide"></span>`);
    }
    return html`<span class="indent">${guides}</span>`;
  }

  _renderTypeIcon(type) {
    if (type === 'object') {
      return html`<svg class="type-icon object" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
      </svg>`;
    }
    if (type === 'array') {
      return html`<svg class="type-icon array" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line>
        <line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line>
        <line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
      </svg>`;
    }
    return '';
  }

  _renderNode(node, depth) {
    const isExpandable = node.type === 'object' || node.type === 'array';
    const isExpanded = this._expandedPaths.has(node.path);
    const isChanged = this._changedPaths.has(node.path);
    const isRootLevel = depth === 0;

    return html`
      <div class="tree-node">
        <div class="tree-row ${isRootLevel ? 'root-level' : ''} ${isChanged ? 'changed' : ''}">
          ${this._renderIndent(depth)}
          ${isExpandable ? html`
            <button class="expand-btn ${isExpanded ? 'expanded' : ''}" @click=${() => this._toggleExpand(node.path)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          ` : html`<span class="expand-placeholder"></span>`}
          ${this._renderTypeIcon(node.type)}
          <span class="key">${node.key}</span>
          <span class="colon">:</span>
          ${isExpandable ? html`
            <span class="badge">${node.count} ${node.type === 'array' ? 'items' : 'keys'}</span>
            ${!isExpanded && node.children?.length ? html`<span class="preview">${this._getPreview(node)}</span>` : ''}
          ` : html`
            <span class="value ${node.type} ${isChanged ? 'changed' : ''}">${this._formatValue(node.value, node.type)}</span>
          `}
        </div>
        ${isExpandable && node.children ? html`
          <div class="children ${isExpanded ? '' : 'collapsed'}">
            ${node.children.map(child => this._renderNode(child, depth + 1))}
          </div>
        ` : ''}
      </div>
    `;
  }

  render() {
    const tree = this._buildTree(this._signals);
    const isEmpty = tree.length === 0;

    return html`
      <button class="toggle" @click=${() => this._toggleCollapsed()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div class="header">
        <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
        </svg>
        <h3>Live Signals</h3>
      </div>

      <div class="content">
        ${isEmpty ? html`
          <div class="empty">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>No signals detected</div>
          </div>
        ` : html`
          <div class="tree-root">
            ${tree.map(node => this._renderNode(node, 0))}
          </div>
        `}
      </div>
    `;
  }
}

customElements.define('live-signals', LiveSignals);
