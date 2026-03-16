/// example-plugin/crate/src/lib.rs
///
/// Example plugin WASM — pure compute, no access to plat or the host.
///
/// This Rust code is completely independent of the CAD system. It receives
/// data as JSON strings from plugin.ts, does compute, and returns JSON strings.
///
/// There are NO extern "C" host imports here. The plugin.ts code calls
/// plat.model.getObjects(), gets the data, then passes it to this WASM
/// for compute. Results come back to plugin.ts, which sends them to the UI.
///
/// This is the clean separation:
///   plat.* = host API access   (only in plugin.ts context)
///   WASM   = pure computation  (any language, no host access)
///
/// Build:
///   cd crate && wasm-pack build --target web --out-dir pkg
///
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct SceneObject {
    id: String,
    #[serde(default)]
    name: String,
    #[serde(flatten)]
    extra: serde_json::Value,
}

#[derive(Serialize)]
struct AnalysisResult {
    object_count: usize,
    ids: Vec<String>,
    summary: String,
}

#[derive(Serialize)]
struct ExecResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

// ── WASM init ─────────────────────────────────────────────────────────────────

#[wasm_bindgen(start)]
pub fn init() {
    // Optional: set panic hook for better error messages in browser console
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// ── Main dispatch ─────────────────────────────────────────────────────────────

/// Single entry point — mirrors the host WASM pattern for consistency.
/// Called from plugin.ts: wasmExecute("analyze_scene", JSON.stringify(data))
#[wasm_bindgen]
pub fn execute(command: &str, params_json: &str) -> String {
    let params: serde_json::Value = serde_json::from_str(params_json).unwrap_or_default();

    let response = match command {
        "analyze_scene" => cmd_analyze_scene(&params),
        "compute_bounds" => cmd_compute_bounds(&params),
        _ => ExecResponse {
            result: None,
            error: Some(format!("Unknown command: {}", command)),
        },
    };

    serde_json::to_string(&response).unwrap_or_default()
}

/// Return JSON schema of commands this plugin's WASM provides.
/// Plugin authors can call this to discover available compute functions.
#[wasm_bindgen]
pub fn schema() -> String {
    serde_json::json!({
        "commands": {
            "analyze_scene": {
                "description": "Count and summarize all objects in a scene snapshot",
                "params": {
                    "objects": { "type": "array", "description": "Array of scene objects from plat.model.getObjects()" }
                }
            },
            "compute_bounds": {
                "description": "Compute axis-aligned bounding box for a set of objects",
                "params": {
                    "objects": { "type": "array" }
                }
            }
        }
    })
    .to_string()
}

// ── Commands ──────────────────────────────────────────────────────────────────

fn cmd_analyze_scene(params: &serde_json::Value) -> ExecResponse {
    let objects_raw = match params.get("objects").and_then(|v| v.as_array()) {
        Some(arr) => arr,
        None => {
            return ExecResponse {
                result: None,
                error: Some("params.objects must be an array".into()),
            }
        }
    };

    let objects: Vec<SceneObject> = objects_raw
        .iter()
        .filter_map(|v| serde_json::from_value(v.clone()).ok())
        .collect();

    let ids: Vec<String> = objects.iter().map(|o| o.id.clone()).collect();
    let summary = format!("{} object(s): {}", ids.len(), ids.join(", "));

    let result = AnalysisResult {
        object_count: ids.len(),
        ids,
        summary,
    };

    ExecResponse {
        result: Some(serde_json::to_value(result).unwrap_or_default()),
        error: None,
    }
}

fn cmd_compute_bounds(params: &serde_json::Value) -> ExecResponse {
    // Placeholder — real implementation would compute AABB from geometry
    let count = params
        .get("objects")
        .and_then(|v| v.as_array())
        .map(|a| a.len())
        .unwrap_or(0);

    ExecResponse {
        result: Some(serde_json::json!({
            "object_count": count,
            "bounds": { "min": [0, 0, 0], "max": [1, 1, 1] }
        })),
        error: None,
    }
}
