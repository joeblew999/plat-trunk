//! Schema boundary tests — geometry domain.
//!
//! Commands: add_cube, add_sphere, add_cylinder, add_torus,
//!           translate, rotate, scale, duplicate
//!
//! Tests use the typed param structs from `commands::*` (the codegen source of
//! truth) via the `p()` helper.  Renaming a field in a param struct causes a
//! compile error here — drift between schema and tests is impossible.
//!
//! Run: cargo test -p truck-webgpu-gui --no-default-features --features native

#![cfg(feature = "native")]

mod common;
use common::{object_id_from, p};
use truck_webgpu_gui::headless::HeadlessController;
use truck_webgpu_gui::commands::{
    AddCubeParams, AddSphereParams, AddCylinderParams, AddTorusParams,
    TranslateParams, RotateParams, ScaleParams, ObjectIdParam,
};

// ── primitives ───────────────────────────────────────────────────────────────

#[test]
fn add_cube_returns_object_id_and_count_is_1() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_cube", &p(AddCubeParams { size: 2.0 })));
    assert!(!id.is_empty());
    assert_eq!(ctrl.object_count(), 1);
    assert_eq!(ctrl.object_ids(), vec![id]);
}

#[test]
fn add_sphere_returns_object_id_and_count_is_1() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_sphere", &p(AddSphereParams { radius: 1.5 })));
    assert!(!id.is_empty());
    assert_eq!(ctrl.object_count(), 1);
}

#[test]
fn add_cylinder_returns_object_id_and_count_is_1() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_cylinder",
        &p(AddCylinderParams { radius: 0.5, height: 2.0 })));
    assert!(!id.is_empty());
    assert_eq!(ctrl.object_count(), 1);
}

#[test]
fn add_torus_returns_object_id_and_count_is_1() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_torus",
        &p(AddTorusParams { major_radius: 2.0, minor_radius: 0.5 })));
    assert!(!id.is_empty());
    assert_eq!(ctrl.object_count(), 1);
}

#[test]
fn add_two_primitives_count_is_2() {
    let mut ctrl = HeadlessController::new();
    ctrl.execute("add_cube",     &p(AddCubeParams { size: 1.0 }));
    ctrl.execute("add_cylinder", &p(AddCylinderParams { radius: 0.4, height: 2.0 }));
    assert_eq!(ctrl.object_count(), 2);
}

// ── transforms ───────────────────────────────────────────────────────────────

#[test]
fn translate_moves_object_returns_success() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_cube", &p(AddCubeParams { size: 1.0 })));
    let r = ctrl.execute("translate", &p(TranslateParams {
        object_id: id, dx: 1.0, dy: 2.0, dz: 3.0,
    }));
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert_eq!(v["success"], true, "translate must succeed; got {}", r);
    assert_eq!(ctrl.object_count(), 1, "translate must not change count");
}

#[test]
fn rotate_object_returns_success() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_cube", &p(AddCubeParams { size: 1.0 })));
    let r = ctrl.execute("rotate", &p(RotateParams {
        object_id: id, axis_x: 0.0, axis_y: 1.0, axis_z: 0.0, angle_deg: 45.0,
    }));
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert_eq!(v["success"], true, "rotate must succeed; got {}", r);
}

#[test]
fn scale_object_returns_success() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_cube", &p(AddCubeParams { size: 1.0 })));
    let r = ctrl.execute("scale", &p(ScaleParams {
        object_id: id, sx: 2.0, sy: 2.0, sz: 2.0,
    }));
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert_eq!(v["success"], true, "scale must succeed; got {}", r);
}

#[test]
fn duplicate_creates_second_object_with_new_id() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_cube", &p(AddCubeParams { size: 1.0 })));
    let new_id = object_id_from(&ctrl.execute("duplicate",
        &p(ObjectIdParam { object_id: id.clone() })));
    assert_ne!(new_id, id, "duplicate must return a new objectId");
    assert_eq!(ctrl.object_count(), 2);
}

#[test]
fn translate_unknown_object_returns_error() {
    let mut ctrl = HeadlessController::new();
    let r = ctrl.execute("translate", &p(TranslateParams {
        object_id: "does-not-exist".into(), dx: 1.0, dy: 0.0, dz: 0.0,
    }));
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert!(v["error"].is_string(), "unknown id must return error; got {}", r);
}

// ── parameter validation ─────────────────────────────────────────────────────

#[test]
fn add_cube_negative_size_returns_error_and_no_object() {
    let mut ctrl = HeadlessController::new();
    let v: serde_json::Value = serde_json::from_str(
        &ctrl.execute("add_cube", &p(AddCubeParams { size: -1.0 }))).unwrap();
    assert!(v["error"].is_string(), "negative size must return error");
    assert_eq!(ctrl.object_count(), 0);
}

#[test]
fn add_sphere_zero_radius_returns_error() {
    let mut ctrl = HeadlessController::new();
    let v: serde_json::Value = serde_json::from_str(
        &ctrl.execute("add_sphere", &p(AddSphereParams { radius: 0.0 }))).unwrap();
    assert!(v["error"].is_string());
}

#[test]
fn add_torus_minor_greater_than_major_returns_error() {
    let mut ctrl = HeadlessController::new();
    let v: serde_json::Value = serde_json::from_str(
        &ctrl.execute("add_torus", &p(AddTorusParams {
            major_radius: 0.5, minor_radius: 1.0,
        }))).unwrap();
    assert!(v["error"].is_string());
}

#[test]
fn unknown_command_returns_error_json() {
    let mut ctrl = HeadlessController::new();
    let v: serde_json::Value = serde_json::from_str(
        &ctrl.execute("not_a_command", "{}")).unwrap();
    assert!(v["error"].is_string());
}
