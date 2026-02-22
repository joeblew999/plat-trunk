//! Parametric 2D sketching with constraint solving via kcl-ezpz.
//!
//! Types are serde-serializable (for Automerge storage).
//! ezpz datums are reconstructed at solve time since they don't impl Serialize.

use kcl_ezpz::{
    datatypes::inputs::{DatumLineSegment, DatumPoint},
    Constraint, ConstraintRequest, Config, Id, IdGenerator, SolveOutcome,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Sketch plane (which world plane the sketch lives on)
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SketchPlane {
    XY,
    XZ,
    YZ,
}

impl SketchPlane {
    pub fn to_3d(&self, x: f64, y: f64) -> truck_modeling::Point3 {
        match self {
            SketchPlane::XY => truck_modeling::Point3::new(x, y, 0.0),
            SketchPlane::XZ => truck_modeling::Point3::new(x, 0.0, y),
            SketchPlane::YZ => truck_modeling::Point3::new(0.0, x, y),
        }
    }

    pub fn normal(&self) -> truck_modeling::Vector3 {
        match self {
            SketchPlane::XY => truck_modeling::Vector3::unit_z(),
            SketchPlane::XZ => truck_modeling::Vector3::unit_y(),
            SketchPlane::YZ => truck_modeling::Vector3::unit_x(),
        }
    }
}

// ---------------------------------------------------------------------------
// Sketch geometry (serializable)
// ---------------------------------------------------------------------------

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SketchPoint {
    pub id: Uuid,
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SketchEdge {
    pub id: Uuid,
    pub p0_id: Uuid,
    pub p1_id: Uuid,
}

// ---------------------------------------------------------------------------
// Constraint kinds (serializable mirror of ezpz Constraint)
// ---------------------------------------------------------------------------

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum SketchConstraintKind {
    /// Fix a point at exact coordinates.
    Fixed { point_id: Uuid, x: f64, y: f64 },
    /// Make an edge horizontal.
    Horizontal { edge_id: Uuid },
    /// Make an edge vertical.
    Vertical { edge_id: Uuid },
    /// Distance between two points.
    Distance { p0_id: Uuid, p1_id: Uuid, value: f64 },
    /// Horizontal distance between two points.
    HorizontalDistance { p0_id: Uuid, p1_id: Uuid, value: f64 },
    /// Vertical distance between two points.
    VerticalDistance { p0_id: Uuid, p1_id: Uuid, value: f64 },
    /// Two points coincide.
    Coincident { p0_id: Uuid, p1_id: Uuid },
    /// Two edges are parallel.
    Parallel { edge0_id: Uuid, edge1_id: Uuid },
    /// Two edges are perpendicular.
    Perpendicular { edge0_id: Uuid, edge1_id: Uuid },
    /// Two edges have equal length.
    EqualLength { edge0_id: Uuid, edge1_id: Uuid },
    /// Point lies at midpoint of edge.
    Midpoint { edge_id: Uuid, point_id: Uuid },
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SketchConstraint {
    pub id: Uuid,
    pub kind: SketchConstraintKind,
    pub priority: u32,
}

// ---------------------------------------------------------------------------
// Sketch (the complete 2D sketch document)
// ---------------------------------------------------------------------------

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Sketch {
    pub id: Uuid,
    pub plane: SketchPlane,
    pub points: Vec<SketchPoint>,
    pub edges: Vec<SketchEdge>,
    pub constraints: Vec<SketchConstraint>,
}

impl Sketch {
    pub fn new(plane: SketchPlane) -> Self {
        Sketch {
            id: Uuid::new_v4(),
            plane,
            points: Vec::new(),
            edges: Vec::new(),
            constraints: Vec::new(),
        }
    }

    pub fn add_point(&mut self, x: f64, y: f64) -> Uuid {
        let id = Uuid::new_v4();
        self.points.push(SketchPoint { id, x, y });
        id
    }

    pub fn add_edge(&mut self, p0_id: Uuid, p1_id: Uuid) -> Uuid {
        let id = Uuid::new_v4();
        self.edges.push(SketchEdge { id, p0_id, p1_id });
        id
    }

    pub fn add_constraint(&mut self, kind: SketchConstraintKind) -> Uuid {
        self.add_constraint_with_priority(kind, 0)
    }

    pub fn add_constraint_with_priority(&mut self, kind: SketchConstraintKind, priority: u32) -> Uuid {
        let id = Uuid::new_v4();
        self.constraints.push(SketchConstraint { id, kind, priority });
        id
    }

    pub fn find_point(&self, id: Uuid) -> Option<&SketchPoint> {
        self.points.iter().find(|p| p.id == id)
    }

    pub fn find_edge(&self, id: Uuid) -> Option<&SketchEdge> {
        self.edges.iter().find(|e| e.id == id)
    }
}

// ---------------------------------------------------------------------------
// Solve: reconstruct ezpz datums and run the constraint solver
// ---------------------------------------------------------------------------

/// Solved point positions after constraint solving.
#[derive(Clone, Debug)]
pub struct SolvedSketch {
    pub positions: Vec<(Uuid, f64, f64)>,
}

impl SolvedSketch {
    pub fn position(&self, id: Uuid) -> Option<(f64, f64)> {
        self.positions.iter().find(|(pid, _, _)| *pid == id).map(|(_, x, y)| (*x, *y))
    }
}

/// Mapping tables used to reconstruct ezpz datums from our Uuid-based sketch.
struct SolveContext {
    point_datums: HashMap<Uuid, DatumPoint>,
    edge_datums: HashMap<Uuid, DatumLineSegment>,
}

impl SolveContext {
    fn new(sketch: &Sketch) -> Self {
        let mut ids = IdGenerator::default();
        let mut point_datums = HashMap::new();
        let mut edge_datums = HashMap::new();

        // Assign ezpz datums for each sketch point
        for pt in &sketch.points {
            let datum = DatumPoint::new(&mut ids);
            point_datums.insert(pt.id, datum);
        }

        // Build edge datums from point datums
        for edge in &sketch.edges {
            let p0 = point_datums[&edge.p0_id];
            let p1 = point_datums[&edge.p1_id];
            let datum = DatumLineSegment::new(p0, p1);
            edge_datums.insert(edge.id, datum);
        }

        let _ = ids; // consumed, datums carry the assigned IDs
        SolveContext { point_datums, edge_datums }
    }

    fn point(&self, id: Uuid) -> DatumPoint {
        self.point_datums[&id]
    }

    fn edge(&self, id: Uuid) -> DatumLineSegment {
        self.edge_datums[&id]
    }

    /// Convert a SketchConstraintKind into an ezpz Constraint.
    fn to_ezpz(&self, kind: &SketchConstraintKind) -> Constraint {
        use kcl_ezpz::datatypes::AngleKind;
        match kind {
            SketchConstraintKind::Fixed { point_id, x, y: _ } => {
                let dp = self.point(*point_id);
                // Fixed is expanded into two constraints in build_requests().
                // This single-constraint path returns just the x constraint.
                Constraint::Fixed(dp.x_id, *x)
            }
            SketchConstraintKind::Horizontal { edge_id } => {
                Constraint::Horizontal(self.edge(*edge_id))
            }
            SketchConstraintKind::Vertical { edge_id } => {
                Constraint::Vertical(self.edge(*edge_id))
            }
            SketchConstraintKind::Distance { p0_id, p1_id, value } => {
                Constraint::Distance(self.point(*p0_id), self.point(*p1_id), *value)
            }
            SketchConstraintKind::HorizontalDistance { p0_id, p1_id, value } => {
                Constraint::HorizontalDistance(self.point(*p0_id), self.point(*p1_id), *value)
            }
            SketchConstraintKind::VerticalDistance { p0_id, p1_id, value } => {
                Constraint::VerticalDistance(self.point(*p0_id), self.point(*p1_id), *value)
            }
            SketchConstraintKind::Coincident { p0_id, p1_id } => {
                Constraint::PointsCoincident(self.point(*p0_id), self.point(*p1_id))
            }
            SketchConstraintKind::Parallel { edge0_id, edge1_id } => {
                Constraint::LinesAtAngle(
                    self.edge(*edge0_id),
                    self.edge(*edge1_id),
                    AngleKind::Parallel,
                )
            }
            SketchConstraintKind::Perpendicular { edge0_id, edge1_id } => {
                Constraint::LinesAtAngle(
                    self.edge(*edge0_id),
                    self.edge(*edge1_id),
                    AngleKind::Perpendicular,
                )
            }
            SketchConstraintKind::EqualLength { edge0_id, edge1_id } => {
                Constraint::LinesEqualLength(self.edge(*edge0_id), self.edge(*edge1_id))
            }
            SketchConstraintKind::Midpoint { edge_id, point_id } => {
                Constraint::Midpoint(self.edge(*edge_id), self.point(*point_id))
            }
        }
    }

    /// Build all constraint requests, expanding Fixed into two constraints (x + y).
    fn build_requests(&self, sketch: &Sketch) -> Vec<ConstraintRequest> {
        let mut reqs = Vec::new();
        for c in &sketch.constraints {
            match &c.kind {
                SketchConstraintKind::Fixed { point_id, x, y } => {
                    let dp = self.point(*point_id);
                    reqs.push(ConstraintRequest::new(
                        Constraint::Fixed(dp.x_id, *x),
                        c.priority,
                    ));
                    reqs.push(ConstraintRequest::new(
                        Constraint::Fixed(dp.y_id, *y),
                        c.priority,
                    ));
                }
                other => {
                    reqs.push(ConstraintRequest::new(self.to_ezpz(other), c.priority));
                }
            }
        }
        reqs
    }

    /// Build initial guesses from current sketch point positions.
    fn build_guesses(&self, sketch: &Sketch) -> Vec<(Id, f64)> {
        sketch
            .points
            .iter()
            .flat_map(|p| {
                let dp = self.point_datums[&p.id];
                vec![(dp.x_id, p.x), (dp.y_id, p.y)]
            })
            .collect()
    }

    /// Extract solved positions from the outcome.
    fn extract_positions(&self, sketch: &Sketch, outcome: &SolveOutcome) -> Vec<(Uuid, f64, f64)> {
        sketch
            .points
            .iter()
            .map(|p| {
                let dp = self.point_datums[&p.id];
                let solved = outcome.final_value_point(&dp);
                (p.id, solved.x, solved.y)
            })
            .collect()
    }
}

/// Solve a sketch's constraints, returning updated point positions.
pub fn solve_sketch(sketch: &Sketch) -> std::result::Result<SolvedSketch, String> {
    if sketch.points.is_empty() {
        return Ok(SolvedSketch { positions: vec![] });
    }

    let ctx = SolveContext::new(sketch);
    let reqs = ctx.build_requests(sketch);
    let guesses = ctx.build_guesses(sketch);

    if reqs.is_empty() {
        // No constraints — return current positions as-is
        let positions = sketch
            .points
            .iter()
            .map(|p| (p.id, p.x, p.y))
            .collect();
        return Ok(SolvedSketch { positions });
    }

    let outcome = kcl_ezpz::solve(&reqs, guesses, Config::default())
        .map_err(|e| format!("Constraint solve failed: {:?}", e.error()))?;

    let positions = ctx.extract_positions(sketch, &outcome);
    Ok(SolvedSketch { positions })
}

// ---------------------------------------------------------------------------
// Extrude: solved sketch → truck Solid
// ---------------------------------------------------------------------------

/// Order sketch edges into a closed loop starting from the first edge.
/// Returns ordered list of point UUIDs forming the polygon boundary.
fn find_closed_loop(edges: &[SketchEdge]) -> std::result::Result<Vec<Uuid>, String> {
    if edges.is_empty() {
        return Err("No edges to form a closed loop".into());
    }

    // Build adjacency: point → list of (edge_index, other_point)
    let mut adj: HashMap<Uuid, Vec<(usize, Uuid)>> = HashMap::new();
    for (i, e) in edges.iter().enumerate() {
        adj.entry(e.p0_id).or_default().push((i, e.p1_id));
        adj.entry(e.p1_id).or_default().push((i, e.p0_id));
    }

    // Walk from first edge's p0
    let mut loop_points = Vec::new();
    let mut used = vec![false; edges.len()];
    let start = edges[0].p0_id;
    let mut current = start;

    loop {
        loop_points.push(current);
        let neighbors = adj.get(&current).ok_or("Disconnected edge graph")?;
        let next = neighbors
            .iter()
            .find(|(idx, _)| !used[*idx]);
        match next {
            Some(&(idx, next_pt)) => {
                used[idx] = true;
                current = next_pt;
                if current == start && loop_points.len() > 2 {
                    break; // closed
                }
            }
            None => return Err("Edges do not form a closed loop".into()),
        }
    }

    if loop_points.len() < 3 {
        return Err("Need at least 3 points for a closed loop".into());
    }

    Ok(loop_points)
}

/// Extrude a solved sketch into a 3D solid.
///
/// Solves the sketch, builds a closed wire from the edges on the sketch plane,
/// attaches a planar face, and sweeps it along the plane normal by `height`.
pub fn sketch_to_solid(sketch: &Sketch, height: f64) -> std::result::Result<truck_modeling::Solid, String> {
    use truck_modeling::*;

    // 1. Solve constraints
    let solved = solve_sketch(sketch)?;

    // 2. Find closed loop of points from edges
    let loop_point_ids = find_closed_loop(&sketch.edges)?;

    // 3. Build 3D vertices from solved positions
    let mut vertices = Vec::new();
    for id in &loop_point_ids {
        let (x, y) = solved.position(*id)
            .ok_or_else(|| format!("Solved position missing for point {}", id))?;
        vertices.push((*id, builder::vertex(sketch.plane.to_3d(x, y))));
    }

    // 4. Build edges connecting consecutive vertices (closed loop)
    let n = vertices.len();
    let truck_edges: Vec<Edge> = (0..n)
        .map(|i| {
            let v0 = &vertices[i].1;
            let v1 = &vertices[(i + 1) % n].1;
            builder::line(v0, v1)
        })
        .collect();

    // 5. Form wire → face → extrude
    let wire = Wire::from(truck_edges);
    let face = builder::try_attach_plane(&[wire])
        .map_err(|e| format!("Failed to create planar face: {:?}", e))?;

    let extrude_vec = sketch.plane.normal() * height;
    Ok(builder::tsweep(&face, extrude_vec))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn approx_eq(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-6
    }

    #[test]
    fn test_empty_sketch() {
        let sketch = Sketch::new(SketchPlane::XY);
        let solved = solve_sketch(&sketch).unwrap();
        assert!(solved.positions.is_empty());
    }

    #[test]
    fn test_unconstrained_sketch() {
        let mut sketch = Sketch::new(SketchPlane::XY);
        let p0 = sketch.add_point(1.0, 2.0);
        let p1 = sketch.add_point(3.0, 4.0);
        sketch.add_edge(p0, p1);

        let solved = solve_sketch(&sketch).unwrap();
        assert_eq!(solved.positions.len(), 2);
        // No constraints → positions unchanged
        let (x0, y0) = solved.position(p0).unwrap();
        assert!(approx_eq(x0, 1.0));
        assert!(approx_eq(y0, 2.0));
    }

    #[test]
    fn test_fixed_point() {
        let mut sketch = Sketch::new(SketchPlane::XY);
        let p0 = sketch.add_point(0.0, 0.0);
        sketch.add_constraint(SketchConstraintKind::Fixed {
            point_id: p0,
            x: 5.0,
            y: 10.0,
        });

        let solved = solve_sketch(&sketch).unwrap();
        let (x, y) = solved.position(p0).unwrap();
        assert!(approx_eq(x, 5.0));
        assert!(approx_eq(y, 10.0));
    }

    #[test]
    fn test_solve_rectangle() {
        // Four points forming a rectangle with constraints:
        // - p0 fixed at origin
        // - edges 0,2 horizontal (bottom, top)
        // - edges 1,3 vertical (right, left)
        // - bottom edge distance = 4
        // - left edge distance = 3
        let mut sketch = Sketch::new(SketchPlane::XY);
        let p0 = sketch.add_point(0.0, 0.0);
        let p1 = sketch.add_point(4.0, 0.0);
        let p2 = sketch.add_point(4.0, 3.0);
        let p3 = sketch.add_point(0.0, 3.0);

        let e_bottom = sketch.add_edge(p0, p1);
        let e_right = sketch.add_edge(p1, p2);
        let e_top = sketch.add_edge(p2, p3);
        let e_left = sketch.add_edge(p3, p0);

        // Fix origin
        sketch.add_constraint(SketchConstraintKind::Fixed { point_id: p0, x: 0.0, y: 0.0 });
        // Horizontal bottom and top
        sketch.add_constraint(SketchConstraintKind::Horizontal { edge_id: e_bottom });
        sketch.add_constraint(SketchConstraintKind::Horizontal { edge_id: e_top });
        // Vertical right and left
        sketch.add_constraint(SketchConstraintKind::Vertical { edge_id: e_right });
        sketch.add_constraint(SketchConstraintKind::Vertical { edge_id: e_left });
        // Dimensions
        sketch.add_constraint(SketchConstraintKind::Distance { p0_id: p0, p1_id: p1, value: 4.0 });
        sketch.add_constraint(SketchConstraintKind::Distance { p0_id: p0, p1_id: p3, value: 3.0 });

        let solved = solve_sketch(&sketch).unwrap();

        let (x0, y0) = solved.position(p0).unwrap();
        let (x1, y1) = solved.position(p1).unwrap();
        let (x2, y2) = solved.position(p2).unwrap();
        let (x3, y3) = solved.position(p3).unwrap();

        // p0 at origin
        assert!(approx_eq(x0, 0.0) && approx_eq(y0, 0.0), "p0: ({x0}, {y0})");
        // p1 at (4, 0)
        assert!(approx_eq(x1, 4.0) && approx_eq(y1, 0.0), "p1: ({x1}, {y1})");
        // p2 at (4, 3)
        assert!(approx_eq(x2, 4.0) && approx_eq(y2, 3.0), "p2: ({x2}, {y2})");
        // p3 at (0, 3)
        assert!(approx_eq(x3, 0.0) && approx_eq(y3, 3.0), "p3: ({x3}, {y3})");
    }

    #[test]
    fn test_solve_triangle_with_distances() {
        let mut sketch = Sketch::new(SketchPlane::XY);
        let p0 = sketch.add_point(0.0, 0.0);
        let p1 = sketch.add_point(3.0, 0.0);
        let p2 = sketch.add_point(0.0, 4.0);

        let e01 = sketch.add_edge(p0, p1);
        let _e12 = sketch.add_edge(p1, p2);
        let _e20 = sketch.add_edge(p2, p0);

        // Fix p0, make bottom horizontal, distance constraints
        sketch.add_constraint(SketchConstraintKind::Fixed { point_id: p0, x: 0.0, y: 0.0 });
        sketch.add_constraint(SketchConstraintKind::Horizontal { edge_id: e01 });
        sketch.add_constraint(SketchConstraintKind::Distance { p0_id: p0, p1_id: p1, value: 3.0 });
        sketch.add_constraint(SketchConstraintKind::Distance { p0_id: p0, p1_id: p2, value: 4.0 });
        // Fix p2 x to 0 (on the y-axis)
        sketch.add_constraint(SketchConstraintKind::Fixed { point_id: p2, x: 0.0, y: 4.0 });

        let solved = solve_sketch(&sketch).unwrap();

        let (x0, y0) = solved.position(p0).unwrap();
        let (x1, y1) = solved.position(p1).unwrap();
        let (x2, y2) = solved.position(p2).unwrap();

        assert!(approx_eq(x0, 0.0) && approx_eq(y0, 0.0), "p0: ({x0}, {y0})");
        assert!(approx_eq(x1, 3.0) && approx_eq(y1, 0.0), "p1: ({x1}, {y1})");
        assert!(approx_eq(x2, 0.0) && approx_eq(y2, 4.0), "p2: ({x2}, {y2})");
    }

    #[test]
    fn test_sketch_serialization_roundtrip() {
        let mut sketch = Sketch::new(SketchPlane::XZ);
        let p0 = sketch.add_point(1.0, 2.0);
        let p1 = sketch.add_point(3.0, 4.0);
        sketch.add_edge(p0, p1);
        sketch.add_constraint(SketchConstraintKind::Horizontal {
            edge_id: sketch.edges[0].id,
        });

        let json = serde_json::to_string(&sketch).expect("serialize");
        let sketch2: Sketch = serde_json::from_str(&json).expect("deserialize");

        assert_eq!(sketch.id, sketch2.id);
        assert_eq!(sketch.points.len(), sketch2.points.len());
        assert_eq!(sketch.edges.len(), sketch2.edges.len());
        assert_eq!(sketch.constraints.len(), sketch2.constraints.len());
    }

    #[test]
    fn test_extrude_rectangle() {
        // Build a 4×3 rectangle, extrude by height 2 → should be a box with 6 faces
        let mut sketch = Sketch::new(SketchPlane::XY);
        let p0 = sketch.add_point(0.0, 0.0);
        let p1 = sketch.add_point(4.0, 0.0);
        let p2 = sketch.add_point(4.0, 3.0);
        let p3 = sketch.add_point(0.0, 3.0);

        let e_bottom = sketch.add_edge(p0, p1);
        let e_right = sketch.add_edge(p1, p2);
        let e_top = sketch.add_edge(p2, p3);
        let e_left = sketch.add_edge(p3, p0);

        sketch.add_constraint(SketchConstraintKind::Fixed { point_id: p0, x: 0.0, y: 0.0 });
        sketch.add_constraint(SketchConstraintKind::Horizontal { edge_id: e_bottom });
        sketch.add_constraint(SketchConstraintKind::Horizontal { edge_id: e_top });
        sketch.add_constraint(SketchConstraintKind::Vertical { edge_id: e_right });
        sketch.add_constraint(SketchConstraintKind::Vertical { edge_id: e_left });
        sketch.add_constraint(SketchConstraintKind::Distance { p0_id: p0, p1_id: p1, value: 4.0 });
        sketch.add_constraint(SketchConstraintKind::Distance { p0_id: p0, p1_id: p3, value: 3.0 });

        let solid = sketch_to_solid(&sketch, 2.0).expect("extrude should succeed");

        // A box from tsweep of a 4-edge face should have 6 faces
        let face_count: usize = solid.boundaries().iter()
            .flat_map(|shell| shell.iter())
            .count();
        assert_eq!(face_count, 6, "Extruded rectangle should have 6 faces, got {}", face_count);

        // Bounding sphere should have positive radius
        let (_, radius) = crate::compute_bounding_sphere(&solid);
        assert!(radius > 0.0, "Bounding radius should be positive");
    }

    #[test]
    fn test_extrude_triangle() {
        let mut sketch = Sketch::new(SketchPlane::XZ);
        let p0 = sketch.add_point(0.0, 0.0);
        let p1 = sketch.add_point(3.0, 0.0);
        let p2 = sketch.add_point(1.5, 2.0);

        sketch.add_edge(p0, p1);
        sketch.add_edge(p1, p2);
        sketch.add_edge(p2, p0);

        sketch.add_constraint(SketchConstraintKind::Fixed { point_id: p0, x: 0.0, y: 0.0 });
        sketch.add_constraint(SketchConstraintKind::Fixed { point_id: p1, x: 3.0, y: 0.0 });
        sketch.add_constraint(SketchConstraintKind::Fixed { point_id: p2, x: 1.5, y: 2.0 });

        let solid = sketch_to_solid(&sketch, 5.0).expect("extrude triangle should succeed");

        // Triangular prism: 2 triangular faces + 3 rectangular faces = 5 faces
        let face_count: usize = solid.boundaries().iter()
            .flat_map(|shell| shell.iter())
            .count();
        assert_eq!(face_count, 5, "Extruded triangle should have 5 faces, got {}", face_count);
    }

    #[test]
    fn test_sketch_plane_to_3d() {
        let p_xy = SketchPlane::XY.to_3d(1.0, 2.0);
        assert!(approx_eq(p_xy.x, 1.0) && approx_eq(p_xy.y, 2.0) && approx_eq(p_xy.z, 0.0));

        let p_xz = SketchPlane::XZ.to_3d(1.0, 2.0);
        assert!(approx_eq(p_xz.x, 1.0) && approx_eq(p_xz.y, 0.0) && approx_eq(p_xz.z, 2.0));

        let p_yz = SketchPlane::YZ.to_3d(1.0, 2.0);
        assert!(approx_eq(p_yz.x, 0.0) && approx_eq(p_yz.y, 1.0) && approx_eq(p_yz.z, 2.0));
    }
}
