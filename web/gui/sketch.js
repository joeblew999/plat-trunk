// sketch.js — Sketch controller: points, edges, constraints, extrude.

const ctrl = () => window.sceneController;
const ds = () => window._ds;
const fb = (msg, err) => window.showFeedbackSignal?.(msg, err);

let points = [];
let edges = [];
let constraints = [];

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
    document.querySelectorAll('.sketch-point-select').forEach(sel => {
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
    document.querySelectorAll('.sketch-edge-select').forEach(sel => {
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

window.__sketch = {
    get isActive() { return ds()?.root?.sketchActive ?? false; },

    begin() {
        if (!ctrl()) return;
        const d = ds();
        const plane = d?.root?.sketchPlane || 'xy';
        const id = ctrl().begin_sketch(plane);
        if (id) {
            points = []; edges = []; constraints = [];
            d.beginBatch(); d.root.sketchActive = true; d.endBatch();
            syncInfo();
            fb(`Sketch started on ${plane.toUpperCase()} plane`, false);
        }
    },

    addPoint() {
        if (!ctrl() || !this.isActive) return;
        const d = ds();
        const x = parseFloat(d.root.sketchPtX) || 0;
        const y = parseFloat(d.root.sketchPtY) || 0;
        const id = ctrl().sketch_add_point(x, y);
        if (id) { points.push({ id, x, y }); syncInfo(); rebuildSelects(); fb(`Point at (${x}, ${y})`, false); }
    },

    addEdge() {
        if (!ctrl() || !this.isActive) return;
        const p0Id = document.getElementById('sketchEdgeP0')?.value;
        const p1Id = document.getElementById('sketchEdgeP1')?.value;
        if (!p0Id || !p1Id || p0Id === p1Id) { fb('Select two different points', true); return; }
        const id = ctrl().sketch_add_edge(p0Id, p1Id);
        if (id) { edges.push({ id, p0Id, p1Id }); syncInfo(); rebuildSelects(); fb('Edge added', false); }
    },

    addConstraint() {
        if (!ctrl() || !this.isActive) return;
        const d = ds();
        const type = d.root.sketchConType;
        if (!type) { fb('Select constraint type', true); return; }
        const p0 = document.getElementById('sketchConP0')?.value;
        const p1 = document.getElementById('sketchConP1')?.value;
        const e0 = document.getElementById('sketchConEdge0')?.value;
        const e1 = document.getElementById('sketchConEdge1')?.value;
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
        const id = ctrl().sketch_add_constraint(type, JSON.stringify(params));
        if (id) { constraints.push({ id, type, params }); syncInfo(); fb(`${type} constraint added`, false); }
    },

    solve() {
        if (!ctrl() || !this.isActive) return;
        const result = ctrl().sketch_solve();
        if (result) {
            try {
                const solved = JSON.parse(result);
                solved.forEach(sp => { const local = points.find(p => p.id === sp.id); if (local) { local.x = sp.x; local.y = sp.y; } });
                rebuildSelects();
                fb(`Solved: ${solved.map((p, i) => `P${i}(${p.x.toFixed(2)},${p.y.toFixed(2)})`).join(' ')}`, false);
            } catch { fb('Solve parse error', true); }
        } else { fb('Solve failed', true); }
    },

    extrude() {
        if (!ctrl() || !this.isActive) return;
        if (edges.length < 3) { fb('Need at least 3 edges for closed loop', true); return; }
        const height = parseFloat(ds().root.sketchExtH) || 1;
        const sketchJson = ctrl().sketch_export();
        const result = window.cadCommand
            ? window.cadCommand('sketch_extrude', { sketchJson, height })
            : { objectId: ctrl().sketch_extrude(height) };
        if (result?.objectId) {
            reset();
            if (window.reconcile) window.reconcile({ objectId: result.objectId });
            fb(`Extruded! Object: ${result.objectId.slice(0, 8)}`, false);
        } else { fb('Extrude failed (ensure edges form closed loop)', true); }
    },

    cancel() {
        if (!ctrl()) return;
        ctrl().sketch_cancel();
        reset();
        fb('Sketch cancelled', false);
    },

    quickRect() {
        if (!ctrl()) return;
        if (!this.isActive) {
            const d = ds();
            const plane = d?.root?.sketchPlane || 'xy';
            if (!ctrl().begin_sketch(plane)) return;
            d.beginBatch(); d.root.sketchActive = true; d.endBatch();
        }
        const d = ds();
        const w = parseFloat(d.root.sketchRectW) || 2;
        const h = parseFloat(d.root.sketchRectH) || 1;
        const ids = [
            ctrl().sketch_add_point(0, 0), ctrl().sketch_add_point(w, 0),
            ctrl().sketch_add_point(w, h), ctrl().sketch_add_point(0, h),
        ];
        points.push({ id: ids[0], x: 0, y: 0 }, { id: ids[1], x: w, y: 0 },
            { id: ids[2], x: w, y: h }, { id: ids[3], x: 0, y: h });
        for (let i = 0; i < 4; i++) {
            const eid = ctrl().sketch_add_edge(ids[i], ids[(i + 1) % 4]);
            edges.push({ id: eid, p0Id: ids[i], p1Id: ids[(i + 1) % 4] });
        }
        ctrl().sketch_add_constraint('fixed', JSON.stringify({ point_id: ids[0], x: 0, y: 0 }));
        ctrl().sketch_add_constraint('horizontal', JSON.stringify({ edge_id: edges[0].id }));
        ctrl().sketch_add_constraint('horizontal', JSON.stringify({ edge_id: edges[2].id }));
        ctrl().sketch_add_constraint('vertical', JSON.stringify({ edge_id: edges[1].id }));
        ctrl().sketch_add_constraint('vertical', JSON.stringify({ edge_id: edges[3].id }));
        ctrl().sketch_add_constraint('distance', JSON.stringify({ p0_id: ids[0], p1_id: ids[1], value: w }));
        ctrl().sketch_add_constraint('distance', JSON.stringify({ p0_id: ids[0], p1_id: ids[3], value: h }));
        constraints.push({ type: 'fixed' }, { type: 'horizontal' }, { type: 'horizontal' },
            { type: 'vertical' }, { type: 'vertical' }, { type: 'distance' }, { type: 'distance' });
        syncInfo(); rebuildSelects();
        fb(`Rectangle ${w}×${h} ready — set depth and Extrude`, false);
    },

    /** One-click: draw rectangle on plane → extrude to 3D solid */
    quickRectExtrude() {
        this.quickRect();
        if (!this.isActive || edges.length < 3) return;
        this.extrude();
    },
};
