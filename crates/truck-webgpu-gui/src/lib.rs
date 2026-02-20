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

use std::f64::consts::PI;
use truck_meshalgo::prelude::*;
use truck_modeling::*;

/// Compute bounding sphere (center, radius) for a solid.
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
                Curve::BSplineCurve(curve) => {
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

pub fn make_cube(size: f64) -> Solid {
    // Build via tsweep (vertex → edge → face → solid).
    // This topology is compatible with truck-shapeops boolean operations.
    // (primitive::cuboid produces topology that shapeops cannot process)
    let half = size / 2.0;
    let v = builder::vertex(Point3::new(-half, -half, -half));
    let e = builder::tsweep(&v, Vector3::new(size, 0.0, 0.0));
    let f = builder::tsweep(&e, Vector3::new(0.0, size, 0.0));
    builder::tsweep(&f, Vector3::new(0.0, 0.0, size))
}

pub fn make_sphere(radius: f64) -> Solid {
    let north = builder::vertex(Point3::new(0.0, 0.0, radius));
    let south = builder::vertex(Point3::new(0.0, 0.0, -radius));
    let arc = builder::circle_arc(&north, &south, Point3::new(radius, 0.0, 0.0));
    let line = builder::line(&south, &north);
    let wire = Wire::from(vec![arc, line]);
    let face = builder::try_attach_plane(&[wire]).unwrap();
    builder::rsweep(&face, Point3::origin(), Vector3::unit_z(), Rad(2.0 * PI), 36)
}

pub fn make_cylinder(radius: f64, height: f64) -> Solid {
    let v0 = builder::vertex(Point3::new(radius, 0.0, 0.0));
    let v1 = builder::vertex(Point3::new(-radius, 0.0, 0.0));
    let arc0 = builder::circle_arc(&v0, &v1, Point3::new(0.0, radius, 0.0));
    let arc1 = builder::circle_arc(&v1, &v0, Point3::new(0.0, -radius, 0.0));
    let wire = Wire::from(vec![arc0, arc1]);
    let face = builder::try_attach_plane(&[wire]).unwrap();
    builder::tsweep(&face, Vector3::new(0.0, 0.0, height))
}

pub fn make_torus(major_r: f64, minor_r: f64) -> Solid {
    let v0 = builder::vertex(Point3::new(major_r + minor_r, 0.0, 0.0));
    let v1 = builder::vertex(Point3::new(major_r - minor_r, 0.0, 0.0));
    let arc0 = builder::circle_arc(&v0, &v1, Point3::new(major_r, 0.0, minor_r));
    let arc1 = builder::circle_arc(&v1, &v0, Point3::new(major_r, 0.0, -minor_r));
    let wire = Wire::from(vec![arc0, arc1]);
    let face = builder::try_attach_plane(&[wire]).unwrap();
    builder::rsweep(&face, Point3::origin(), Vector3::unit_z(), Rad(2.0 * PI), 36)
}

// ---------------------------------------------------------------------------
// WASM application (only compiled for wasm32 target)
// ---------------------------------------------------------------------------

#[cfg(target_arch = "wasm32")]
mod wasm_app;

// Re-export WASM types at crate root so wasm_bindgen can find them
#[cfg(target_arch = "wasm32")]
pub use wasm_app::SceneController;
