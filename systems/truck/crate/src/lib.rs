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

#[cfg(feature = "mvt")]
pub mod mvt;

// gltf_import is currently in progress and unstable. 
// It will be enabled via feature flag once fixed.
// pub mod gltf_import;

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
    // Use builder::cone to handle pole singularities correctly (like truck examples).
    // 1. Create a vertex at North Pole (0, 0, radius).
    let v0 = builder::vertex(Point3::new(0.0, 0.0, radius));
    // 2. Sweep it around Y axis by PI to create a semi-circle arc from North to South.
    //    This arc lies in the XZ plane (passing through x=radius).
    let wire: Wire = builder::rsweep(&v0, Point3::origin(), Vector3::unit_y(), Rad(PI), 16);
    // 3. Revolve this arc around Z axis by 2*PI to form the sphere surface.
    //    The ends of the arc are on the Z axis, so cone() handles the degeneration.
    let shell = builder::cone(&wire, Vector3::unit_z(), Rad(2.0 * PI), 36);
    Solid::new(vec![shell])
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
// WASM application — rendering vs headless (ADR-0018 Phase 0.5)
// ---------------------------------------------------------------------------

// Full rendering app (browser): wasm32 + rendering feature
#[cfg(all(target_arch = "wasm32", feature = "rendering"))]
mod wasm_app;

#[cfg(all(target_arch = "wasm32", feature = "rendering"))]
pub use wasm_app::SceneController;

// Headless geometry engine (CF Worker): wasm32, no rendering
#[cfg(all(target_arch = "wasm32", not(feature = "rendering")))]
mod headless;

#[cfg(all(target_arch = "wasm32", not(feature = "rendering")))]
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
