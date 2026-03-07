//! Golden tests: load every JSON shape from .src/truck/resources/shape/,
//! verify deserialization, bounding sphere, tessellation, and round-trip.

use std::fs;
use std::path::PathBuf;
use monstertruck_meshing::prelude::*;
use monstertruck_modeling::*;

/// Path to truck resource shapes relative to the workspace root.
fn resources_dir() -> PathBuf {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest.join("../../../.src/truck/resources/shape")
}

/// Load a Solid from a JSON file.
fn load_solid(name: &str) -> Solid {
    let path = resources_dir().join(name);
    let json = fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("Failed to read {}: {}", path.display(), e));
    serde_json::from_str::<Solid>(&json)
        .unwrap_or_else(|e| panic!("Failed to deserialize {}: {}", name, e))
}

/// Compute bounding sphere (center, radius) for a solid.
fn bounding_sphere(solid: &Solid) -> (Point3, f64) {
    let mut bdd_box = BoundingBox::new();
    solid
        .boundaries()
        .iter()
        .flatten()
        .flat_map(Face::boundaries)
        .flatten()
        .for_each(|edge: Edge| {
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

/// Test that a shape file loads, has valid geometry, tessellates, and round-trips.
fn verify_shape(name: &str) {
    // 1. Deserialize
    let solid = load_solid(name);

    // 2. Bounding sphere must have positive radius
    let (center, radius) = bounding_sphere(&solid);
    assert!(
        radius > 0.0,
        "{}: bounding sphere radius should be positive, got {} at {:?}",
        name, radius, center
    );

    // 3. Has at least one boundary shell
    assert!(
        !solid.boundaries().is_empty(),
        "{}: solid should have at least one boundary",
        name
    );

    // 4. Tessellate without panic
    let mesh = solid.triangulation(radius * 0.01);
    let polygon = mesh.to_polygon();
    assert!(
        polygon.positions().len() > 0,
        "{}: tessellation should produce vertices",
        name
    );

    // 5. Round-trip: serialize then deserialize
    let json = serde_json::to_string(&solid).expect("serialize");
    let solid2: Solid = serde_json::from_str(&json).expect("re-deserialize");
    let (_, radius2) = bounding_sphere(&solid2);
    let diff = (radius - radius2).abs();
    assert!(
        diff < 1e-10,
        "{}: round-trip bounding radius mismatch: {} vs {} (diff {})",
        name, radius, radius2, diff
    );
}

#[test]
fn golden_cube() {
    verify_shape("cube.json");
}

#[test]
fn golden_sphere() {
    verify_shape("sphere.json");
}

#[test]
fn golden_cylinder() {
    verify_shape("cylinder.json");
}

#[test]
fn golden_torus() {
    verify_shape("torus.json");
}

#[test]
fn golden_bottle() {
    verify_shape("bottle.json");
}

#[test]
fn golden_punched_cube() {
    verify_shape("punched-cube.json");
}

#[test]
fn golden_cube_in_cube() {
    verify_shape("cube-in-cube.json");
}

#[test]
fn golden_torus_punched_cube() {
    verify_shape("torus-punched-cube.json");
}

#[test]
fn golden_large_torus() {
    verify_shape("large-torus.json");
}

#[test]
fn golden_punched_cube_shapeops() {
    verify_shape("punched-cube-shapeops.json");
}

/// Verify all JSON files in the resources directory are covered.
#[test]
fn all_resources_accounted_for() {
    let dir = resources_dir();
    if !dir.exists() {
        panic!(
            "Resources directory not found at {}. Run `task truck:deps:clone` first.",
            dir.display()
        );
    }
    let mut json_files: Vec<String> = fs::read_dir(&dir)
        .unwrap()
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map_or(false, |ext| ext == "json"))
        .map(|e| e.file_name().to_string_lossy().to_string())
        .collect();
    json_files.sort();

    // Each file should load without error
    for name in &json_files {
        let path = dir.join(name);
        let json = fs::read_to_string(&path).unwrap();
        let result: std::result::Result<Solid, _> = serde_json::from_str(&json);
        assert!(
            result.is_ok(),
            "Failed to deserialize {}: {}",
            name,
            result.err().unwrap()
        );
    }
}
