//! Sketch domain — parametric 2D sketch operations.
//!
//! Commands: begin_sketch, sketch_add_point, sketch_add_edge,
//!           sketch_add_constraint, sketch_solve, sketch_cancel,
//!           sketch_export, sketch_extrude

use serde::Deserialize;
use schemars::JsonSchema;

use super::{schema_for, SchemaEntry};

// ─── Param structs ──────────────────────────────────────────────

#[derive(Deserialize, JsonSchema)]
pub struct BeginSketchParams {
    /// Sketch plane: "xy", "xz", or "yz"
    pub plane: String,
}

#[derive(Deserialize, JsonSchema)]
pub struct SketchAddPointParams {
    pub x: f64,
    pub y: f64,
}

#[derive(Deserialize, JsonSchema)]
pub struct SketchAddEdgeParams {
    /// UUID of the first point
    #[serde(rename = "p0Id")]
    pub p0_id: String,
    /// UUID of the second point
    #[serde(rename = "p1Id")]
    pub p1_id: String,
}

#[derive(Deserialize, JsonSchema)]
pub struct SketchAddConstraintParams {
    /// Constraint type: "fixed", "horizontal", "vertical", "distance",
    /// "horizontal_distance", "vertical_distance", "coincident",
    /// "parallel", "perpendicular", "equal_length", "midpoint"
    #[serde(rename = "constraintType")]
    pub constraint_type: String,
    /// JSON object with constraint-specific parameters
    pub params: String,
}

#[derive(Deserialize, JsonSchema)]
pub struct SketchExtrudeParams {
    #[serde(rename = "sketchJson")]
    pub sketch_json: String,
    pub height: f64,
}

#[derive(Deserialize, JsonSchema)]
pub struct QuickRectExtrudeParams {
    pub width: f64,
    pub height: f64,
    pub depth: f64,
    /// Sketch plane: "xy", "xz", or "yz" (default: "xy")
    pub plane: Option<String>,
}

// ─── Shared constraint parser (used by wasm_app + headless) ─────

fn parse_uuid(params: &serde_json::Value, field: &str) -> Option<uuid::Uuid> {
    params[field].as_str().and_then(|s| uuid::Uuid::parse_str(s).ok())
}

/// Parse constraint type + params JSON into a SketchConstraintKind.
/// Returns Err(String) with a human-readable error message on failure.
pub fn parse_constraint_kind(
    constraint_type: &str,
    params: &serde_json::Value,
) -> Result<crate::sketch::SketchConstraintKind, String> {
    use crate::sketch::SketchConstraintKind;

    match constraint_type {
        "fixed" => {
            let point_id = parse_uuid(params, "point_id")
                .ok_or("fixed: missing point_id")?;
            let x = params["x"].as_f64().unwrap_or(0.0);
            let y = params["y"].as_f64().unwrap_or(0.0);
            Ok(SketchConstraintKind::Fixed { point_id, x, y })
        }
        "horizontal" => {
            let edge_id = parse_uuid(params, "edge_id")
                .ok_or("horizontal: missing edge_id")?;
            Ok(SketchConstraintKind::Horizontal { edge_id })
        }
        "vertical" => {
            let edge_id = parse_uuid(params, "edge_id")
                .ok_or("vertical: missing edge_id")?;
            Ok(SketchConstraintKind::Vertical { edge_id })
        }
        "distance" => {
            let p0_id = parse_uuid(params, "p0_id").ok_or("distance: missing p0_id")?;
            let p1_id = parse_uuid(params, "p1_id").ok_or("distance: missing p1_id")?;
            let value = params["value"].as_f64().unwrap_or(1.0);
            Ok(SketchConstraintKind::Distance { p0_id, p1_id, value })
        }
        "horizontal_distance" => {
            let p0_id = parse_uuid(params, "p0_id").ok_or("horizontal_distance: missing p0_id")?;
            let p1_id = parse_uuid(params, "p1_id").ok_or("horizontal_distance: missing p1_id")?;
            let value = params["value"].as_f64().unwrap_or(1.0);
            Ok(SketchConstraintKind::HorizontalDistance { p0_id, p1_id, value })
        }
        "vertical_distance" => {
            let p0_id = parse_uuid(params, "p0_id").ok_or("vertical_distance: missing p0_id")?;
            let p1_id = parse_uuid(params, "p1_id").ok_or("vertical_distance: missing p1_id")?;
            let value = params["value"].as_f64().unwrap_or(1.0);
            Ok(SketchConstraintKind::VerticalDistance { p0_id, p1_id, value })
        }
        "coincident" => {
            let p0_id = parse_uuid(params, "p0_id").ok_or("coincident: missing p0_id")?;
            let p1_id = parse_uuid(params, "p1_id").ok_or("coincident: missing p1_id")?;
            Ok(SketchConstraintKind::Coincident { p0_id, p1_id })
        }
        "parallel" => {
            let edge0_id = parse_uuid(params, "edge0_id").ok_or("parallel: missing edge0_id")?;
            let edge1_id = parse_uuid(params, "edge1_id").ok_or("parallel: missing edge1_id")?;
            Ok(SketchConstraintKind::Parallel { edge0_id, edge1_id })
        }
        "perpendicular" => {
            let edge0_id = parse_uuid(params, "edge0_id").ok_or("perpendicular: missing edge0_id")?;
            let edge1_id = parse_uuid(params, "edge1_id").ok_or("perpendicular: missing edge1_id")?;
            Ok(SketchConstraintKind::Perpendicular { edge0_id, edge1_id })
        }
        "equal_length" => {
            let edge0_id = parse_uuid(params, "edge0_id").ok_or("equal_length: missing edge0_id")?;
            let edge1_id = parse_uuid(params, "edge1_id").ok_or("equal_length: missing edge1_id")?;
            Ok(SketchConstraintKind::EqualLength { edge0_id, edge1_id })
        }
        "midpoint" => {
            let edge_id = parse_uuid(params, "edge_id").ok_or("midpoint: missing edge_id")?;
            let point_id = parse_uuid(params, "point_id").ok_or("midpoint: missing point_id")?;
            Ok(SketchConstraintKind::Midpoint { edge_id, point_id })
        }
        _ => Err(format!("Unknown constraint type: {}", constraint_type)),
    }
}

// ─── Schema entries ─────────────────────────────────────────────

pub fn schema_entries() -> Vec<SchemaEntry> {
    let empty = serde_json::json!({"type": "object"});
    vec![
        // Interactive sketch building (ephemeral — not recorded to Automerge)
        ("begin_sketch", "Start a new 2D sketch on a plane", schema_for::<BeginSketchParams>(), "sketchId", true, false, "sketch"),
        ("sketch_add_point", "Add a point to the active sketch", schema_for::<SketchAddPointParams>(), "pointId", true, false, "sketch"),
        ("sketch_add_edge", "Add an edge between two sketch points", schema_for::<SketchAddEdgeParams>(), "edgeId", true, false, "sketch"),
        ("sketch_add_constraint", "Add a constraint to the sketch", schema_for::<SketchAddConstraintParams>(), "constraintId", true, false, "sketch"),
        ("sketch_solve", "Solve sketch constraints and return solved positions", empty.clone(), "solved", true, true, "sketch"),
        ("sketch_cancel", "Cancel the active sketch", empty.clone(), "success", true, false, "sketch"),
        ("sketch_export", "Export active sketch as JSON", empty, "sketchJson", true, true, "sketch"),
        // Final commit (recorded to Automerge)
        ("sketch_extrude", "Extrude a 2D sketch to 3D", schema_for::<SketchExtrudeParams>(), "objectId", false, false, "sketch"),
        ("quick_rect_extrude", "Create a rectangular sketch and extrude it to 3D in one step", schema_for::<QuickRectExtrudeParams>(), "objectId", false, false, "sketch"),
    ]
}
