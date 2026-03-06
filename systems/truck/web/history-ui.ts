import { getSchema } from './schema';
import { CadDocumentManagerBase } from './history-domain';

// UI layer for CadDocumentManager.
// Extends CadDocumentManagerBase with DOM-dependent methods:
//   _renderTimeline() — timeline chip strip rendering + event handlers
//   _updateDocInfo()  — document name display

class CadDocumentManager extends CadDocumentManagerBase {
    override _updateDocInfo() {
        const el = document.getElementById('docInfo');
        if (!el || !this._docBytes) return;
        el.textContent = this._meta.name || 'Untitled';
        el.title = this._modelId || '';
    }

    override _renderTimeline() {
        const strip = document.getElementById('timelineStrip');
        if (!strip) return;
        const ops = this._getOps();
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

        const chips: Array<{label: string; color: string; enabled: boolean; own: boolean; groupId: string | null | undefined; opIndex: number}> = [];
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
                });
                i++;
            }
        }

        strip.innerHTML = chips.map((chip, ci) => {
            const disabled = chip.enabled ? '' : 'timeline-chip-disabled';
            const own = chip.own ? 'timeline-chip-own' : 'timeline-chip-remote';
            return `<button class="btn btn-xs ${chip.color} ${disabled} ${own}" data-chip="${ci}" title="${chip.enabled ? 'Click to disable' : 'Click to re-enable'}">${chip.label}</button>`;
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

window.cadDocManager = new CadDocumentManager();
