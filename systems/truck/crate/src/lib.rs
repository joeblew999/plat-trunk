// Truck WebGPU CAD — parametric modeler in the browser.
// Uses truck-platform Scene + truck-rendimpl PBR shaders.
// Multi-object scene with boolean operations and save/load.
//
// The WASM rendering code is gated behind #[cfg(target_arch = "wasm32")]
// so that geometry modules (sketch, primitives) can be tested on native.

// ---------------------------------------------------------------------------
// Shared geometry (always compiled — used by native tests)
// ---------------------------------------------------------------------------

pub mod sketch;
pub mod commands;
mod bool_robustness;

#[cfg(feature = "mvt")]
pub mod mvt;

// gltf_import is currently in progress and unstable. 
// It will be enabled via feature flag once fixed.
// pub mod gltf_import;

use std::f64::consts::PI;
use monstertruck_meshing::prelude::*;
use monstertruck_modeling::*;

/// Compute bounding sphere (center, radius) for a solid.
/// Try a boolean op with multiple perturbation fallbacks.
/// monstertruck is stricter than truck — some geometries need different perturbations.
pub fn try_bool_op<F>(solid_a: &Solid, solid_b: &Solid, op: F) -> Option<Solid>
where F: Fn(&Solid, &Solid) -> Option<Solid>
{
    // 1. Try exact geometry
    if let Some(result) = op(solid_a, solid_b) {
        return Some(result);
    }
    // 2. Try progressively different perturbations to break axis alignment
    let perturbations = [
        Vector3::new(-0.1, -0.07, -0.03),
        Vector3::new(0.01, 0.013, 0.007),
        Vector3::new(-0.023, 0.017, -0.011),
    ];
    for p in &perturbations {
        let perturbed = builder::translated(solid_b, *p);
        if let Some(result) = op(solid_a, &perturbed) {
            return Some(result);
        }
    }
    None
}

/// Compute axis-aligned bounding box for a solid: (min, max).
pub fn solid_bounding_box(solid: &Solid) -> (Point3, Point3) {
    let mut bdd_box: BoundingBox<Point3> = BoundingBox::new();
    solid
        .boundaries()
        .iter()
        .flatten()
        .flat_map(Face::boundaries)
        .flatten()
        .for_each(|edge| {
            let curve = edge.oriented_curve();
            bdd_box += match curve {
                Curve::Line(line) => vec![line.0, line.1].into_iter().collect(),
                Curve::BsplineCurve(curve) => {
                    let bdb = curve.roughly_bounding_box();
                    vec![bdb.max(), bdb.min()].into_iter().collect()
                }
                Curve::NurbsCurve(curve) => curve.roughly_bounding_box(),
                Curve::IntersectionCurve(_) => BoundingBox::new(),
            };
        });
    (bdd_box.min(), bdd_box.max())
}

/// Check if two AABBs overlap on all 3 axes.
pub fn aabb_overlap(a: &(Point3, Point3), b: &(Point3, Point3)) -> bool {
    a.0.x <= b.1.x && a.1.x >= b.0.x &&
    a.0.y <= b.1.y && a.1.y >= b.0.y &&
    a.0.z <= b.1.z && a.1.z >= b.0.z
}

// ---------------------------------------------------------------------------
// Shared boolean operations — single source of truth for both headless + WASM
// ---------------------------------------------------------------------------

/// Boolean union: or() with De Morgan fallback (A ∪ B = ¬(¬A ∧ ¬B)) + perturbation.
pub fn bool_union(a: &Solid, b: &Solid) -> Option<Solid> {
    try_bool_op(a, b, |a, b| {
        monstertruck_solid::or(a, b, 0.05).ok().or_else(|| {
            let mut not_a = a.clone(); not_a.not();
            let mut not_b = b.clone(); not_b.not();
            monstertruck_solid::and(&not_a, &not_b, 0.05).ok().map(|mut s| { s.not(); s })
        })
    })
}

/// Boolean subtract: A \ B = A ∧ ¬B + perturbation.
pub fn bool_subtract(a: &Solid, b: &Solid) -> Option<Solid> {
    try_bool_op(a, b, |a, b| {
        let mut neg = b.clone(); neg.not();
        monstertruck_solid::and(a, &neg, 0.05).ok()
    })
}

/// Boolean intersect: and() + perturbation.
pub fn bool_intersect(a: &Solid, b: &Solid) -> Option<Solid> {
    try_bool_op(a, b, |a, b| monstertruck_solid::and(a, b, 0.05).ok())
}

/// Clash detection on raw solids: AABB pre-check + boolean intersection test.
pub fn clash_detect_solids(a: &Solid, b: &Solid) -> bool {
    let bb_a = solid_bounding_box(a);
    let bb_b = solid_bounding_box(b);
    if !aabb_overlap(&bb_a, &bb_b) { return false; }
    match monstertruck_solid::and(a, b, 0.05) {
        Ok(result) => !result.boundaries().is_empty(),
        Err(_) => true, // AABBs overlap but boolean failed → assume clash
    }
}

pub fn compute_bounding_sphere(solid: &Solid) -> (Point3, f64) {
    let mut bdd_box = BoundingBox::new();
    solid
        .boundaries()
        .iter()
        .flatten()
        .flat_map(Face::boundaries)
        .flatten()
        .for_each(|edge| {
            let curve = edge.oriented_curve();
            bdd_box += match curve {
                Curve::Line(line) => vec![line.0, line.1].into_iter().collect(),
                Curve::BsplineCurve(curve) => {
                    let bdb = curve.roughly_bounding_box();
                    vec![bdb.max(), bdb.min()].into_iter().collect()
                }
                Curve::NurbsCurve(curve) => curve.roughly_bounding_box(),
                Curve::IntersectionCurve(_) => BoundingBox::new(),
            };
        });
    let min = bdd_box.min();
    let max = bdd_box.max();
    let center = Point3::new(
        (min.x + max.x) / 2.0,
        (min.y + max.y) / 2.0,
        (min.z + max.z) / 2.0,
    );
    let radius = (max - min).magnitude() / 2.0;
    (center, radius)
}

// ---------------------------------------------------------------------------
// Primitive builders (always compiled — reused by WASM app + tests)
// ---------------------------------------------------------------------------

// ── Primitive parameter validation — single source of truth ────────────────
//
// These functions are the ONLY place where primitive parameter constraints
// live. Both the HTTP layer (geometry.rs params structs) and the geometry
// builders below delegate here, so adding a new constraint means editing
// exactly one function.

pub fn validate_cube(size: f64) -> std::result::Result<(), String> {
    if !size.is_finite() || size <= 0.0 {
        return Err(format!("size must be > 0, got {}", size));
    }
    if size > 1000.0 {
        return Err(format!("size must be ≤ 1000, got {}", size));
    }
    Ok(())
}

pub fn validate_sphere(radius: f64) -> std::result::Result<(), String> {
    if !radius.is_finite() || radius <= 0.0 {
        return Err(format!("radius must be > 0, got {}", radius));
    }
    if radius > 1000.0 {
        return Err(format!("radius must be ≤ 1000, got {}", radius));
    }
    Ok(())
}

pub fn validate_cylinder(radius: f64, height: f64) -> std::result::Result<(), String> {
    if !radius.is_finite() || radius <= 0.0 {
        return Err(format!("radius must be > 0, got {}", radius));
    }
    if radius > 1000.0 {
        return Err(format!("radius must be ≤ 1000, got {}", radius));
    }
    if !height.is_finite() || height <= 0.0 {
        return Err(format!("height must be > 0, got {}", height));
    }
    if height > 1000.0 {
        return Err(format!("height must be ≤ 1000, got {}", height));
    }
    Ok(())
}

pub fn validate_torus(major_r: f64, minor_r: f64) -> std::result::Result<(), String> {
    if !major_r.is_finite() || major_r <= 0.0 {
        return Err(format!("majorRadius must be > 0, got {}", major_r));
    }
    if major_r > 1000.0 {
        return Err(format!("majorRadius must be ≤ 1000, got {}", major_r));
    }
    if !minor_r.is_finite() || minor_r <= 0.0 {
        return Err(format!("minorRadius must be > 0, got {}", minor_r));
    }
    if minor_r >= major_r {
        return Err(format!(
            "minorRadius ({}) must be < majorRadius ({})",
            minor_r, major_r
        ));
    }
    Ok(())
}

pub fn make_cube(size: f64) -> std::result::Result<Solid, String> {
    validate_cube(size)?;
    // Build via tsweep (vertex → edge → face → solid).
    // This topology is compatible with truck-shapeops boolean operations.
    // (primitive::cuboid produces topology that shapeops cannot process)
    let half = size / 2.0;
    let v = builder::vertex(Point3::new(-half, -half, -half));
    let e = builder::extrude(&v, Vector3::new(size, 0.0, 0.0));
    let f = builder::extrude(&e, Vector3::new(0.0, size, 0.0));
    Ok(builder::extrude(&f, Vector3::new(0.0, 0.0, size)))
}

pub fn make_sphere(radius: f64) -> std::result::Result<Solid, String> {
    validate_sphere(radius)?;
    // Use builder::revolve_wire to handle pole singularities correctly.
    // 1. Create a vertex at North Pole (0, 0, radius).
    let v0 = builder::vertex(Point3::new(0.0, 0.0, radius));
    // 2. Sweep it around Y axis by PI to create a semi-circle arc from North to South.
    //    This arc lies in the XZ plane (passing through x=radius).
    let wire: Wire = builder::revolve(&v0, Point3::origin(), Vector3::unit_y(), Rad(PI), 16);
    // 3. Revolve this arc around Z axis by 2*PI to form the sphere surface.
    let shell = builder::revolve_wire(&wire, Point3::origin(), Vector3::unit_z(), Rad(2.0 * PI), 36);
    Ok(Solid::new(vec![shell]))
}

pub fn make_cylinder(radius: f64, height: f64) -> std::result::Result<Solid, String> {
    validate_cylinder(radius, height)?;
    let v0 = builder::vertex(Point3::new(radius, 0.0, 0.0));
    let v1 = builder::vertex(Point3::new(-radius, 0.0, 0.0));
    let arc0 = builder::circle_arc(&v0, &v1, Point3::new(0.0, radius, 0.0));
    let arc1 = builder::circle_arc(&v1, &v0, Point3::new(0.0, -radius, 0.0));
    let wire = Wire::from(vec![arc0, arc1]);
    let face = builder::try_attach_plane(&[wire]).unwrap();
    Ok(builder::extrude(&face, Vector3::new(0.0, 0.0, height)))
}

pub fn make_torus(major_r: f64, minor_r: f64) -> std::result::Result<Solid, String> {
    validate_torus(major_r, minor_r)?;
    let v0 = builder::vertex(Point3::new(major_r + minor_r, 0.0, 0.0));
    let v1 = builder::vertex(Point3::new(major_r - minor_r, 0.0, 0.0));
    let arc0 = builder::circle_arc(&v0, &v1, Point3::new(major_r, 0.0, minor_r));
    let arc1 = builder::circle_arc(&v1, &v0, Point3::new(major_r, 0.0, -minor_r));
    let wire = Wire::from(vec![arc0, arc1]);
    let face = builder::try_attach_plane(&[wire]).unwrap();
    Ok(builder::revolve(&face, Point3::origin(), Vector3::unit_z(), Rad(2.0 * PI), 36))
}

// ---------------------------------------------------------------------------
// WASM application — rendering vs headless (ADR-0018 Phase 0.5)
// ---------------------------------------------------------------------------

// Full rendering app (browser): wasm32 + rendering feature
#[cfg(all(target_arch = "wasm32", feature = "rendering"))]
mod wasm_app;

#[cfg(all(target_arch = "wasm32", feature = "rendering"))]
pub use wasm_app::SceneController;

// Headless geometry engine (CF Worker): wasm32, no rendering
// Also available on native for cargo test via the `native` feature flag.
#[cfg(any(
    all(target_arch = "wasm32", not(feature = "rendering")),
    feature = "native",
))]
pub mod headless;

#[cfg(any(
    all(target_arch = "wasm32", not(feature = "rendering")),
    feature = "native",
))]
pub use headless::HeadlessController;

use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);
    #[wasm_bindgen(js_namespace = console)]
    pub fn error(s: &str);
}

#[macro_export]
macro_rules! log {
    ($($t:tt)*) => {
        unsafe { $crate::log(&format_args!($($t)*).to_string()) }
    }
}

#[macro_export]
macro_rules! error {
    ($($t:tt)*) => {
        unsafe { $crate::error(&format_args!($($t)*).to_string()) }
    }
}
