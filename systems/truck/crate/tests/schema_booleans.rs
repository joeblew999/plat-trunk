//! Schema boundary tests — booleans domain.
//!
//! Commands: boolean_union, boolean_subtract, boolean_intersect, clash_detect
//!
//! Run: cargo test -p truck-webgpu-gui --no-default-features --features native

#![cfg(feature = "native")]

mod common;
use common::object_id_from;
use truck_webgpu_gui::headless::HeadlessController;

#[test]
fn boolean_subtract_cube_minus_cylinder_returns_object_count_1() {
    // Known geometry: cylinder (r=0.5, h=3) punched through cube (size=2)
    let mut ctrl = HeadlessController::new();
    let id_a = object_id_from(&ctrl.execute("add_cube", r#"{"size":2.0}"#));
    let id_b = object_id_from(&ctrl.execute("add_cylinder", r#"{"radius":0.5,"height":3.0}"#));
    let r = ctrl.execute("boolean_subtract", &format!(r#"{{"idA":"{}","idB":"{}"}}"#, id_a, id_b));
    let result_id = object_id_from(&r);
    assert!(!result_id.is_empty(), "boolean_subtract must return objectId; got {}", r);
    assert_eq!(ctrl.object_count(), 1, "two inputs consumed → one output");
}

#[test]
fn boolean_union_cube_and_cylinder_returns_object_count_1() {
    let mut ctrl = HeadlessController::new();
    let id_a = object_id_from(&ctrl.execute("add_cube", r#"{"size":2.0}"#));
    let id_b = object_id_from(&ctrl.execute("add_cylinder", r#"{"radius":0.5,"height":3.0}"#));
    let r = ctrl.execute("boolean_union", &format!(r#"{{"idA":"{}","idB":"{}"}}"#, id_a, id_b));
    let result_id = object_id_from(&r);
    assert!(!result_id.is_empty(), "boolean_union must return objectId; got {}", r);
    assert_eq!(ctrl.object_count(), 1);
}

#[test]
fn boolean_intersect_overlapping_cubes_returns_object_count_1() {
    // Diagonal offset — avoids coincident faces (degenerate for shapeops)
    let mut ctrl = HeadlessController::new();
    let id_a = object_id_from(&ctrl.execute("add_cube", r#"{"size":1.0}"#));
    let id_b = object_id_from(&ctrl.execute("add_cube", r#"{"size":1.0}"#));
    ctrl.execute("translate", &format!(r#"{{"objectId":"{}","dx":0.5,"dy":0.5,"dz":0.5}}"#, id_b));
    let r = ctrl.execute("boolean_intersect", &format!(r#"{{"idA":"{}","idB":"{}"}}"#, id_a, id_b));
    let result_id = object_id_from(&r);
    assert!(!result_id.is_empty(), "boolean_intersect must return objectId; got {}", r);
    assert_eq!(ctrl.object_count(), 1);
}

#[test]
fn clash_detect_diagonal_overlap_returns_true() {
    // Same diagonal geometry as boolean_intersect — known to succeed with shapeops
    let mut ctrl = HeadlessController::new();
    let id_a = object_id_from(&ctrl.execute("add_cube", r#"{"size":1.0}"#));
    let id_b = object_id_from(&ctrl.execute("add_cube", r#"{"size":1.0}"#));
    ctrl.execute("translate", &format!(r#"{{"objectId":"{}","dx":0.5,"dy":0.5,"dz":0.5}}"#, id_b));
    let r = ctrl.execute("clash_detect", &format!(r#"{{"idA":"{}","idB":"{}"}}"#, id_a, id_b));
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert!(v["clash"].is_boolean(), "clash_detect must return clash bool; got {}", r);
    assert_eq!(v["clash"], true);
}

#[test]
fn clash_detect_separated_objects_returns_false() {
    let mut ctrl = HeadlessController::new();
    let id_a = object_id_from(&ctrl.execute("add_cube", r#"{"size":1.0}"#));
    let id_b = object_id_from(&ctrl.execute("add_cube", r#"{"size":1.0}"#));
    ctrl.execute("translate", &format!(r#"{{"objectId":"{}","dx":100,"dy":0,"dz":0}}"#, id_b));
    let r = ctrl.execute("clash_detect", &format!(r#"{{"idA":"{}","idB":"{}"}}"#, id_a, id_b));
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert_eq!(v["clash"], false, "separated objects must not clash; got {}", r);
}
