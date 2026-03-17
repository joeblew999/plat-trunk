/// # FrameExtractor
///
/// Bridges Truck B-Rep geometry → `howick_rs::Frameset` structs.
///
/// This is the core of ADR-0014: the interface between the CAD system and
/// the manufacturing output layer is NOT STEP — it is the `Frameset` struct.
/// This module queries Truck's topology directly to derive manufacturing
/// parameters, which is richer and more reliable than parsing STEP.
///
/// ## Architecture
///
/// ```text
/// Truck B-Rep (Solid)
///     ↓
/// FrameExtractor::extract()
///     ↓
/// Vec<Frameset>          ← stable interface (howick_rs public type)
///     ↓
/// howick_rs::csv::serialize()
///     ↓
/// Howick FRAMA CSV
/// ```
///
/// ## Compilation
///
/// This module is gated behind the `native` feature and never compiled
/// to WASM. The WASM plugin uses `stud_layout` + `generate_csv` commands
/// which operate on parametric inputs, not B-Rep geometry.
///
/// Enable with: `cargo build --features native`

use howick_rs::types::{
    Component, Frameset, LabelOrientation, Operation, Profile, Unit,
};

// ── Types ─────────────────────────────────────────────────────────────────────

/// Error from frame extraction.
#[derive(Debug)]
pub enum ExtractError {
    NoMembers,
    InvalidGeometry(String),
}

impl std::fmt::Display for ExtractError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExtractError::NoMembers => write!(f, "no steel members found in geometry"),
            ExtractError::InvalidGeometry(msg) => write!(f, "invalid geometry: {msg}"),
        }
    }
}

/// Parameters controlling how extraction works.
#[derive(Debug, Clone)]
pub struct ExtractParams {
    /// Frameset name written to the CSV header (e.g. "W1", "T1")
    pub frameset_name: String,
    /// Steel profile code (e.g. "S8908")
    pub profile_code: String,
    /// Stud spacing in mm — used to derive dimple pair positions
    pub stud_spacing_mm: f64,
    /// Tolerance in mm for classifying members as horizontal vs vertical
    pub orientation_tolerance_deg: f64,
}

impl Default for ExtractParams {
    fn default() -> Self {
        Self {
            frameset_name:             "W1".into(),
            profile_code:              "S8908".into(),
            stud_spacing_mm:           600.0,
            orientation_tolerance_deg: 5.0,
        }
    }
}

/// Describes a single extracted steel member before converting to operations.
#[derive(Debug, Clone)]
pub struct ExtractedMember {
    /// Member length in mm
    pub length_mm: f64,
    /// Orientation: true = vertical (stud), false = horizontal (track)
    pub is_vertical: bool,
    /// Position along the wall (x-coordinate in mm, from wall start)
    pub position_mm: f64,
}

// ── FrameExtractor trait ──────────────────────────────────────────────────────

/// Extracts steel framing members from CAD geometry and produces Howick Framesets.
///
/// The trait allows multiple implementations:
/// - `TruckFrameExtractor` — queries Truck B-Rep directly (this module)
/// - Future: `StepFrameExtractor` — parses STEP geometry (if ever needed)
/// - Tests: `MockFrameExtractor` — returns fixed data for testing
pub trait FrameExtractor {
    fn extract(&self, params: &ExtractParams) -> Result<Vec<Frameset>, ExtractError>;
}

// ── Parametric extractor (no Truck dependency) ────────────────────────────────
// Used by the WASM plugin path and for testing without the full Truck workspace.

/// Extracts a simple rectangular wall from parametric inputs.
///
/// This is what the WASM plugin's `generate_csv` command uses internally.
/// It does not require Truck — it works from wall dimensions directly.
pub struct ParametricWallExtractor {
    pub wall_length_mm: f64,
    pub wall_height_mm: f64,
    pub stud_spacing_mm: f64,
    pub openings: Vec<WallOpening>,
}

/// A door or window opening in the wall.
#[derive(Debug, Clone)]
pub struct WallOpening {
    /// Distance from wall start to opening edge (mm)
    pub start_mm: f64,
    /// WallOpening width (mm)
    pub width_mm: f64,
    /// WallOpening height from floor (mm)
    pub height_mm: f64,
}

impl FrameExtractor for ParametricWallExtractor {
    fn extract(&self, params: &ExtractParams) -> Result<Vec<Frameset>, ExtractError> {
        let members = self.layout_members();
        if members.is_empty() {
            return Err(ExtractError::NoMembers);
        }
        let frameset = members_to_frameset(&members, params);
        Ok(vec![frameset])
    }
}

impl ParametricWallExtractor {
    /// Generate the member list for this wall.
    pub fn layout_members(&self) -> Vec<ExtractedMember> {
        let mut members = Vec::new();

        // Bottom track
        members.push(ExtractedMember {
            length_mm:  self.wall_length_mm,
            is_vertical: false,
            position_mm: 0.0,
        });

        // Top track
        members.push(ExtractedMember {
            length_mm:  self.wall_length_mm,
            is_vertical: false,
            position_mm: self.wall_height_mm,
        });

        // Studs at spacing intervals, skipping openings
        let mut x = 0.0_f64;
        loop {
            if !self.in_opening(x) {
                members.push(ExtractedMember {
                    length_mm:  self.stud_height_at(x),
                    is_vertical: true,
                    position_mm: x,
                });
            }
            if (x - self.wall_length_mm).abs() < 1.0 { break; }
            x = (x + self.stud_spacing_mm).min(self.wall_length_mm);
        }

        // Jamb studs and headers for each opening
        for opening in &self.openings {
            // Jamb studs at each side of opening
            for &jamb_x in &[opening.start_mm, opening.start_mm + opening.width_mm] {
                members.push(ExtractedMember {
                    length_mm:  opening.height_mm,
                    is_vertical: true,
                    position_mm: jamb_x,
                });
            }
            // Header track above opening
            members.push(ExtractedMember {
                length_mm:  opening.width_mm,
                is_vertical: false,
                position_mm: opening.height_mm,
            });
        }

        members
    }

    fn in_opening(&self, x: f64) -> bool {
        self.openings.iter().any(|o| x > o.start_mm + 1.0 && x < o.start_mm + o.width_mm - 1.0)
    }

    fn stud_height_at(&self, _x: f64) -> f64 {
        // Full height unless inside an opening (already excluded)
        self.wall_height_mm
    }
}

// ── Truck B-Rep extractor (native feature only) ───────────────────────────────

/// Extracts steel framing members from a Truck B-Rep Solid.
///
/// Strategy:
/// 1. Enumerate all edges of the Solid
/// 2. Classify each edge by length and orientation (vertical = stud, horizontal = track)
/// 3. Filter to plausible steel member lengths (>100mm, <12000mm)
/// 4. Derive manufacturing operations from classified members
///
/// This is Phase 1 — simple walls only. Phase 2 adds opening detection.
/// See ADR-0014 for the full implementation roadmap.
#[cfg(feature = "native")]
pub struct TruckFrameExtractor<'a> {
    pub solid: &'a monstertruck_modeling::Solid,
}

#[cfg(feature = "native")]
impl<'a> FrameExtractor for TruckFrameExtractor<'a> {
    fn extract(&self, params: &ExtractParams) -> Result<Vec<Frameset>, ExtractError> {
        use monstertruck_modeling::{Edge, Tolerance};

        let members = self.classify_edges(params)?;
        if members.is_empty() {
            return Err(ExtractError::NoMembers);
        }

        let frameset = members_to_frameset(&members, params);
        Ok(vec![frameset])
    }
}

#[cfg(feature = "native")]
impl<'a> TruckFrameExtractor<'a> {
    /// Classify all edges of the solid into steel members.
    fn classify_edges(
        &self,
        params: &ExtractParams,
    ) -> Result<Vec<ExtractedMember>, ExtractError> {
        use monstertruck_modeling::Tolerance;

        let tol = params.orientation_tolerance_deg.to_radians();
        let mut members = Vec::new();

        // Walk all faces → edges → classify
        for shell in self.solid.boundaries() {
            for face in shell.face_iter() {
                for boundary in face.boundaries() {
                    for edge in boundary.edge_iter() {
                        if let Some(member) = self.edge_to_member(&edge, tol) {
                            // Deduplicate — same edge appears on two adjacent faces
                            let is_dup = members.iter().any(|m: &ExtractedMember| {
                                (m.length_mm - member.length_mm).abs() < 1.0
                                    && (m.position_mm - member.position_mm).abs() < 1.0
                                    && m.is_vertical == member.is_vertical
                            });
                            if !is_dup {
                                members.push(member);
                            }
                        }
                    }
                }
            }
        }

        Ok(members)
    }

    /// Try to interpret a single edge as a steel member.
    /// Returns None for edges that are clearly not members (too short, diagonal, etc.)
    fn edge_to_member(
        &self,
        edge: &monstertruck_modeling::Edge,
        orientation_tol_rad: f64,
    ) -> Option<ExtractedMember> {
        use monstertruck_modeling::ParametricCurve;

        // Get start and end points of the edge
        let curve = edge.oriented_curve();
        let range  = curve.parameter_range();
        let p0 = curve.subs(range.0);
        let p1 = curve.subs(range.1);

        // Length in mm (model units assumed to be mm)
        let diff = p1 - p0;
        let length_mm = diff.magnitude() * 1000.0; // convert m → mm if needed

        // Filter: plausible steel member lengths (100mm–12000mm)
        if length_mm < 100.0 || length_mm > 12_000.0 {
            return None;
        }

        // Classify orientation
        let dir = diff.normalize();
        let up = monstertruck_modeling::Vector3::unit_y();
        let angle_from_vertical = dir.dot(up).acos();

        let is_vertical = angle_from_vertical < orientation_tol_rad
            || (std::f64::consts::PI - angle_from_vertical) < orientation_tol_rad;
        let is_horizontal = (std::f64::consts::PI / 2.0 - angle_from_vertical).abs() < orientation_tol_rad;

        // Skip diagonals — not valid steel members in this context
        if !is_vertical && !is_horizontal {
            return None;
        }

        // Position: x-coordinate of the start point (for stud ordering)
        let position_mm = p0.x * 1000.0;

        Some(ExtractedMember {
            length_mm,
            is_vertical,
            position_mm,
        })
    }
}

// ── Member → Frameset conversion ──────────────────────────────────────────────
// Shared between ParametricWallExtractor and TruckFrameExtractor.

/// Convert a list of classified members into a Howick Frameset.
///
/// Each member produces an INV/NRM pair of Components (C-section faces both
/// directions). Manufacturing operations are derived from member type and length.
pub fn members_to_frameset(members: &[ExtractedMember], params: &ExtractParams) -> Frameset {
    let mut components = Vec::new();
    let mut idx = 1usize;

    for member in members {
        let ops = derive_operations(member, params);

        for label in [LabelOrientation::Inverted, LabelOrientation::Normal] {
            components.push(Component {
                id:         format!("{}-{}", params.frameset_name, idx),
                label,
                quantity:   1,
                length_mm:  member.length_mm,
                operations: ops.clone(),
            });
            idx += 1;
        }
    }

    Frameset {
        name:    params.frameset_name.clone(),
        unit:    Unit::Millimetre,
        profile: Profile {
            code:        params.profile_code.clone(),
            description: "Standard Profile".into(),
        },
        components,
    }
}

/// Derive Howick machine operations for a single classified member.
///
/// Rules derived from analysis of Prin's factory CSV files (T1 truss + W1 wall):
/// - Dimples come in pairs 50mm apart at each connection point
/// - First/last dimple pair is ~20mm from each end
/// - Lip cuts are at 23mm from each end (track-to-stud connection)
/// - Service holes at mid-height for studs > 600mm
/// - Tracks get dimples at stud spacing intervals
pub fn derive_operations(member: &ExtractedMember, params: &ExtractParams) -> Vec<Operation> {
    let len = member.length_mm;
    let mut ops = Vec::new();

    // Standard constants from factory CSV analysis
    const DIMPLE_END_OFFSET: f64 = 20.65;   // from end to first dimple
    const DIMPLE_PAIR_GAP:   f64 = 50.0;    // between paired dimples
    const LIP_CUT_OFFSET:    f64 = 23.0;    // lip cut from end

    if member.is_vertical {
        // ── Stud (C-section, vertical) ────────────────────────────────────

        // Dimple pairs at each end (connection to track)
        ops.push(Operation::Dimple(DIMPLE_END_OFFSET));
        ops.push(Operation::Dimple(DIMPLE_END_OFFSET + DIMPLE_PAIR_GAP));
        ops.push(Operation::Dimple(len - DIMPLE_END_OFFSET - DIMPLE_PAIR_GAP));
        ops.push(Operation::Dimple(len - DIMPLE_END_OFFSET));

        // Lip cuts at each end (stud inserts into U-track)
        ops.push(Operation::LipCut(LIP_CUT_OFFSET));
        ops.push(Operation::LipCut(len - LIP_CUT_OFFSET));

        // Service hole at mid-height (electrical/plumbing — Phase 1: single hole)
        if len > 600.0 {
            ops.push(Operation::ServiceHole(len / 2.0));
        }

    } else {
        // ── Track (U-section, horizontal) ─────────────────────────────────

        // Dimple pairs at each stud position along the track
        let mut pos = params.stud_spacing_mm;
        while pos < len - DIMPLE_END_OFFSET {
            ops.push(Operation::Dimple(pos));
            ops.push(Operation::Dimple(pos + DIMPLE_PAIR_GAP));
            pos += params.stud_spacing_mm;
        }

        // Lip cuts at track ends
        ops.push(Operation::LipCut(LIP_CUT_OFFSET));
        ops.push(Operation::LipCut(len - LIP_CUT_OFFSET));
    }

    ops
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn default_params() -> ExtractParams {
        ExtractParams {
            frameset_name: "W1".into(),
            profile_code:  "S8908".into(),
            stud_spacing_mm: 600.0,
            orientation_tolerance_deg: 5.0,
        }
    }

    #[test]
    fn parametric_wall_basic() {
        let extractor = ParametricWallExtractor {
            wall_length_mm:  4740.0,
            wall_height_mm:  2400.0,
            stud_spacing_mm: 600.0,
            openings:        vec![],
        };
        let params = default_params();
        let result = extractor.extract(&params).unwrap();
        assert_eq!(result.len(), 1);

        let frameset = &result[0];
        // 2 tracks + 9 stud positions = 11 members × 2 (INV/NRM) = 22 components
        assert_eq!(frameset.components.len(), 22);
    }

    #[test]
    fn parametric_wall_label_symmetry() {
        let extractor = ParametricWallExtractor {
            wall_length_mm:  4740.0,
            wall_height_mm:  2400.0,
            stud_spacing_mm: 600.0,
            openings:        vec![],
        };
        let frameset = extractor.extract(&default_params()).unwrap().remove(0);
        let inv = frameset.components.iter().filter(|c| c.label == LabelOrientation::Inverted).count();
        let nrm = frameset.components.iter().filter(|c| c.label == LabelOrientation::Normal).count();
        assert_eq!(inv, nrm, "INV/NRM must be equal");
    }

    #[test]
    fn parametric_wall_tracks_are_longest() {
        let extractor = ParametricWallExtractor {
            wall_length_mm:  4740.0,
            wall_height_mm:  2400.0,
            stud_spacing_mm: 600.0,
            openings:        vec![],
        };
        let frameset = extractor.extract(&default_params()).unwrap().remove(0);
        let max_len = frameset.components.iter().map(|c| c.length_mm as u64).max().unwrap();
        assert_eq!(max_len, 4740);
    }

    #[test]
    fn parametric_wall_studs_have_service_holes() {
        let extractor = ParametricWallExtractor {
            wall_length_mm:  4740.0,
            wall_height_mm:  2400.0,
            stud_spacing_mm: 600.0,
            openings:        vec![],
        };
        let frameset = extractor.extract(&default_params()).unwrap().remove(0);
        let has_service_holes = frameset.components.iter().any(|c| {
            c.operations.iter().any(|op| matches!(op, Operation::ServiceHole(_)))
        });
        assert!(has_service_holes, "Studs must have service holes");
    }

    #[test]
    fn parametric_wall_with_door_opening() {
        let extractor = ParametricWallExtractor {
            wall_length_mm:  4740.0,
            wall_height_mm:  2400.0,
            stud_spacing_mm: 600.0,
            openings: vec![WallOpening {
                start_mm:  900.0,
                width_mm:  900.0,
                height_mm: 2100.0,
            }],
        };
        let params = default_params();
        let frameset = extractor.extract(&params).unwrap().remove(0);

        // Must have more components than a plain wall (header + jamb studs)
        assert!(frameset.components.len() > 22,
            "Wall with opening must have extra jamb + header members");
    }

    #[test]
    fn derive_operations_stud_has_dimple_pairs() {
        let member = ExtractedMember {
            length_mm:   2400.0,
            is_vertical: true,
            position_mm: 0.0,
        };
        let ops = derive_operations(&member, &default_params());
        let dimples: Vec<f64> = ops.iter()
            .filter_map(|op| if let Operation::Dimple(p) = op { Some(*p) } else { None })
            .collect();
        assert_eq!(dimples.len(), 4, "Stud must have 4 dimples (2 pairs)");
        // First pair
        assert!((dimples[1] - dimples[0] - 50.0).abs() < 1.0,
            "Dimple pair gap must be ~50mm");
    }

    #[test]
    fn derive_operations_track_has_stud_dimples() {
        let member = ExtractedMember {
            length_mm:   4740.0,
            is_vertical: false,
            position_mm: 0.0,
        };
        let ops = derive_operations(&member, &default_params());
        let dimples: Vec<f64> = ops.iter()
            .filter_map(|op| if let Operation::Dimple(p) = op { Some(*p) } else { None })
            .collect();
        // At 600mm spacing in 4740mm: positions 600,650,1200,1250,... = many dimples
        assert!(dimples.len() >= 8, "Track must have dimples at stud positions");
    }

    #[test]
    fn frameset_roundtrips_to_csv() {
        let extractor = ParametricWallExtractor {
            wall_length_mm:  4740.0,
            wall_height_mm:  2400.0,
            stud_spacing_mm: 600.0,
            openings:        vec![],
        };
        let frameset  = extractor.extract(&default_params()).unwrap().remove(0);
        let csv       = howick_rs::csv::serialize(&frameset).unwrap();
        let reparsed  = howick_rs::csv::parse(&csv).unwrap();

        assert_eq!(frameset.name,              reparsed.name);
        assert_eq!(frameset.components.len(),  reparsed.components.len());
        assert_eq!(frameset.profile.code,      reparsed.profile.code);
    }
}
