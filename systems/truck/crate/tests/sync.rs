//! Sync/CRDT tests — multi-user, offline/online scenarios.
//!
//! Tests the integration between truck-sync (Automerge op log) and
//! truck-cad (HeadlessController geometry execution).
//!
//! Mirrors the Playwright cross-tab-sync.spec.ts tests but runs natively
//! in cargo test without a browser.
//!
//! Run: cargo test -p truck-cad --no-default-features --features native

#![cfg(feature = "native")]

mod common;
use common::{make_op, replay};
use truck_sync::core::{apply_op, create_doc, get_ops, merge_docs, set_op_enabled};

// ── single-user op log ───────────────────────────────────────────────────────

#[test]
fn ops_replay_through_geometry_produces_correct_scene() {
    // Known input:  two ops in Automerge doc
    // Known output: 2 objects after replay
    let mut doc: Vec<u8> = vec![];
    doc = apply_op(&doc, &make_op("add_cube",   serde_json::json!({"size": 2.0}))).unwrap();
    doc = apply_op(&doc, &make_op("add_sphere", serde_json::json!({"radius": 1.0}))).unwrap();

    assert_eq!(get_ops(&doc).unwrap().len(), 2);
    assert_eq!(replay(&doc).object_count(), 2);
}

#[test]
fn disabled_op_excluded_from_replay() {
    let op1 = make_op("add_cube",   serde_json::json!({"size": 2.0}));
    let op2 = make_op("add_sphere", serde_json::json!({"radius": 1.0}));
    let op1_id = op1.id.clone();

    let mut doc: Vec<u8> = vec![];
    doc = apply_op(&doc, &op1).unwrap();
    doc = apply_op(&doc, &op2).unwrap();
    doc = set_op_enabled(&doc, &op1_id, false).unwrap();

    // Only sphere replays
    assert_eq!(replay(&doc).object_count(), 1);
}

// ── two users — offline → reconnect ─────────────────────────────────────────

#[test]
fn two_users_offline_concurrent_edits_both_appear_after_merge() {
    // Users A and B start from the same model doc, go offline independently.
    // When they reconnect (merge), both edits appear.
    let base = create_doc();
    let mut doc_a = base.clone();
    let mut doc_b = base.clone();

    doc_a = apply_op(&doc_a, &make_op("add_cube",   serde_json::json!({"size": 1.0}))).unwrap();
    doc_b = apply_op(&doc_b, &make_op("add_sphere", serde_json::json!({"radius": 1.0}))).unwrap();

    let merged = merge_docs(&doc_a, &doc_b).unwrap();
    assert_eq!(replay(&merged).object_count(), 2);
}

#[test]
fn merge_is_commutative() {
    // merge(A, B) and merge(B, A) must produce the same object count.
    let base = create_doc();
    let mut doc_a = base.clone();
    let mut doc_b = base.clone();

    doc_a = apply_op(&doc_a, &make_op("add_cube",   serde_json::json!({"size": 1.0}))).unwrap();
    doc_b = apply_op(&doc_b, &make_op("add_sphere", serde_json::json!({"radius": 1.0}))).unwrap();
    doc_b = apply_op(&doc_b, &make_op("add_torus",  serde_json::json!({"majorRadius": 2.0, "minorRadius": 0.5}))).unwrap();

    let count_ab = replay(&merge_docs(&doc_a, &doc_b).unwrap()).object_count();
    let count_ba = replay(&merge_docs(&doc_b, &doc_a).unwrap()).object_count();
    assert_eq!(count_ab, 3);
    assert_eq!(count_ba, 3, "merge must be commutative");
}

#[test]
fn user_comes_back_online_after_offline_work() {
    // Shared start: 1 cube. A goes offline, B keeps working.
    // A reconnects with its own changes. All 3 objects appear.
    let mut shared: Vec<u8> = vec![];
    shared = apply_op(&shared, &make_op("add_cube", serde_json::json!({"size": 1.0}))).unwrap();

    let mut doc_a = shared.clone();
    let mut doc_b = shared.clone();

    doc_b = apply_op(&doc_b, &make_op("add_cylinder", serde_json::json!({"radius": 0.5, "height": 2.0}))).unwrap();
    doc_a = apply_op(&doc_a, &make_op("add_sphere",   serde_json::json!({"radius": 0.8}))).unwrap();

    let merged = merge_docs(&doc_a, &doc_b).unwrap();
    assert_eq!(replay(&merged).object_count(), 3, "cube + cylinder + sphere");
}

#[test]
fn offline_undo_propagates_through_merge() {
    // A adds a cube. B (offline) disables (undoes) it. B reconnects.
    // After merge, cube op is disabled → empty replay.
    let cube_op = make_op("add_cube", serde_json::json!({"size": 1.0}));
    let cube_op_id = cube_op.id.clone();

    let mut shared: Vec<u8> = vec![];
    shared = apply_op(&shared, &cube_op).unwrap();

    let doc_a = shared.clone();
    let mut doc_b = shared.clone();
    doc_b = set_op_enabled(&doc_b, &cube_op_id, false).unwrap();

    let merged = merge_docs(&doc_a, &doc_b).unwrap();
    assert_eq!(replay(&merged).object_count(), 0, "B's offline undo must propagate");
}

// ── many users, many models ──────────────────────────────────────────────────

#[test]
fn three_models_are_fully_isolated() {
    // 3 separate models (docs) — changes to one must not affect the others.
    let mut model1: Vec<u8> = vec![];
    model1 = apply_op(&model1, &make_op("add_cube", serde_json::json!({"size": 1.0}))).unwrap();

    let mut model2: Vec<u8> = vec![];
    model2 = apply_op(&model2, &make_op("add_sphere",   serde_json::json!({"radius": 1.0}))).unwrap();
    model2 = apply_op(&model2, &make_op("add_cylinder", serde_json::json!({"radius": 0.5, "height": 2.0}))).unwrap();

    let mut model3: Vec<u8> = vec![];
    model3 = apply_op(&model3, &make_op("add_torus", serde_json::json!({"majorRadius": 2.0, "minorRadius": 0.5}))).unwrap();

    assert_eq!(replay(&model1).object_count(), 1, "model1");
    assert_eq!(replay(&model2).object_count(), 2, "model2");
    assert_eq!(replay(&model3).object_count(), 1, "model3");
}

#[test]
fn four_users_across_two_models_correct_counts_and_no_contamination() {
    // Model alpha: users 1+2 offline → merge → 2 objects
    let alpha_base = create_doc();
    let mut alpha_u1 = alpha_base.clone();
    let mut alpha_u2 = alpha_base.clone();
    alpha_u1 = apply_op(&alpha_u1, &make_op("add_cube",   serde_json::json!({"size": 1.0}))).unwrap();
    alpha_u2 = apply_op(&alpha_u2, &make_op("add_sphere", serde_json::json!({"radius": 1.0}))).unwrap();
    let alpha = merge_docs(&alpha_u1, &alpha_u2).unwrap();

    // Model beta: users 3+4 offline → merge → 3 objects
    let beta_base = create_doc();
    let mut beta_u3 = beta_base.clone();
    let mut beta_u4 = beta_base.clone();
    beta_u3 = apply_op(&beta_u3, &make_op("add_cylinder", serde_json::json!({"radius": 0.4, "height": 2.0}))).unwrap();
    beta_u4 = apply_op(&beta_u4, &make_op("add_torus",    serde_json::json!({"majorRadius": 2.0, "minorRadius": 0.5}))).unwrap();
    beta_u4 = apply_op(&beta_u4, &make_op("add_cube",     serde_json::json!({"size": 0.5}))).unwrap();
    let beta = merge_docs(&beta_u3, &beta_u4).unwrap();

    assert_eq!(replay(&alpha).object_count(), 2, "alpha: cube + sphere");
    assert_eq!(replay(&beta).object_count(), 3, "beta: cylinder + torus + cube");

    // No contamination: alpha has no torus
    assert!(get_ops(&alpha).unwrap().iter().all(|op| op.op_type != "add_torus"),
        "alpha must not contain beta's torus");
}
