//! Schema boundary tests — geometry domain.
//!
//! Commands: add_cube, add_sphere, add_cylinder, add_torus,
//!           translate, rotate, scale, duplicate
//!
//! Run: cargo test -p truck-webgpu-gui --no-default-features --features native

#![cfg(feature = "native")]

mod common;
use common::object_id_from;
use truck_webgpu_gui::headless::HeadlessController;

// ── primitives ───────────────────────────────────────────────────────────────

#[test]
fn add_cube_returns_object_id_and_count_is_1() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_cube", r#"{"size":2.0}"#));
    assert!(!id.is_empty());
    assert_eq!(ctrl.object_count(), 1);
    assert_eq!(ctrl.object_ids(), vec![id]);
}

#[test]
fn add_sphere_returns_object_id_and_count_is_1() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_sphere", r#"{"radius":1.5}"#));
    assert!(!id.is_empty());
    assert_eq!(ctrl.object_count(), 1);
}

#[test]
fn add_cylinder_returns_object_id_and_count_is_1() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_cylinder", r#"{"radius":0.5,"height":2.0}"#));
    assert!(!id.is_empty());
    assert_eq!(ctrl.object_count(), 1);
}

#[test]
fn add_torus_returns_object_id_and_count_is_1() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_torus", r#"{"majorRadius":2.0,"minorRadius":0.5}"#));
    assert!(!id.is_empty());
    assert_eq!(ctrl.object_count(), 1);
}

#[test]
fn add_two_primitives_count_is_2() {
    let mut ctrl = HeadlessController::new();
    ctrl.execute("add_cube", r#"{"size":1.0}"#);
    ctrl.execute("add_cylinder", r#"{"radius":0.4,"height":2.0}"#);
    assert_eq!(ctrl.object_count(), 2);
}

// ── transforms ───────────────────────────────────────────────────────────────

#[test]
fn translate_moves_object_returns_success() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_cube", r#"{"size":1.0}"#));
    let r = ctrl.execute("translate", &format!(r#"{{"objectId":"{}","dx":1.0,"dy":2.0,"dz":3.0}}"#, id));
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert_eq!(v["success"], true, "translate must succeed; got {}", r);
    assert_eq!(ctrl.object_count(), 1, "translate must not change count");
}

#[test]
fn rotate_object_returns_success() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_cube", r#"{"size":1.0}"#));
    let r = ctrl.execute("rotate", &format!(
        r#"{{"objectId":"{}","axisX":0,"axisY":1,"axisZ":0,"angleDeg":45}}"#, id));
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert_eq!(v["success"], true, "rotate must succeed; got {}", r);
}

#[test]
fn scale_object_returns_success() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_cube", r#"{"size":1.0}"#));
    let r = ctrl.execute("scale", &format!(r#"{{"objectId":"{}","sx":2.0,"sy":2.0,"sz":2.0}}"#, id));
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert_eq!(v["success"], true, "scale must succeed; got {}", r);
}

#[test]
fn duplicate_creates_second_object_with_new_id() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_cube", r#"{"size":1.0}"#));
    let new_id = object_id_from(&ctrl.execute("duplicate", &format!(r#"{{"objectId":"{}"}}"#, id)));
    assert_ne!(new_id, id, "duplicate must return a new objectId");
    assert_eq!(ctrl.object_count(), 2);
}

#[test]
fn translate_unknown_object_returns_error() {
    let mut ctrl = HeadlessController::new();
    let r = ctrl.execute("translate", r#"{"objectId":"does-not-exist","dx":1,"dy":0,"dz":0}"#);
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert!(v["error"].is_string(), "unknown id must return error; got {}", r);
}

// ── parameter validation ─────────────────────────────────────────────────────

#[test]
fn add_cube_negative_size_returns_error_and_no_object() {
    let mut ctrl = HeadlessController::new();
    let v: serde_json::Value = serde_json::from_str(
        &ctrl.execute("add_cube", r#"{"size":-1.0}"#)).unwrap();
    assert!(v["error"].is_string(), "negative size must return error");
    assert_eq!(ctrl.object_count(), 0);
}

#[test]
fn add_sphere_zero_radius_returns_error() {
    let mut ctrl = HeadlessController::new();
    let v: serde_json::Value = serde_json::from_str(
        &ctrl.execute("add_sphere", r#"{"radius":0.0}"#)).unwrap();
    assert!(v["error"].is_string());
}

#[test]
fn add_torus_minor_greater_than_major_returns_error() {
    let mut ctrl = HeadlessController::new();
    let v: serde_json::Value = serde_json::from_str(
        &ctrl.execute("add_torus", r#"{"majorRadius":0.5,"minorRadius":1.0}"#)).unwrap();
    assert!(v["error"].is_string());
}

#[test]
fn unknown_command_returns_error_json() {
    let mut ctrl = HeadlessController::new();
    let v: serde_json::Value = serde_json::from_str(
        &ctrl.execute("not_a_command", "{}")).unwrap();
    assert!(v["error"].is_string());
}
