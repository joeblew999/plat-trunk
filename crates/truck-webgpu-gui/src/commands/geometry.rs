//! Geometry domain — primitives + transforms.
//!
//! Commands: add_cube, add_sphere, add_cylinder, add_torus,
//!           translate, rotate, scale, duplicate

use serde::Deserialize;
use schemars::JsonSchema;

use super::{default_1, default_0_5, default_0_3, schema_for, SchemaEntry};

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

/// Shared param for commands that take a single objectId.
#[derive(Deserialize, JsonSchema)]
pub struct ObjectIdParam {
    #[serde(rename = "objectId")]
    pub object_id: String,
}

// ─── Schema entries ─────────────────────────────────────────────

pub fn schema_entries() -> Vec<SchemaEntry> {
    vec![
        ("add_cube", "Add a cube primitive", schema_for::<AddCubeParams>(), "objectId", false, false, "geometry"),
        ("add_sphere", "Add a sphere primitive", schema_for::<AddSphereParams>(), "objectId", false, false, "geometry"),
        ("add_cylinder", "Add a cylinder primitive", schema_for::<AddCylinderParams>(), "objectId", false, false, "geometry"),
        ("add_torus", "Add a torus primitive", schema_for::<AddTorusParams>(), "objectId", false, false, "geometry"),
        ("translate", "Move an object by dx/dy/dz", schema_for::<TranslateParams>(), "success", false, false, "geometry"),
        ("rotate", "Rotate an object around an axis", schema_for::<RotateParams>(), "success", false, false, "geometry"),
        ("scale", "Scale an object by sx/sy/sz", schema_for::<ScaleParams>(), "success", false, false, "geometry"),
        ("duplicate", "Duplicate an object", schema_for::<ObjectIdParam>(), "objectId", false, false, "geometry"),
    ]
}
