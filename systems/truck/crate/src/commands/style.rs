//! Style & viewport domain — appearance, naming, camera, queries.
//!
//! Commands: set_style, set_color, get_object_style, rename,
//!           set_camera, get_state, get_bim_metadata, pick_mesh_stats

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

use super::{default_1, default_45, default_near, default_far, schema_for, SchemaEntry};

// ─── Param structs ──────────────────────────────────────────────

#[derive(Deserialize, Serialize, JsonSchema)]
pub struct SetStyleParams {
    #[serde(rename = "objectId")]
    pub object_id: String,
    pub style: serde_json::Value,
}

#[derive(Deserialize, Serialize, JsonSchema)]
pub struct SetColorParams {
    #[serde(rename = "objectId")]
    pub object_id: String,
    #[serde(default = "default_1")]
    pub r: f64,
    #[serde(default)]
    pub g: f64,
    #[serde(default)]
    pub b: f64,
    #[serde(default = "default_1")]
    pub a: f64,
}

#[derive(Deserialize, Serialize, JsonSchema)]
pub struct RenameParams {
    #[serde(rename = "objectId")]
    pub object_id: String,
    pub name: String,
}

#[derive(Deserialize, Serialize, JsonSchema)]
pub struct SetCameraParams {
    /// 16 floats: column-major 4×4 camera-to-world matrix
    #[serde(rename = "matrixWorld")]
    pub matrix_world: Vec<f64>,
    /// Vertical field-of-view in degrees (perspective only)
    #[serde(default = "default_45")]
    #[serde(rename = "fovDeg")]
    pub fov_deg: f64,
    #[serde(default = "default_near")]
    pub near: f64,
    #[serde(default = "default_far")]
    pub far: f64,
}

// ─── Schema entries ─────────────────────────────────────────────

pub fn schema_entries() -> Vec<SchemaEntry> {
    use super::geometry::ObjectIdParam;

    vec![
        // Style
        ("set_style", "Set object material style", schema_for::<SetStyleParams>(), "success", false, false, "style"),
        ("set_color", "Set object color (RGBA)", schema_for::<SetColorParams>(), "success", false, false, "style"),
        ("get_object_style", "Get object material style", schema_for::<ObjectIdParam>(), "style", true, true, "style"),
        // Naming
        ("rename", "Rename an object", schema_for::<RenameParams>(), "success", false, false, "style"),
        // Camera
        ("set_camera", "Set camera from JS (matrixWorld + projection)", schema_for::<SetCameraParams>(), "success", true, false, "style"),
        // Queries
        ("get_state", "Get full scene state", serde_json::json!({"type": "object"}), "state", true, true, "style"),
        ("get_bim_metadata", "Get BIM metadata for an object", schema_for::<ObjectIdParam>(), "bim", true, true, "style"),
        ("pick_mesh_stats", "Get pick mesh statistics", serde_json::json!({"type": "object"}), "stats", true, true, "style"),
    ]
}
