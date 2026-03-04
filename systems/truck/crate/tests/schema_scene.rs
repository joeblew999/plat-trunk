//! Schema boundary tests — scene (control plane) domain.
//!
//! Commands: clear, delete, export_scene, import_scene,
//!           export_step, export_obj, export_stl
//!
//! Run: cargo test -p truck-webgpu-gui --no-default-features --features native

#![cfg(feature = "native")]

mod common;
use common::object_id_from;
use truck_webgpu_gui::headless::HeadlessController;

#[test]
fn clear_resets_scene_to_zero_objects() {
    let mut ctrl = HeadlessController::new();
    ctrl.execute("add_cube", r#"{"size":1.0}"#);
    ctrl.execute("add_sphere", r#"{"radius":1.0}"#);
    assert_eq!(ctrl.object_count(), 2);
    ctrl.execute("clear", "{}");
    assert_eq!(ctrl.object_count(), 0);
}

#[test]
fn delete_removes_exactly_one_object() {
    let mut ctrl = HeadlessController::new();
    let id_a = object_id_from(&ctrl.execute("add_cube",   r#"{"size":1.0}"#));
    let _id_b = object_id_from(&ctrl.execute("add_sphere", r#"{"radius":1.0}"#));
    assert_eq!(ctrl.object_count(), 2);
    ctrl.execute("delete", &format!(r#"{{"objectId":"{}"}}"#, id_a));
    assert_eq!(ctrl.object_count(), 1);
    assert!(!ctrl.object_ids().contains(&id_a), "deleted id must be gone");
}

#[test]
fn export_scene_then_import_scene_round_trip_restores_count() {
    // Known input:  2 objects → export → fresh controller → import
    // Known output: 2 objects restored
    let mut ctrl = HeadlessController::new();
    object_id_from(&ctrl.execute("add_cube",   r#"{"size":1.0}"#));
    object_id_from(&ctrl.execute("add_sphere", r#"{"radius":0.5}"#));

    let export_v: serde_json::Value = serde_json::from_str(
        &ctrl.execute("export_scene", "{}")).unwrap();
    let scene_json = export_v["scene"].as_str()
        .unwrap_or_else(|| panic!("export_scene must return scene string"));
    assert!(!scene_json.is_empty());

    let mut ctrl2 = HeadlessController::new();
    let import_v: serde_json::Value = serde_json::from_str(
        &ctrl2.execute("import_scene", &format!(r#"{{"json":{}}}"#,
            serde_json::to_string(scene_json).unwrap()))).unwrap();
    assert_eq!(import_v["success"], true);
    assert_eq!(ctrl2.object_count(), 2);
}

#[test]
fn export_step_returns_iso_step_header() {
    let mut ctrl = HeadlessController::new();
    object_id_from(&ctrl.execute("add_cube", r#"{"size":1.0}"#));
    let v: serde_json::Value = serde_json::from_str(&ctrl.execute("export_step", "{}")).unwrap();
    let step = v["step"].as_str().unwrap_or("");
    assert!(!step.is_empty(), "export_step must return data");
    assert!(step.contains("ISO-10303"), "STEP must contain ISO-10303 header");
}

#[test]
fn export_obj_returns_non_empty_wavefront_data() {
    let mut ctrl = HeadlessController::new();
    object_id_from(&ctrl.execute("add_cube", r#"{"size":1.0}"#));
    let v: serde_json::Value = serde_json::from_str(&ctrl.execute("export_obj", "{}")).unwrap();
    assert!(!v["obj"].as_str().unwrap_or("").is_empty(), "export_obj must return data");
}

#[test]
fn export_stl_returns_non_empty_data() {
    let mut ctrl = HeadlessController::new();
    object_id_from(&ctrl.execute("add_cube", r#"{"size":1.0}"#));
    let v: serde_json::Value = serde_json::from_str(&ctrl.execute("export_stl", "{}")).unwrap();
    assert!(!v["stl"].as_str().unwrap_or("").is_empty(), "export_stl must return data");
}
