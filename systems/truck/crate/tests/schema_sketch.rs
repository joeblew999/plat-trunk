//! Schema boundary tests — sketch domain.
//!
//! Commands: begin_sketch, sketch_add_point, sketch_add_edge,
//!           sketch_solve, sketch_export, sketch_cancel, sketch_extrude
//!
//! Run: cargo test -p truck-webgpu-gui --no-default-features --features native

#![cfg(feature = "native")]

mod common;
use common::object_id_from;
use truck_webgpu_gui::headless::HeadlessController;

/// Build a unit-square sketch and extrude it. Returns the result objectId.
fn extruded_square(ctrl: &mut HeadlessController, height: f64) -> String {
    ctrl.execute("begin_sketch", r#"{"plane":"xy"}"#);
    let p0 = point_id(ctrl, 0.0, 0.0);
    let p1 = point_id(ctrl, 1.0, 0.0);
    let p2 = point_id(ctrl, 1.0, 1.0);
    let p3 = point_id(ctrl, 0.0, 1.0);
    ctrl.execute("sketch_add_edge", &fmt_edge(&p0, &p1));
    ctrl.execute("sketch_add_edge", &fmt_edge(&p1, &p2));
    ctrl.execute("sketch_add_edge", &fmt_edge(&p2, &p3));
    ctrl.execute("sketch_add_edge", &fmt_edge(&p3, &p0));

    let export_r = ctrl.execute("sketch_export", "{}");
    let export_v: serde_json::Value = serde_json::from_str(&export_r).unwrap();
    let sketch_json = export_v["sketchJson"].as_str()
        .unwrap_or_else(|| panic!("sketch_export must return sketchJson; got {}", export_r));

    object_id_from(&ctrl.execute("sketch_extrude", &format!(
        r#"{{"sketchJson":{},"height":{}}}"#,
        serde_json::to_string(sketch_json).unwrap(), height)))
}

fn point_id(ctrl: &mut HeadlessController, x: f64, y: f64) -> String {
    let r = ctrl.execute("sketch_add_point", &format!(r#"{{"x":{},"y":{}}}"#, x, y));
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    v["pointId"].as_str().unwrap_or_else(|| panic!("sketch_add_point failed: {}", r)).to_string()
}

fn fmt_edge(p0: &str, p1: &str) -> String {
    format!(r#"{{"p0Id":"{}","p1Id":"{}"}}"#, p0, p1)
}

// ── tests ────────────────────────────────────────────────────────────────────

#[test]
fn sketch_extrude_unit_square_returns_object_id_and_count_1() {
    // Known input:  1×1 square in XY plane, height=2.0
    // Known output: objectId returned, object_count() == 1
    let mut ctrl = HeadlessController::new();
    let id = extruded_square(&mut ctrl, 2.0);
    assert!(!id.is_empty(), "sketch_extrude must return objectId");
    assert_eq!(ctrl.object_count(), 1);
}

#[test]
fn begin_sketch_returns_sketch_id() {
    let mut ctrl = HeadlessController::new();
    let r = ctrl.execute("begin_sketch", r#"{"plane":"xy"}"#);
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert!(v["sketchId"].is_string(), "begin_sketch must return sketchId; got {}", r);
}

#[test]
fn sketch_add_point_returns_point_id() {
    let mut ctrl = HeadlessController::new();
    ctrl.execute("begin_sketch", r#"{"plane":"xy"}"#);
    let r = ctrl.execute("sketch_add_point", r#"{"x":1.0,"y":2.0}"#);
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert!(v["pointId"].is_string(), "sketch_add_point must return pointId; got {}", r);
}

#[test]
fn sketch_add_edge_returns_edge_id() {
    let mut ctrl = HeadlessController::new();
    ctrl.execute("begin_sketch", r#"{"plane":"xy"}"#);
    let p0 = point_id(&mut ctrl, 0.0, 0.0);
    let p1 = point_id(&mut ctrl, 1.0, 0.0);
    let r = ctrl.execute("sketch_add_edge", &fmt_edge(&p0, &p1));
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert!(v["edgeId"].is_string(), "sketch_add_edge must return edgeId; got {}", r);
}

#[test]
fn sketch_cancel_removes_active_sketch() {
    let mut ctrl = HeadlessController::new();
    ctrl.execute("begin_sketch", r#"{"plane":"xy"}"#);
    let r = ctrl.execute("sketch_cancel", "{}");
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert_eq!(v["success"], true, "sketch_cancel must succeed; got {}", r);
    // After cancel, add_point should error (no active sketch)
    let r2 = ctrl.execute("sketch_add_point", r#"{"x":0,"y":0}"#);
    let v2: serde_json::Value = serde_json::from_str(&r2).unwrap();
    assert!(v2["error"].is_string(), "add_point after cancel must error; got {}", r2);
}

#[test]
fn sketch_export_returns_sketch_json() {
    let mut ctrl = HeadlessController::new();
    ctrl.execute("begin_sketch", r#"{"plane":"xz"}"#);
    point_id(&mut ctrl, 0.0, 0.0);
    let r = ctrl.execute("sketch_export", "{}");
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert!(v["sketchJson"].is_string(), "sketch_export must return sketchJson; got {}", r);
}

#[test]
fn sketch_no_active_sketch_returns_error() {
    let mut ctrl = HeadlessController::new();
    // No begin_sketch called
    let r = ctrl.execute("sketch_add_point", r#"{"x":0,"y":0}"#);
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    assert!(v["error"].is_string(), "add_point without active sketch must error; got {}", r);
}
