//! Shared helpers for schema-level integration tests.
//! Include with `mod common;` in each test file.

#![allow(dead_code)]

use truck_webgpu_gui::headless::HeadlessController;
use truck_sync::Op;

/// Extract objectId from a HeadlessController::execute JSON response.
pub fn object_id_from(json: &str) -> String {
    let v: serde_json::Value = serde_json::from_str(json).expect("bad JSON");
    v["objectId"]
        .as_str()
        .unwrap_or_else(|| panic!("no objectId in: {}", json))
        .to_string()
}

/// Build a truck-sync Op with a random id.
pub fn make_op(op_type: &str, params: serde_json::Value) -> Op {
    Op {
        id: uuid::Uuid::new_v4().to_string(),
        op_type: op_type.to_string(),
        params,
        enabled: true,
        timestamp: 0,
        actor_id: "test".to_string(),
        group_id: None,
    }
}

/// Replay all enabled ops from a doc through a fresh HeadlessController.
pub fn replay(doc_bytes: &[u8]) -> HeadlessController {
    let ops = truck_sync::core::get_ops(doc_bytes).unwrap();
    let mut ctrl = HeadlessController::new();
    for op in &ops {
        if op.enabled {
            ctrl.execute(&op.op_type, &op.params.to_string());
        }
    }
    ctrl
}
