import { getSchema } from './schema';
import { CadDocumentManagerBase } from './cad-doc-manager';

// UI layer for CadDocumentManager.
// Extends CadDocumentManagerBase with DOM-dependent methods:
//   _renderTimeline() — timeline chip strip rendering + event handlers
//   _updateDocInfo()  — document name display

class CadDocumentManager extends CadDocumentManagerBase {
    override _updateDocInfo() {
        const el = document.getElementById('docInfo');
        if (!el || !this._modelId) return;
        el.textContent = this._meta.name || 'Untitled';
        el.title = this._modelId || '';
    }

    override _renderTimeline() {
        const strip = document.getElementById('timelineStrip');
        if (!strip) return;
        const ops = this._syncDoc?.getOps() ?? [];
        if (!ops || ops.length === 0) {
            strip.innerHTML = '';
            return;
        }

        const DOMAIN_COLORS: Record<string, string> = {
            geometry: 'btn-primary', booleans: 'btn-success',
            scene: 'btn-ghost',     style: 'btn-ghost',
            sketch: 'btn-primary',
        };
        const COLOR_OVERRIDES: Record<string, string> = {
            boolean_subtract: 'btn-warning', boolean_intersect: 'btn-error',
            clash_detect: 'btn-info', delete: 'btn-error', duplicate: 'btn-info',
        };
        const schema = getSchema();
        const chipColor = (type: string) => {
            if (COLOR_OVERRIDES[type]) return COLOR_OVERRIDES[type];
            const cmd = schema?.commands?.[type];
            if (!cmd) return 'btn-ghost';
            if (cmd.domain === 'geometry' && !type.startsWith('add_')) return 'btn-ghost';
            return DOMAIN_COLORS[cmd.domain] || 'btn-ghost';
        };
        const chipLabel = (type: string) => {
            const cmd = schema?.commands?.[type];
            if (!cmd?.description) return type;
            const desc = cmd.description.replace(/\s*\(.*\)/, '');
            const words = desc.split(/\s+/);
            if (words[0] === 'Add' && words.length >= 3) return words[2][0].toUpperCase() + words[2].slice(1);
            if (words[0] === 'Set' || words[0] === 'Get') {
                const w = words[words.length - 1];
                return w[0].toUpperCase() + w.slice(1);
            }
            const ABBR: Record<string, string> = { Delete: 'Del', Subtract: 'Sub', Duplicate: 'Dup', Intersect: 'Inter', Rotate: 'Rot' };
            return ABBR[words[0]] || words[0];
        };

        // Assign stable colors to actors
        const ACTOR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
        const actorIds = [...new Set(ops.map(o => o.actorId))];
        const actorColorMap = new Map(actorIds.map((id, i) => [id, ACTOR_COLORS[i % ACTOR_COLORS.length]]));

        const chips: Array<{label: string; color: string; enabled: boolean; own: boolean; groupId: string | null | undefined; opIndex: number; actorId: string; actorColor: string}> = [];
        let i = 0;
        while (i < ops.length) {
            const op = ops[i];
            if (op.groupId) {
                const gid = op.groupId;
                const group = ops.filter(o => o.groupId === gid);
                const primary = group[0];
                chips.push({
                    label: chipLabel(primary.type) + (group.length > 1 ? `+${group.length - 1}` : ''),
                    color: chipColor(primary.type),
                    enabled: primary.enabled,
                    own: primary.actorId === this.actorId,
                    groupId: gid,
                    opIndex: i,
                    actorId: primary.actorId,
                    actorColor: actorColorMap.get(primary.actorId) || ACTOR_COLORS[0],
                });
                i += group.length;
            } else {
                chips.push({
                    label: chipLabel(op.type),
                    color: chipColor(op.type),
                    enabled: op.enabled,
                    own: op.actorId === this.actorId,
                    groupId: null,
                    opIndex: i,
                    actorId: op.actorId,
                    actorColor: actorColorMap.get(op.actorId) || ACTOR_COLORS[0],
                });
                i++;
            }
        }

        const actorName = (id: string) => id === 'mcp-server' ? 'MCP Agent' : (id === this.actorId ? 'You' : id.slice(0, 8));
        strip.innerHTML = chips.map((chip, ci) => {
            const disabled = chip.enabled ? '' : 'timeline-chip-disabled';
            const own = chip.own ? 'timeline-chip-own' : 'timeline-chip-remote';
            const action = chip.enabled ? 'Click to disable' : 'Click to re-enable';
            const title = `${actorName(chip.actorId)} — ${action}`;
            const dot = actorIds.length > 1 ? `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${chip.actorColor};margin-right:3px;vertical-align:middle"></span>` : '';
            return `<button class="btn btn-xs ${chip.color} ${disabled} ${own}" data-chip="${ci}" title="${title}">${dot}${chip.label}</button>`;
        }).join('');

        strip.querySelectorAll('[data-chip]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const ci = parseInt((btn as HTMLElement).dataset.chip!);
                const chip = chips[ci];
                if (!chip.own) return;
                this.toggleOpAtIndex(chip.opIndex, chip.groupId, chip.enabled).catch(console.error);
            });

            btn.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const ci = parseInt((btn as HTMLElement).dataset.chip!);
                const chip = chips[ci];
                if (!chip.own) return;
                this.rollback(chip.opIndex);
            });
        });

        strip.scrollLeft = strip.scrollWidth;
    }
}

// ── Module singleton ──────────────────────────────────────────────────────────
// Prefer importing cadDocManager directly rather than using window.cadDocManager.
// window.cadDocManager is kept for backward compat with E2E tests and inline
// scripts that can't import ES modules.

export const cadDocManager: CadDocumentManagerBase = new CadDocumentManager();
window.cadDocManager = cadDocManager;
