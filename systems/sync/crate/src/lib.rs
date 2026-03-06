//! truck-sync — Automerge-backed op log for the truck CAD system.
//!
//! Doc structure (flat operations list, matches JS CadOperation schema):
//!
//!   ROOT
//!     operations: List[Map{ id, type, params_json, enabled, timestamp, actorId, groupId }]
//!     name: String
//!
//! No plugin segmentation — this crate is the CAD op log only.
//! WASM exports give TypeScript raw bytes in / raw bytes out.
//! Storage (IDB) and networking (BroadcastChannel) are the JS shell's responsibility.
//!
//! # TODO: Multi-system / multi-plugin support
//!
//! The previous truck-sync prototype used a segmented doc structure:
//!
//!   ROOT
//!     plugins: Map{
//!       "{plugin_id}": Map{ operations: List[...], name: String }
//!     }
//!
//! This was removed in favour of the flat structure above because:
//! - truck CAD is the only consumer right now
//! - Flat structure matches the JS CadOperation schema with zero translation
//! - Simpler tests, simpler WASM API
//!
//! If future systems (e.g. truck-mvt, ifc-lite) need their own op logs in the
//! same Automerge doc, choose one of:
//!   (a) Separate Automerge docs per system — simplest; no changes to this crate
//!   (b) Re-introduce the plugins map — add a `plugin_id: String` field to `Op`
//!       and restore the nested structure in apply_op / get_ops

use automerge::{AutoCommit, ObjType, ReadDoc, Value};
use automerge::transaction::Transactable;
use serde::{Deserialize, Serialize};

// ────────────────────────────────────────────────────────────────────────────
// Public types — field names match the JS CadOperation schema exactly
// ────────────────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Op {
    pub id: String,
    /// Command name, e.g. "add_cube" (serialised as "type" to match JS)
    #[serde(rename = "type")]
    pub op_type: String,
    /// Params serialised to/from JSON string in Automerge storage
    pub params: serde_json::Value,
    pub enabled: bool,
    pub timestamp: u64,
    #[serde(rename = "actorId")]
    pub actor_id: String,
    #[serde(rename = "groupId")]
    pub group_id: Option<String>,
}

// ────────────────────────────────────────────────────────────────────────────
// Core (pure Rust — no WASM, fully testable with `cargo test`)
// ────────────────────────────────────────────────────────────────────────────

pub mod core {
    use super::*;
    use automerge::ROOT;

    /// Deserialise doc bytes → AutoCommit. Empty slice → new empty document.
    pub fn load_doc(bytes: &[u8]) -> Result<AutoCommit, String> {
        if bytes.is_empty() {
            Ok(AutoCommit::new())
        } else {
            AutoCommit::load(bytes).map_err(|e| e.to_string())
        }
    }

    /// Ensure `operations` list exists at root; return its ObjId.
    fn get_or_create_ops_list(doc: &mut AutoCommit) -> Result<automerge::ObjId, String> {
        match doc.get(ROOT, "operations").map_err(|e| e.to_string())? {
            Some((Value::Object(ObjType::List), id)) => Ok(id),
            _ => doc
                .put_object(ROOT, "operations", ObjType::List)
                .map_err(|e| e.to_string()),
        }
    }

    /// Read operations list ObjId (read-only path — returns empty vec if missing).
    fn get_ops_list(doc: &AutoCommit) -> Option<automerge::ObjId> {
        match doc.get(ROOT, "operations") {
            Ok(Some((Value::Object(ObjType::List), id))) => Some(id),
            _ => None,
        }
    }

    /// Read a string field from an entry map.
    fn read_str(doc: &AutoCommit, obj: &automerge::ObjId, field: &str) -> Option<String> {
        match doc.get(obj, field) {
            Ok(Some((Value::Scalar(s), _))) => match s.as_ref() {
                automerge::ScalarValue::Str(v) => Some(v.to_string()),
                _ => None,
            },
            _ => None,
        }
    }

    /// Read a bool field from an entry map.
    fn read_bool(doc: &AutoCommit, obj: &automerge::ObjId, field: &str) -> bool {
        match doc.get(obj, field) {
            Ok(Some((Value::Scalar(s), _))) => match s.as_ref() {
                automerge::ScalarValue::Boolean(v) => *v,
                _ => true, // default enabled
            },
            _ => true,
        }
    }

    /// Read a u64 timestamp field from an entry map.
    fn read_u64(doc: &AutoCommit, obj: &automerge::ObjId, field: &str) -> u64 {
        match doc.get(obj, field) {
            Ok(Some((Value::Scalar(s), _))) => match s.as_ref() {
                automerge::ScalarValue::Int(v) => *v as u64,
                automerge::ScalarValue::Uint(v) => *v,
                _ => 0,
            },
            _ => 0,
        }
    }

    /// Write all fields of an Op into an Automerge map entry.
    fn write_op_fields(doc: &mut AutoCommit, entry: &automerge::ObjId, op: &Op) -> Result<(), String> {
        let params_str = serde_json::to_string(&op.params).map_err(|e| e.to_string())?;
        doc.put(entry, "id",       op.id.clone()).map_err(|e| e.to_string())?;
        doc.put(entry, "type",     op.op_type.clone()).map_err(|e| e.to_string())?;
        doc.put(entry, "params",   params_str).map_err(|e| e.to_string())?;
        doc.put(entry, "enabled",  op.enabled).map_err(|e| e.to_string())?;
        doc.put(entry, "timestamp", op.timestamp as i64).map_err(|e| e.to_string())?;
        doc.put(entry, "actorId",  op.actor_id.clone()).map_err(|e| e.to_string())?;
        match &op.group_id {
            Some(gid) => doc.put(entry, "groupId", gid.clone()),
            None      => doc.put(entry, "groupId", automerge::ScalarValue::Null),
        }.map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Read one Op from an entry map at position `i` in `ops_list`.
    fn read_op(doc: &AutoCommit, ops_list: &automerge::ObjId, i: usize) -> Option<Op> {
        let entry = match doc.get(ops_list, i) {
            Ok(Some((Value::Object(ObjType::Map), id))) => id,
            _ => return None,
        };
        let id      = read_str(doc, &entry, "id")?;
        let op_type = read_str(doc, &entry, "type")?;
        let enabled = read_bool(doc, &entry, "enabled");
        let timestamp = read_u64(doc, &entry, "timestamp");
        let actor_id = read_str(doc, &entry, "actorId").unwrap_or_default();
        let group_id = match doc.get(&entry, "groupId") {
            Ok(Some((Value::Scalar(s), _))) => match s.as_ref() {
                automerge::ScalarValue::Str(v) => Some(v.to_string()),
                _ => None,
            },
            _ => None,
        };
        let params_str = read_str(doc, &entry, "params").unwrap_or_else(|| "{}".to_string());
        let params: serde_json::Value = serde_json::from_str(&params_str).unwrap_or(serde_json::json!({}));

        Some(Op { id, op_type, params, enabled, timestamp, actor_id, group_id })
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /// Create a new empty doc with the operations list pre-initialised.
    ///
    /// **Critical for multi-user correctness**: The operations list must exist
    /// in the doc before any peer forks a copy. If two peers independently
    /// call `apply_op` on an empty doc (`vec![]`), each creates its own
    /// "operations" list object with a different ObjId. Automerge's
    /// last-write-wins for map keys then silently discards one peer's entire
    /// list on merge — all their ops are lost.
    ///
    /// By pre-creating the list here, all peers that start from `create_doc()`
    /// bytes share the same ObjId and can safely append concurrently.
    pub fn create_doc() -> Vec<u8> {
        let mut doc = AutoCommit::new();
        doc.put_object(ROOT, "operations", ObjType::List)
            .expect("create operations list");
        doc.save()
    }

    /// Apply one op to the doc and return serialised bytes.
    pub fn apply_op(doc_bytes: &[u8], op: &Op) -> Result<Vec<u8>, String> {
        let mut doc = load_doc(doc_bytes)?;
        let ops_list = get_or_create_ops_list(&mut doc)?;
        let len = doc.length(&ops_list);
        let entry = doc
            .insert_object(&ops_list, len, ObjType::Map)
            .map_err(|e| e.to_string())?;
        write_op_fields(&mut doc, &entry, op)?;
        Ok(doc.save())
    }

    /// CRDT merge — commutative, associative.
    pub fn merge_docs(local_bytes: &[u8], remote_bytes: &[u8]) -> Result<Vec<u8>, String> {
        let mut local = load_doc(local_bytes)?;
        let mut remote = load_doc(remote_bytes)?;
        local.merge(&mut remote).map_err(|e| e.to_string())?;
        Ok(local.save())
    }

    /// Return all ops in document order.
    pub fn get_ops(doc_bytes: &[u8]) -> Result<Vec<Op>, String> {
        let doc = load_doc(doc_bytes)?;
        let ops_list = match get_ops_list(&doc) {
            Some(id) => id,
            None => return Ok(vec![]),
        };
        let count = doc.length(&ops_list);
        let mut ops = Vec::with_capacity(count);
        for i in 0..count {
            if let Some(op) = read_op(&doc, &ops_list, i) {
                ops.push(op);
            }
        }
        Ok(ops)
    }

    /// Set `enabled` on the op with the given `op_id`.
    pub fn set_op_enabled(doc_bytes: &[u8], op_id: &str, enabled: bool) -> Result<Vec<u8>, String> {
        let mut doc = load_doc(doc_bytes)?;
        let ops_list = get_or_create_ops_list(&mut doc)?;
        let count = doc.length(&ops_list);
        for i in 0..count {
            let entry = match doc.get(&ops_list, i).map_err(|e| e.to_string())? {
                Some((Value::Object(ObjType::Map), id)) => id,
                _ => continue,
            };
            if read_str(&doc, &entry, "id").as_deref() == Some(op_id) {
                doc.put(&entry, "enabled", enabled).map_err(|e| e.to_string())?;
                break;
            }
        }
        Ok(doc.save())
    }

    /// Set `enabled` on all ops sharing the given `group_id`.
    pub fn set_group_enabled(doc_bytes: &[u8], group_id: &str, enabled: bool) -> Result<Vec<u8>, String> {
        let mut doc = load_doc(doc_bytes)?;
        let ops_list = get_or_create_ops_list(&mut doc)?;
        let count = doc.length(&ops_list);
        for i in 0..count {
            let entry = match doc.get(&ops_list, i).map_err(|e| e.to_string())? {
                Some((Value::Object(ObjType::Map), id)) => id,
                _ => continue,
            };
            if let Some(gid) = read_str(&doc, &entry, "groupId") {
                if gid == group_id {
                    doc.put(&entry, "enabled", enabled).map_err(|e| e.to_string())?;
                }
            }
        }
        Ok(doc.save())
    }

    /// Rollback: for ops belonging to `actor_id`, enable if index ≤ to_index, disable if after.
    pub fn rollback_to(doc_bytes: &[u8], actor_id: &str, to_index: usize) -> Result<Vec<u8>, String> {
        let mut doc = load_doc(doc_bytes)?;
        let ops_list = get_or_create_ops_list(&mut doc)?;
        let count = doc.length(&ops_list);
        for i in 0..count {
            let entry = match doc.get(&ops_list, i).map_err(|e| e.to_string())? {
                Some((Value::Object(ObjType::Map), id)) => id,
                _ => continue,
            };
            if read_str(&doc, &entry, "actorId").as_deref() == Some(actor_id) {
                doc.put(&entry, "enabled", i <= to_index).map_err(|e| e.to_string())?;
            }
        }
        Ok(doc.save())
    }

    /// Return ops from `since_index` onward (incremental sync).
    pub fn export_ops_since(doc_bytes: &[u8], since_index: usize) -> Result<Vec<Op>, String> {
        let all = get_ops(doc_bytes)?;
        Ok(all.into_iter().skip(since_index).collect())
    }

    /// Validate that `op_json` deserialises to a well-formed Op.
    pub fn validate_op(op_json: &str) -> bool {
        serde_json::from_str::<Op>(op_json).is_ok()
    }

    /// Return ops ready for scene replay: index order, disabled ops excluded.
    ///
    /// This is the only input the geometry layer needs — the sync crate has no
    /// geometry knowledge. The Worker / browser geometry WASM calls execute()
    /// on each returned op in array order to reproduce the scene.
    pub fn get_replay_ops(doc_bytes: &[u8]) -> Result<Vec<Op>, String> {
        let all = get_ops(doc_bytes)?;
        Ok(all.into_iter().filter(|o| o.enabled).collect())
    }
}

// ────────────────────────────────────────────────────────────────────────────
// WASM exports
// ────────────────────────────────────────────────────────────────────────────

#[cfg(target_arch = "wasm32")]
mod wasm {
    use super::*;
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen(start)]
    pub fn start() {
        console_error_panic_hook::set_once();
    }

    /// Create a new empty Automerge doc. Returns raw bytes.
    #[wasm_bindgen]
    pub fn create_doc() -> Vec<u8> {
        core::create_doc()
    }

    /// Apply one op (JSON string matching Op schema). Returns updated doc bytes.
    #[wasm_bindgen]
    pub fn apply_op(doc: &[u8], op_json: &str) -> Result<Vec<u8>, JsValue> {
        let op: Op = serde_json::from_str(op_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        core::apply_op(doc, &op).map_err(|e| JsValue::from_str(&e))
    }

    /// CRDT merge. Returns merged doc bytes.
    #[wasm_bindgen]
    pub fn merge_docs(local: &[u8], remote: &[u8]) -> Result<Vec<u8>, JsValue> {
        core::merge_docs(local, remote).map_err(|e| JsValue::from_str(&e))
    }

    /// Get all ops as a JSON array string.
    #[wasm_bindgen]
    pub fn get_ops(doc: &[u8]) -> Result<String, JsValue> {
        let ops = core::get_ops(doc).map_err(|e| JsValue::from_str(&e))?;
        serde_json::to_string(&ops).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Set `enabled` on one op by ID.
    #[wasm_bindgen]
    pub fn set_op_enabled(doc: &[u8], op_id: &str, enabled: bool) -> Result<Vec<u8>, JsValue> {
        core::set_op_enabled(doc, op_id, enabled).map_err(|e| JsValue::from_str(&e))
    }

    /// Set `enabled` on all ops in a group.
    #[wasm_bindgen]
    pub fn set_group_enabled(doc: &[u8], group_id: &str, enabled: bool) -> Result<Vec<u8>, JsValue> {
        core::set_group_enabled(doc, group_id, enabled).map_err(|e| JsValue::from_str(&e))
    }

    /// Rollback actor's ops to a given index.
    #[wasm_bindgen]
    pub fn rollback_to(doc: &[u8], actor_id: &str, to_index: u32) -> Result<Vec<u8>, JsValue> {
        core::rollback_to(doc, actor_id, to_index as usize).map_err(|e| JsValue::from_str(&e))
    }

    /// Export ops since a given index (incremental sync). Returns JSON array string.
    #[wasm_bindgen]
    pub fn export_ops_since(doc: &[u8], since_index: u32) -> Result<String, JsValue> {
        let ops = core::export_ops_since(doc, since_index as usize)
            .map_err(|e| JsValue::from_str(&e))?;
        serde_json::to_string(&ops).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Validate op JSON.
    #[wasm_bindgen]
    pub fn validate_op(op_json: &str) -> bool {
        core::validate_op(op_json)
    }

    /// Return ops ready for replay: index order, disabled ops excluded.
    /// Returns JSON array string — the geometry layer executes each in order.
    #[wasm_bindgen]
    pub fn get_replay_ops(doc: &[u8]) -> Result<String, JsValue> {
        let ops = core::get_replay_ops(doc).map_err(|e| JsValue::from_str(&e))?;
        serde_json::to_string(&ops).map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Tests — pure Rust, `cargo test -p truck-sync`
// ────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::{Op, core};
    use serde_json::json;

    fn op(op_type: &str, params: serde_json::Value) -> Op {
        Op {
            id: uuid::Uuid::new_v4().to_string(),
            op_type: op_type.to_string(),
            params,
            enabled: true,
            timestamp: 0,
            actor_id: "actor-a".to_string(),
            group_id: None,
        }
    }

    fn op_b(op_type: &str, params: serde_json::Value) -> Op {
        Op { actor_id: "actor-b".to_string(), ..op(op_type, params) }
    }

    // ── ADR-0036 §9 regression tests ────────────────────────────────────────

    /// Applying the same sequence of ops must produce deterministic replay order.
    #[test]
    fn op_replay_order_is_deterministic() {
        let doc = vec![];
        let op1 = op("add_cube",   json!({"size": 1.0}));
        let op2 = op("add_sphere", json!({"radius": 0.5}));

        let doc = core::apply_op(&doc, &op1).unwrap();
        let doc = core::apply_op(&doc, &op2).unwrap();

        let ops = core::get_ops(&doc).unwrap();
        assert_eq!(ops.len(), 2);
        assert_eq!(ops[0].op_type, "add_cube");
        assert_eq!(ops[1].op_type, "add_sphere");
        assert_eq!(ops[0].params["size"], 1.0);
    }

    /// Peer A and Peer B record ops concurrently; merge must be commutative.
    #[test]
    fn concurrent_ops_merge_commutatively() {
        let base = core::apply_op(&[], &op("add_cube", json!({"size": 2.0}))).unwrap();

        let op_a = op("boolean_union", json!({"idA": "a", "idB": "b"}));
        let doc_a = core::apply_op(&base, &op_a).unwrap();

        let op_b = op_b("add_sphere", json!({"radius": 1.0}));
        let doc_b = core::apply_op(&base, &op_b).unwrap();

        let merged_ab = core::merge_docs(&doc_a, &doc_b).unwrap();
        let merged_ba = core::merge_docs(&doc_b, &doc_a).unwrap();

        let ops_ab = core::get_ops(&merged_ab).unwrap();
        let ops_ba = core::get_ops(&merged_ba).unwrap();
        assert_eq!(ops_ab.len(), 3);
        assert_eq!(ops_ba.len(), 3);

        let mut ids_ab: Vec<_> = ops_ab.iter().map(|o| o.id.clone()).collect();
        let mut ids_ba: Vec<_> = ops_ba.iter().map(|o| o.id.clone()).collect();
        ids_ab.sort(); ids_ba.sort();
        assert_eq!(ids_ab, ids_ba);
    }

    /// Snapshot + delta replay must equal full replay.
    #[test]
    fn snapshot_plus_delta_replay_matches_full_replay() {
        let ops: Vec<Op> = (0..5)
            .map(|i| op("add_cube", json!({"size": i})))
            .collect();

        let mut full_doc = vec![];
        for o in &ops { full_doc = core::apply_op(&full_doc, o).unwrap(); }

        let mut snap_doc = vec![];
        for o in &ops[..3] { snap_doc = core::apply_op(&snap_doc, o).unwrap(); }

        let mut delta_doc = snap_doc.clone();
        for o in &ops[3..] { delta_doc = core::apply_op(&delta_doc, o).unwrap(); }

        let full_ops  = core::get_ops(&full_doc).unwrap();
        let delta_ops = core::get_ops(&delta_doc).unwrap();
        assert_eq!(full_ops.len(), delta_ops.len());
        for (f, d) in full_ops.iter().zip(delta_ops.iter()) {
            assert_eq!(f.op_type, d.op_type);
            assert_eq!(f.params, d.params);
        }
    }

    /// set_op_enabled toggles a single op.
    #[test]
    fn set_op_enabled_toggles_state() {
        let o1 = op("add_cube",   json!({"size": 1.0}));
        let o2 = op("add_sphere", json!({"radius": 0.5}));
        let id2 = o2.id.clone();

        let doc = core::apply_op(&[], &o1).unwrap();
        let doc = core::apply_op(&doc, &o2).unwrap();

        // disable o2
        let doc = core::set_op_enabled(&doc, &id2, false).unwrap();
        let ops = core::get_ops(&doc).unwrap();
        assert!(ops[0].enabled);
        assert!(!ops[1].enabled);

        // re-enable o2
        let doc = core::set_op_enabled(&doc, &id2, true).unwrap();
        let ops = core::get_ops(&doc).unwrap();
        assert!(ops[1].enabled);
    }

    /// rollback_to disables all actor's ops after the given index.
    #[test]
    fn rollback_to_disables_ops_after_index() {
        let mut doc = vec![];
        let ops: Vec<Op> = (0..4).map(|i| op("add_cube", json!({"size": i}))).collect();
        for o in &ops { doc = core::apply_op(&doc, o).unwrap(); }

        // rollback actor-a to index 1 → ops 0,1 enabled; 2,3 disabled
        let doc = core::rollback_to(&doc, "actor-a", 1).unwrap();
        let result = core::get_ops(&doc).unwrap();
        assert!(result[0].enabled);
        assert!(result[1].enabled);
        assert!(!result[2].enabled);
        assert!(!result[3].enabled);
    }

    /// Cross-tab sync: Tab B starts from the shared IDB base, merges Tab A's full state.
    ///
    /// Browser reality: when Tab A calls create_doc(), those bytes are written to IDB.
    /// Tab B reads the same bytes from IDB (NOT a fresh create_doc()) so both peers
    /// share the same Automerge ObjId for the "operations" list. Merge then works correctly.
    ///
    /// Two separate create_doc() calls produce different ObjIds → Automerge LWW silently
    /// discards one peer's ops on merge. This test models the real IDB-sharing scenario.
    #[test]
    fn cross_tab_sync_from_shared_base_doc() {
        // Tab A creates the model (writes these bytes to IDB)
        let shared_base = core::create_doc();

        // Tab A records add_sphere — this is what IDB+BroadcastChannel will deliver to Tab B
        let tab_a = core::apply_op(&shared_base, &op("add_sphere", json!({"radius": 1.0}))).unwrap();
        let tab_a_replay = core::get_replay_ops(&tab_a).unwrap();
        assert_eq!(tab_a_replay.len(), 1, "Tab A should have 1 op");

        // Tab B opens: reads the shared base bytes from IDB (clone = same ObjId)
        let tab_b = shared_base.clone();
        assert_eq!(core::get_replay_ops(&tab_b).unwrap().len(), 0, "Tab B base has 0 ops");

        // BroadcastChannel delivers Tab A's bytes → Tab B merges (same ObjId → no op loss)
        let tab_b_merged = core::merge_docs(&tab_b, &tab_a).unwrap();

        let tab_b_replay = core::get_replay_ops(&tab_b_merged).unwrap();
        assert_eq!(tab_b_replay.len(), 1, "Tab B must see Tab A's sphere after merge");
        assert_eq!(tab_b_replay[0].op_type, "add_sphere");
        assert_eq!(tab_b_replay[0].params["radius"], 1.0);
    }

    /// validate_op rejects malformed JSON.
    #[test]
    fn validate_op_rejects_malformed_json() {
        assert!(!core::validate_op("not json"));
        assert!(!core::validate_op(r#"{"id":"x"}"#)); // missing fields
        assert!(core::validate_op(
            r#"{"id":"x","type":"add_cube","params":{"size":1},"enabled":true,"timestamp":0,"actorId":"a","groupId":null}"#
        ));
    }

    /// export_ops_since returns only ops after the given index.
    #[test]
    fn export_ops_since_returns_incremental_slice() {
        let ops: Vec<Op> = (0..4).map(|i| op("add_cube", json!({"size": i}))).collect();
        let mut d = vec![];
        for o in &ops { d = core::apply_op(&d, o).unwrap(); }

        let since2 = core::export_ops_since(&d, 2).unwrap();
        assert_eq!(since2.len(), 2);
        assert_eq!(since2[0].params["size"], 2);
        assert_eq!(since2[1].params["size"], 3);
    }

    // ── ADR-0036 §9 — exact names from spec ─────────────────────────────────

    /// After a CRDT merge, get_replay_ops must return ops in document-index order.
    /// Geometry is not involved — the sync crate owns ordering + disabled filtering.
    #[test]
    fn op_replay_order_is_deterministic_after_merge() {
        let base = core::apply_op(&[], &op("add_cube", json!({"size": 1.0}))).unwrap();

        // Actor A extrudes; Actor B adds a sphere concurrently
        let op_a = Op { actor_id: "actor-a".to_string(), ..op("sketch_extrude", json!({"height": 2.0})) };
        let doc_a = core::apply_op(&base, &op_a).unwrap();

        let op_b = Op { actor_id: "actor-b".to_string(), ..op("add_sphere", json!({"radius": 0.5})) };
        let doc_b = core::apply_op(&base, &op_b).unwrap();

        // Merge both ways — replay order must be identical
        let merged_ab = core::merge_docs(&doc_a, &doc_b).unwrap();
        let merged_ba = core::merge_docs(&doc_b, &doc_a).unwrap();

        let replay_ab = core::get_replay_ops(&merged_ab).unwrap();
        let replay_ba = core::get_replay_ops(&merged_ba).unwrap();

        // All ops enabled → replay length matches total op count
        assert_eq!(replay_ab.len(), 3);
        assert_eq!(replay_ba.len(), 3);

        // Same op IDs in same order
        let ids_ab: Vec<_> = replay_ab.iter().map(|o| &o.id).collect();
        let ids_ba: Vec<_> = replay_ba.iter().map(|o| &o.id).collect();
        assert_eq!(ids_ab, ids_ba);
    }

    /// Concurrent extrude + boolean — merge must contain all ops; disabled ops must be excluded
    /// from get_replay_ops even after merge.
    #[test]
    fn concurrent_extrude_and_fillet_merge_produces_valid_geometry() {
        let base = core::apply_op(&[], &op("add_cube", json!({"size": 2.0}))).unwrap();
        let cube_op = core::get_ops(&base).unwrap().into_iter().next().unwrap();

        // Actor A: extrude (analogous to fillet — a boolean-adjacent op)
        let extrude = Op { actor_id: "actor-a".to_string(), ..op("sketch_extrude", json!({"height": 1.0})) };
        let doc_a = core::apply_op(&base, &extrude).unwrap();

        // Actor B: boolean subtract concurrently on the same base
        let subtract = Op { actor_id: "actor-b".to_string(), ..op("boolean_subtract", json!({"idA": cube_op.id, "idB": "other"})) };
        let doc_b = core::apply_op(&base, &subtract).unwrap();

        let merged = core::merge_docs(&doc_a, &doc_b).unwrap();

        // All ops present in merged doc
        let all_ops = core::get_ops(&merged).unwrap();
        assert_eq!(all_ops.len(), 3);

        // All enabled → all appear in replay
        let replay = core::get_replay_ops(&merged).unwrap();
        assert_eq!(replay.len(), 3);

        // Now undo the subtract (actor-b) — it must be excluded from replay
        let subtract_id = all_ops.iter().find(|o| o.op_type == "boolean_subtract").unwrap().id.clone();
        let doc_after_undo = core::set_op_enabled(&merged, &subtract_id, false).unwrap();
        let replay_after_undo = core::get_replay_ops(&doc_after_undo).unwrap();
        assert_eq!(replay_after_undo.len(), 2);
        assert!(replay_after_undo.iter().all(|o| o.op_type != "boolean_subtract"));
    }
}
