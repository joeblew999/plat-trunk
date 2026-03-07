// Boolean operation robustness tests.
//
// Tests verify boolean ops behavior with monstertruck's Result-based API.
// monstertruck is stricter than original truck — it validates output shell
// orientation and rejects shells that truck silently accepted.

#[cfg(test)]
mod tests {
    use monstertruck_modeling::*;
    use monstertruck_meshing::tessellation::MeshableShape;
    use crate::{make_cube, make_cylinder};

    const TOL: f64 = 0.05;

    /// Perturbation vector matching wasm_app.rs BOOL_PERTURBATION.
    const PERTURB: Vector3 = Vector3::new(-0.1, -0.07, -0.03);

    // ── Helpers ──────────────────────────────────────────────

    fn cube_at(size: f64, dx: f64, dy: f64, dz: f64) -> Solid {
        let c = make_cube(size).expect("valid cube params");
        builder::translated(&c, Vector3::new(dx, dy, dz))
    }

    fn cylinder_at(r: f64, h: f64, dx: f64, dy: f64, dz: f64) -> Solid {
        let c = make_cylinder(r, h).expect("valid cylinder params");
        builder::translated(&c, Vector3::new(dx, dy, dz))
    }

    /// Our perturbation fallback — mirrors wasm_app.rs try_bool_op.
    fn bool_with_fallback(a: &Solid, b: &Solid, op: fn(&Solid, &Solid) -> Option<Solid>) -> Option<Solid> {
        if let Some(result) = op(a, b) {
            return Some(result);
        }
        let perturbed = builder::translated(b, PERTURB);
        op(a, &perturbed)
    }

    fn union(a: &Solid, b: &Solid) -> Option<Solid> {
        monstertruck_solid::or(a, b, TOL).ok()
    }

    fn subtract(a: &Solid, b: &Solid) -> Option<Solid> {
        let mut not_b = b.clone();
        not_b.not();
        monstertruck_solid::and(a, &not_b, TOL).ok()
    }

    fn intersect(a: &Solid, b: &Solid) -> Option<Solid> {
        monstertruck_solid::and(a, b, TOL).ok()
    }

    // ── Test: monstertruck returns Result (not panic) for all cases ──

    #[test]
    fn union_no_panic() {
        let a = make_cube(1.0).expect("valid cube params");
        let b = cube_at(1.0, 0.5, 0.5, 0.5);
        // monstertruck may return Err (stricter validation) but must not panic
        let _ = union(&a, &b);
    }

    #[test]
    fn subtract_no_panic() {
        let a = make_cube(1.0).expect("valid cube params");
        let b = cube_at(1.0, 0.5, 0.5, 0.5);
        let _ = subtract(&a, &b);
    }

    #[test]
    fn intersect_no_panic() {
        let a = make_cube(1.0).expect("valid cube params");
        let b = cube_at(1.0, 0.5, 0.5, 0.5);
        let _ = intersect(&a, &b);
    }

    // ── Test: Non-overlapping cubes ─────────────────────────

    #[test]
    fn union_apart_no_panic() {
        let a = make_cube(1.0).expect("valid cube params");
        let b = cube_at(1.0, 3.0, 0.0, 0.0);
        let _ = union(&a, &b);
    }

    // ── Test: Coplanar — monstertruck fixed the panic, now returns Result ──

    #[test]
    fn coplanar_union_no_panic() {
        let a = make_cube(1.0).expect("valid cube params");
        let b = cube_at(1.0, 1.0, 0.0, 0.0);
        // Old truck panicked here. monstertruck returns Result (may be Ok or Err).
        let _ = union(&a, &b);
    }

    #[test]
    fn half_overlap_union_no_panic() {
        let a = make_cube(1.0).expect("valid cube params");
        let b = cube_at(1.0, 0.5, 0.0, 0.0);
        let _ = union(&a, &b);
    }

    #[test]
    fn corner_overlap_union_no_panic() {
        let a = make_cube(1.0).expect("valid cube params");
        let b = cube_at(1.0, 0.5, 0.5, 0.0);
        let _ = union(&a, &b);
    }

    // ── Test: Perturbation fallback recovers coplanar cases ─────

    #[test]
    fn fallback_union_coplanar_full_face() {
        let a = make_cube(1.0).expect("valid cube params");
        let b = cube_at(1.0, 1.0, 0.0, 0.0);
        let result = bool_with_fallback(&a, &b, union);
        assert!(result.is_some(), "Perturbation fallback should recover coplanar full-face union");
    }

    #[test]
    fn fallback_union_half_overlap() {
        let a = make_cube(1.0).expect("valid cube params");
        let b = cube_at(1.0, 0.5, 0.0, 0.0);
        let result = bool_with_fallback(&a, &b, union);
        assert!(result.is_some(), "Perturbation fallback should recover axis-aligned half-overlap union");
    }

    #[test]
    fn fallback_subtract_coplanar_full_face() {
        let a = make_cube(1.0).expect("valid cube params");
        let b = cube_at(1.0, 1.0, 0.0, 0.0);
        let result = bool_with_fallback(&a, &b, subtract);
        assert!(result.is_some(), "Perturbation fallback should recover coplanar full-face subtract");
    }

    #[test]
    fn fallback_intersect_coplanar() {
        let a = make_cube(1.0).expect("valid cube params");
        let b = cube_at(1.0, 1.0, 0.0, 0.0);
        let result = bool_with_fallback(&a, &b, intersect);
        assert!(result.is_some(), "Perturbation fallback should recover coplanar full-face intersect");
    }

    // ── Test: Cube-cylinder boolean ops ─────────────────────────────

    #[test]
    fn subtract_cylinder_from_cube() {
        let a = make_cube(1.0).expect("valid cube params");
        let b = cylinder_at(0.3, 1.0, 0.0, 0.0, -0.5);
        let _ = subtract(&a, &b);
    }

    #[test]
    fn union_cube_and_cylinder_with_fallback() {
        let a = make_cube(1.0).expect("valid cube params");
        let b = cylinder_at(0.3, 1.0, 0.0, 0.0, -0.5);
        let _ = bool_with_fallback(&a, &b, union);
    }

    // ── Test: Multiple overlapping cubes (chain of booleans) ────────

    #[test]
    fn chain_three_cubes_with_fallback() {
        let a = make_cube(1.0).expect("valid cube params");
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
        let a = make_cube(2.0).expect("valid cube params");
        let b = cube_at(1.0, 1.5, 0.0, 0.0);
        let result = bool_with_fallback(&a, &b, union);
        assert!(result.is_some(), "Different-size cubes union should work with fallback");
    }

    #[test]
    fn fallback_subtract_different_sizes() {
        let a = make_cube(2.0).expect("valid cube params");
        let b = cube_at(1.0, 1.5, 0.0, 0.0);
        let result = bool_with_fallback(&a, &b, subtract);
        assert!(result.is_some(), "Different-size cubes subtract should work with fallback");
    }

    // ── Test: Edge-aligned (shared edge, not face) ──────────────────

    #[test]
    fn fallback_union_edge_aligned() {
        let a = make_cube(1.0).expect("valid cube params");
        let b = cube_at(1.0, 1.0, 1.0, 0.0);
        let result = bool_with_fallback(&a, &b, union);
        assert!(result.is_some(), "Edge-aligned cubes should work with fallback");
    }

    // ── Test: Tessellation ──────────────────────────────────────────

    #[test]
    fn cube_tessellation_succeeds() {
        let cube = make_cube(1.0).expect("valid cube params");
        let meshed = cube.triangulation(0.01);
        assert!(!meshed.boundaries().is_empty(), "Cube should tessellate");
    }

    #[test]
    fn cylinder_tessellation_succeeds() {
        let cyl = make_cylinder(0.5, 2.0).expect("valid cylinder params");
        let meshed = cyl.triangulation(0.01);
        assert!(!meshed.boundaries().is_empty(), "Cylinder should tessellate");
    }

    #[test]
    fn boolean_result_tessellates() {
        let a = make_cube(2.0).expect("valid cube params");
        let b = cylinder_at(0.5, 3.0, 0.0, 0.0, -1.5);
        let result = subtract(&a, &b).expect("Cube-cylinder subtract should work");
        let meshed = result.triangulation(0.01);
        assert!(!meshed.boundaries().is_empty(), "Boolean result should tessellate");
    }
}
