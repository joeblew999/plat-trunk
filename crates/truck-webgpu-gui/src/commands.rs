// Command param structs — the single source of truth for all JSON Schema generation.
// These compile on ALL targets (native + wasm32) so the schema can be generated
// without a browser via `cargo run --bin generate-schema`.

use serde::Deserialize;
use schemars::JsonSchema;

// ─── Default value functions ────────────────────────────────────

pub fn default_1() -> f64 { 1.0 }
pub fn default_0_5() -> f64 { 0.5 }
pub fn default_0_3() -> f64 { 0.3 }

// ─── Param structs ──────────────────────────────────────────────

#[derive(Deserialize, JsonSchema)]
pub struct AddCubeParams {
    #[serde(default = "default_1")]
    pub size: f64,
}

#[derive(Deserialize, JsonSchema)]
pub struct AddSphereParams {
    #[serde(default = "default_1")]
    pub radius: f64,
}

#[derive(Deserialize, JsonSchema)]
pub struct AddCylinderParams {
    #[serde(default = "default_0_5")]
    pub radius: f64,
    #[serde(default = "default_1")]
    pub height: f64,
}

#[derive(Deserialize, JsonSchema)]
pub struct AddTorusParams {
    #[serde(default = "default_1")]
    #[serde(rename = "majorRadius")]
    pub major_radius: f64,
    #[serde(default = "default_0_3")]
    #[serde(rename = "minorRadius")]
    pub minor_radius: f64,
}

#[derive(Deserialize, JsonSchema)]
pub struct TranslateParams {
    #[serde(rename = "objectId")]
    pub object_id: String,
    #[serde(default)]
    pub dx: f64,
    #[serde(default)]
    pub dy: f64,
    #[serde(default)]
    pub dz: f64,
}

#[derive(Deserialize, JsonSchema)]
pub struct RotateParams {
    #[serde(rename = "objectId")]
    pub object_id: String,
    #[serde(default)]
    #[serde(rename = "axisX")]
    pub axis_x: f64,
    #[serde(default = "default_1")]
    #[serde(rename = "axisY")]
    pub axis_y: f64,
    #[serde(default)]
    #[serde(rename = "axisZ")]
    pub axis_z: f64,
    #[serde(default)]
    #[serde(rename = "angleDeg")]
    pub angle_deg: f64,
}

#[derive(Deserialize, JsonSchema)]
pub struct ScaleParams {
    #[serde(rename = "objectId")]
    pub object_id: String,
    #[serde(default = "default_1")]
    pub sx: f64,
    #[serde(default = "default_1")]
    pub sy: f64,
    #[serde(default = "default_1")]
    pub sz: f64,
}

#[derive(Deserialize, JsonSchema)]
pub struct ObjectIdParam {
    #[serde(rename = "objectId")]
    pub object_id: String,
}

#[derive(Deserialize, JsonSchema)]
pub struct BooleanParams {
    #[serde(rename = "idA")]
    pub id_a: String,
    #[serde(rename = "idB")]
    pub id_b: String,
}

#[derive(Deserialize, JsonSchema)]
pub struct ImportSceneParams {
    pub json: String,
}

#[derive(Deserialize, JsonSchema)]
pub struct SetStyleParams {
    #[serde(rename = "objectId")]
    pub object_id: String,
    pub style: serde_json::Value,
}

#[derive(Deserialize, JsonSchema)]
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

#[derive(Deserialize, JsonSchema)]
pub struct RenameParams {
    #[serde(rename = "objectId")]
    pub object_id: String,
    pub name: String,
}

#[derive(Deserialize, JsonSchema)]
pub struct SketchExtrudeParams {
    #[serde(rename = "sketchJson")]
    pub sketch_json: String,
    pub height: f64,
}

#[derive(Deserialize, JsonSchema)]
pub struct SelectParams {
    pub id: String,
}

#[derive(Deserialize, JsonSchema)]
pub struct PickAtParams {
    #[serde(rename = "ndcX")]
    pub ndc_x: f64,
    #[serde(rename = "ndcY")]
    pub ndc_y: f64,
}

// ─── Schema generation ──────────────────────────────────────────

/// Build the complete command schema for the CAD module.
/// This is THE single source of truth — Worker Zod, MCP tools, OpenAPI,
/// and browser cadCommand() all derive from this.
pub fn build_schema() -> serde_json::Value {
    let commands = vec![
        // Primitives
        ("add_cube", "Add a cube primitive", schema_for::<AddCubeParams>(), "objectId", false, false),
        ("add_sphere", "Add a sphere primitive", schema_for::<AddSphereParams>(), "objectId", false, false),
        ("add_cylinder", "Add a cylinder primitive", schema_for::<AddCylinderParams>(), "objectId", false, false),
        ("add_torus", "Add a torus primitive", schema_for::<AddTorusParams>(), "objectId", false, false),
        // Transforms
        ("translate", "Move an object by dx/dy/dz", schema_for::<TranslateParams>(), "success", false, false),
        ("rotate", "Rotate an object around an axis", schema_for::<RotateParams>(), "success", false, false),
        ("scale", "Scale an object by sx/sy/sz", schema_for::<ScaleParams>(), "success", false, false),
        ("duplicate", "Duplicate an object", schema_for::<ObjectIdParam>(), "objectId", false, false),
        // Booleans
        ("boolean_union", "Union two objects (A + B)", schema_for::<BooleanParams>(), "objectId", false, false),
        ("boolean_subtract", "Subtract B from A", schema_for::<BooleanParams>(), "objectId", false, false),
        ("boolean_intersect", "Intersect two objects (A & B)", schema_for::<BooleanParams>(), "objectId", false, false),
        // Scene
        ("delete", "Delete an object by ID", schema_for::<ObjectIdParam>(), "success", false, false),
        ("clear", "Clear all objects from the scene", serde_json::json!({"type": "object"}), "success", false, false),
        ("export_scene", "Export scene as JSON string", serde_json::json!({"type": "object"}), "scene", false, true),
        ("import_scene", "Import scene from JSON string", schema_for::<ImportSceneParams>(), "success", false, false),
        // Selection (ephemeral — not recorded in Automerge, not MCP tools)
        ("select", "Select an object by ID", schema_for::<SelectParams>(), "selectedId", true, false),
        ("deselect", "Clear selection", serde_json::json!({"type": "object"}), "selectedId", true, false),
        ("pick_at", "Ray-cast pick at NDC coords (read-only)", schema_for::<PickAtParams>(), "pickedId", true, true),
        ("select_at", "Pick + select at NDC coords", schema_for::<PickAtParams>(), "selectedId", true, false),
        // Style
        ("get_object_style", "Get object material style", schema_for::<ObjectIdParam>(), "style", true, true),
        ("set_style", "Set object material style", schema_for::<SetStyleParams>(), "success", false, false),
        ("set_color", "Set object color (RGBA)", schema_for::<SetColorParams>(), "success", false, false),
        // Naming
        ("rename", "Rename an object", schema_for::<RenameParams>(), "success", false, false),
        // Sketch
        ("sketch_extrude", "Extrude a 2D sketch to 3D", schema_for::<SketchExtrudeParams>(), "objectId", false, false),
        // Queries
        ("get_state", "Get full scene state", serde_json::json!({"type": "object"}), "state", true, true),
        ("pick_mesh_stats", "Get pick mesh statistics", serde_json::json!({"type": "object"}), "stats", true, true),
    ];

    let mut cmd_map = serde_json::Map::new();
    for (name, description, params, returns, ephemeral, readonly) in commands {
        cmd_map.insert(name.to_string(), serde_json::json!({
            "description": description,
            "params": params,
            "returns": returns,
            "ephemeral": ephemeral,
            "readonly": readonly,
        }));
    }

    serde_json::json!({
        "module": "cad",
        "version": "0.3.0",
        "commands": cmd_map,
    })
}

/// Helper: generate JSON Schema for a type using schemars.
fn schema_for<T: JsonSchema>() -> serde_json::Value {
    let schema = schemars::schema_for!(T);
    serde_json::to_value(schema).unwrap_or(serde_json::json!({"type": "object"}))
}
