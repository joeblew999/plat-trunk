// Boolean operation robustness tests.
//
// truck-shapeops panics on axis-aligned/coplanar faces (issue #57).
// These tests verify:
// 1. Which configurations fail with raw shapeops (documenting the bug)
// 2. Our perturbation strategy recovers all cases
// 3. virtualritz improvements don't regress working configurations

#[cfg(test)]
mod tests {
    use std::panic::{catch_unwind, AssertUnwindSafe};
    use truck_modeling::*;
    use truck_meshalgo::tessellation::MeshableShape;
    use crate::{make_cube, make_cylinder};

    const TOL: f64 = 0.05;

    /// Perturbation vector matching wasm_app.rs BOOL_PERTURBATION.
    const PERTURB: Vector3 = Vector3::new(-0.1, -0.07, -0.03);

    // ── Helpers ──────────────────────────────────────────────

    fn cube_at(size: f64, dx: f64, dy: f64, dz: f64) -> Solid {
        let c = make_cube(size);
        builder::translated(&c, Vector3::new(dx, dy, dz))
    }

    fn cylinder_at(r: f64, h: f64, dx: f64, dy: f64, dz: f64) -> Solid {
        let c = make_cylinder(r, h);
        builder::translated(&c, Vector3::new(dx, dy, dz))
    }

    /// Try a boolean op, catching panics (AssertUnwindSafe because virtualritz
    /// uses parking_lot which has interior mutability).
    fn try_op<F>(op: F) -> Option<Solid>
    where
        F: FnOnce() -> Option<Solid>,
    {
        catch_unwind(AssertUnwindSafe(op)).ok().flatten()
    }

    /// Our perturbation fallback — mirrors wasm_app.rs try_bool_with_fallback.
    fn bool_with_fallback(a: &Solid, b: &Solid, op: fn(&Solid, &Solid) -> Option<Solid>) -> Option<Solid> {
        // 1. Try exact
        let result = catch_unwind(AssertUnwindSafe(|| op(a, b)))
            .ok()
            .flatten();
        if result.is_some() {
            return result;
        }
        // 2. Retry with perturbation
        let perturbed = builder::translated(b, PERTURB);
        catch_unwind(AssertUnwindSafe(|| op(a, &perturbed)))
            .ok()
            .flatten()
    }

    fn union(a: &Solid, b: &Solid) -> Option<Solid> {
        truck_shapeops::or(a, b, TOL)
    }

    fn subtract(a: &Solid, b: &Solid) -> Option<Solid> {
        let mut not_b = b.clone();
        not_b.not();
        truck_shapeops::and(a, &not_b, TOL)
    }

    fn intersect(a: &Solid, b: &Solid) -> Option<Solid> {
        truck_shapeops::and(a, b, TOL)
    }

    // ── Test: 3D diagonal overlap (should ALWAYS work) ──────

    #[test]
    fn union_3d_overlap_works() {
        let a = make_cube(1.0);
        let b = cube_at(1.0, 0.5, 0.5, 0.5);
        let result = try_op(|| union(&a, &b));
        assert!(result.is_some(), "3D diagonal union should succeed natively");
    }

    #[test]
    fn subtract_3d_overlap_works() {
        let a = make_cube(1.0);
        let b = cube_at(1.0, 0.5, 0.5, 0.5);
        let result = try_op(|| subtract(&a, &b));
        assert!(result.is_some(), "3D diagonal subtract should succeed natively");
    }

    #[test]
    fn intersect_3d_overlap_works() {
        let a = make_cube(1.0);
        let b = cube_at(1.0, 0.5, 0.5, 0.5);
        let result = try_op(|| intersect(&a, &b));
        assert!(result.is_some(), "3D diagonal intersect should succeed natively");
    }

    // ── Test: Non-overlapping cubes ─────────────────────────

    #[test]
    fn union_apart_no_panic() {
        let a = make_cube(1.0);
        let b = cube_at(1.0, 3.0, 0.0, 0.0);
        // Should not panic — may return Some (disjoint shells) or None
        let _ = try_op(|| union(&a, &b));
    }

    // ── Test: Coplanar cases — raw shapeops expected to fail ────────

    #[test]
    fn raw_union_coplanar_full_face_fails() {
        let a = make_cube(1.0);
        let b = cube_at(1.0, 1.0, 0.0, 0.0);
        let result = try_op(|| union(&a, &b));
        // Documents the bug: raw shapeops panics or returns None
        assert!(result.is_none(), "Coplanar full-face union fails without perturbation (known bug #57)");
    }

    #[test]
    fn raw_union_half_overlap_fails() {
        let a = make_cube(1.0);
        let b = cube_at(1.0, 0.5, 0.0, 0.0);
        let result = try_op(|| union(&a, &b));
        assert!(result.is_none(), "Axis-aligned half-overlap union fails without perturbation");
    }

    #[test]
    fn raw_union_corner_overlap_fails() {
        let a = make_cube(1.0);
        let b = cube_at(1.0, 0.5, 0.5, 0.0);
        let result = try_op(|| union(&a, &b));
        assert!(result.is_none(), "2D corner overlap union fails without perturbation");
    }

    // ── Test: Perturbation fallback recovers ALL coplanar cases ─────

    #[test]
    fn fallback_union_coplanar_full_face() {
        let a = make_cube(1.0);
        let b = cube_at(1.0, 1.0, 0.0, 0.0);
        let result = bool_with_fallback(&a, &b, union);
        assert!(result.is_some(), "Perturbation fallback should recover coplanar full-face union");
    }

    #[test]
    fn fallback_union_half_overlap() {
        let a = make_cube(1.0);
        let b = cube_at(1.0, 0.5, 0.0, 0.0);
        let result = bool_with_fallback(&a, &b, union);
        assert!(result.is_some(), "Perturbation fallback should recover axis-aligned half-overlap union");
    }

    #[test]
    fn fallback_union_corner_overlap() {
        let a = make_cube(1.0);
        let b = cube_at(1.0, 0.5, 0.5, 0.0);
        let result = bool_with_fallback(&a, &b, union);
        assert!(result.is_some(), "Perturbation fallback should recover 2D corner-overlap union");
    }

    #[test]
    fn fallback_subtract_coplanar_full_face() {
        let a = make_cube(1.0);
        let b = cube_at(1.0, 1.0, 0.0, 0.0);
        let result = bool_with_fallback(&a, &b, subtract);
        assert!(result.is_some(), "Perturbation fallback should recover coplanar full-face subtract");
    }

    #[test]
    fn fallback_subtract_half_overlap() {
        let a = make_cube(1.0);
        let b = cube_at(1.0, 0.5, 0.0, 0.0);
        let result = bool_with_fallback(&a, &b, subtract);
        assert!(result.is_some(), "Perturbation fallback should recover axis-aligned half-overlap subtract");
    }

    #[test]
    fn fallback_intersect_coplanar() {
        let a = make_cube(1.0);
        let b = cube_at(1.0, 1.0, 0.0, 0.0);
        let result = bool_with_fallback(&a, &b, intersect);
        assert!(result.is_some(), "Perturbation fallback should recover coplanar full-face intersect");
    }

    // ── Test: Cube-cylinder boolean ops ─────────────────────────────

    #[test]
    fn subtract_cylinder_from_cube() {
        let a = make_cube(2.0);
        let b = cylinder_at(0.5, 3.0, 0.0, 0.0, -1.5);
        let result = try_op(|| subtract(&a, &b));
        assert!(result.is_some(), "Cylinder subtracted from cube should work (makes a hole)");
    }

    #[test]
    fn union_cube_and_cylinder() {
        let a = make_cube(1.0);
        let b = cylinder_at(0.3, 2.0, 0.0, 0.0, -1.0);
        let result = try_op(|| union(&a, &b));
        assert!(result.is_some(), "Cube + cylinder union should work");
    }

    // ── Test: Multiple overlapping cubes (chain of booleans) ────────

    #[test]
    fn chain_three_cubes_with_fallback() {
        let a = make_cube(1.0);
        let b = cube_at(1.0, 1.0, 0.0, 0.0);
        let c = cube_at(1.0, 2.0, 0.0, 0.0);

        let ab = bool_with_fallback(&a, &b, union);
        assert!(ab.is_some(), "First union in chain should succeed");

        let abc = bool_with_fallback(ab.as_ref().unwrap(), &c, union);
        assert!(abc.is_some(), "Chained triple union should succeed");
    }

    // ── Test: Various sizes ─────────────────────────────────────────

    #[test]
    fn fallback_union_different_sizes() {
        let a = make_cube(2.0);
        let b = cube_at(1.0, 1.5, 0.0, 0.0);
        let result = bool_with_fallback(&a, &b, union);
        assert!(result.is_some(), "Different-size cubes union should work with fallback");
    }

    #[test]
    fn fallback_subtract_different_sizes() {
        let a = make_cube(2.0);
        let b = cube_at(1.0, 1.5, 0.0, 0.0);
        let result = bool_with_fallback(&a, &b, subtract);
        assert!(result.is_some(), "Different-size cubes subtract should work with fallback");
    }

    // ── Test: Edge-aligned (shared edge, not face) ──────────────────

    #[test]
    fn fallback_union_edge_aligned() {
        let a = make_cube(1.0);
        let b = cube_at(1.0, 1.0, 1.0, 0.0);
        let result = bool_with_fallback(&a, &b, union);
        assert!(result.is_some(), "Edge-aligned cubes should work with fallback");
    }

    // ── Test: Tessellation (virtualritz parallel mesh improvements) ──

    #[test]
    fn cube_tessellation_succeeds() {
        let cube = make_cube(1.0);
        // triangulation returns Solid<Point3, PolylineCurve, Option<PolygonMesh>>
        let meshed = cube.triangulation(0.01);
        // Verify boundaries exist (shells with meshed faces)
        assert!(!meshed.boundaries().is_empty(), "Cube should tessellate");
    }

    #[test]
    fn cylinder_tessellation_succeeds() {
        let cyl = make_cylinder(0.5, 2.0);
        let meshed = cyl.triangulation(0.01);
        assert!(!meshed.boundaries().is_empty(), "Cylinder should tessellate");
    }

    #[test]
    fn boolean_result_tessellates() {
        let a = make_cube(2.0);
        let b = cylinder_at(0.5, 3.0, 0.0, 0.0, -1.5);
        let result = subtract(&a, &b).expect("Cube-cylinder subtract should work");
        let meshed = result.triangulation(0.01);
        assert!(!meshed.boundaries().is_empty(), "Boolean result should tessellate");
    }
}
