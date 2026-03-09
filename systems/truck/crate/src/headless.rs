// Headless geometry engine for Cloudflare Workers (ADR-0018 Phase 0.5).
//
// Same execute() dispatch as wasm_app.rs SceneController, but without
// rendering dependencies (wgpu, winit, truck-platform, truck-rendimpl).
// Compiled when: target_arch = "wasm32" AND feature "rendering" is OFF.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use uuid::Uuid;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

use monstertruck_meshing::prelude::*;
use monstertruck_modeling::*;

use crate::commands::*;
use crate::{make_cube, make_cylinder, make_sphere, make_torus};

use ifc_lite_core as ifc;

// ---------------------------------------------------------------------------
// Console logging — WASM uses JS console.log, native uses println
// ---------------------------------------------------------------------------

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
    #[wasm_bindgen(js_namespace = console)]
    fn error(s: &str);
}

#[cfg(target_arch = "wasm32")]
macro_rules! log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}
#[cfg(target_arch = "wasm32")]
macro_rules! error {
    ($($t:tt)*) => (error(&format_args!($($t)*).to_string()))
}

#[cfg(not(target_arch = "wasm32"))]
macro_rules! log {
    ($($t:tt)*) => { let _ = format!($($t)*); }
}
#[cfg(not(target_arch = "wasm32"))]
macro_rules! error {
    ($($t:tt)*) => { let _ = format!($($t)*); }
}

// ---------------------------------------------------------------------------
// Data types (mirror wasm_app.rs, without rendering fields)
// ---------------------------------------------------------------------------

/// Per-object BIM metadata.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
struct BimMetadata {
    ifc_type: String,
    global_id: String,
    properties: HashMap<String, String>,
}

/// Simplified BIM node for hierarchy export.
#[derive(Serialize, Deserialize, Clone, Debug)]
struct BimNodeJson {
    #[serde(rename = "entityId")]
    entity_id: u32,
    #[serde(rename = "globalId")]
    global_id: String,
    #[serde(rename = "ifcType")]
    ifc_type: String,
    name: String,
    #[serde(rename = "objectId")]
    object_id: Option<String>,
    children: Vec<u32>,
}

/// Visual style (kept for import/export scene JSON compatibility).
#[derive(Serialize, Deserialize, Clone, Debug)]
struct ObjectStyle {
    albedo: [f64; 4],
    roughness: f64,
    reflectance: f64,
    ambient_ratio: f64,
}

impl Default for ObjectStyle {
    fn default() -> Self {
        ObjectStyle {
            albedo: [0.2, 0.6, 1.0, 1.0],
            roughness: 0.3,
            reflectance: 0.5,
            ambient_ratio: 0.05,
        }
    }
}

/// Headless scene object — geometry only, no rendering instances.
struct HeadlessObject {
    id: Uuid,
    name: String,
    solid: Option<Solid>,
    mesh: PolygonMesh,
    style: ObjectStyle,
    bim: Option<BimMetadata>,
}

/// Import/export format (compatible with wasm_app.rs ExportEntry).
#[derive(Serialize, Deserialize)]
struct ExportEntry {
    id: String,
    #[serde(default)]
    name: String,
    solid: Option<Solid>,
    mesh: Option<PolygonMesh>,
    #[serde(default)]
    style: Option<ObjectStyle>,
    #[serde(default)]
    bim: Option<BimMetadata>,
    /// Precomputed bounding sphere for Phase 3 progressive loading (ADR-0025).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    bounding_sphere: Option<[f64; 4]>,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn next_name(counters: &mut HashMap<String, usize>, kind: &str) -> String {
    let count = counters.entry(kind.to_string()).or_insert(0);
    *count += 1;
    format!("{} {}", kind, count)
}

fn tessellate_solid(solid: &Solid) -> PolygonMesh {
    let mut bdd_box: BoundingBox<Point3> = BoundingBox::new();
    solid
        .boundaries()
        .iter()
        .flatten()
        .flat_map(Face::boundaries)
        .flatten()
        .for_each(|edge| {
            let curve = edge.oriented_curve();
            bdd_box += match curve {
                Curve::Line(line) => vec![line.0, line.1].into_iter().collect(),
                Curve::BsplineCurve(curve) => {
                    let bdb = curve.roughly_bounding_box();
                    vec![bdb.max(), bdb.min()].into_iter().collect()
                }
                Curve::NurbsCurve(curve) => curve.roughly_bounding_box(),
                Curve::IntersectionCurve(_) => BoundingBox::new(),
            };
        });
    let size = bdd_box.size();
    solid.triangulation(size * 0.005).to_polygon()
}

// ---------------------------------------------------------------------------
// HeadlessController — wasm_bindgen API
// ---------------------------------------------------------------------------

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct HeadlessController {
    objects: Vec<HeadlessObject>,
    id_to_index: HashMap<String, usize>,
    name_counters: HashMap<String, usize>,
    active_sketch: Option<crate::sketch::Sketch>,
}

fn rebuild_id_index(objects: &[HeadlessObject], id_to_index: &mut HashMap<String, usize>) {
    id_to_index.clear();
    for (i, obj) in objects.iter().enumerate() {
        id_to_index.insert(obj.id.to_string(), i);
    }
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl HeadlessController {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(constructor))]
    pub fn new() -> HeadlessController {
        #[cfg(target_arch = "wasm32")]
        {
            std::panic::set_hook(Box::new(console_error_panic_hook::hook));
            let _ = console_log::init_with_level(log::Level::Info);
        }
        log!("headless: HeadlessController::new()");
        HeadlessController {
            objects: Vec::new(),
            id_to_index: HashMap::new(),
            name_counters: HashMap::new(),
            active_sketch: None,
        }
    }

    // ── Primitives ──────────────────────────────────────────

    fn add_solid(&mut self, solid: Solid, kind: &str, bim: Option<BimMetadata>) -> String {
        let id = Uuid::new_v4();
        let idx = self.objects.len();
        let name = next_name(&mut self.name_counters, kind);
        let mesh = tessellate_solid(&solid);
        let id_str = id.to_string();
        self.id_to_index.insert(id_str.clone(), idx);
        self.objects.push(HeadlessObject {
            id,
            name,
            solid: Some(solid),
            mesh,
            style: ObjectStyle::default(),
            bim,
        });
        id_str
    }

    fn add_mesh(&mut self, mesh: PolygonMesh, kind: &str, bim: Option<BimMetadata>) -> String {
        let id = Uuid::new_v4();
        let idx = self.objects.len();
        let name = next_name(&mut self.name_counters, kind);
        let id_str = id.to_string();
        self.id_to_index.insert(id_str.clone(), idx);
        self.objects.push(HeadlessObject {
            id,
            name,
            solid: None,
            mesh,
            style: ObjectStyle::default(),
            bim,
        });
        id_str
    }

    pub fn add_cube(&mut self, size: f64) -> String {
        log!("headless: add_cube({})", size);
        let solid = match make_cube(size) {
            Ok(s) => s,
            Err(e) => { log!("add_cube error: {}", e); return String::new(); }
        };
        self.add_solid(solid, "Box", None)
    }

    pub fn add_sphere(&mut self, radius: f64) -> String {
        log!("headless: add_sphere({})", radius);
        let solid = match make_sphere(radius) {
            Ok(s) => s,
            Err(e) => { log!("add_sphere error: {}", e); return String::new(); }
        };
        self.add_solid(solid, "Sphere", None)
    }

    pub fn add_cylinder(&mut self, radius: f64, height: f64) -> String {
        log!("headless: add_cylinder({}, {})", radius, height);
        let solid = match make_cylinder(radius, height) {
            Ok(s) => s,
            Err(e) => { log!("add_cylinder error: {}", e); return String::new(); }
        };
        self.add_solid(solid, "Cylinder", None)
    }

    pub fn add_torus(&mut self, major_r: f64, minor_r: f64) -> String {
        log!("headless: add_torus({}, {})", major_r, minor_r);
        let solid = match make_torus(major_r, minor_r) {
            Ok(s) => s,
            Err(e) => { log!("add_torus error: {}", e); return String::new(); }
        };
        self.add_solid(solid, "Torus", None)
    }

    // ── Transforms ──────────────────────────────────────────

    pub fn translate_object(&mut self, id: &str, dx: f64, dy: f64, dz: f64) -> bool {
        let idx = match self.id_to_index.get(id) { Some(&i) => i, None => return false };
        let solid = match &self.objects[idx].solid {
            Some(s) => s,
            None => return false,
        };
        let solid = builder::translated(solid, Vector3::new(dx, dy, dz));
        let mesh = tessellate_solid(&solid);
        self.objects[idx].solid = Some(solid);
        self.objects[idx].mesh = mesh;
        true
    }

    pub fn rotate_object(&mut self, id: &str, axis_x: f64, axis_y: f64, axis_z: f64, angle_deg: f64) -> bool {
        let idx = match self.id_to_index.get(id) { Some(&i) => i, None => return false };
        let axis = Vector3::new(axis_x, axis_y, axis_z);
        if axis.so_small() { return false; }
        let solid = match &self.objects[idx].solid {
            Some(s) => s,
            None => return false,
        };
        let solid = builder::rotated(solid, Point3::origin(), axis.normalize(), Rad(angle_deg * std::f64::consts::PI / 180.0));
        let mesh = tessellate_solid(&solid);
        self.objects[idx].solid = Some(solid);
        self.objects[idx].mesh = mesh;
        true
    }

    pub fn scale_object(&mut self, id: &str, sx: f64, sy: f64, sz: f64) -> bool {
        let idx = match self.id_to_index.get(id) { Some(&i) => i, None => return false };
        let solid = match &self.objects[idx].solid {
            Some(s) => s,
            None => return false,
        };
        let solid = builder::scaled(solid, Point3::origin(), Vector3::new(sx, sy, sz));
        let mesh = tessellate_solid(&solid);
        self.objects[idx].solid = Some(solid);
        self.objects[idx].mesh = mesh;
        true
    }

    pub fn duplicate_object(&mut self, id: &str) -> String {
        let (solid, src_name, bim) = {
            let idx = match self.id_to_index.get(id) { Some(&i) => i, None => return String::new() };
            let solid = match &self.objects[idx].solid { Some(s) => s.clone(), None => return String::new() };
            (solid, self.objects[idx].name.clone(), self.objects[idx].bim.clone())
        };
        let dup_solid = builder::translated(&solid, Vector3::new(0.5, 0.0, 0.0));
        let kind = src_name.rsplitn(2, ' ').last().unwrap_or("Object");
        self.add_solid(dup_solid, kind, bim)
    }

    // ── Booleans ────────────────────────────────────────────

    pub fn boolean_union(&mut self, id_a: &str, id_b: &str) -> String {
        log!("headless: boolean_union({}, {})", id_a, id_b);
        self.bool_op_impl(id_a, id_b, crate::bool_union, "Union")
    }

    pub fn boolean_subtract(&mut self, id_a: &str, id_b: &str) -> String {
        log!("headless: boolean_subtract({}, {})", id_a, id_b);
        self.bool_op_impl(id_a, id_b, crate::bool_subtract, "Subtraction")
    }

    pub fn boolean_intersect(&mut self, id_a: &str, id_b: &str) -> String {
        log!("headless: boolean_intersect({}, {})", id_a, id_b);
        self.bool_op_impl(id_a, id_b, crate::bool_intersect, "Intersection")
    }

    fn bool_op_impl(&mut self, id_a: &str, id_b: &str, op: fn(&Solid, &Solid) -> Option<Solid>, label: &str) -> String {
        let idx_a = match self.id_to_index.get(id_a) { Some(&i) => i, None => return String::new() };
        let idx_b = match self.id_to_index.get(id_b) { Some(&i) => i, None => return String::new() };
        if idx_a == idx_b { return String::new(); }

        let solid_a = match &self.objects[idx_a].solid { Some(s) => s.clone(), None => return String::new() };
        let solid_b = match &self.objects[idx_b].solid { Some(s) => s.clone(), None => return String::new() };

        match op(&solid_a, &solid_b) {
            Some(solid) => {
                let (lo, hi) = if idx_a < idx_b { (idx_a, idx_b) } else { (idx_b, idx_a) };
                self.objects.remove(hi);
                self.objects.remove(lo);
                rebuild_id_index(&self.objects, &mut self.id_to_index);
                self.add_solid(solid, label, None)
            }
            None => {
                error!("Boolean {} failed", label.to_lowercase());
                String::new()
            }
        }
    }

    // ── Scene management ────────────────────────────────────

    pub fn delete_object(&mut self, id: &str) -> bool {
        let idx = match self.id_to_index.get(id) { Some(&i) => i, None => return false };
        self.objects.remove(idx);
        rebuild_id_index(&self.objects, &mut self.id_to_index);
        true
    }

    pub fn clear_scene(&mut self) {
        self.objects.clear();
        self.id_to_index.clear();
    }

    pub fn object_count(&self) -> usize {
        self.objects.len()
    }

    pub fn object_ids(&self) -> Vec<String> {
        self.objects.iter().map(|o| o.id.to_string()).collect()
    }

    // ── Export ───────────────────────────────────────────────

    pub fn export_scene(&self) -> String {
        let entries: Vec<ExportEntry> = self.objects.iter().map(|obj| {
            let bs = obj.solid.as_ref()
                .map(|s| crate::compute_bounding_sphere(s))
                .map(|(c, r)| [c.x, c.y, c.z, r]);
            ExportEntry {
                id: obj.id.to_string(),
                name: obj.name.clone(),
                solid: obj.solid.clone(),
                mesh: Some(obj.mesh.clone()),
                style: Some(obj.style.clone()),
                bim: obj.bim.clone(),
                bounding_sphere: bs,
            }
        }).collect();
        serde_json::to_string_pretty(&entries).unwrap_or_else(|e| {
            error!("Export failed: {}", e);
            "[]".to_string()
        })
    }

    pub fn export_step(&self) -> String {
        use monstertruck_step::save::*;
        log!("headless: export_step processing {} objects", self.objects.len());
        let compressed_solids: Vec<_> = self.objects.iter()
            .filter_map(|obj| obj.solid.as_ref().map(|s| s.compress()))
            .collect();
        if compressed_solids.is_empty() {
            return String::new();
        }
        let models = StepModels::from_iter(compressed_solids.iter());
        CompleteStepDisplay::new(
            models,
            StepHeaderDescriptor {
                organization_system: "truck-cad headless".to_owned(),
                ..Default::default()
            },
        ).to_string()
    }

    pub fn export_obj(&self) -> String {
        use monstertruck_mesh::obj;
        let meshes: Vec<_> = self.objects.iter().map(|obj| obj.mesh.clone()).collect();
        let mut buf = Vec::new();
        if obj::write_vec(&meshes, &mut buf).is_ok() {
            String::from_utf8_lossy(&buf).into_owned()
        } else {
            String::new()
        }
    }

    pub fn export_stl(&self) -> String {
        use monstertruck_mesh::stl;
        let mut meshes = PolygonMesh::default();
        for obj in &self.objects {
            meshes.merge(obj.mesh.clone());
        }
        let mut buf = Vec::new();
        if stl::write(&meshes, &mut buf, stl::StlType::Ascii).is_ok() {
            String::from_utf8_lossy(&buf).into_owned()
        } else {
            String::new()
        }
    }

    // ── Import ──────────────────────────────────────────────

    pub fn import_scene(&mut self, json: &str) -> bool {
        let entries: Vec<ExportEntry> = match serde_json::from_str(json) {
            Ok(e) => e,
            Err(e) => {
                error!("Import failed: {}", e);
                return false;
            }
        };
        self.objects.clear();
        self.id_to_index.clear();
        for entry in entries {
            let id = Uuid::parse_str(&entry.id).unwrap_or_else(|_| Uuid::new_v4());
            let idx = self.objects.len();
            let style = entry.style.unwrap_or_default();
            let name = if entry.name.is_empty() { format!("Object {}", idx + 1) } else { entry.name };

            if let Some(solid) = entry.solid {
                let mesh = tessellate_solid(&solid);
                let id_str = id.to_string();
                self.id_to_index.insert(id_str, idx);
                self.objects.push(HeadlessObject { id, name, solid: Some(solid), mesh, style, bim: entry.bim });
            } else if let Some(mesh) = entry.mesh {
                let id_str = id.to_string();
                self.id_to_index.insert(id_str, idx);
                self.objects.push(HeadlessObject { id, name, solid: None, mesh, style, bim: entry.bim });
            }
        }
        log!("headless: Imported {} objects", self.objects.len());
        true
    }

    // ── Clash detection ─────────────────────────────────────

    pub fn clash_detect(&self, id_a: &str, id_b: &str) -> bool {
        let idx_a = match self.id_to_index.get(id_a) { Some(&i) => i, None => return false };
        let idx_b = match self.id_to_index.get(id_b) { Some(&i) => i, None => return false };
        let solid_a = match &self.objects[idx_a].solid { Some(s) => s, None => return false };
        let solid_b = match &self.objects[idx_b].solid { Some(s) => s, None => return false };
        crate::clash_detect_solids(solid_a, solid_b)
    }

    // ── Sketch ──────────────────────────────────────────────

    fn sketch_import_inner(&mut self, json: &str) -> bool {
        match serde_json::from_str::<crate::sketch::Sketch>(json) {
            Ok(sketch) => {
                log!("headless: sketch imported, {} points, {} edges",
                    sketch.points.len(), sketch.edges.len());
                self.active_sketch = Some(sketch);
                true
            }
            Err(e) => {
                error!("headless: sketch_import failed: {}", e);
                false
            }
        }
    }

    fn sketch_extrude_inner(&mut self, height: f64) -> String {
        let sketch = match self.active_sketch.take() {
            Some(sk) => sk,
            None => { error!("headless: sketch_extrude with no active sketch"); return String::new(); }
        };
        match crate::sketch::sketch_to_solid(&sketch, height) {
            Ok(solid) => {
                log!("headless: sketch extruded, height={}", height);
                self.add_solid(solid, "Extruded", None)
            }
            Err(e) => {
                error!("headless: sketch_extrude failed: {}", e);
                self.active_sketch = Some(sketch);
                String::new()
            }
        }
    }

    // ── BIM metadata ────────────────────────────────────────

    pub fn get_bim_metadata(&self, id: &str) -> String {
        let idx = match self.id_to_index.get(id) { Some(&i) => i, None => return String::new() };
        match &self.objects[idx].bim {
            Some(bim) => serde_json::to_string(bim).unwrap_or_default(),
            None => String::new(),
        }
    }

    // ── Domain dispatchers (ADR-0019: domain-organized dispatch) ──

    fn dispatch_geometry(&mut self, cmd: &str, p: serde_json::Value) -> Option<serde_json::Value> {
        match cmd {
            "add_cube" => {
                let params: AddCubeParams = serde_json::from_value(p).unwrap_or(AddCubeParams { size: 1.0 });
                Some(match params.validate() {
                    Err(e) => serde_json::json!({ "error": e }),
                    Ok(()) => serde_json::json!({ "objectId": self.add_cube(params.size) }),
                })
            }
            "add_sphere" => {
                let params: AddSphereParams = serde_json::from_value(p).unwrap_or(AddSphereParams { radius: 1.0 });
                Some(match params.validate() {
                    Err(e) => serde_json::json!({ "error": e }),
                    Ok(()) => serde_json::json!({ "objectId": self.add_sphere(params.radius) }),
                })
            }
            "add_cylinder" => {
                let params: AddCylinderParams = serde_json::from_value(p).unwrap_or(AddCylinderParams { radius: 0.5, height: 1.0 });
                Some(match params.validate() {
                    Err(e) => serde_json::json!({ "error": e }),
                    Ok(()) => serde_json::json!({ "objectId": self.add_cylinder(params.radius, params.height) }),
                })
            }
            "add_torus" => {
                let params: AddTorusParams = serde_json::from_value(p).unwrap_or(AddTorusParams { major_radius: 1.0, minor_radius: 0.3 });
                Some(match params.validate() {
                    Err(e) => serde_json::json!({ "error": e }),
                    Ok(()) => serde_json::json!({ "objectId": self.add_torus(params.major_radius, params.minor_radius) }),
                })
            }
            "translate" => Some(match serde_json::from_value::<TranslateParams>(p) {
                Ok(params) => {
                    let ok = self.translate_object(&params.object_id, params.dx, params.dy, params.dz);
                    if ok { serde_json::json!({ "success": true }) }
                    else { serde_json::json!({ "error": format!("Object '{}' not found", params.object_id) }) }
                }
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),
            "rotate" => Some(match serde_json::from_value::<RotateParams>(p) {
                Ok(params) => match params.validate() {
                    Err(e) => serde_json::json!({ "error": e }),
                    Ok(()) => {
                        let ok = self.rotate_object(&params.object_id, params.axis_x, params.axis_y, params.axis_z, params.angle_deg);
                        if ok { serde_json::json!({ "success": true }) }
                        else { serde_json::json!({ "error": format!("Object '{}' not found", params.object_id) }) }
                    }
                }
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),
            "scale" => Some(match serde_json::from_value::<ScaleParams>(p) {
                Ok(params) => match params.validate() {
                    Err(e) => serde_json::json!({ "error": e }),
                    Ok(()) => {
                        let ok = self.scale_object(&params.object_id, params.sx, params.sy, params.sz);
                        if ok { serde_json::json!({ "success": true }) }
                        else { serde_json::json!({ "error": format!("Object '{}' not found", params.object_id) }) }
                    }
                }
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),
            "duplicate" => Some(match serde_json::from_value::<ObjectIdParam>(p) {
                Ok(params) => {
                    let id = self.duplicate_object(&params.object_id);
                    if id.is_empty() { serde_json::json!({ "error": "Duplicate failed" }) }
                    else { serde_json::json!({ "objectId": id }) }
                }
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),
            _ => None,
        }
    }

    fn dispatch_booleans(&mut self, cmd: &str, p: serde_json::Value) -> Option<serde_json::Value> {
        match cmd {
            "boolean_union" => Some(match serde_json::from_value::<BooleanParams>(p) {
                Ok(params) => {
                    let id = self.boolean_union(&params.id_a, &params.id_b);
                    if id.is_empty() { serde_json::json!({ "error": "Union failed" }) }
                    else { serde_json::json!({ "objectId": id }) }
                }
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),
            "boolean_subtract" => Some(match serde_json::from_value::<BooleanParams>(p) {
                Ok(params) => {
                    let id = self.boolean_subtract(&params.id_a, &params.id_b);
                    if id.is_empty() { serde_json::json!({ "error": "Subtract failed" }) }
                    else { serde_json::json!({ "objectId": id }) }
                }
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),
            "boolean_intersect" => Some(match serde_json::from_value::<BooleanParams>(p) {
                Ok(params) => {
                    let id = self.boolean_intersect(&params.id_a, &params.id_b);
                    if id.is_empty() { serde_json::json!({ "error": "Intersect failed" }) }
                    else { serde_json::json!({ "objectId": id }) }
                }
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),
            "clash_detect" => Some(match serde_json::from_value::<BooleanParams>(p) {
                Ok(params) => serde_json::json!({ "clash": self.clash_detect(&params.id_a, &params.id_b) }),
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),
            _ => None,
        }
    }

    fn dispatch_sketch(&mut self, cmd: &str, p: serde_json::Value) -> Option<serde_json::Value> {
        use crate::sketch::{Sketch, SketchPlane};

        match cmd {
            "begin_sketch" => Some(match serde_json::from_value::<BeginSketchParams>(p) {
                Ok(params) => {
                    let plane = match params.plane.as_str() {
                        "xz" => SketchPlane::XZ,
                        "yz" => SketchPlane::YZ,
                        _ => SketchPlane::XY,
                    };
                    let sketch = Sketch::new(plane);
                    let id = sketch.id.to_string();
                    self.active_sketch = Some(sketch);
                    serde_json::json!({ "sketchId": id })
                }
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),

            "sketch_add_point" => Some(match serde_json::from_value::<SketchAddPointParams>(p) {
                Ok(params) => match self.active_sketch.as_mut() {
                    Some(sketch) => {
                        let id = sketch.add_point(params.x, params.y);
                        serde_json::json!({ "pointId": id.to_string() })
                    }
                    None => serde_json::json!({ "error": "No active sketch" }),
                },
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),

            "sketch_add_edge" => Some(match serde_json::from_value::<SketchAddEdgeParams>(p) {
                Ok(params) => match self.active_sketch.as_mut() {
                    Some(sketch) => {
                        let p0 = match uuid::Uuid::parse_str(&params.p0_id) {
                            Ok(u) => u, Err(_) => return Some(serde_json::json!({ "error": "Invalid p0Id" })),
                        };
                        let p1 = match uuid::Uuid::parse_str(&params.p1_id) {
                            Ok(u) => u, Err(_) => return Some(serde_json::json!({ "error": "Invalid p1Id" })),
                        };
                        let id = sketch.add_edge(p0, p1);
                        serde_json::json!({ "edgeId": id.to_string() })
                    }
                    None => serde_json::json!({ "error": "No active sketch" }),
                },
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),

            "sketch_add_constraint" => Some(match serde_json::from_value::<SketchAddConstraintParams>(p) {
                Ok(params) => match self.active_sketch.as_mut() {
                    Some(sketch) => {
                        let cp: serde_json::Value = match serde_json::from_str(&params.params) {
                            Ok(v) => v,
                            Err(e) => return Some(serde_json::json!({ "error": format!("Invalid constraint params: {}", e) })),
                        };
                        let kind = match crate::commands::sketch::parse_constraint_kind(&params.constraint_type, &cp) {
                            Ok(k) => k,
                            Err(e) => return Some(serde_json::json!({ "error": e })),
                        };
                        let id = sketch.add_constraint(kind);
                        serde_json::json!({ "constraintId": id.to_string() })
                    }
                    None => serde_json::json!({ "error": "No active sketch" }),
                },
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),

            "sketch_solve" => Some(match &self.active_sketch {
                Some(sketch) => match crate::sketch::solve_sketch(sketch) {
                    Ok(solved) => {
                        let result: Vec<serde_json::Value> = solved.positions.iter()
                            .map(|(id, x, y)| serde_json::json!({ "id": id.to_string(), "x": x, "y": y }))
                            .collect();
                        serde_json::json!({ "solved": result })
                    }
                    Err(e) => serde_json::json!({ "error": format!("Solve failed: {}", e) }),
                },
                None => serde_json::json!({ "error": "No active sketch" }),
            }),

            "sketch_cancel" => {
                self.active_sketch = None;
                Some(serde_json::json!({ "success": true }))
            }

            "sketch_export" => Some(match &self.active_sketch {
                Some(sketch) => match serde_json::to_string(sketch) {
                    Ok(json) => serde_json::json!({ "sketchJson": json }),
                    Err(e) => serde_json::json!({ "error": format!("Export failed: {}", e) }),
                },
                None => serde_json::json!({ "error": "No active sketch" }),
            }),

            "sketch_extrude" => Some(match serde_json::from_value::<SketchExtrudeParams>(p) {
                Ok(params) => {
                    if params.sketch_json.is_empty() || params.height <= 0.0 {
                        serde_json::json!({ "error": "Missing sketchJson or height" })
                    } else if !self.sketch_import_inner(&params.sketch_json) {
                        serde_json::json!({ "error": "Invalid sketch JSON" })
                    } else {
                        let id = self.sketch_extrude_inner(params.height);
                        if id.is_empty() { serde_json::json!({ "error": "Extrude failed" }) }
                        else { serde_json::json!({ "objectId": id }) }
                    }
                }
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),
            "quick_rect_extrude" => Some(match serde_json::from_value::<QuickRectExtrudeParams>(p) {
                Ok(params) => {
                    if params.width <= 0.0 || params.height <= 0.0 || params.depth <= 0.0 {
                        serde_json::json!({ "error": "width, height, depth must all be > 0" })
                    } else {
                        let plane = match params.plane.as_deref().unwrap_or("xy") {
                            "xz" => crate::sketch::SketchPlane::XZ,
                            "yz" => crate::sketch::SketchPlane::YZ,
                            _    => crate::sketch::SketchPlane::XY,
                        };
                        let sketch = crate::sketch::quick_rect_sketch(params.width, params.height, plane);
                        match crate::sketch::sketch_to_solid(&sketch, params.depth) {
                            Ok(solid) => {
                                let id = self.add_solid(solid, "QuickRect", None);
                                serde_json::json!({ "objectId": id })
                            }
                            Err(e) => {
                                error!("headless: quick_rect_extrude failed: {}", e);
                                serde_json::json!({ "error": format!("Extrude failed: {}", e) })
                            }
                        }
                    }
                }
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),
            _ => None,
        }
    }

    fn dispatch_scene(&mut self, cmd: &str, p: serde_json::Value) -> Option<serde_json::Value> {
        match cmd {
            "delete" => Some(match serde_json::from_value::<ObjectIdParam>(p) {
                Ok(params) => { self.delete_object(&params.object_id); serde_json::json!({ "success": true }) }
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),
            "clear" => { self.clear_scene(); Some(serde_json::json!({ "success": true })) }
            "export_scene" => Some(serde_json::json!({ "scene": self.export_scene() })),
            "export_step" => {
                let step = self.export_step();
                Some(if step.is_empty() { serde_json::json!({ "error": "Export failed" }) }
                     else { serde_json::json!({ "step": step }) })
            }
            "export_obj" => {
                let obj = self.export_obj();
                Some(if obj.is_empty() { serde_json::json!({ "error": "Export failed" }) }
                     else { serde_json::json!({ "obj": obj }) })
            }
            "export_stl" => {
                let stl = self.export_stl();
                Some(if stl.is_empty() { serde_json::json!({ "error": "Export failed" }) }
                     else { serde_json::json!({ "stl": stl }) })
            }
            "import_scene" => Some(match serde_json::from_value::<ImportSceneParams>(p) {
                Ok(params) => serde_json::json!({ "success": self.import_scene(&params.json) }),
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),
            "import_step" => Some(match serde_json::from_value::<ImportStepParams>(p) {
                Ok(params) => {
                    log!("headless: import_step data length={}", params.data.len());
                    use monstertruck_step::load::*;
                    match Table::from_step(&params.data) {
                        Some(table) => {
                            let mut count = 0;
                            for step_solid in table.manifold_solid_brep.values() {
                                if let Ok(csolid) = table.to_compressed_solid(step_solid) {
                                    for cshell in csolid.boundaries {
                                        let pre = cshell.triangulation(0.01).to_polygon();
                                        let bdd = pre.bounding_box();
                                        let mesh = cshell.triangulation(bdd.diameter() * 0.001).to_polygon();
                                        self.add_mesh(mesh, "STEP Mesh", None);
                                        count += 1;
                                    }
                                }
                            }
                            log!("headless: Imported {} meshes from STEP", count);
                            serde_json::json!({ "success": true, "meshCount": count })
                        }
                        None => {
                            error!("headless: STEP parse failed");
                            serde_json::json!({ "error": "STEP parse failed" })
                        }
                    }
                }
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),
            "import_ifc" => Some(match serde_json::from_value::<ImportIfcParams>(p) {
                Ok(params) => {
                    log!("headless: import_ifc data length={}", params.data.len());
                    let index = ifc::build_entity_index(&params.data);
                    let ids: Vec<u32> = index.keys().cloned().collect();
                    let mut decoder = ifc::EntityDecoder::with_index(&params.data, index);
                    let router = ifc_lite_geometry::router::GeometryRouter::new();

                    let mut count = 0;
                    let mut entity_to_uuid = HashMap::new();
                    let mut hierarchy_map: HashMap<u32, BimNodeJson> = HashMap::new();

                    for &id in &ids {
                        if let Ok(entity) = decoder.decode_by_id(id) {
                            let type_name: &str = entity.ifc_type.as_str();
                            let is_spatial = matches!(entity.ifc_type,
                                ifc::IfcType::IfcProject | ifc::IfcType::IfcSite | ifc::IfcType::IfcBuilding | ifc::IfcType::IfcBuildingStorey);

                            if is_spatial || ifc::generated::has_geometry_by_name(type_name) {
                                let mut object_id = None;

                                if ifc::generated::has_geometry_by_name(type_name) {
                                    if let Ok(ifc_mesh) = router.process_element(&entity, &mut decoder) {
                                        if !ifc_mesh.positions.is_empty() && !ifc_mesh.indices.is_empty() {
                                            let mut positions = Vec::new();
                                            for i in (0..ifc_mesh.positions.len()).step_by(3) {
                                                positions.push(Point3::new(
                                                    ifc_mesh.positions[i] as f64,
                                                    ifc_mesh.positions[i+1] as f64,
                                                    ifc_mesh.positions[i+2] as f64
                                                ));
                                            }
                                            let mut faces_vec = Vec::new();
                                            for i in (0..ifc_mesh.indices.len()).step_by(3) {
                                                let i0 = ifc_mesh.indices[i] as usize;
                                                let i1 = ifc_mesh.indices[i+1] as usize;
                                                let i2 = ifc_mesh.indices[i+2] as usize;
                                                faces_vec.push(vec![
                                                    StandardVertex { pos: i0, uv: None, nor: None },
                                                    StandardVertex { pos: i1, uv: None, nor: None },
                                                    StandardVertex { pos: i2, uv: None, nor: None },
                                                ]);
                                            }
                                            let poly = PolygonMesh::new(
                                                StandardAttributes { positions, ..Default::default() },
                                                Faces::from_iter(faces_vec)
                                            );
                                            let bim = BimMetadata {
                                                ifc_type: type_name.to_string(),
                                                global_id: entity.get_string(0).unwrap_or("").to_string(),
                                                properties: HashMap::new(),
                                            };
                                            let uuid = self.add_mesh(poly, type_name, Some(bim));
                                            entity_to_uuid.insert(id, uuid.clone());
                                            object_id = Some(uuid);
                                            count += 1;
                                        }
                                    }
                                }

                                hierarchy_map.insert(id, BimNodeJson {
                                    entity_id: id,
                                    global_id: entity.get_string(0).unwrap_or("").to_string(),
                                    ifc_type: type_name.to_string(),
                                    name: entity.get_string(2).unwrap_or(type_name).to_string(),
                                    object_id,
                                    children: Vec::new(),
                                });
                            }
                        }
                    }

                    // Second pass: relationships
                    for &id in &ids {
                        if let Ok(entity) = decoder.decode_by_id(id) {
                            match entity.ifc_type {
                                ifc::IfcType::IfcRelAggregates => {
                                    if let Some(parent_id) = entity.get_ref(4) {
                                        if let Some(children) = entity.get_list(5) {
                                            for child_attr in children {
                                                if let Some(child_id) = child_attr.as_entity_ref() {
                                                    if let Some(parent_node) = hierarchy_map.get_mut(&parent_id) {
                                                        parent_node.children.push(child_id);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                ifc::IfcType::IfcRelContainedInSpatialStructure => {
                                    if let Some(parent_id) = entity.get_ref(5) {
                                        if let Some(children) = entity.get_list(4) {
                                            for child_attr in children {
                                                if let Some(child_id) = child_attr.as_entity_ref() {
                                                    if let Some(parent_node) = hierarchy_map.get_mut(&parent_id) {
                                                        parent_node.children.push(child_id);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                _ => {}
                            }
                        }
                    }

                    log!("headless: Imported {} entities from IFC", count);
                    let nodes: Vec<BimNodeJson> = hierarchy_map.into_values().collect();
                    serde_json::json!({ "success": true, "meshCount": count, "hierarchy": nodes })
                }
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),
            _ => None,
        }
    }

    fn dispatch_style(&mut self, cmd: &str, p: serde_json::Value) -> Option<serde_json::Value> {
        match cmd {
            "get_state" => {
                let ids: Vec<String> = self.objects.iter().map(|o| o.id.to_string()).collect();
                let names: HashMap<String, String> = self.objects.iter().map(|o| (o.id.to_string(), o.name.clone())).collect();
                Some(serde_json::json!({
                    "ready": true,
                    "headless": true,
                    "objectCount": ids.len(),
                    "objectIds": ids,
                    "objectNames": names,
                }))
            }
            "rename" => Some(match serde_json::from_value::<RenameParams>(p) {
                Ok(params) => {
                    let idx = match self.id_to_index.get(&params.object_id) {
                        Some(&i) => i,
                        None => return Some(serde_json::json!({"error":"not found"})),
                    };
                    self.objects[idx].name = params.name;
                    serde_json::json!({ "success": true })
                }
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),
            "get_bim_metadata" => Some(match serde_json::from_value::<ObjectIdParam>(p) {
                Ok(params) => {
                    let json = self.get_bim_metadata(&params.object_id);
                    if json.is_empty() { serde_json::json!({ "bim": null }) }
                    else {
                        match serde_json::from_str::<serde_json::Value>(&json) {
                            Ok(v) => serde_json::json!({ "bim": v }),
                            Err(_) => serde_json::json!({ "error": "Parse error" }),
                        }
                    }
                }
                Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
            }),
            // Rendering-only commands (not available headless)
            "select_at" | "pick_at" | "select" | "deselect" |
            "set_camera" | "set_style" | "set_color" | "get_object_style" |
            "pick_mesh_stats" => {
                Some(serde_json::json!({ "error": format!("Command '{}' requires rendering (not available in headless mode)", cmd) }))
            }
            _ => None,
        }
    }

    // ── Universal dispatcher (ADR-0019: domain-routed) ──────

    pub fn execute(&mut self, cmd_type: &str, params_json: &str) -> String {
        let p: serde_json::Value = serde_json::from_str(params_json).unwrap_or(serde_json::json!({}));

        let result = self.dispatch_geometry(cmd_type, p.clone())
            .or_else(|| self.dispatch_booleans(cmd_type, p.clone()))
            .or_else(|| self.dispatch_sketch(cmd_type, p.clone()))
            .or_else(|| self.dispatch_scene(cmd_type, p.clone()))
            .or_else(|| self.dispatch_style(cmd_type, p))
            .unwrap_or_else(|| serde_json::json!({ "error": format!("Unknown command: {}", cmd_type) }));

        serde_json::to_string(&result).unwrap_or_else(|_| r#"{"error":"serialize failed"}"#.to_string())
    }
}
