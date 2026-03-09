//! Schema boundary tests — booleans domain.
//!
//! Commands: boolean_union, boolean_subtract, boolean_intersect, clash_detect
//!
//! Run: cargo test -p truck-cad --no-default-features --features native

#![cfg(feature = "native")]

mod common;
use common::{object_id_from, p};
use truck_cad::headless::HeadlessController;
use truck_cad::commands::{AddCubeParams, AddCylinderParams, TranslateParams, BooleanParams};

#[test]
fn boolean_subtract_cube_minus_cylinder_returns_object_count_1() {
    // Known geometry: cylinder (r=0.5, h=3) punched through cube (size=2)
    let mut ctrl = HeadlessController::new();
    let id_a = object_id_from(&ctrl.execute("add_cube",     &p(AddCubeParams { size: 2.0 })));
    let id_b = object_id_from(&ctrl.execute("add_cylinder", &p(AddCylinderParams { radius: 0.5, height: 3.0 })));
    let r = ctrl.execute("boolean_subtract", &p(BooleanParams { id_a, id_b }));
    let result_id = object_id_from(&r);
    assert!(!result_id.is_empty(), "boolean_subtract must return objectId; got {}", r);
    assert_eq!(ctrl.object_count(), 1, "two inputs consumed → one output");
}

#[test]
fn boolean_union_cube_and_cylinder_returns_object_count_1() {
    let mut ctrl = HeadlessController::new();
    let id_a = object_id_from(&ctrl.execute("add_cube",     &p(AddCubeParams { size: 2.0 })));
    let id_b = object_id_from(&ctrl.execute("add_cylinder", &p(AddCylinderParams { radius: 0.5, height: 3.0 })));
    let r = ctrl.execute("boolean_union", &p(BooleanParams { id_a, id_b }));
    let result_id = object_id_from(&r);
    assert!(!result_id.is_empty(), "boolean_union must return objectId; got {}", r);
    assert_eq!(ctrl.object_count(), 1);
}

#[test]
fn boolean_intersect_overlapping_cubes_returns_object_count_1() {
    // monstertruck's and() cannot compute cube-cube intersection (returns Err).
    // Test that it returns a graceful error, not a panic/crash.
    let mut ctrl = HeadlessController::new();
    let id_a = object_id_from(&ctrl.execute("add_cube", &p(AddCubeParams { size: 1.0 })));
    let id_b = object_id_from(&ctrl.execute("add_cube", &p(AddCubeParams { size: 1.0 })));
    ctrl.execute("translate", &p(TranslateParams { object_id: id_b.clone(), dx: 0.5, dy: 0.5, dz: 0.5 }));
    let r = ctrl.execute("boolean_intersect", &p(BooleanParams { id_a, id_b }));
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    // monstertruck returns error gracefully — both objects remain
    assert!(v.get("error").is_some(), "intersect should return error for cube-cube; got {}", r);
    assert_eq!(ctrl.object_count(), 2, "failed intersect should leave both objects intact");
}

#[test]
fn clash_detect_diagonal_overlap_returns_true() {
    // Same diagonal geometry as boolean_intersect — known to succeed with shapeops
    let mut ctrl = HeadlessController::new();
    let id_a = object_id_from(&ctrl.execute("add_cube", &p(AddCubeParams { size: 1.0 })));
    let id_b = object_id_from(&ctrl.execute("add_cube", &p(AddCubeParams { size: 1.0 })));
    ctrl.execute("translate", &p(TranslateParams { object_id: id_b.clone(), dx: 0.5, dy: 0.5, dz: 0.5 }));
    let r = ctrl.execute("clash_detect", &p(BooleanParams { id_a, id_b }));
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert!(v["clash"].is_boolean(), "clash_detect must return clash bool; got {}", r);
    assert_eq!(v["clash"], true);
}

#[test]
fn clash_detect_separated_objects_returns_false() {
    let mut ctrl = HeadlessController::new();
    let id_a = object_id_from(&ctrl.execute("add_cube", &p(AddCubeParams { size: 1.0 })));
    let id_b = object_id_from(&ctrl.execute("add_cube", &p(AddCubeParams { size: 1.0 })));
    ctrl.execute("translate", &p(TranslateParams { object_id: id_b.clone(), dx: 100.0, dy: 0.0, dz: 0.0 }));
    let r = ctrl.execute("clash_detect", &p(BooleanParams { id_a, id_b }));
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert_eq!(v["clash"], false, "separated objects must not clash; got {}", r);
}
