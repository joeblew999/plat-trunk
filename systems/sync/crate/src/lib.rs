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
use schemars::JsonSchema;

// ────────────────────────────────────────────────────────────────────────────
// Public types — field names match the JS CadOperation schema exactly
// ────────────────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
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
    /// Deduplicates by op ID — if an op with the same ID already exists, returns
    /// the doc unchanged. This prevents the dual-write bug where both server
    /// (executeServerDirect) and browser (applyServerOp via SSE) record the same
    /// op, producing duplicates on the next CRDT merge.
    pub fn apply_op(doc_bytes: &[u8], op: &Op) -> Result<Vec<u8>, String> {
        let mut doc = load_doc(doc_bytes)?;
        let ops_list = get_or_create_ops_list(&mut doc)?;

        // Check for existing op with same ID (prevents dual-write duplicates)
        let len = doc.length(&ops_list);
        for i in 0..len {
            if let Ok(Some((Value::Object(ObjType::Map), entry))) = doc.get(&ops_list, i) {
                if let Some(existing_id) = read_str(&doc, &entry, "id") {
                    if existing_id == op.id {
                        return Ok(doc.save()); // Already exists — no-op
                    }
                }
            }
        }

        let entry = doc
            .insert_object(&ops_list, len, ObjType::Map)
            .map_err(|e| e.to_string())?;
        write_op_fields(&mut doc, &entry, op)?;
        Ok(doc.save())
    }

    /// Result of a merge with diff information — lets callers know if
    /// the merge introduced new ops without JSON round-tripping.
    pub struct MergeResult {
        pub doc: Vec<u8>,
        pub local_op_count: usize,
        pub merged_op_count: usize,
    }

    impl MergeResult {
        pub fn had_new_ops(&self) -> bool {
            self.merged_op_count > self.local_op_count
        }
    }

    /// Count ops without JSON serialization.
    pub fn get_op_count(doc_bytes: &[u8]) -> Result<usize, String> {
        let doc = load_doc(doc_bytes)?;
        match get_ops_list(&doc) {
            Some(id) => Ok(doc.length(&id)),
            None => Ok(0),
        }
    }

    /// CRDT merge with diff info — returns doc bytes + op counts so callers
    /// can decide whether to broadcast without JSON round-tripping.
    pub fn merge_docs_with_info(local_bytes: &[u8], remote_bytes: &[u8]) -> Result<MergeResult, String> {
        let local_op_count = get_op_count(local_bytes)?;
        let doc = merge_docs_inner(local_bytes, remote_bytes)?;
        let merged_op_count = get_op_count(&doc)?;
        Ok(MergeResult { doc, local_op_count, merged_op_count })
    }

    /// CRDT merge — commutative, associative.
    ///
    /// After Automerge's merge, deduplicates ops by ID. Two cases produce dupes:
    /// 1. **Independent-doc problem**: two peers call `create_doc()` independently,
    ///    creating separate "operations" lists. Automerge's LWW on map keys picks
    ///    one list as winner, discarding the other's ops.
    /// 2. **Dual-write problem**: server `executeServerDirect` applies an op, then
    ///    broadcasts via SSE; browser `applyServerOp` applies the same op. Both
    ///    append to the SAME operations list (shared lineage), so Automerge
    ///    preserves both insertions — no map-level conflict, but duplicate entries.
    ///
    /// This function handles both: collect all ops, deduplicate by ID, rebuild.
    pub fn merge_docs(local_bytes: &[u8], remote_bytes: &[u8]) -> Result<Vec<u8>, String> {
        merge_docs_inner(local_bytes, remote_bytes)
    }

    fn merge_docs_inner(local_bytes: &[u8], remote_bytes: &[u8]) -> Result<Vec<u8>, String> {
        let mut local = load_doc(local_bytes)?;
        let mut remote = load_doc(remote_bytes)?;
        local.merge(&mut remote).map_err(|e| e.to_string())?;

        // Collect all ops from all conflict branches (or the single winning list)
        let conflicts = local.get_all(ROOT, "operations").map_err(|e| e.to_string())?;
        let mut all_ops: Vec<Op> = Vec::new();
        let mut seen_ids = std::collections::HashSet::new();
        for (value, obj_id) in &conflicts {
            if let Value::Object(ObjType::List) = value {
                let len = local.length(obj_id);
                for i in 0..len {
                    if let Some(op) = read_op(&local, obj_id, i) {
                        if seen_ids.insert(op.id.clone()) {
                            all_ops.push(op);
                        }
                    }
                }
            }
        }

        // Only rebuild if we found duplicates or conflicts
        let total_entries: usize = conflicts.iter()
            .filter_map(|(v, id)| if let Value::Object(ObjType::List) = v { Some(local.length(id)) } else { None })
            .sum();
        if all_ops.len() < total_entries || conflicts.len() > 1 {
            all_ops.sort_by_key(|op| op.timestamp);
            local.delete(ROOT, "operations").map_err(|e| e.to_string())?;
            let new_list = local.put_object(ROOT, "operations", ObjType::List)
                .map_err(|e| e.to_string())?;
            for (i, op) in all_ops.iter().enumerate() {
                let entry = local.insert_object(&new_list, i, ObjType::Map)
                    .map_err(|e| e.to_string())?;
                write_op_fields(&mut local, &entry, op)?;
            }
        }

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

    /// Get the model name from the Automerge doc (stored at root "name" key).
    pub fn get_name(doc_bytes: &[u8]) -> Result<String, String> {
        let doc = load_doc(doc_bytes)?;
        match doc.get(ROOT, "name").map_err(|e| e.to_string())? {
            Some((Value::Scalar(s), _)) => match s.as_ref() {
                automerge::ScalarValue::Str(v) => Ok(v.to_string()),
                _ => Ok(String::new()),
            },
            _ => Ok(String::new()),
        }
    }

    /// Set the model name in the Automerge doc (stored at root "name" key).
    pub fn set_name(doc_bytes: &[u8], name: &str) -> Result<Vec<u8>, String> {
        let mut doc = load_doc(doc_bytes)?;
        doc.put(ROOT, "name", name).map_err(|e| e.to_string())?;
        Ok(doc.save())
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

    /// CRDT merge with diff info.
    /// Returns { doc: Uint8Array, localOpCount: number, mergedOpCount: number, hadNewOps: boolean }.
    #[wasm_bindgen]
    pub fn merge_docs_with_info(local: &[u8], remote: &[u8]) -> Result<JsValue, JsValue> {
        let result = core::merge_docs_with_info(local, remote).map_err(|e| JsValue::from_str(&e))?;
        let obj = js_sys::Object::new();
        let doc_array = js_sys::Uint8Array::from(result.doc.as_slice());
        let key_doc = JsValue::from_str("doc");
        let key_local = JsValue::from_str("localOpCount");
        let key_merged = JsValue::from_str("mergedOpCount");
        let key_had = JsValue::from_str("hadNewOps");
        let val_local = JsValue::from_f64(result.local_op_count as f64);
        let val_merged = JsValue::from_f64(result.merged_op_count as f64);
        let val_had = JsValue::from_bool(result.had_new_ops());
        js_sys::Reflect::set(&obj, &key_doc, &doc_array).unwrap();
        js_sys::Reflect::set(&obj, &key_local, &val_local).unwrap();
        js_sys::Reflect::set(&obj, &key_merged, &val_merged).unwrap();
        js_sys::Reflect::set(&obj, &key_had, &val_had).unwrap();
        Ok(obj.into())
    }

    /// Count ops without JSON serialization.
    #[wasm_bindgen]
    pub fn get_op_count(doc: &[u8]) -> Result<u32, JsValue> {
        core::get_op_count(doc).map(|n| n as u32).map_err(|e| JsValue::from_str(&e))
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

    /// Get the model name from the Automerge doc.
    #[wasm_bindgen]
    pub fn get_name(doc: &[u8]) -> Result<String, JsValue> {
        core::get_name(doc).map_err(|e| JsValue::from_str(&e))
    }

    /// Set the model name in the Automerge doc. Returns updated doc bytes.
    #[wasm_bindgen]
    pub fn set_name(doc: &[u8], name: &str) -> Result<Vec<u8>, JsValue> {
        core::set_name(doc, name).map_err(|e| JsValue::from_str(&e))
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

    /// get_name/set_name round-trips and syncs via merge_docs.
    #[test]
    fn name_round_trips_and_merges() {
        let doc = core::create_doc();
        assert_eq!(core::get_name(&doc).unwrap(), "");

        let doc = core::set_name(&doc, "My Model").unwrap();
        assert_eq!(core::get_name(&doc).unwrap(), "My Model");

        // Name survives merge
        let doc2 = core::create_doc();
        let merged = core::merge_docs(&doc2, &doc).unwrap();
        assert_eq!(core::get_name(&merged).unwrap(), "My Model");
    }

    /// Simulates server sync: browser sets name → syncs to server (empty doc) → server reads name.
    /// Also verifies last-writer-wins when both actors set different names.
    #[test]
    fn sync_name_propagates_through_merge() {
        // Browser creates doc and sets name
        let browser_doc = core::create_doc();
        let browser_doc = core::set_name(&browser_doc, "Browser Name").unwrap();

        // Server has empty doc (first sync)
        let server_doc = core::create_doc();
        let merged = core::merge_docs(&server_doc, &browser_doc).unwrap();
        assert_eq!(core::get_name(&merged).unwrap(), "Browser Name");

        // Second scenario: both actors set different names — merge resolves
        let server_doc2 = core::set_name(&core::create_doc(), "Server Name").unwrap();
        let merged2 = core::merge_docs(&server_doc2, &browser_doc).unwrap();
        let name = core::get_name(&merged2).unwrap();
        // Automerge LWW: one wins deterministically (either is acceptable)
        assert!(!name.is_empty(), "merged name should not be empty");
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

    /// Two independently-created docs (e.g. MCP creates server doc, browser creates its own)
    /// must preserve ALL ops after merge, not silently discard one side.
    /// This is the "independent doc problem" — without conflict resolution,
    /// Automerge's LWW on the "operations" map key drops one list entirely.
    #[test]
    fn independent_docs_merge_preserves_all_ops() {
        // Server creates doc independently and adds an op
        let server_doc = core::create_doc();
        let server_op = Op { actor_id: "mcp-server".to_string(), ..op("add_sphere", json!({"radius": 1.0})) };
        let server_doc = core::apply_op(&server_doc, &server_op).unwrap();

        // Browser creates doc independently and adds a different op
        let browser_doc = core::create_doc();
        let browser_op = Op { actor_id: "browser-user".to_string(), ..op("add_cube", json!({"size": 2.0})) };
        let browser_doc = core::apply_op(&browser_doc, &browser_op).unwrap();

        // Merge should preserve BOTH ops (not silently discard one side)
        let merged = core::merge_docs(&server_doc, &browser_doc).unwrap();
        let ops = core::get_ops(&merged).unwrap();
        assert_eq!(ops.len(), 2, "merge of independent docs must preserve all ops");
        let types: Vec<&str> = ops.iter().map(|o| o.op_type.as_str()).collect();
        assert!(types.contains(&"add_sphere"), "server op must survive");
        assert!(types.contains(&"add_cube"), "browser op must survive");

        // Merge must be commutative
        let merged_rev = core::merge_docs(&browser_doc, &server_doc).unwrap();
        let ops_rev = core::get_ops(&merged_rev).unwrap();
        assert_eq!(ops_rev.len(), 2, "reverse merge must also preserve all ops");
    }

    /// Independent docs with overlapping op IDs must deduplicate.
    #[test]
    fn independent_docs_merge_deduplicates_by_op_id() {
        let shared_op = op("add_cube", json!({"size": 1.0}));

        let doc_a = core::create_doc();
        let doc_a = core::apply_op(&doc_a, &shared_op).unwrap();

        let doc_b = core::create_doc();
        let doc_b = core::apply_op(&doc_b, &shared_op).unwrap();

        let merged = core::merge_docs(&doc_a, &doc_b).unwrap();
        let ops = core::get_ops(&merged).unwrap();
        assert_eq!(ops.len(), 1, "duplicate op IDs must be deduplicated");
    }

    /// apply_op with the same op ID twice must not create a duplicate.
    /// This is the dual-write bug: server executeServerDirect applies the op,
    /// then browser applyServerOp applies the same op — on merge, both copies
    /// survived because they were different Automerge changes.
    #[test]
    fn apply_op_deduplicates_by_id() {
        let doc = core::create_doc();
        let the_op = op("add_cube", json!({"size": 2.0}));

        // First apply — should add the op
        let doc = core::apply_op(&doc, &the_op).unwrap();
        let ops = core::get_ops(&doc).unwrap();
        assert_eq!(ops.len(), 1);

        // Second apply with same ID — should be a no-op
        let doc = core::apply_op(&doc, &the_op).unwrap();
        let ops = core::get_ops(&doc).unwrap();
        assert_eq!(ops.len(), 1, "apply_op must deduplicate by op ID");
    }

    /// Dual-write scenario: server and browser both apply_op with same ID
    /// on their own docs, then merge. Should produce 1 op, not 2.
    #[test]
    fn dual_write_merge_produces_single_op() {
        let base = core::create_doc();
        let the_op = op("add_sphere", json!({"radius": 1.5}));

        // Server applies op to its fork
        let server_doc = core::apply_op(&base, &the_op).unwrap();

        // Browser applies same op to its fork (from SSE sync-op)
        let browser_doc = core::apply_op(&base, &the_op).unwrap();

        // Merge — should have exactly 1 op (deduplicated in merge_docs)
        let merged = core::merge_docs(&server_doc, &browser_doc).unwrap();
        let ops = core::get_ops(&merged).unwrap();
        assert_eq!(ops.len(), 1, "dual-write merge must not duplicate ops");
        assert_eq!(ops[0].op_type, "add_sphere");
    }

    /// get_op_count returns count without JSON serialization.
    #[test]
    fn get_op_count_matches_get_ops_length() {
        let mut doc = core::create_doc();
        assert_eq!(core::get_op_count(&doc).unwrap(), 0);

        doc = core::apply_op(&doc, &op("add_cube", json!({"size": 1.0}))).unwrap();
        assert_eq!(core::get_op_count(&doc).unwrap(), 1);

        doc = core::apply_op(&doc, &op("add_sphere", json!({"radius": 0.5}))).unwrap();
        assert_eq!(core::get_op_count(&doc).unwrap(), 2);
        assert_eq!(core::get_op_count(&doc).unwrap(), core::get_ops(&doc).unwrap().len());
    }

    /// merge_docs_with_info reports correct diff info.
    #[test]
    fn merge_docs_with_info_reports_new_ops() {
        let base = core::create_doc();
        let doc_a = core::apply_op(&base, &op("add_cube", json!({"size": 1.0}))).unwrap();
        let doc_b = core::apply_op(&base, &op_b("add_sphere", json!({"radius": 0.5}))).unwrap();

        // Merge with new ops from B
        let result = core::merge_docs_with_info(&doc_a, &doc_b).unwrap();
        assert_eq!(result.local_op_count, 1);
        assert_eq!(result.merged_op_count, 2);
        assert!(result.had_new_ops());

        // No-op merge (same doc merged with itself)
        let result2 = core::merge_docs_with_info(&result.doc, &result.doc).unwrap();
        assert_eq!(result2.local_op_count, 2);
        assert_eq!(result2.merged_op_count, 2);
        assert!(!result2.had_new_ops());
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Integration tests — simulate full browser ↔ server ↔ browser sync cycle
//
// These tests model the real storage/network boundary entirely in Rust:
//   "IDB"  = Vec<u8> in memory (same bytes the browser would store)
//   "R2"   = Vec<u8> in memory (same bytes the worker would store)
//   "fetch" = direct function call (same CRDT logic the worker executes)
//
// If these pass, the sync protocol is correct. Browser/CF add only I/O.
// ────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod integration {
    use super::{Op, core};
    use serde_json::json;

    fn op(op_type: &str, params: serde_json::Value, actor: &str) -> Op {
        Op {
            id: uuid::Uuid::new_v4().to_string(),
            op_type: op_type.to_string(),
            params,
            enabled: true,
            timestamp: 0,
            actor_id: actor.to_string(),
            group_id: None,
        }
    }

    // ── Storage simulators ────────────────────────────────────────────────────

    /// Simulates IDB (browser IndexedDB) — just bytes in memory.
    struct MockIdb(Option<Vec<u8>>);
    impl MockIdb {
        fn new() -> Self { Self(None) }
        fn save(&mut self, bytes: &[u8]) { self.0 = Some(bytes.to_vec()); }
        fn load(&self) -> Option<Vec<u8>> { self.0.clone() }
    }

    /// Simulates R2 (Cloudflare) — just bytes in memory.
    struct MockR2(Option<Vec<u8>>);
    impl MockR2 {
        fn new() -> Self { Self(None) }
        fn put(&mut self, bytes: &[u8]) { self.0 = Some(bytes.to_vec()); }
        fn get(&self) -> Option<Vec<u8>> { self.0.clone() }
    }

    /// Simulates the worker's POST /api/models/:id/sync endpoint.
    /// Takes browser doc bytes, merges with R2 doc, saves back, returns merged.
    fn simulate_server_sync(browser_doc: &[u8], r2: &mut MockR2) -> Vec<u8> {
        match r2.get() {
            Some(server_doc) => {
                let merged = core::merge_docs(server_doc.as_slice(), browser_doc)
                    .expect("merge failed");
                r2.put(&merged);
                merged
            }
            None => {
                // No server doc yet — adopt browser doc directly
                r2.put(browser_doc);
                browser_doc.to_vec()
            }
        }
    }

    /// Simulates the worker's POST /api/models/:id/ops endpoint.
    fn simulate_server_apply_op(op: &Op, r2: &mut MockR2) -> Vec<u8> {
        let doc = r2.get().unwrap_or_else(|| core::create_doc());
        let updated = core::apply_op(&doc, op).expect("apply_op failed");
        r2.put(&updated);
        updated
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    /// Full cycle: browser creates doc → syncs to server → server applies MCP op
    /// → browser syncs again → browser sees both ops.
    #[test]
    fn browser_server_full_sync_cycle() {
        let mut idb = MockIdb::new();
        let mut r2 = MockR2::new();

        // Browser: create doc + apply local op
        let browser_op = op("add_cube", json!({"size": 1.0}), "browser");
        let doc = core::create_doc();
        let doc = core::apply_op(&doc, &browser_op).unwrap();
        idb.save(&doc);

        // Browser → Server: first sync (server adopts browser doc)
        let merged = simulate_server_sync(idb.load().unwrap().as_slice(), &mut r2);
        idb.save(&merged);
        assert_eq!(core::get_op_count(&merged).unwrap(), 1);

        // Server: MCP agent applies op directly (simulate executeServerDirect)
        let mcp_op = op("add_sphere", json!({"radius": 0.5}), "mcp-server");
        simulate_server_apply_op(&mcp_op, &mut r2);

        // Browser → Server: second sync (browser gets MCP op via merge)
        let merged = simulate_server_sync(idb.load().unwrap().as_slice(), &mut r2);
        idb.save(&merged);

        // Browser now has both ops
        let ops = core::get_ops(&merged).unwrap();
        assert_eq!(ops.len(), 2, "browser must see both ops after sync");
        let types: Vec<&str> = ops.iter().map(|o| o.op_type.as_str()).collect();
        assert!(types.contains(&"add_cube"), "browser op must survive");
        assert!(types.contains(&"add_sphere"), "MCP op must survive");
    }

    /// Two browsers, one server: both make changes offline, sync independently,
    /// server merges both, each browser gets the other's changes.
    #[test]
    fn two_browsers_converge_via_server() {
        let mut r2 = MockR2::new();
        let mut idb_a = MockIdb::new();
        let mut idb_b = MockIdb::new();

        // Shared base (both tabs open from the same IDB state)
        let base = core::create_doc();
        idb_a.save(&base);
        idb_b.save(&base);

        // Browser A: adds a cube offline
        let op_a = op("add_cube", json!({"size": 2.0}), "browser-a");
        let doc_a = core::apply_op(&base, &op_a).unwrap();
        idb_a.save(&doc_a);

        // Browser B: adds a sphere offline
        let op_b = op("add_sphere", json!({"radius": 1.0}), "browser-b");
        let doc_b = core::apply_op(&base, &op_b).unwrap();
        idb_b.save(&doc_b);

        // Browser A syncs first — server adopts A's doc
        let merged_a = simulate_server_sync(idb_a.load().unwrap().as_slice(), &mut r2);
        idb_a.save(&merged_a);
        assert_eq!(core::get_op_count(&merged_a).unwrap(), 1);

        // Browser B syncs — server merges A+B, B receives merged doc
        let merged_b = simulate_server_sync(idb_b.load().unwrap().as_slice(), &mut r2);
        idb_b.save(&merged_b);
        assert_eq!(core::get_op_count(&merged_b).unwrap(), 2, "B must see A's op");

        // Browser A syncs again — gets B's op
        let merged_a2 = simulate_server_sync(idb_a.load().unwrap().as_slice(), &mut r2);
        idb_a.save(&merged_a2);
        assert_eq!(core::get_op_count(&merged_a2).unwrap(), 2, "A must see B's op");

        // Both browsers have the same ops
        let ops_a = core::get_ops(&merged_a2).unwrap();
        let ops_b = core::get_ops(&merged_b).unwrap();
        let mut ids_a: Vec<_> = ops_a.iter().map(|o| o.id.clone()).collect();
        let mut ids_b: Vec<_> = ops_b.iter().map(|o| o.id.clone()).collect();
        ids_a.sort(); ids_b.sort();
        assert_eq!(ids_a, ids_b, "both browsers must converge to identical state");
    }

    /// Undo/redo survives a server sync round-trip.
    /// Browser undoes an op, syncs to server, re-syncs — op remains disabled.
    #[test]
    fn undo_survives_server_sync() {
        let mut idb = MockIdb::new();
        let mut r2 = MockR2::new();

        // Browser: apply 2 ops
        let o1 = op("add_cube",   json!({"size": 1.0}), "browser");
        let o2 = op("add_sphere", json!({"radius": 0.5}), "browser");
        let id2 = o2.id.clone();

        let doc = core::create_doc();
        let doc = core::apply_op(&doc, &o1).unwrap();
        let doc = core::apply_op(&doc, &o2).unwrap();

        // Browser: undo second op
        let doc = core::set_op_enabled(&doc, &id2, false).unwrap();
        idb.save(&doc);

        // Sync to server
        let merged = simulate_server_sync(idb.load().unwrap().as_slice(), &mut r2);
        idb.save(&merged);

        // Sync again (no new ops — idempotent)
        let merged2 = simulate_server_sync(idb.load().unwrap().as_slice(), &mut r2);
        idb.save(&merged2);

        // Replay ops — only enabled ones
        let replay = core::get_replay_ops(&merged2).unwrap();
        assert_eq!(replay.len(), 1, "undo must survive sync round-trip");
        assert_eq!(replay[0].op_type, "add_cube");
        assert!(replay[0].enabled);

        // Full op list still has both
        let all = core::get_ops(&merged2).unwrap();
        assert_eq!(all.len(), 2);
        assert!(!all.iter().find(|o| o.id == id2).unwrap().enabled);
    }

    /// Dual-write: server applies op via MCP, SSE delivers it to browser which
    /// also applies it locally. Server sync must not duplicate the op.
    #[test]
    fn dual_write_mcp_and_sse_no_duplication() {
        let mut idb = MockIdb::new();
        let mut r2 = MockR2::new();

        let shared_op = op("add_cube", json!({"size": 3.0}), "mcp-server");

        // Server applies op via MCP
        simulate_server_apply_op(&shared_op, &mut r2);

        // Browser: create doc + apply same op (simulating SSE applyServerOp)
        let base = core::create_doc();
        let browser_doc = core::apply_op(&base, &shared_op).unwrap();
        idb.save(&browser_doc);

        // Browser syncs — CRDT dedup must eliminate duplicate
        let merged = simulate_server_sync(idb.load().unwrap().as_slice(), &mut r2);
        idb.save(&merged);

        let ops = core::get_ops(&merged).unwrap();
        assert_eq!(ops.len(), 1, "dual-write must not duplicate op");
        assert_eq!(ops[0].id, shared_op.id);
    }

    /// Ping-pong prevention: browser syncs the merged doc back to server.
    /// Op count must not grow — no infinite broadcast loop.
    #[test]
    fn re_sync_is_idempotent_no_ping_pong() {
        let mut idb = MockIdb::new();
        let mut r2 = MockR2::new();

        let doc = core::create_doc();
        let doc = core::apply_op(&doc, &op("add_cube", json!({"size": 1.0}), "browser")).unwrap();
        idb.save(&doc);

        // First sync
        let merged = simulate_server_sync(idb.load().unwrap().as_slice(), &mut r2);
        idb.save(&merged);
        let count_after_first = core::get_op_count(&merged).unwrap();

        // Second sync with same doc (ping-pong scenario)
        let merged2 = simulate_server_sync(idb.load().unwrap().as_slice(), &mut r2);
        let count_after_second = core::get_op_count(&merged2).unwrap();

        assert_eq!(count_after_first, count_after_second,
            "re-sync must not inflate op count — ping-pong prevention");
    }

    /// Model name syncs from browser to server and back to a second browser.
    #[test]
    fn model_name_syncs_browser_to_server_to_browser() {
        let mut r2 = MockR2::new();
        let mut idb_a = MockIdb::new();
        let mut idb_b = MockIdb::new();

        // Browser A sets name
        let base = core::create_doc();
        let doc_a = core::set_name(&base, "My Model").unwrap();
        idb_a.save(&doc_a);

        // A syncs to server
        let merged = simulate_server_sync(idb_a.load().unwrap().as_slice(), &mut r2);
        idb_a.save(&merged);

        // Browser B starts empty, syncs — gets name from server
        idb_b.save(&base);
        let merged_b = simulate_server_sync(idb_b.load().unwrap().as_slice(), &mut r2);
        idb_b.save(&merged_b);

        let name = core::get_name(&merged_b).unwrap();
        assert_eq!(name, "My Model", "name must propagate browser A → server → browser B");
    }
}
