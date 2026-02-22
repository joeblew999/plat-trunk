// Command param structs — the single source of truth for all JSON Schema generation.
// These compile on ALL targets (native + wasm32) so the schema can be generated
// without a browser via `cargo run --bin generate-schema`.

use serde::{Deserialize, Serialize};
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
pub struct GetBoundingSphereParams {
    /// If provided, get sphere for this object. If null, get sphere for entire scene.
    #[serde(rename = "objectId")]
    pub object_id: Option<String>,
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
    /// Material style: albedo [r,g,b,a], roughness, reflectance, ambient_ratio (all 0-1)
    pub style: StyleInput,
}

/// PBR material style properties.
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct StyleInput {
    /// RGBA color array, each value 0-1
    pub albedo: Option<[f64; 4]>,
    /// Surface roughness (0 = mirror, 1 = matte)
    pub roughness: Option<f64>,
    /// Surface reflectance (0-1)
    pub reflectance: Option<f64>,
    /// Ambient light ratio (0-1)
    pub ambient_ratio: Option<f64>,
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
pub struct ImportStepParams {
    pub data: String,
}

#[derive(Deserialize, JsonSchema)]
pub struct ImportIfcParams {
    pub data: String,
}

#[cfg(feature = "mvt")]
#[derive(Deserialize, JsonSchema)]
pub struct ImportMvtParams {
    /// Base64-encoded Protobuf data of the MVT tile.
    pub data: String,
    /// X coordinate offset in world meters.
    #[serde(default)]
    pub x: f64,
    /// Y coordinate offset in world meters.
    #[serde(default)]
    pub y: f64,
    /// Z coordinate offset in world meters.
    #[serde(default)]
    pub z: f64,
}

#[cfg(feature = "gltf")]
#[derive(Deserialize, JsonSchema)]
pub struct ImportGltfParams {
    /// Base64-encoded GLTF or GLB data.
    pub data: String,
    /// X coordinate offset in world meters.
    #[serde(default)]
    pub x: f64,
    /// Y coordinate offset in world meters.
    #[serde(default)]
    pub y: f64,
    /// Z coordinate offset in world meters.
    #[serde(default)]
    pub z: f64,
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

#[derive(Deserialize, JsonSchema)]
pub struct SetCameraParams {
    /// 16 floats (column-major) representing the camera's world matrix (inverse of View).
    pub matrix_world: Vec<f64>,
    pub fov_deg: f64,
    pub near: f64,
    pub far: f64,
}

#[derive(Deserialize, JsonSchema)]
pub struct SetModeParams {
    pub mode: String, // "local" or "online"
}

#[derive(Deserialize, JsonSchema)]
pub struct SetAutomergeParams {
    pub enabled: bool,
}

#[derive(Deserialize, JsonSchema)]
pub struct CreateModelParams {
    #[serde(default)]
    pub name: String,
}

// ─── Schema generation ──────────────────────────────────────────

/// Build the complete command schema for the CAD module.
/// This is THE single source of truth — Worker Zod, MCP tools, OpenAPI,
/// and browser cadCommand() all derive from this.
pub fn build_schema() -> serde_json::Value {
    let mut commands = vec![
        // Primitives
        ("add_cube", "Add a cube primitive", schema_for::<AddCubeParams>(), "objectId", false, false, "wasm"),
        ("add_sphere", "Add a sphere primitive", schema_for::<AddSphereParams>(), "objectId", false, false, "wasm"),
        ("add_cylinder", "Add a cylinder primitive", schema_for::<AddCylinderParams>(), "objectId", false, false, "wasm"),
        ("add_torus", "Add a torus primitive", schema_for::<AddTorusParams>(), "objectId", false, false, "wasm"),
        // Transforms
        ("translate", "Move an object by dx/dy/dz", schema_for::<TranslateParams>(), "success", false, false, "wasm"),
        ("rotate", "Rotate an object around an axis", schema_for::<RotateParams>(), "success", false, false, "wasm"),
        ("scale", "Scale an object by sx/sy/sz", schema_for::<ScaleParams>(), "success", false, false, "wasm"),
        ("duplicate", "Duplicate an object", schema_for::<ObjectIdParam>(), "objectId", false, false, "wasm"),
        // Booleans
        ("boolean_union", "Union two objects (A + B)", schema_for::<BooleanParams>(), "objectId", false, false, "wasm"),
        ("boolean_subtract", "Subtract B from A", schema_for::<BooleanParams>(), "objectId", false, false, "wasm"),
        ("boolean_intersect", "Intersect two objects (A & B)", schema_for::<BooleanParams>(), "objectId", false, false, "wasm"),
        // Scene
        ("delete", "Delete an object by ID", schema_for::<ObjectIdParam>(), "success", false, false, "wasm"),
        ("clear", "Clear all objects from the scene", serde_json::json!({"type": "object"}), "success", false, false, "wasm"),
        ("export_scene", "Export scene as JSON string", serde_json::json!({"type": "object"}), "scene", false, true, "wasm"),
        ("export_step", "Export scene as STEP string", serde_json::json!({"type": "object"}), "step", false, true, "wasm"),
        ("export_obj", "Export scene as OBJ string", serde_json::json!({"type": "object"}), "obj", false, true, "wasm"),
        ("export_stl", "Export scene as STL string", serde_json::json!({"type": "object"}), "stl", false, true, "wasm"),
        ("clash_detect", "Detect intersection between two objects", schema_for::<BooleanParams>(), "clash", false, true, "wasm"),
        ("import_scene", "Import scene from JSON string", schema_for::<ImportSceneParams>(), "success", false, false, "wasm"),
        ("import_step", "Import B-Rep data from STEP string", schema_for::<ImportStepParams>(), "success", false, false, "wasm"),
        ("import_ifc", "Import BIM data from IFC string", schema_for::<ImportIfcParams>(), "success", false, false, "wasm"),
    ];

    #[cfg(feature = "mvt")]
    commands.push(("import_mvt", "Import Mapbox Vector Tile (MVT) building data", schema_for::<ImportMvtParams>(), "success", false, false, "wasm"));

    #[cfg(feature = "gltf")]
    commands.push(("import_gltf", "Import 3D asset from GLTF/GLB string", schema_for::<ImportGltfParams>(), "success", false, false, "wasm"));

    let static_commands = vec![
        // Selection (ephemeral — not recorded in Automerge, not MCP tools)
        ("select", "Select an object by ID", schema_for::<SelectParams>(), "selectedId", true, false, "wasm"),
        ("deselect", "Clear selection", serde_json::json!({"type": "object"}), "selectedId", true, false, "wasm"),
        ("pick_at", "Ray-cast pick at NDC coords (read-only)", schema_for::<PickAtParams>(), "pickedId", true, true, "wasm"),
        ("select_at", "Pick + select at NDC coords", schema_for::<PickAtParams>(), "selectedId", true, false, "wasm"),
        ("set_camera", "Set camera view-projection matrix", schema_for::<SetCameraParams>(), "success", true, false, "wasm"),
        // Style
        ("get_object_style", "Get object material style", schema_for::<ObjectIdParam>(), "style", true, true, "wasm"),
        ("get_bim_metadata", "Get BIM metadata for an object", schema_for::<ObjectIdParam>(), "bim", true, true, "wasm"),
        ("set_style", "Set object material style", schema_for::<SetStyleParams>(), "success", false, false, "wasm"),
        ("set_color", "Set object color (RGBA)", schema_for::<SetColorParams>(), "success", false, false, "wasm"),
        // Naming
        ("rename", "Rename an object", schema_for::<RenameParams>(), "success", false, false, "wasm"),
        // Sketch
        ("sketch_extrude", "Extrude a 2D sketch to 3D", schema_for::<SketchExtrudeParams>(), "objectId", false, false, "wasm"),
        // Queries
        ("get_state", "Get full scene state", serde_json::json!({"type": "object"}), "state", true, true, "wasm"),
        ("get_bounding_sphere", "Get bounding sphere for object or scene", schema_for::<GetBoundingSphereParams>(), "sphere", true, true, "wasm"),
        ("pick_mesh_stats", "Get pick mesh statistics", serde_json::json!({"type": "object"}), "stats", true, true, "wasm"),
        
        // ─── Control Plane (JS Layer) ──────────────────────────────────
        ("undo", "Undo last operation", serde_json::json!({"type": "object"}), "success", false, false, "js"),
        ("redo", "Redo last operation", serde_json::json!({"type": "object"}), "success", false, false, "js"),
        ("get_status", "Get complete system status", serde_json::json!({"type": "object"}), "status", true, true, "js"),
        ("set_mode", "Set local/online mode", schema_for::<SetModeParams>(), "mode", false, false, "js"),
        ("set_automerge", "Enable/disable Automerge sync", schema_for::<SetAutomergeParams>(), "enabled", false, false, "js"),
        ("create_model", "Create a new model", schema_for::<CreateModelParams>(), "modelId", false, false, "js"),
        ("clear_data", "Wipe all local application data", serde_json::json!({"type": "object"}), "success", false, false, "js"),
    ];
    
    commands.extend(static_commands);

    let mut cmd_map = serde_json::Map::new();
    for (name, description, params, returns, ephemeral, readonly, layer) in commands {
        cmd_map.insert(name.to_string(), serde_json::json!({
            "description": description,
            "params": params,
            "returns": returns,
            "ephemeral": ephemeral,
            "readonly": readonly,
            "layer": layer,
        }));
    }

    serde_json::json!({
        "module": "cad",
        "version": "0.5.0",
        "commands": cmd_map,
    })
}

/// Helper: generate JSON Schema for a type using schemars, then clean it
/// for universal compatibility (Gemini API, MCP, OpenAPI).
fn schema_for<T: JsonSchema>() -> serde_json::Value {
    let schema = schemars::schema_for!(T);
    let value = serde_json::to_value(schema).unwrap_or(serde_json::json!({"type": "object"}));
    clean_schema(value)
}

/// Clean schemars output for Gemini API compatibility.
///
/// schemars 0.8 generates patterns that Gemini rejects:
///   - `$schema` meta key
///   - `title` (struct name)
///   - `format: "double"` (f64 annotation)
///   - `type: ["number", "null"]` (Option<T>) → normalized to `type: "number"`
///   - `$ref` + `definitions` → inlined
///   - `allOf: [{$ref}]` → merged with sibling keys
fn clean_schema(value: serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(mut obj) => {
            // Strip meta keys
            obj.remove("$schema");
            obj.remove("title");
            obj.remove("format");

            // Inline $ref: resolve references against definitions
            if let Some(definitions) = obj.remove("definitions") {
                let defs = definitions.clone();
                let fallback = obj.clone();
                obj = inline_refs(serde_json::Value::Object(obj), &defs)
                    .as_object().cloned().unwrap_or(fallback);
            }

            // Normalize type arrays: ["number", "null"] → "number"
            if let Some(serde_json::Value::Array(types)) = obj.get("type") {
                let non_null: Vec<_> = types.iter()
                    .filter(|t| t.as_str() != Some("null"))
                    .cloned()
                    .collect();
                if non_null.len() == 1 {
                    obj.insert("type".to_string(), non_null.into_iter().next().unwrap());
                }
            }

            // Recurse into all remaining values
            let cleaned: serde_json::Map<String, serde_json::Value> = obj.into_iter()
                .map(|(k, v)| (k, clean_schema(v)))
                .collect();
            serde_json::Value::Object(cleaned)
        }
        serde_json::Value::Array(arr) => {
            serde_json::Value::Array(arr.into_iter().map(clean_schema).collect())
        }
        other => other,
    }
}

/// Inline `$ref` pointers against a definitions map.
/// Handles `{"$ref": "#/definitions/Foo"}` and `{"allOf": [{"$ref": "..."}], ...}`.
fn inline_refs(value: serde_json::Value, definitions: &serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(mut obj) => {
            // Direct $ref
            if let Some(serde_json::Value::String(ref_path)) = obj.get("$ref") {
                let name = ref_path.replace("#/definitions/", "");
                if let Some(def) = definitions.get(&name) {
                    return inline_refs(def.clone(), definitions);
                }
            }

            // allOf with $ref: merge all items + sibling keys
            if let Some(serde_json::Value::Array(items)) = obj.remove("allOf") {
                let mut merged = serde_json::Map::new();
                for item in items {
                    if let serde_json::Value::Object(resolved) =
                        inline_refs(item, definitions)
                    {
                        merged.extend(resolved);
                    }
                }
                // Merge sibling keys (e.g. description) over the resolved content
                for (k, v) in obj {
                    merged.insert(k, inline_refs(v, definitions));
                }
                return serde_json::Value::Object(merged);
            }

            // Recurse
            let result: serde_json::Map<String, serde_json::Value> = obj.into_iter()
                .map(|(k, v)| (k, inline_refs(v, definitions)))
                .collect();
            serde_json::Value::Object(result)
        }
        serde_json::Value::Array(arr) => {
            serde_json::Value::Array(arr.into_iter().map(|v| inline_refs(v, definitions)).collect())
        }
        other => other,
    }
}
