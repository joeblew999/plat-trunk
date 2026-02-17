// Sketch mode UI controller.
// Manages the sketch workflow: create points → draw edges → add constraints → extrude.

(function setupSketchUI() {
    function ctrl() { return window.sceneController; }
    function docMgr() { return window.cadDocManager?.handle ? window.cadDocManager : null; }
    function update() { if (window.updateObjectList) window.updateObjectList(); }
    function showFeedback(msg, isError) {
        const el = document.getElementById('objectList');
        if (!el) return;
        el.textContent = msg;
        if (isError) el.classList.add('text-error');
        else el.classList.add('text-success');
        setTimeout(() => { el.classList.remove('text-error', 'text-success'); update(); }, 2000);
    }

    // State
    let sketchActive = false;
    let sketchPoints = []; // [{id, x, y}]
    let sketchEdges = []; // [{id, p0Id, p1Id}]
    let sketchConstraints = []; // [{id, type, params}]

    function resetState() {
        sketchActive = false;
        sketchPoints = [];
        sketchEdges = [];
        sketchConstraints = [];
        updateSketchInfo();
        toggleSketchControls(false);
    }

    function toggleSketchControls(active) {
        const controls = document.getElementById('sketch-active-controls');
        const beginBtn = document.getElementById('sketchBeginBtn');
        if (controls) controls.style.display = active ? '' : 'none';
        if (beginBtn) beginBtn.style.display = active ? 'none' : '';
    }

    function updateSketchInfo() {
        const el = document.getElementById('sketchInfo');
        if (!el) return;
        if (!sketchActive) {
            el.textContent = 'No active sketch';
            return;
        }
        el.textContent = `Points: ${sketchPoints.length}  Edges: ${sketchEdges.length}  Constraints: ${sketchConstraints.length}`;
    }

    function updatePointSelects() {
        const selects = document.querySelectorAll('.sketch-point-select');
        selects.forEach(sel => {
            const current = sel.value;
            sel.innerHTML = '<option value="">--</option>';
            sketchPoints.forEach((p, i) => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `P${i} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`;
                sel.appendChild(opt);
            });
            if (current) sel.value = current;
        });
    }

    function updateEdgeSelects() {
        const selects = document.querySelectorAll('.sketch-edge-select');
        selects.forEach(sel => {
            const current = sel.value;
            sel.innerHTML = '<option value="">--</option>';
            sketchEdges.forEach((e, i) => {
                const p0Idx = sketchPoints.findIndex(p => p.id === e.p0Id);
                const p1Idx = sketchPoints.findIndex(p => p.id === e.p1Id);
                const opt = document.createElement('option');
                opt.value = e.id;
                opt.textContent = `E${i} (P${p0Idx}→P${p1Idx})`;
                sel.appendChild(opt);
            });
            if (current) sel.value = current;
        });
    }

    // --- Begin sketch ---
    document.getElementById('sketchBeginBtn')?.addEventListener('click', () => {
        if (!ctrl()) return;
        const plane = document.getElementById('sketchPlane')?.value || 'xy';
        const sketchId = ctrl().begin_sketch(plane);
        if (sketchId) {
            sketchActive = true;
            toggleSketchControls(true);
            updateSketchInfo();
            showFeedback(`Sketch started on ${plane.toUpperCase()} plane`, false);
        }
    });

    // --- Add point ---
    document.getElementById('sketchAddPointBtn')?.addEventListener('click', () => {
        if (!ctrl() || !sketchActive) return;
        const x = parseFloat(document.getElementById('sketchPtX')?.value) || 0;
        const y = parseFloat(document.getElementById('sketchPtY')?.value) || 0;
        const id = ctrl().sketch_add_point(x, y);
        if (id) {
            sketchPoints.push({ id, x, y });
            updateSketchInfo();
            updatePointSelects();
            showFeedback(`Point added at (${x}, ${y})`, false);
        }
    });

    // --- Add edge ---
    document.getElementById('sketchAddEdgeBtn')?.addEventListener('click', () => {
        if (!ctrl() || !sketchActive) return;
        const p0Id = document.getElementById('sketchEdgeP0')?.value;
        const p1Id = document.getElementById('sketchEdgeP1')?.value;
        if (!p0Id || !p1Id || p0Id === p1Id) {
            showFeedback('Select two different points', true);
            return;
        }
        const id = ctrl().sketch_add_edge(p0Id, p1Id);
        if (id) {
            sketchEdges.push({ id, p0Id, p1Id });
            updateSketchInfo();
            updateEdgeSelects();
            showFeedback('Edge added', false);
        }
    });

    // --- Add constraint ---
    document.getElementById('sketchAddConstraintBtn')?.addEventListener('click', () => {
        if (!ctrl() || !sketchActive) return;
        const type = document.getElementById('sketchConstraintType')?.value;
        if (!type) { showFeedback('Select constraint type', true); return; }

        const params = buildConstraintParams(type);
        if (!params) return;

        const paramsJson = JSON.stringify(params);
        const id = ctrl().sketch_add_constraint(type, paramsJson);
        if (id) {
            sketchConstraints.push({ id, type, params });
            updateSketchInfo();
            showFeedback(`${type} constraint added`, false);
        }
    });

    function buildConstraintParams(type) {
        const p0 = document.getElementById('sketchConP0')?.value;
        const p1 = document.getElementById('sketchConP1')?.value;
        const edge0 = document.getElementById('sketchConEdge0')?.value;
        const edge1 = document.getElementById('sketchConEdge1')?.value;
        const val = parseFloat(document.getElementById('sketchConValue')?.value);

        switch (type) {
            case 'fixed':
                if (!p0) { showFeedback('Select a point', true); return null; }
                return { point_id: p0, x: val || 0, y: parseFloat(document.getElementById('sketchConValue2')?.value) || 0 };
            case 'horizontal':
            case 'vertical':
                if (!edge0) { showFeedback('Select an edge', true); return null; }
                return { edge_id: edge0 };
            case 'distance':
            case 'horizontal_distance':
            case 'vertical_distance':
                if (!p0 || !p1) { showFeedback('Select two points', true); return null; }
                return { p0_id: p0, p1_id: p1, value: val || 1 };
            case 'coincident':
                if (!p0 || !p1) { showFeedback('Select two points', true); return null; }
                return { p0_id: p0, p1_id: p1 };
            case 'parallel':
            case 'perpendicular':
            case 'equal_length':
                if (!edge0 || !edge1) { showFeedback('Select two edges', true); return null; }
                return { edge0_id: edge0, edge1_id: edge1 };
            case 'midpoint':
                if (!edge0 || !p0) { showFeedback('Select edge and point', true); return null; }
                return { edge_id: edge0, point_id: p0 };
            default:
                showFeedback('Unknown constraint', true);
                return null;
        }
    }

    // --- Solve preview ---
    document.getElementById('sketchSolveBtn')?.addEventListener('click', () => {
        if (!ctrl() || !sketchActive) return;
        const result = ctrl().sketch_solve();
        if (result) {
            try {
                const solved = JSON.parse(result);
                // Update local point positions from solver
                solved.forEach(sp => {
                    const local = sketchPoints.find(p => p.id === sp.id);
                    if (local) { local.x = sp.x; local.y = sp.y; }
                });
                updatePointSelects();
                const positions = solved.map((p, i) => `P${i}(${p.x.toFixed(2)},${p.y.toFixed(2)})`).join(' ');
                showFeedback(`Solved: ${positions}`, false);
            } catch (e) {
                showFeedback('Solve parse error', true);
            }
        } else {
            showFeedback('Solve failed', true);
        }
    });

    // --- Extrude ---
    document.getElementById('sketchExtrudeBtn')?.addEventListener('click', () => {
        if (!ctrl() || !sketchActive) return;
        if (sketchEdges.length < 3) {
            showFeedback('Need at least 3 edges for closed loop', true);
            return;
        }
        const height = parseFloat(document.getElementById('sketchExtrudeHeight')?.value) || 1;

        // Export sketch JSON before extrude (for Automerge replay)
        const sketchJson = ctrl().sketch_export();

        const mgr = docMgr();
        if (mgr && sketchJson) {
            // Go through Automerge op log: extrude clears active sketch internally
            const objectId = mgr.applyOperation('sketch_extrude', { sketchJson, height });
            if (objectId) {
                window.selectedObjectId = objectId;
                resetState();
                update();
                showFeedback(`Extruded! Object: ${objectId.slice(0, 8)}`, false);
            } else {
                showFeedback('Extrude failed (ensure edges form closed loop)', true);
            }
        } else {
            // Fallback: direct WASM call
            const objectId = ctrl().sketch_extrude(height);
            if (objectId) {
                window.selectedObjectId = objectId;
                resetState();
                update();
                showFeedback(`Extruded! Object: ${objectId.slice(0, 8)}`, false);
            } else {
                showFeedback('Extrude failed (ensure edges form closed loop)', true);
            }
        }
    });

    // --- Cancel ---
    document.getElementById('sketchCancelBtn')?.addEventListener('click', () => {
        if (!ctrl()) return;
        ctrl().sketch_cancel();
        resetState();
        showFeedback('Sketch cancelled', false);
    });

    // --- Quick rectangle helper ---
    document.getElementById('sketchQuickRectBtn')?.addEventListener('click', () => {
        if (!ctrl()) return;

        // Start a fresh sketch if none active
        if (!sketchActive) {
            const plane = document.getElementById('sketchPlane')?.value || 'xy';
            const sketchId = ctrl().begin_sketch(plane);
            if (!sketchId) return;
            sketchActive = true;
            toggleSketchControls(true);
        }

        const w = parseFloat(document.getElementById('sketchRectW')?.value) || 2;
        const h = parseFloat(document.getElementById('sketchRectH')?.value) || 1;

        // Add 4 points
        const ids = [
            ctrl().sketch_add_point(0, 0),
            ctrl().sketch_add_point(w, 0),
            ctrl().sketch_add_point(w, h),
            ctrl().sketch_add_point(0, h),
        ];
        sketchPoints.push(
            { id: ids[0], x: 0, y: 0 },
            { id: ids[1], x: w, y: 0 },
            { id: ids[2], x: w, y: h },
            { id: ids[3], x: 0, y: h },
        );

        // Add 4 edges (closed loop)
        for (let i = 0; i < 4; i++) {
            const eid = ctrl().sketch_add_edge(ids[i], ids[(i + 1) % 4]);
            sketchEdges.push({ id: eid, p0Id: ids[i], p1Id: ids[(i + 1) % 4] });
        }

        // Add constraints: fix origin, horizontal/vertical edges, dimensions
        ctrl().sketch_add_constraint('fixed', JSON.stringify({ point_id: ids[0], x: 0, y: 0 }));
        ctrl().sketch_add_constraint('horizontal', JSON.stringify({ edge_id: sketchEdges[0].id }));
        ctrl().sketch_add_constraint('horizontal', JSON.stringify({ edge_id: sketchEdges[2].id }));
        ctrl().sketch_add_constraint('vertical', JSON.stringify({ edge_id: sketchEdges[1].id }));
        ctrl().sketch_add_constraint('vertical', JSON.stringify({ edge_id: sketchEdges[3].id }));
        ctrl().sketch_add_constraint('distance', JSON.stringify({ p0_id: ids[0], p1_id: ids[1], value: w }));
        ctrl().sketch_add_constraint('distance', JSON.stringify({ p0_id: ids[0], p1_id: ids[3], value: h }));

        sketchConstraints.push(
            { type: 'fixed' }, { type: 'horizontal' }, { type: 'horizontal' },
            { type: 'vertical' }, { type: 'vertical' },
            { type: 'distance' }, { type: 'distance' },
        );

        updateSketchInfo();
        updatePointSelects();
        updateEdgeSelects();
        showFeedback(`Rectangle ${w}×${h} ready — set height and Extrude`, false);
    });

    // Show/hide constraint fields based on type
    document.getElementById('sketchConstraintType')?.addEventListener('change', (e) => {
        const type = e.target.value;
        const needsPoints = ['fixed', 'distance', 'horizontal_distance', 'vertical_distance', 'coincident', 'midpoint'].includes(type);
        const needsEdges = ['horizontal', 'vertical', 'parallel', 'perpendicular', 'equal_length', 'midpoint'].includes(type);
        const needsValue = ['fixed', 'distance', 'horizontal_distance', 'vertical_distance'].includes(type);
        const needsValue2 = type === 'fixed';
        const needsEdge2 = ['parallel', 'perpendicular', 'equal_length'].includes(type);

        document.getElementById('sketchConPointsRow').style.display = needsPoints ? '' : 'none';
        document.getElementById('sketchConEdgesRow').style.display = needsEdges ? '' : 'none';
        document.getElementById('sketchConValueRow').style.display = needsValue ? '' : 'none';
        document.getElementById('sketchConValue2Row').style.display = needsValue2 ? '' : 'none';
        document.getElementById('sketchConEdge1')?.parentElement && (document.getElementById('sketchConEdge1').style.display = needsEdge2 ? '' : 'none');
    });

    // Expose for keyboard shortcut
    window.sketchUI = {
        get isActive() { return sketchActive; },
        cancel() { document.getElementById('sketchCancelBtn')?.click(); },
    };
})();
