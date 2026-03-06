// sketch.ts — Sketch controller: points, edges, constraints, extrude.
// ALL sketch operations go through cadCommand (ADR-0019 Phase 4).
// ES module (ADR-0019 Phase 5).

import { cadCommand, cadQuery, showFeedback } from './dispatch';
import { reconcile } from './reconcile';

// cmd wraps cadQuery which is synchronous — no await needed.
const cmd = (type: string, params: Record<string, unknown> = {}) => cadQuery(type, params);
const ds = () => window._ds;
const fb = (msg: string, err: boolean) => showFeedback(msg, err);

let points: Array<{id: string, x: number, y: number}> = [];
let edges: Array<{id: string, p0Id: string, p1Id: string}> = [];
let constraints: Array<{id?: string, type: string, params?: unknown}> = [];

function syncInfo() {
    const d = ds();
    if (!d?.root) return;
    d.beginBatch();
    d.root.sketchInfo = points.length || edges.length || constraints.length
        ? `Points: ${points.length}  Edges: ${edges.length}  Constraints: ${constraints.length}`
        : 'No active sketch';
    d.endBatch();
}

function rebuildSelects() {
    (document.querySelectorAll('.sketch-point-select') as unknown as NodeListOf<HTMLSelectElement>).forEach(sel => {
        const cur = sel.value;
        sel.innerHTML = '<option value="">--</option>';
        points.forEach((p, i) => {
            const o = document.createElement('option');
            o.value = p.id;
            o.textContent = `P${i} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`;
            sel.appendChild(o);
        });
        if (cur) sel.value = cur;
    });
    (document.querySelectorAll('.sketch-edge-select') as unknown as NodeListOf<HTMLSelectElement>).forEach(sel => {
        const cur = sel.value;
        sel.innerHTML = '<option value="">--</option>';
        edges.forEach((e, i) => {
            const p0i = points.findIndex(p => p.id === e.p0Id);
            const p1i = points.findIndex(p => p.id === e.p1Id);
            const o = document.createElement('option');
            o.value = e.id;
            o.textContent = `E${i} (P${p0i}→P${p1i})`;
            sel.appendChild(o);
        });
        if (cur) sel.value = cur;
    });
}

function reset() {
    points = []; edges = []; constraints = [];
    const d = ds();
    if (d?.root) {
        d.beginBatch();
        d.root.sketchActive = false;
        d.root.sketchInfo = 'No active sketch';
        d.root.sketchConType = '';
        d.endBatch();
    }
}

const sketch = {
    get isActive() { return ds()?.root?.sketchActive ?? false; },

    begin() {
        const d = ds();
        const plane = d?.root?.sketchPlane || 'xy';
        const result = cmd('begin_sketch', { plane });
        if (result?.sketchId) {
            points = []; edges = []; constraints = [];
            d.beginBatch(); d.root.sketchActive = true; d.endBatch();
            syncInfo();
            fb(`Sketch started on ${plane.toUpperCase()} plane`, false);
        }
    },

    addPoint() {
        if (!this.isActive) return;
        const d = ds();
        const x = parseFloat(d.root.sketchPtX) || 0;
        const y = parseFloat(d.root.sketchPtY) || 0;
        const result = cmd('sketch_add_point', { x, y });
        if (result?.pointId) {
            points.push({ id: result.pointId, x, y });
            syncInfo(); rebuildSelects();
            fb(`Point at (${x}, ${y})`, false);
        }
    },

    addEdge() {
        if (!this.isActive) return;
        const p0Id = (document.getElementById('sketchEdgeP0') as HTMLInputElement | null)?.value;
        const p1Id = (document.getElementById('sketchEdgeP1') as HTMLInputElement | null)?.value;
        if (!p0Id || !p1Id || p0Id === p1Id) { fb('Select two different points', true); return; }
        const result = cmd('sketch_add_edge', { p0Id, p1Id });
        if (result?.edgeId) {
            edges.push({ id: result.edgeId, p0Id, p1Id });
            syncInfo(); rebuildSelects();
            fb('Edge added', false);
        }
    },

    addConstraint() {
        if (!this.isActive) return;
        const d = ds();
        const type = d.root.sketchConType;
        if (!type) { fb('Select constraint type', true); return; }
        const p0 = (document.getElementById('sketchConP0') as HTMLInputElement | null)?.value;
        const p1 = (document.getElementById('sketchConP1') as HTMLInputElement | null)?.value;
        const e0 = (document.getElementById('sketchConEdge0') as HTMLInputElement | null)?.value;
        const e1 = (document.getElementById('sketchConEdge1') as HTMLInputElement | null)?.value;
        const val = parseFloat(d.root.sketchConVal);
        const val2 = parseFloat(d.root.sketchConVal2);
        let params;
        switch (type) {
            case 'fixed':
                if (!p0) { fb('Select a point', true); return; }
                params = { point_id: p0, x: val || 0, y: val2 || 0 }; break;
            case 'horizontal': case 'vertical':
                if (!e0) { fb('Select an edge', true); return; }
                params = { edge_id: e0 }; break;
            case 'distance': case 'horizontal_distance': case 'vertical_distance':
                if (!p0 || !p1) { fb('Select two points', true); return; }
                params = { p0_id: p0, p1_id: p1, value: val || 1 }; break;
            case 'coincident':
                if (!p0 || !p1) { fb('Select two points', true); return; }
                params = { p0_id: p0, p1_id: p1 }; break;
            case 'parallel': case 'perpendicular': case 'equal_length':
                if (!e0 || !e1) { fb('Select two edges', true); return; }
                params = { edge0_id: e0, edge1_id: e1 }; break;
            case 'midpoint':
                if (!e0 || !p0) { fb('Select edge and point', true); return; }
                params = { edge_id: e0, point_id: p0 }; break;
            default: fb('Unknown constraint', true); return;
        }
        const result = cmd('sketch_add_constraint', { constraintType: type, params: JSON.stringify(params) });
        if (result?.constraintId) {
            constraints.push({ id: result.constraintId, type, params });
            syncInfo();
            fb(`${type} constraint added`, false);
        }
    },

    solve() {
        if (!this.isActive) return;
        const result = cmd('sketch_solve');
        if (result?.solved) {
            try {
                const solved = result.solved;
                solved.forEach((sp: {id: string, x: number, y: number}) => { const local = points.find(p => p.id === sp.id); if (local) { local.x = sp.x; local.y = sp.y; } });
                rebuildSelects();
                fb(`Solved: ${solved.map((p: {x: number, y: number}, i: number) => `P${i}(${p.x.toFixed(2)},${p.y.toFixed(2)})`).join(' ')}`, false);
            } catch { fb('Solve parse error', true); }
        } else { fb(result?.error || 'Solve failed', true); }
    },

    async extrude() {
        if (!this.isActive) return;
        if (edges.length < 3) { fb('Need at least 3 edges for closed loop', true); return; }
        const height = parseFloat(ds().root.sketchExtH) || 1;
        const exportResult = cmd('sketch_export');
        if (!exportResult?.sketchJson) { fb('Failed to export sketch', true); return; }
        // sketch_extrude is the final commit — uses default options (record: true, broadcast: true)
        const result = await cadCommand('sketch_extrude', { sketchJson: exportResult.sketchJson, height });
        if (result?.objectId) {
            reset();
            reconcile({ objectId: result.objectId });
            fb(`Extruded! Object: ${result.objectId.slice(0, 8)}`, false);
        } else { fb(result?.error || 'Extrude failed (ensure edges form closed loop)', true); }
    },

    cancel() {
        cmd('sketch_cancel');
        reset();
        fb('Sketch cancelled', false);
    },

    quickRect() {
        if (!this.isActive) {
            const d = ds();
            const plane = d?.root?.sketchPlane || 'xy';
            const r = cmd('begin_sketch', { plane });
            if (!r?.sketchId) return;
            d.beginBatch(); d.root.sketchActive = true; d.endBatch();
        }
        const d = ds();
        const w = parseFloat(d.root.sketchRectW) || 2;
        const h = parseFloat(d.root.sketchRectH) || 1;
        const ids = [
            cmd('sketch_add_point', { x: 0, y: 0 })?.pointId,
            cmd('sketch_add_point', { x: w, y: 0 })?.pointId,
            cmd('sketch_add_point', { x: w, y: h })?.pointId,
            cmd('sketch_add_point', { x: 0, y: h })?.pointId,
        ];
        if (ids.some(id => !id)) { fb('Failed to add points', true); return; }
        const sIds = ids as string[];
        points.push({ id: sIds[0], x: 0, y: 0 }, { id: sIds[1], x: w, y: 0 },
            { id: sIds[2], x: w, y: h }, { id: sIds[3], x: 0, y: h });
        const edgeIds: string[] = [];
        for (let i = 0; i < 4; i++) {
            const r = cmd('sketch_add_edge', { p0Id: sIds[i], p1Id: sIds[(i + 1) % 4] });
            if (!r?.edgeId) { fb('Failed to add edge', true); return; }
            edgeIds.push(r.edgeId);
            edges.push({ id: r.edgeId, p0Id: sIds[i], p1Id: sIds[(i + 1) % 4] });
        }
        cmd('sketch_add_constraint', { constraintType: 'fixed', params: JSON.stringify({ point_id: ids[0], x: 0, y: 0 }) });
        cmd('sketch_add_constraint', { constraintType: 'horizontal', params: JSON.stringify({ edge_id: edgeIds[0] }) });
        cmd('sketch_add_constraint', { constraintType: 'horizontal', params: JSON.stringify({ edge_id: edgeIds[2] }) });
        cmd('sketch_add_constraint', { constraintType: 'vertical', params: JSON.stringify({ edge_id: edgeIds[1] }) });
        cmd('sketch_add_constraint', { constraintType: 'vertical', params: JSON.stringify({ edge_id: edgeIds[3] }) });
        cmd('sketch_add_constraint', { constraintType: 'distance', params: JSON.stringify({ p0_id: ids[0], p1_id: ids[1], value: w }) });
        cmd('sketch_add_constraint', { constraintType: 'distance', params: JSON.stringify({ p0_id: ids[0], p1_id: ids[3], value: h }) });
        constraints.push({ type: 'fixed' }, { type: 'horizontal' }, { type: 'horizontal' },
            { type: 'vertical' }, { type: 'vertical' }, { type: 'distance' }, { type: 'distance' });
        syncInfo(); rebuildSelects();
        fb(`Rectangle ${w}×${h} ready — set depth and Extrude`, false);
    },

    /** One-click: draw rectangle on plane → extrude to 3D solid (single WASM call) */
    async quickRectExtrude() {
        const d = ds();
        const plane = d?.root?.sketchPlane || 'xy';
        const w = parseFloat(d?.root?.sketchRectW) || 2;
        const h = parseFloat(d?.root?.sketchRectH) || 1;
        const depth = parseFloat(d?.root?.sketchExtH) || 1;
        const result = await cadCommand('quick_rect_extrude', { width: w, height: h, depth, plane });
        if (result?.objectId) {
            reset();
            reconcile({ objectId: result.objectId });
            fb(`Extruded! Object: ${result.objectId.slice(0, 8)}`, false);
        } else { fb(result?.error || 'Quick rect extrude failed', true); }
    },
};

// Expose globally for HTML onclick handlers
window.__sketch = sketch;

export { sketch };
