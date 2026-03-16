//! Geometry domain — primitives + transforms.
//!
//! Commands: add_cube, add_sphere, add_cylinder, add_torus,
//!           translate, rotate, scale, duplicate

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

use super::{default_1, default_0_5, default_0_3, schema_for, SchemaEntry};
use crate::{validate_cube, validate_sphere, validate_cylinder, validate_torus};

// ─── Param structs ──────────────────────────────────────────────

#[derive(Deserialize, Serialize, JsonSchema)]
pub struct AddCubeParams {
    #[serde(default = "default_1")]
    #[schemars(range(min = 0.001, max = 1000.0))]
    pub size: f64,
}

impl AddCubeParams {
    pub fn validate(&self) -> Result<(), String> { validate_cube(self.size) }
}

#[derive(Deserialize, Serialize, JsonSchema)]
pub struct AddSphereParams {
    #[serde(default = "default_1")]
    #[schemars(range(min = 0.001, max = 1000.0))]
    pub radius: f64,
}

impl AddSphereParams {
    pub fn validate(&self) -> Result<(), String> { validate_sphere(self.radius) }
}

#[derive(Deserialize, Serialize, JsonSchema)]
pub struct AddCylinderParams {
    #[serde(default = "default_0_5")]
    #[schemars(range(min = 0.001, max = 1000.0))]
    pub radius: f64,
    #[serde(default = "default_1")]
    #[schemars(range(min = 0.001, max = 1000.0))]
    pub height: f64,
}

impl AddCylinderParams {
    pub fn validate(&self) -> Result<(), String> { validate_cylinder(self.radius, self.height) }
}

#[derive(Deserialize, Serialize, JsonSchema)]
pub struct AddTorusParams {
    #[serde(default = "default_1")]
    #[serde(rename = "majorRadius")]
    #[schemars(range(min = 0.001, max = 1000.0))]
    pub major_radius: f64,
    #[serde(default = "default_0_3")]
    #[serde(rename = "minorRadius")]
    #[schemars(range(min = 0.001, max = 999.0))]
    pub minor_radius: f64,
}

impl AddTorusParams {
    pub fn validate(&self) -> Result<(), String> { validate_torus(self.major_radius, self.minor_radius) }
}

#[derive(Deserialize, Serialize, JsonSchema)]
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

#[derive(Deserialize, Serialize, JsonSchema)]
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

impl RotateParams {
    pub fn validate(&self) -> std::result::Result<(), String> {
        let mag2 = self.axis_x * self.axis_x + self.axis_y * self.axis_y + self.axis_z * self.axis_z;
        if mag2 < 1e-20 {
            return Err("axis must be a non-zero vector (axisX/axisY/axisZ cannot all be 0)".to_string());
        }
        if !self.angle_deg.is_finite() {
            return Err(format!("angleDeg must be finite, got {}", self.angle_deg));
        }
        Ok(())
    }
}

#[derive(Deserialize, Serialize, JsonSchema)]
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

impl ScaleParams {
    pub fn validate(&self) -> std::result::Result<(), String> {
        if self.sx.abs() < 1e-10 { return Err(format!("sx must be non-zero, got {}", self.sx)); }
        if self.sy.abs() < 1e-10 { return Err(format!("sy must be non-zero, got {}", self.sy)); }
        if self.sz.abs() < 1e-10 { return Err(format!("sz must be non-zero, got {}", self.sz)); }
        if !self.sx.is_finite() { return Err(format!("sx must be finite, got {}", self.sx)); }
        if !self.sy.is_finite() { return Err(format!("sy must be finite, got {}", self.sy)); }
        if !self.sz.is_finite() { return Err(format!("sz must be finite, got {}", self.sz)); }
        Ok(())
    }
}

/// Shared param for commands that take a single objectId.
#[derive(Deserialize, Serialize, JsonSchema)]
pub struct ObjectIdParam {
    #[serde(rename = "objectId")]
    pub object_id: String,
}

/// Add a B-Rep solid described as a swept polyline cross-section.
///
/// Used by plugins (e.g. Howick) that compute geometry in their own WASM kernel
/// and need to hand the resulting B-Rep description to the host CAD engine.
///
/// `geometry` is an opaque JSON object produced by the plugin's WASM kernel.
/// The host interprets the `type` field to select the construction strategy:
///
/// - `"swept_polyline"`: sweep a 2D polyline cross-section along an axis.
///   Required fields: `cross_section` ([[y,z]…]), `sweep_length` (mm),
///   `sweep_axis` ([dx,dy,dz]), `origin` ([x,y,z]), `rotation_deg`, `thickness`.
///
/// `meta` is stored on the resulting object verbatim and returned in get_state /
/// export_scene so plugins can recover their domain data (e.g. Howick member params).
///
/// NOTE: This command is intentionally duplicated in headless.rs and wasm_app.rs
/// pending ADR-0002 (GeometryStore). Remove duplication when that lands.
#[derive(Deserialize, Serialize, JsonSchema)]
pub struct AddBrepParams {
    /// Geometry description produced by the plugin WASM kernel.
    pub geometry: serde_json::Value,
    /// Domain metadata stored on the object (e.g. Howick member params).
    #[serde(default)]
    pub meta: serde_json::Value,
    /// Human-readable name for the object. Defaults to the geometry type.
    #[serde(default)]
    pub name: Option<String>,
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
        // NOTE: duplicated in headless.rs + wasm_app.rs — move to GeometryStore in ADR-0002
        ("add_brep", "Add a B-Rep solid from a plugin geometry description", schema_for::<AddBrepParams>(), "objectId", false, false, "geometry"),
    ]
}
