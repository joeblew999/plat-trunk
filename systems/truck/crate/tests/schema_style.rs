//! Schema boundary tests — style/state domain.
//!
//! Commands: rename, get_state, get_bim_metadata
//! Rendering-only (headless returns explicit error): select, deselect,
//!   select_at, pick_at, set_camera, set_color, set_style,
//!   get_object_style, pick_mesh_stats
//!
//! Run: cargo test -p truck-webgpu-gui --no-default-features --features native

#![cfg(feature = "native")]

mod common;
use common::object_id_from;
use truck_webgpu_gui::headless::HeadlessController;

#[test]
fn rename_changes_name_visible_in_get_state() {
    let mut ctrl = HeadlessController::new();
    let id = object_id_from(&ctrl.execute("add_cube", r#"{"size":1.0}"#));
    let r = ctrl.execute("rename", &format!(r#"{{"objectId":"{}","name":"MyBox"}}"#, id));
    assert_eq!(serde_json::from_str::<serde_json::Value>(&r).unwrap()["success"], true);

    let state: serde_json::Value = serde_json::from_str(&ctrl.execute("get_state", "{}")).unwrap();
    assert_eq!(state["objectNames"][&id], "MyBox");
}

#[test]
fn get_state_reflects_current_object_count_and_ids() {
    let mut ctrl = HeadlessController::new();
    let id1 = object_id_from(&ctrl.execute("add_cube",   r#"{"size":1.0}"#));
    let id2 = object_id_from(&ctrl.execute("add_sphere", r#"{"radius":1.0}"#));
    let state: serde_json::Value = serde_json::from_str(&ctrl.execute("get_state", "{}")).unwrap();
    assert_eq!(state["objectCount"], 2);
    assert_eq!(state["headless"], true);
    let ids = state["objectIds"].as_array().unwrap();
    assert!(ids.contains(&serde_json::json!(id1)));
    assert!(ids.contains(&serde_json::json!(id2)));
}

#[test]
fn rendering_only_commands_return_error_not_unknown() {
    // These commands are in the schema but require GPU rendering.
    // In headless mode they must return an explicit error (not "Unknown command").
    // Known input → known output: always a JSON error string.
    let rendering_cmds = [
        "select", "deselect", "select_at", "pick_at",
        "set_camera", "set_color", "set_style",
        "get_object_style", "pick_mesh_stats",
    ];
    let mut ctrl = HeadlessController::new();
    for cmd in &rendering_cmds {
        let r = ctrl.execute(cmd, "{}");
        let v: serde_json::Value = serde_json::from_str(&r).unwrap();
        assert!(v["error"].is_string(),
            "rendering-only '{}' must return error in headless; got {}", cmd, r);
        assert!(!v["error"].as_str().unwrap().contains("Unknown command"),
            "'{}' must say 'requires rendering', not 'Unknown command'; got {}", cmd, r);
    }
}
