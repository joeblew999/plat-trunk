//! howick/crate/src/lib.rs
//!
//! Howick cold-formed steel framing — WASM kernel + native FrameExtractor.
//!
//! ## WASM (default) — browser plugin
//!   - Profile cross-section definitions (C, U, Z, Hat)
//!   - Member parametric geometry (B-Rep description as JSON)
//!   - Stud layout generation (spacing, headers, tracks)
//!   - Cut list calculation
//!   - CSV export via howick-rs (generate_csv command)
//!
//! ## Native (--features native) — server / Tauri sidecar
//!   - FrameExtractor trait: Truck B-Rep geometry → howick_rs::Frameset
//!   - ParametricWallExtractor: wall dimensions → Frameset (no Truck dep)
//!   - TruckFrameExtractor: queries Solid topology directly (ADR-0014)
//!
//! All WASM entry points go through execute(cmd, params_json) → String.

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

// ── FrameExtractor (native feature — never compiled to WASM) ──────────────────
pub mod frame_extractor;
pub use frame_extractor::{
    ExtractParams, ExtractedMember, ExtractError, FrameExtractor,
    ParametricWallExtractor, WallOpening, members_to_frameset, derive_operations,
};

// ── Public WASM entry point ───────────────────────────────────────────────────

/// Dispatch a command by name, with JSON params. Returns JSON result.
/// Errors are returned as `{ "error": "..." }`.
///
/// Commands:
///   list_profiles       → { profiles: Profile[] }
///   member_geometry     → { vertices, faces, meta }   (B-Rep description)
///   stud_layout         → { members: MemberParams[] }
///   cut_list            → { members: CutItem[] }
#[wasm_bindgen]
pub fn execute(cmd: &str, params_json: &str) -> String {
    let result = dispatch(cmd, params_json);
    match result {
        Ok(v)  => v.to_string(),
        Err(e) => serde_json::json!({ "error": e }).to_string(),
    }
}

fn dispatch(cmd: &str, params_json: &str) -> Result<serde_json::Value, String> {
    match cmd {
        "list_profiles"   => list_profiles(),
        "member_geometry" => {
            let p: MemberParams = serde_json::from_str(params_json)
                .map_err(|e| format!("bad params: {e}"))?;
            member_geometry(&p)
        }
        "stud_layout" => {
            let p: StudLayoutParams = serde_json::from_str(params_json)
                .map_err(|e| format!("bad params: {e}"))?;
            stud_layout(&p)
        }
        "cut_list" => {
            let p: CutListParams = serde_json::from_str(params_json)
                .map_err(|e| format!("bad params: {e}"))?;
            cut_list(&p)
        }
        "generate_csv" => {
            let p: GenerateCsvParams = serde_json::from_str(params_json)
                .map_err(|e| format!("bad params: {e}"))?;
            generate_csv(&p)
        }
        _ => Err(format!("unknown command: {cmd}")),
    }
}

// ── Profiles ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id:          String,
    pub name:        String,
    pub description: String,
    /// Default web depth mm
    pub default_web: f64,
    /// Default flange width mm
    pub default_flange: f64,
    /// Default lip length mm (0 for open sections like U/Hat)
    pub default_lip: f64,
    /// Available gauges (mm)
    pub gauges: Vec<f64>,
}

fn list_profiles() -> Result<serde_json::Value, String> {
    let profiles = vec![
        Profile {
            id: "C".into(),
            name: "C Section".into(),
            description: "Standard Howick C-section stud / rafter".into(),
            default_web: 90.0,
            default_flange: 42.0,
            default_lip: 12.0,
            gauges: vec![0.55, 0.75, 1.00, 1.15, 1.50, 2.00],
        },
        Profile {
            id: "U".into(),
            name: "U Track".into(),
            description: "U-track (no lip) — bottom and top plate".into(),
            default_web: 92.0,
            default_flange: 34.0,
            default_lip: 0.0,
            gauges: vec![0.55, 0.75, 1.00, 1.15],
        },
        Profile {
            id: "Z".into(),
            name: "Z Purlin".into(),
            description: "Z-section purlin — roof framing".into(),
            default_web: 200.0,
            default_flange: 65.0,
            default_lip: 20.0,
            gauges: vec![0.75, 1.00, 1.15, 1.50, 2.00],
        },
        Profile {
            id: "HAT".into(),
            name: "Hat / Furring".into(),
            description: "Hat section for wall furring and ceiling battens".into(),
            default_web: 35.0,
            default_flange: 40.0,
            default_lip: 0.0,
            gauges: vec![0.55, 0.75],
        },
    ];
    Ok(serde_json::json!({ "profiles": profiles }))
}

// ── Member geometry ───────────────────────────────────────────────────────────

/// Parameters for a single cold-formed steel member.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberParams {
    pub profile:  String,
    pub gauge:    f64,    // mm
    pub web:      f64,    // mm
    pub flange:   f64,    // mm
    pub lip:      f64,    // mm (0 for U/Hat)
    pub length:   f64,    // mm
    #[serde(default)]
    pub rotation: f64,    // degrees about long axis
    #[serde(default)]
    pub x: f64,
    #[serde(default)]
    pub y: f64,
    #[serde(default)]
    pub z: f64,
}

/// Returns a B-Rep geometry description that the host CAD kernel (truck) can
/// consume via the `add_brep` command. The description is a swept cross-section:
///   - cross_section: ordered 2D polyline (mm, local YZ)
///   - sweep_axis: unit vector (always +X for horizontal members)
///   - sweep_length: mm
///   - origin: [x, y, z] world position
///   - rotation_deg: about sweep axis
///   - meta: Howick-specific properties for the cut list
fn member_geometry(p: &MemberParams) -> Result<serde_json::Value, String> {
    let cross = cross_section_points(p)?;

    Ok(serde_json::json!({
        "type": "swept_polyline",
        "cross_section": cross,  // [[y, z], ...] mm, local frame
        "sweep_axis":    [1.0, 0.0, 0.0],
        "sweep_length":  p.length,
        "origin":        [p.x, p.y, p.z],
        "rotation_deg":  p.rotation,
        "thickness":     p.gauge,
        "meta": {
            "howick": {
                "profile":  p.profile,
                "gauge":    p.gauge,
                "web":      p.web,
                "flange":   p.flange,
                "lip":      p.lip,
                "length":   p.length,
            }
        }
    }))
}

/// Compute the 2D cross-section outline (open polyline) for the given profile.
/// Origin is the bottom-centre of the web.
/// Y = horizontal, Z = vertical.
fn cross_section_points(p: &MemberParams) -> Result<Vec<[f64; 2]>, String> {
    let t  = p.gauge;
    let hw = p.web    / 2.0;   // half-web
    let f  = p.flange;
    let l  = p.lip;

    let pts = match p.profile.as_str() {
        "C" => {
            // C section (lips pointing in, symmetric):
            //
            //   lip ─┐             ┌─ lip
            //        │             │
            //   flange─────────────flange
            //              web
            //
            // Polyline from top-left lip tip, clockwise:
            vec![
                [-f + l,  hw],          // top-left lip tip
                [-f,      hw],          // top-left flange start
                [-f,     -hw],          // bottom-left flange start
                [-f + l, -hw],          // bottom-left lip tip
                // mirror right side
                [ f - l, -hw],
                [ f,     -hw],
                [ f,      hw],
                [ f - l,  hw],
            ]
        }
        "U" => {
            // U track — no lips
            vec![
                [-f,  hw],
                [-f, -hw],
                [ f, -hw],
                [ f,  hw],
            ]
        }
        "Z" => {
            // Z purlin — lips on opposite sides (one-sided)
            vec![
                [-f + l,  hw],   // top lip
                [-f,      hw],
                [-f,     -hw],
                [ f,     -hw],
                [ f - l, -hw],   // bottom lip (opposite side)
            ]
        }
        "HAT" => {
            // Hat / furring: ──┐     ┌──
            //                 └─────┘
            let crown = p.web;
            let leg   = p.flange;
            vec![
                [-crown/2.0 - leg, 0.0],
                [-crown/2.0,       0.0],
                [-crown/2.0,       hw],   // using hw as crown height
                [ crown/2.0,       hw],
                [ crown/2.0,       0.0],
                [ crown/2.0 + leg, 0.0],
            ]
        }
        other => return Err(format!("unknown profile: {other}")),
    };

    Ok(pts.into_iter().map(|[y, z]| [y + t/2.0, z]).collect())
}

// ── Stud layout ───────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct StudLayoutParams {
    pub wall_length: f64,    // mm
    pub wall_height: f64,    // mm
    pub spacing:     f64,    // mm centre-to-centre
    pub gauge:       f64,
    pub profile:     String,
    #[serde(default)]
    pub openings:    Vec<Opening>,
}

#[derive(Debug, Deserialize)]
pub struct Opening {
    pub x:      f64,   // offset from wall start (mm)
    pub width:  f64,   // mm
    pub height: f64,   // mm (from floor)
}

fn stud_layout(p: &StudLayoutParams) -> Result<serde_json::Value, String> {
    let mut members: Vec<serde_json::Value> = vec![];

    // Bottom track (full width)
    members.push(track_member(p, 0.0, p.wall_length, 0.0));

    // Top track (full width)
    members.push(track_member(p, 0.0, p.wall_length, p.wall_height));

    // Studs — start at 0, then spacing intervals, end stud at wall_length
    let mut x = 0.0_f64;
    while x <= p.wall_length + 1.0 {
        // Skip if inside an opening
        if !in_opening(x, p) {
            members.push(stud_member(p, x));
        }
        if (x - p.wall_length).abs() < 1.0 { break; }
        x = (x + p.spacing).min(p.wall_length);
    }

    // Opening headers and trimmer studs
    for o in &p.openings {
        // Header above opening
        members.push(track_member(p, o.x, o.width, o.height));
        // Trimmer studs either side
        members.push(stud_member_height(p, o.x, o.height));
        members.push(stud_member_height(p, o.x + o.width, o.height));
    }

    Ok(serde_json::json!({ "members": members }))
}

fn in_opening(x: f64, p: &StudLayoutParams) -> bool {
    p.openings.iter().any(|o| x > o.x + 1.0 && x < o.x + o.width - 1.0)
}

fn stud_member(p: &StudLayoutParams, x: f64) -> serde_json::Value {
    stud_member_height(p, x, p.wall_height)
}

fn stud_member_height(p: &StudLayoutParams, x: f64, height: f64) -> serde_json::Value {
    serde_json::json!({
        "profile":  p.profile,
        "gauge":    p.gauge,
        "web":      90.0,
        "flange":   42.0,
        "lip":      12.0,
        "length":   height,
        "rotation": 90.0,   // studs are vertical
        "x": x,
        "y": 0.0,
        "z": 0.0,
    })
}

fn track_member(p: &StudLayoutParams, x: f64, length: f64, z: f64) -> serde_json::Value {
    serde_json::json!({
        "profile":  "U",
        "gauge":    p.gauge,
        "web":      92.0,
        "flange":   34.0,
        "lip":      0.0,
        "length":   length,
        "rotation": 0.0,
        "x": x,
        "y": 0.0,
        "z": z,
    })
}

// ── Cut list ──────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CutListParams {
    pub members: Vec<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct CutItem {
    pub qty:     usize,
    pub profile: String,
    pub gauge:   String,
    pub web:     String,
    pub flange:  String,
    pub lip:     String,
    pub length:  String,
}

fn cut_list(p: &CutListParams) -> Result<serde_json::Value, String> {
    use std::collections::HashMap;

    // Group by (profile, gauge, web, flange, lip, length) and count
    let mut groups: HashMap<String, usize> = HashMap::new();

    for m in &p.members {
        let meta = m.get("meta").and_then(|v| v.get("howick"));
        if let Some(h) = meta {
            let key = format!(
                "{}|{}|{}|{}|{}|{}",
                h.get("profile").and_then(|v| v.as_str()).unwrap_or("?"),
                h.get("gauge").and_then(|v| v.as_f64()).unwrap_or(0.0),
                h.get("web").and_then(|v| v.as_f64()).unwrap_or(0.0),
                h.get("flange").and_then(|v| v.as_f64()).unwrap_or(0.0),
                h.get("lip").and_then(|v| v.as_f64()).unwrap_or(0.0),
                h.get("length").and_then(|v| v.as_f64()).unwrap_or(0.0),
            );
            *groups.entry(key).or_insert(0) += 1;
        }
    }

    let mut rows: Vec<CutItem> = groups.iter().map(|(k, &qty)| {
        let parts: Vec<&str> = k.split('|').collect();
        CutItem {
            qty,
            profile: parts.get(0).unwrap_or(&"?").to_string(),
            gauge:   format!("{:.2}mm", parts.get(1).unwrap_or(&"0").parse::<f64>().unwrap_or(0.0)),
            web:     format!("{:.0}mm", parts.get(2).unwrap_or(&"0").parse::<f64>().unwrap_or(0.0)),
            flange:  format!("{:.0}mm", parts.get(3).unwrap_or(&"0").parse::<f64>().unwrap_or(0.0)),
            lip:     format!("{:.0}mm", parts.get(4).unwrap_or(&"0").parse::<f64>().unwrap_or(0.0)),
            length:  format!("{:.0}mm", parts.get(5).unwrap_or(&"0").parse::<f64>().unwrap_or(0.0)),
        }
    }).collect();

    // Sort: profile, then length descending
    rows.sort_by(|a, b| a.profile.cmp(&b.profile).then(b.length.cmp(&a.length)));

    Ok(serde_json::json!({ "members": rows }))
}

// ── CSV export ────────────────────────────────────────────────────────────────

/// Params for CSV generation: takes a stud_layout result + frameset metadata.
#[derive(Debug, Deserialize)]
pub struct GenerateCsvParams {
    /// Frameset name — e.g. "W1", "T1". Used as FRAMESET header in CSV.
    pub frameset_name: String,
    /// Steel profile code — e.g. "S8908"
    pub profile_code: String,
    /// Members from stud_layout output
    pub members: Vec<serde_json::Value>,
    /// Stud spacing in mm (for dimple pair calculation)
    #[serde(default = "default_stud_spacing")]
    pub stud_spacing_mm: f64,
}

fn default_stud_spacing() -> f64 { 600.0 }

/// Generate a Howick FRAMA CSV string from a stud layout.
///
/// Maps the internal member representation produced by `stud_layout` into
/// `howick_rs::Frameset` structs, then serialises to the Howick CSV format.
///
/// Returns: `{ "csv": "UNIT,MILLIMETRE\n..." }` or `{ "error": "..." }`
fn generate_csv(params: &GenerateCsvParams) -> Result<serde_json::Value, String> {
    use howick_rs::types::{
        Component, Frameset, LabelOrientation, Operation, Profile, Unit,
    };

    let mut components: Vec<Component> = Vec::new();

    for (i, member) in params.members.iter().enumerate() {
        let length_mm = member.get("length")
            .and_then(|v| v.as_f64())
            .ok_or_else(|| format!("member {i}: missing length"))?;

        let profile_id = member.get("profile")
            .and_then(|v| v.as_str())
            .unwrap_or("C");

        let _x = member.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let rotation = member.get("rotation").and_then(|v| v.as_f64()).unwrap_or(0.0);

        // Determine member type from profile + rotation
        // rotation 90 = vertical stud, 0 = horizontal track
        let is_stud = (rotation - 90.0).abs() < 1.0 || profile_id == "C";
        let is_track = profile_id == "U" || (rotation.abs() < 1.0 && profile_id != "C");

        // Build operations for this member
        let mut operations: Vec<Operation> = Vec::new();

        if is_stud {
            // Dimple pairs at each connection point
            // Standard: pair at 20.65mm from each end, then at stud_spacing intervals
            let dimple_offset = 20.65_f64;
            let dimple_pair_gap = 50.0_f64;

            // Near end dimple pair
            operations.push(Operation::Dimple(dimple_offset));
            operations.push(Operation::Dimple(dimple_offset + dimple_pair_gap));

            // Far end dimple pair
            operations.push(Operation::Dimple(length_mm - dimple_offset - dimple_pair_gap));
            operations.push(Operation::Dimple(length_mm - dimple_offset));

            // Lip cuts at each end (connect to track)
            operations.push(Operation::LipCut(23.0));
            operations.push(Operation::LipCut(length_mm - 23.0));

            // Standard service hole at mid-height for services routing
            if length_mm > 600.0 {
                operations.push(Operation::ServiceHole(length_mm / 2.0));
            }

        } else if is_track {
            // Track (U section): dimples at each stud position
            let mut pos = params.stud_spacing_mm;
            while pos < length_mm - 20.0 {
                operations.push(Operation::Dimple(pos));
                operations.push(Operation::Dimple(pos + 50.0));
                pos += params.stud_spacing_mm;
            }

            // Lip cuts at each end
            operations.push(Operation::LipCut(23.0));
            operations.push(Operation::LipCut(length_mm - 23.0));
        }

        // Each member comes as an INV/NRM pair (C-section faces both directions)
        // Component ID: frameset_name + sequential number
        let base_id = i + 1;

        components.push(Component {
            id: format!("{}-{}", params.frameset_name, base_id * 2 - 1),
            label: LabelOrientation::Inverted,
            quantity: 1,
            length_mm,
            operations: operations.clone(),
        });
        components.push(Component {
            id: format!("{}-{}", params.frameset_name, base_id * 2),
            label: LabelOrientation::Normal,
            quantity: 1,
            length_mm,
            operations,
        });
    }

    let frameset = Frameset {
        name: params.frameset_name.clone(),
        unit: Unit::Millimetre,
        profile: Profile {
            code: params.profile_code.clone(),
            description: "Standard Profile".to_string(),
        },
        components,
    };

    let csv = howick_rs::csv::serialize(&frameset)
        .map_err(|e| format!("CSV serialisation failed: {e}"))?;

    Ok(serde_json::json!({ "csv": csv }))
}
