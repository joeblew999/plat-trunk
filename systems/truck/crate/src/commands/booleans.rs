//! Boolean operations domain.
//!
//! Commands: boolean_union, boolean_subtract, boolean_intersect, clash_detect

use serde::Deserialize;
use schemars::JsonSchema;

use super::{schema_for, SchemaEntry};

// ─── Param structs ──────────────────────────────────────────────

#[derive(Deserialize, JsonSchema)]
pub struct BooleanParams {
    #[serde(rename = "idA")]
    pub id_a: String,
    #[serde(rename = "idB")]
    pub id_b: String,
}

// ─── Schema entries ─────────────────────────────────────────────

pub fn schema_entries() -> Vec<SchemaEntry> {
    vec![
        ("boolean_union", "Union two objects (A + B)", schema_for::<BooleanParams>(), "objectId", false, false, "booleans"),
        ("boolean_subtract", "Subtract B from A", schema_for::<BooleanParams>(), "objectId", false, false, "booleans"),
        ("boolean_intersect", "Intersect two objects (A & B)", schema_for::<BooleanParams>(), "objectId", false, false, "booleans"),
        ("clash_detect", "Detect intersection between two objects", schema_for::<BooleanParams>(), "clash", false, true, "booleans"),
    ]
}
