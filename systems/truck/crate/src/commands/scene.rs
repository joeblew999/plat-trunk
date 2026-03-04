//! Scene domain — object lifecycle, selection, import/export.
//!
//! Commands: delete, clear, select, deselect, pick_at, select_at,
//!           export_scene, export_step, export_obj, export_stl,
//!           import_scene, import_step, import_ifc

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

use super::{schema_for, SchemaEntry};

// ─── Param structs ──────────────────────────────────────────────

#[derive(Deserialize, Serialize, JsonSchema)]
pub struct SelectParams {
    pub id: String,
}

#[derive(Deserialize, Serialize, JsonSchema)]
pub struct PickAtParams {
    #[serde(rename = "ndcX")]
    pub ndc_x: f64,
    #[serde(rename = "ndcY")]
    pub ndc_y: f64,
}

#[derive(Deserialize, Serialize, JsonSchema)]
pub struct ImportSceneParams {
    pub json: String,
}

#[derive(Deserialize, Serialize, JsonSchema)]
pub struct ImportStepParams {
    pub data: String,
}

#[derive(Deserialize, Serialize, JsonSchema)]
pub struct ImportIfcParams {
    pub data: String,
}

// ─── Schema entries ─────────────────────────────────────────────

pub fn schema_entries() -> Vec<SchemaEntry> {
    use super::geometry::ObjectIdParam;

    vec![
        // Scene CRUD
        ("delete", "Delete an object by ID", schema_for::<ObjectIdParam>(), "success", false, false, "scene"),
        ("clear", "Clear all objects from the scene", serde_json::json!({"type": "object"}), "success", false, false, "scene"),
        // Export
        ("export_scene", "Export scene as JSON string", serde_json::json!({"type": "object"}), "scene", false, true, "scene"),
        ("export_step", "Export scene as STEP string", serde_json::json!({"type": "object"}), "step", false, true, "scene"),
        ("export_obj", "Export scene as OBJ string", serde_json::json!({"type": "object"}), "obj", false, true, "scene"),
        ("export_stl", "Export scene as STL string", serde_json::json!({"type": "object"}), "stl", false, true, "scene"),
        // Import
        ("import_scene", "Import scene from JSON string", schema_for::<ImportSceneParams>(), "success", false, false, "scene"),
        ("import_step", "Import B-Rep data from STEP string", schema_for::<ImportStepParams>(), "success", false, false, "scene"),
        ("import_ifc", "Import BIM data from IFC string", schema_for::<ImportIfcParams>(), "success", false, false, "scene"),
        // Selection (ephemeral)
        ("select", "Select an object by ID", schema_for::<SelectParams>(), "selectedId", true, false, "scene"),
        ("deselect", "Clear selection", serde_json::json!({"type": "object"}), "selectedId", true, false, "scene"),
        ("pick_at", "Ray-cast pick at NDC coords (read-only)", schema_for::<PickAtParams>(), "pickedId", true, true, "scene"),
        ("select_at", "Pick + select at NDC coords", schema_for::<PickAtParams>(), "selectedId", true, false, "scene"),
    ]
}
