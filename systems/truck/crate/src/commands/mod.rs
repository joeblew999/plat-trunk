//! Command domain modules — organized by functional domain (ADR-0019).
//!
//! Each module owns its param structs + schema entries.
//! `build_schema()` collects from all domains into the single source of truth.
//!
//! ## Domains
//!
//! | Domain     | Commands                                            |
//! |------------|-----------------------------------------------------|
//! | geometry   | add_cube/sphere/cylinder/torus, translate/rotate/scale, duplicate |
//! | booleans   | boolean_union/subtract/intersect, clash_detect       |
//! | sketch     | begin_sketch, sketch_add_point/edge/constraint, sketch_solve/cancel/export, sketch_extrude |
//! | scene      | delete, clear, select/deselect, pick_at, import/export |
//! | style      | set_style/color, rename, set_camera, get_state, queries |

pub mod geometry;
pub mod booleans;
pub mod sketch;
pub mod scene;
pub mod style;

use schemars::JsonSchema;

// Re-export param types so `use crate::commands::*` still works.
// Use named re-exports to avoid ambiguity on schema_entries().
pub use geometry::{AddCubeParams, AddSphereParams, AddCylinderParams, AddTorusParams,
                   TranslateParams, RotateParams, ScaleParams, ObjectIdParam};
pub use booleans::BooleanParams;
pub use sketch::{BeginSketchParams, SketchAddPointParams, SketchAddEdgeParams,
                 SketchAddConstraintParams, SketchExtrudeParams, QuickRectExtrudeParams};
pub use scene::{SelectParams, PickAtParams, ImportSceneParams, ImportStepParams, ImportIfcParams};
pub use style::{SetStyleParams, SetColorParams, RenameParams, SetCameraParams};

// ─── Default value functions (shared across domains) ────────────

pub fn default_1() -> f64 { 1.0 }
pub fn default_0_5() -> f64 { 0.5 }
pub fn default_0_3() -> f64 { 0.3 }
pub fn default_45() -> f64 { 45.0 }
pub fn default_near() -> f64 { 0.01 }
pub fn default_far() -> f64 { 100.0 }

// ─── Schema infrastructure ──────────────────────────────────────

/// Schema entry: (name, description, params_schema, returns_key, ephemeral, readonly, domain)
pub type SchemaEntry = (&'static str, &'static str, serde_json::Value, &'static str, bool, bool, &'static str);

/// Helper: generate JSON Schema for a type using schemars.
pub fn schema_for<T: JsonSchema>() -> serde_json::Value {
    let schema = schemars::schema_for!(T);
    serde_json::to_value(schema).unwrap_or(serde_json::json!({"type": "object"}))
}

// ─── Schema generation ──────────────────────────────────────────

/// Build the complete command schema for the CAD module.
/// This is THE single source of truth — Worker Zod, MCP tools, OpenAPI,
/// and browser cadCommand() all derive from this.
///
/// Each domain module contributes its own `schema_entries()`.
/// The `domain` field enables the Module Router (ADR-0019) to route
/// commands to the correct domain on both browser and Cloudflare Workers.
pub fn build_schema() -> serde_json::Value {
    let mut all_entries: Vec<SchemaEntry> = Vec::new();
    all_entries.extend(geometry::schema_entries());
    all_entries.extend(booleans::schema_entries());
    all_entries.extend(sketch::schema_entries());
    all_entries.extend(scene::schema_entries());
    all_entries.extend(style::schema_entries());

    let mut cmd_map = serde_json::Map::new();
    for (name, description, params, returns, ephemeral, readonly, domain) in all_entries {
        cmd_map.insert(name.to_string(), serde_json::json!({
            "description": description,
            "params": params,
            "returns": returns,
            "ephemeral": ephemeral,
            "readonly": readonly,
            "domain": domain,
        }));
    }

    // Control plane commands — handled in JS (state.js), not WASM.
    // Included in schema so MCP agents and tests can discover and call them.
    let control_plane = serde_json::json!({
        "undo": {
            "description": "Undo the last operation",
            "layer": "js",
            "params": { "type": "object", "properties": {} },
            "returns": "success"
        },
        "redo": {
            "description": "Redo the last undone operation",
            "layer": "js",
            "params": { "type": "object", "properties": {} },
            "returns": "success"
        },
        "get_status": {
            "description": "Get system status: mode, sync state, object count",
            "layer": "js",
            "params": { "type": "object", "properties": {} },
            "returns": "status"
        },
        "set_mode": {
            "description": "Switch between local (offline) and online (Worker relay) mode",
            "layer": "js",
            "params": {
                "type": "object",
                "properties": {
                    "mode": { "type": "string", "enum": ["local", "online"], "description": "Target mode" }
                },
                "required": ["mode"]
            },
            "returns": "mode"
        },
        "create_model": {
            "description": "Create a new document, reset the scene",
            "layer": "js",
            "params": {
                "type": "object",
                "properties": {
                    "name": { "type": "string", "description": "Optional model name" }
                }
            },
            "returns": "modelId"
        },
        "set_automerge": {
            "description": "Enable or disable Automerge sync",
            "layer": "js",
            "params": {
                "type": "object",
                "properties": {
                    "enabled": { "type": "boolean", "description": "Whether Automerge sync is enabled" }
                },
                "required": ["enabled"]
            },
            "returns": "success"
        },
        "clear_data": {
            "description": "Wipe all local data (IndexedDB, localStorage). Requires user confirmation in GUI. Cannot be undone.",
            "layer": "js",
            "params": { "type": "object", "properties": {} },
            "returns": "success"
        },
        "save_cloud": {
            "description": "Save the current scene to cloud storage with thumbnail",
            "layer": "js",
            "params": {
                "type": "object",
                "properties": {
                    "name": { "type": "string", "description": "Model name" }
                },
                "required": ["name"]
            },
            "returns": "success"
        },
        "delete_model": {
            "description": "Delete a model from cloud storage",
            "layer": "js",
            "params": {
                "type": "object",
                "properties": {
                    "id": { "type": "string", "description": "Model ID to delete" }
                },
                "required": ["id"]
            },
            "returns": "success"
        },
        "share_model": {
            "description": "Copy a shareable URL for the current model to clipboard",
            "layer": "js",
            "params": { "type": "object", "properties": {} },
            "returns": "url"
        }
    });

    serde_json::json!({
        "module": "cad",
        "version": env!("PROJECT_VERSION"),
        "commands": cmd_map,
        "controlPlane": control_plane,
    })
}
