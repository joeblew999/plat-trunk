// WASM application: rendering, scene management, gizmo interaction.
// This module is only compiled for wasm32 targets.

use std::cell::RefCell;
use std::collections::HashMap;
use std::f64::consts::PI;
use std::rc::Rc;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::commands::*;

use wasm_bindgen::prelude::*;
use winit::event::*;
use winit::event_loop::EventLoop;
use winit::platform::web::WindowAttributesExtWebSys;
use winit::window::Window;

use truck_meshalgo::prelude::*;
use truck_modeling::*;
use truck_platform::*;
use truck_rendimpl::*;

use ifc_lite_core as ifc;

use crate::{make_cube, make_sphere, make_cylinder, make_torus};

// Boolean perturbation vector — asymmetric, exceeds shapeops tolerance (0.05) in all axes.
// truck-shapeops panics on axis-aligned/coplanar faces ("This wire is not simple", issue #57).
// Asymmetric values break axis alignment; magnitude >0.05 ensures the intersection region
// has non-degenerate edges. Tested exhaustively: coplanar, half-overlap, corner-overlap all pass.
const BOOL_PERTURBATION: Vector3 = Vector3::new(-0.1, -0.07, -0.03);

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
    #[wasm_bindgen(js_namespace = console)]
    fn error(s: &str);
}

macro_rules! log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}
macro_rules! error {
    ($($t:tt)*) => (error(&format_args!($($t)*).to_string()))
}

// ---------------------------------------------------------------------------
// Scene object: a solid + its rendered instances
// ---------------------------------------------------------------------------

/// Per-object BIM metadata (for IFC objects).
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

/// Per-object visual style (color + PBR material properties).
#[derive(Serialize, Deserialize, Clone, Debug)]
struct ObjectStyle {
    albedo: [f64; 4],      // RGBA, each [0,1]
    roughness: f64,        // [0,1]
    reflectance: f64,      // [0,1]
    ambient_ratio: f64,    // [0,1]
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

impl ObjectStyle {
    fn from_index(idx: usize) -> Self {
        let c = COLORS[idx % COLORS.len()];
        ObjectStyle {
            albedo: c,
            roughness: 0.3,
            reflectance: 0.5,
            ambient_ratio: 0.05,
        }
    }

    fn to_material_color(&self) -> Vector4 {
        Vector4::new(self.albedo[0], self.albedo[1], self.albedo[2], self.albedo[3])
    }
}

/// CPU-side mesh data for ray-triangle picking.
/// Designed so a BVH acceleration structure can be dropped in later
/// (it would index into the same `positions` and `triangles` arrays).
struct PickMesh {
    positions: Vec<Point3>,
    triangles: Vec<[usize; 3]>,  // indices into positions
}

impl PickMesh {
    /// Compute a bounding sphere from the (already-transformed) pick mesh positions.
    fn bounding_sphere(&self) -> (Point3, f64) {
        if self.positions.is_empty() {
            return (Point3::origin(), 0.0);
        }
        let n = self.positions.len() as f64;
        let sum = self.positions.iter().fold(Vector3::zero(), |acc, p| acc + p.to_vec());
        let center = Point3::from_vec(sum / n);
        let radius = self.positions.iter()
            .map(|p| (*p - center).magnitude())
            .fold(0.0_f64, f64::max);
        (center, radius)
    }
}

struct SceneObject {
    id: Uuid,
    name: String,
    solid: Option<Solid>,
    mesh: PolygonMesh,
    polygon: PolygonInstance,
    wireframe: WireFrameInstance,
    style: ObjectStyle,
    pick_mesh: PickMesh,
    bim: Option<BimMetadata>,
}

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
    /// [cx, cy, cz, radius] — allows JS to do viewport culling without loading geometry.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    bounding_sphere: Option<[f64; 4]>,
    /// Whether this object is rsweep geometry (sphere/torus).
    /// Persisted so import_scene can restore rsweep_ids and block boolean ops on replay.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    is_rsweep: bool,
}

// ---------------------------------------------------------------------------
// Gizmo interaction
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, Debug, PartialEq)]
enum Axis {
    X,
    Y,
    Z,
}

impl Axis {
    fn unit_vector(&self) -> Vector3 {
        match self {
            Axis::X => Vector3::unit_x(),
            Axis::Y => Vector3::unit_y(),
            Axis::Z => Vector3::unit_z(),
        }
    }
}

#[derive(Clone, Debug)]
enum InteractionMode {
    Idle,
    Selected { object_id: String },
    Dragging {
        object_id: String,
        axis: Axis,
        cumulative_delta: [f64; 3],
    },
}

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

/// LOD proxy: a bounding-box wireframe that represents a Warm-tier object on the GPU.
/// Created when an object is evicted (Hot→Warm), removed when promoted (Warm→Hot).
#[allow(dead_code)]
struct LodProxy {
    id: String,               // same objectId as the evicted object
    wireframe: WireFrameInstance,
    center: Point3,
    radius: f64,
}

struct SharedState {
    scene: Scene,
    creator: InstanceCreator,
    surface: wgpu::Surface<'static>,
    objects: Vec<SceneObject>,
    id_to_index: HashMap<String, usize>,
    selected: Option<String>,
    // Mouse interaction
    rotate_flag: bool,
    prev_cursor: Vector2,
    // Touch interaction (iOS / mobile)
    touches: HashMap<u64, Vector2>,
    prev_pinch_dist: Option<f64>,
    // Gizmo interaction
    interaction: InteractionMode,
    bounding_spheres: Vec<(String, Point3, f64)>, // (object_id, center, radius)
    // LOD proxies for Warm-tier objects (ADR-0025 Phase 2)
    lod_proxies: Vec<LodProxy>,
    // JS callbacks
    on_select: Option<js_sys::Function>,
    on_drag_complete: Option<js_sys::Function>,
    // Parametric sketch
    active_sketch: Option<crate::sketch::Sketch>,
    // Object naming
    name_counters: HashMap<String, usize>,
    // Passive WASM: JS owns camera via set_camera (ADR-0013)
    camera_external: bool,
    // Track rsweep objects (sphere/torus) — boolean ops trap on rsweep geometry
    rsweep_ids: std::collections::HashSet<String>,
}

/// Rebuild the id→index lookup after any mutation that changes Vec ordering.
fn rebuild_id_index(s: &mut SharedState) {
    s.id_to_index.clear();
    for (i, obj) in s.objects.iter().enumerate() {
        s.id_to_index.insert(obj.id.to_string(), i);
    }
}

/// Rename an object's UUID in place. Used by `execute()` at the API boundary
/// to preserve IDs during Automerge undo/redo replay. The kernel stays pure —
/// it always generates fresh UUIDs; this post-hoc rename is the only place
/// that knows about replay semantics.
fn rename_object(s: &mut SharedState, old_id: &str, new_id_str: &str) {
    let new_uuid = match Uuid::parse_str(new_id_str) {
        Ok(u) => u,
        Err(_) => return,
    };
    if let Some(&idx) = s.id_to_index.get(old_id) {
        s.objects[idx].id = new_uuid;
        s.id_to_index.remove(old_id);
        s.id_to_index.insert(new_id_str.to_string(), idx);
        // Update bounding sphere entry
        for entry in s.bounding_spheres.iter_mut() {
            if entry.0 == old_id {
                entry.0 = new_id_str.to_string();
                break;
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Picking helpers
// ---------------------------------------------------------------------------

fn rebuild_bounding_spheres(s: &mut SharedState) {
    s.bounding_spheres.clear();
    for obj in &s.objects {
        let (center, radius) = obj.pick_mesh.bounding_sphere();
        s.bounding_spheres.push((obj.id.to_string(), center, radius));
    }
}

fn ray_sphere_intersect(
    ray_origin: Point3,
    ray_dir: Vector3,
    center: Point3,
    radius: f64,
) -> Option<f64> {
    let oc = ray_origin - center;
    let a = ray_dir.dot(ray_dir);
    let b = 2.0 * oc.dot(ray_dir);
    let c = oc.dot(oc) - radius * radius;
    let disc = b * b - 4.0 * a * c;
    if disc < 0.0 {
        return None;
    }
    let t = (-b - disc.sqrt()) / (2.0 * a);
    if t > 0.0 {
        Some(t)
    } else {
        // Try the other root (we might be inside the sphere)
        let t2 = (-b + disc.sqrt()) / (2.0 * a);
        if t2 > 0.0 { Some(t2) } else { None }
    }
}

/// Möller–Trumbore ray-triangle intersection with a small pick tolerance.
/// The tolerance relaxes the barycentric bounds so triangles are slightly
/// larger for picking — this closes gaps between smooth-shaded visual
/// surfaces and the underlying flat triangle mesh on curved objects.
const PICK_EPS: f64 = 0.03;

fn ray_triangle_intersect(
    ray_origin: Point3,
    ray_dir: Vector3,
    v0: Point3,
    v1: Point3,
    v2: Point3,
) -> Option<f64> {
    let edge1 = v1 - v0;
    let edge2 = v2 - v0;
    let h = ray_dir.cross(edge2);
    let a = edge1.dot(h);
    if a.abs() < 1e-10 {
        return None; // Ray parallel to triangle
    }
    let f = 1.0 / a;
    let s = ray_origin - v0;
    let u = f * s.dot(h);
    if u < -PICK_EPS || u > 1.0 + PICK_EPS {
        return None;
    }
    let q = s.cross(edge1);
    let v = f * ray_dir.dot(q);
    if v < -PICK_EPS || u + v > 1.0 + PICK_EPS {
        return None;
    }
    let t = f * edge2.dot(q);
    if t > 1e-6 { Some(t) } else { None }
}

/// Test a ray against all triangles in a PickMesh.
/// Returns the closest hit distance, or None.
fn ray_pick_mesh_intersect(
    ray_origin: Point3,
    ray_dir: Vector3,
    mesh: &PickMesh,
) -> Option<f64> {
    let mut best_t: Option<f64> = None;
    for tri in &mesh.triangles {
        let v0 = mesh.positions[tri[0]];
        let v1 = mesh.positions[tri[1]];
        let v2 = mesh.positions[tri[2]];
        if let Some(t) = ray_triangle_intersect(ray_origin, ray_dir, v0, v1, v2) {
            if best_t.map_or(true, |bt| t < bt) {
                best_t = Some(t);
            }
        }
    }
    best_t
}

/// Pick the closest object hit by a ray from NDC coordinates.
/// Two-phase: (1) broadphase bounding-sphere reject, (2) narrowphase ray-triangle.
fn pick_object(s: &SharedState, ndc_x: f64, ndc_y: f64) -> Option<String> {
    let camera = &s.scene.studio_config().camera;
    let ray = camera.ray(Point2::new(ndc_x, ndc_y));
    let origin = ray.origin();
    let dir = ray.direction();

    // Broadphase: collect candidate objects whose bounding sphere is hit
    let mut candidates: Vec<(usize, f64)> = Vec::new(); // (object index, sphere t)
    for (i, obj) in s.objects.iter().enumerate() {
        let id_str = obj.id.to_string();
        if let Some(bs) = s.bounding_spheres.iter().find(|(bid, _, _)| *bid == id_str) {
            if ray_sphere_intersect(origin, dir, bs.1, bs.2).is_some() {
                candidates.push((i, 0.0));
            }
        }
    }

    // Narrowphase: ray-triangle test on each candidate
    let mut closest: Option<(String, f64)> = None;
    for (idx, _) in &candidates {
        let obj = &s.objects[*idx];
        if let Some(t) = ray_pick_mesh_intersect(origin, dir, &obj.pick_mesh) {
            if closest.as_ref().map_or(true, |(_, best_t)| t < *best_t) {
                closest = Some((obj.id.to_string(), t));
            }
        }
    }
    closest.map(|(id, _)| id)
}

/// Minimum distance from a ray to a line segment.
fn ray_to_segment_distance(
    ray_origin: Point3,
    ray_dir: Vector3,
    seg_a: Point3,
    seg_b: Point3,
) -> f64 {
    let u = ray_dir;
    let v = seg_b - seg_a;
    let w = ray_origin - seg_a;
    let a = u.dot(u);
    let b = u.dot(v);
    let c = v.dot(v);
    let d = u.dot(w);
    let e = v.dot(w);
    let denom = a * c - b * b;

    let (sc, tc) = if denom < 1e-10 {
        // Nearly parallel
        (0.0, if b > c { d / b } else { e / c })
    } else {
        let sc = (b * e - c * d) / denom;
        let tc = (a * e - b * d) / denom;
        (sc.max(0.0), tc.clamp(0.0, 1.0))
    };

    let closest_on_ray = ray_origin + u * sc;
    let closest_on_seg = seg_a + v * tc;
    (closest_on_ray - closest_on_seg).magnitude()
}

/// Compute how far to move along `axis_dir` based on mouse NDC delta.
/// Projects the world-space axis onto screen space, then maps the NDC delta.
fn compute_axis_drag_delta(
    camera: &Camera,
    origin: Point3,
    axis_dir: Vector3,
    ndc_x: f64,
    ndc_y: f64,
    prev_ndc_x: f64,
    prev_ndc_y: f64,
) -> f64 {
    // Cast rays for current and previous mouse positions
    let ray_cur = camera.ray(Point2::new(ndc_x, ndc_y));
    let ray_prev = camera.ray(Point2::new(prev_ndc_x, prev_ndc_y));

    // Find closest point on the axis line to each ray
    let t_cur = closest_point_on_axis(ray_cur.origin(), ray_cur.direction(), origin, axis_dir);
    let t_prev = closest_point_on_axis(ray_prev.origin(), ray_prev.direction(), origin, axis_dir);

    t_cur - t_prev
}

/// Find the parameter t along the axis (origin + t*axis_dir) that is closest to the given ray.
fn closest_point_on_axis(
    ray_origin: Point3,
    ray_dir: Vector3,
    axis_origin: Point3,
    axis_dir: Vector3,
) -> f64 {
    let w = ray_origin - axis_origin;
    let a = axis_dir.dot(axis_dir);
    let b = axis_dir.dot(ray_dir);
    let c = ray_dir.dot(ray_dir);
    let d = axis_dir.dot(w);
    let e = ray_dir.dot(w);
    let denom = a * c - b * b;
    if denom.abs() < 1e-10 {
        return 0.0; // Axis parallel to ray
    }
    (b * e - c * d) / denom
}

// ---------------------------------------------------------------------------
// Colors for multiple objects
// ---------------------------------------------------------------------------

const COLORS: &[[f64; 4]] = &[
    [0.2, 0.6, 1.0, 1.0], // blue
    [1.0, 0.4, 0.3, 1.0], // red
    [0.3, 0.9, 0.4, 1.0], // green
    [1.0, 0.8, 0.2, 1.0], // yellow
    [0.8, 0.3, 0.9, 1.0], // purple
    [0.2, 0.9, 0.9, 1.0], // cyan
];

// ---------------------------------------------------------------------------
// Geometry: truck solid -> renderable instances
// ---------------------------------------------------------------------------

/// Extract a PickMesh from a truck PolygonMesh for CPU-side ray-triangle picking.
fn extract_pick_mesh(poly: &PolygonMesh) -> PickMesh {
    let positions = poly.positions().clone();
    // Use faces().triangle_iter() to triangulate all faces (tris + quads + n-gons)
    let triangles: Vec<[usize; 3]> = poly
        .faces()
        .triangle_iter()
        .map(|tri| [tri[0].pos, tri[1].pos, tri[2].pos])
        .collect();
    PickMesh { positions, triangles }
}

fn solid_to_instances(
    creator: &InstanceCreator,
    solid: &Solid,
    style: &ObjectStyle,
) -> (PolygonInstance, WireFrameInstance, PickMesh, PolygonMesh) {
    let mut bdd_box = BoundingBox::new();
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
                Curve::BSplineCurve(curve) => {
                    let bdb = curve.roughly_bounding_box();
                    vec![bdb.max(), bdb.min()].into_iter().collect()
                }
                Curve::NurbsCurve(curve) => curve.roughly_bounding_box(),
                Curve::IntersectionCurve(_) => BoundingBox::new(),
            };
        });
    // Only normalize by size — do NOT re-center.
    // Centering would force all objects back to origin, making translate invisible.
    let size = bdd_box.size();
    let mat = Matrix4::from_scale(size);

    let mesh_solid = solid.triangulation(size * 0.005);
    let curves = mesh_solid
        .edge_iter()
        .map(|edge| edge.curve())
        .collect::<Vec<_>>();

    let poly = mesh_solid.to_polygon();
    let inv_mat = mat.invert().unwrap();
    // Use a finer tessellation for the pick mesh so curved surfaces
    // (sphere, torus) have more triangles and fewer gaps vs. the visual surface.
    let pick_solid = solid.triangulation(size * 0.002);
    let pick_poly = pick_solid.to_polygon();
    let raw_pick = extract_pick_mesh(&pick_poly);
    let pick_mesh = PickMesh {
        positions: raw_pick.positions.iter().map(|p| inv_mat.transform_point(*p)).collect(),
        triangles: raw_pick.triangles,
    };

    let polygon_state = PolygonState {
        matrix: inv_mat,
        material: Material {
            albedo: style.to_material_color(),
            roughness: style.roughness,
            reflectance: style.reflectance,
            ambient_ratio: style.ambient_ratio,
            ..Default::default()
        },
        ..Default::default()
    };
    let wire_state = WireFrameState {
        matrix: mat.invert().unwrap(),
        ..Default::default()
    };

    (
        creator.create_instance(&poly, &polygon_state),
        creator.create_instance(&curves, &wire_state),
        pick_mesh,
        poly
    )
}

fn rebuild_scene(s: &mut SharedState) {
    s.scene.clear_objects();
    let selected_id = s.selected.as_deref();
    for obj in &s.objects {
        let id_str = obj.id.to_string();
        let is_selected = selected_id == Some(id_str.as_str());
        s.scene.add_object(&obj.polygon);
        if is_selected {
            // Highlight: render wireframe in bright yellow/gold for selected object
            let mut highlight_wire = obj.wireframe.clone_instance();
            *highlight_wire.instance_state_mut() = WireFrameState {
                matrix: obj.wireframe.instance_state().matrix,
                color: Vector4::new(1.0, 0.85, 0.0, 1.0), // gold highlight
            };
            s.scene.add_object(&highlight_wire);
        } else {
            s.scene.add_object(&obj.wireframe);
        }
    }
    // Add LOD proxy wireframes for Warm-tier objects (ADR-0025 Phase 2)
    for proxy in &s.lod_proxies {
        s.scene.add_object(&proxy.wireframe);
    }
    // Add gizmo arrows if an object is selected
    add_gizmo_arrows(s);
}

/// Gizmo axis colors: X=red, Y=green, Z=blue
const GIZMO_COLORS: [(Axis, [f64; 4]); 3] = [
    (Axis::X, [1.0, 0.2, 0.2, 1.0]),
    (Axis::Y, [0.2, 1.0, 0.2, 1.0]),
    (Axis::Z, [0.3, 0.3, 1.0, 1.0]),
];

fn add_gizmo_arrows(s: &mut SharedState) {
    let object_id = match &s.interaction {
        InteractionMode::Selected { object_id } | InteractionMode::Dragging { object_id, .. } => {
            object_id.clone()
        }
        InteractionMode::Idle => return,
    };

    // Find the selected object's bounding sphere center
    let gizmo_origin = s.bounding_spheres.iter()
        .find(|(id, _, _)| *id == object_id)
        .map(|(_, center, _)| *center);
    let origin = match gizmo_origin {
        Some(o) => o,
        None => return,
    };

    // Arrow length proportional to camera distance for consistent screen size
    let cam_pos = s.scene.studio_config().camera.position();
    let cam_dist = (cam_pos - origin).magnitude();
    let arrow_len = cam_dist * 0.25;

    // Which axis is being dragged (if any)?
    let dragging_axis = match &s.interaction {
        InteractionMode::Dragging { axis, .. } => Some(*axis),
        _ => None,
    };

    for (axis, color) in &GIZMO_COLORS {
        let dir = axis.unit_vector();
        let end = origin + dir * arrow_len;

        // Arrowhead: small perpendicular lines at the tip
        let head_len = arrow_len * 0.15;
        let perp1 = match axis {
            Axis::X => Vector3::unit_y(),
            Axis::Y => Vector3::unit_z(),
            Axis::Z => Vector3::unit_x(),
        };
        let head_base = origin + dir * (arrow_len - head_len);
        let head1 = head_base + perp1 * head_len * 0.5;
        let head2 = head_base - perp1 * head_len * 0.5;

        let segments: Vec<(Point3, Point3)> = vec![
            (origin, end),
            (end, head1),
            (end, head2),
        ];

        // Dim non-active axes during drag
        let alpha = if let Some(da) = dragging_axis {
            if *axis == da { 1.0 } else { 0.2 }
        } else {
            1.0
        };

        let wire_state = WireFrameState {
            matrix: Matrix4::identity(),
            color: Vector4::new(color[0], color[1], color[2], alpha),
        };
        let instance: WireFrameInstance = s.creator.create_instance(&segments, &wire_state);
        s.scene.add_object(&instance);
    }
}

// ---------------------------------------------------------------------------
// Sketch helpers
// ---------------------------------------------------------------------------

fn plane_str(p: crate::sketch::SketchPlane) -> &'static str {
    match p {
        crate::sketch::SketchPlane::XY => "xy",
        crate::sketch::SketchPlane::XZ => "xz",
        crate::sketch::SketchPlane::YZ => "yz",
    }
}

fn next_name(s: &mut SharedState, kind: &str) -> String {
    let counter = s.name_counters.entry(kind.to_string()).or_insert(0);
    *counter += 1;
    format!("{} {}", kind, counter)
}

fn mesh_to_instances(
    creator: &InstanceCreator,
    mesh: &PolygonMesh,
    style: &ObjectStyle,
) -> (PolygonInstance, WireFrameInstance, PickMesh) {
    let bdd_box = mesh.bounding_box();
    let size = bdd_box.size();
    let mat = Matrix4::from_scale(size);
    let inv_mat = mat.invert().unwrap();

    let raw_pick = extract_pick_mesh(mesh);
    let pick_mesh = PickMesh {
        positions: raw_pick.positions.iter().map(|p| inv_mat.transform_point(*p)).collect(),
        triangles: raw_pick.triangles,
    };

    let polygon_state = PolygonState {
        matrix: inv_mat,
        material: Material {
            albedo: style.to_material_color(),
            roughness: style.roughness,
            reflectance: style.reflectance,
            ambient_ratio: style.ambient_ratio,
            ..Default::default()
        },
        ..Default::default()
    };
    
    // Extract wireframe segments from the polygon mesh
    let mut edges = Vec::new();
    for face in mesh.face_iter() {
        for i in 0..face.len() {
            let p0 = mesh.positions()[face[i].pos];
            let p1 = mesh.positions()[face[(i + 1) % face.len()].pos];
            edges.push((p0, p1));
        }
    }

    let wire_state = WireFrameState {
        matrix: inv_mat,
        ..Default::default()
    };

    (
        creator.create_instance(mesh, &polygon_state),
        creator.create_instance(&edges, &wire_state),
        pick_mesh,
    )
}

fn add_mesh_to_state(s: &mut SharedState, mesh: PolygonMesh, kind: &str, bim: Option<BimMetadata>) -> String {
    let id = Uuid::new_v4();
    let idx = s.objects.len();
    let name = next_name(s, kind);
    let style = ObjectStyle::from_index(idx);
    let (polygon, wireframe, pick_mesh) = mesh_to_instances(&s.creator, &mesh, &style);
    let (center, radius) = pick_mesh.bounding_sphere();
    s.scene.add_object(&polygon);
    s.scene.add_object(&wireframe);
    let id_str = id.to_string();
    s.id_to_index.insert(id_str.clone(), idx);
    s.bounding_spheres.push((id_str.clone(), center, radius));
    s.objects.push(SceneObject {
        id,
        name,
        solid: None,
        mesh,
        polygon,
        wireframe,
        style,
        pick_mesh,
        bim,
    });
    id_str
}

fn add_solid_to_state(s: &mut SharedState, solid: Solid, kind: &str, bim: Option<BimMetadata>) -> String {
    let id = Uuid::new_v4();
    let idx = s.objects.len();
    let name = next_name(s, kind);
    let style = ObjectStyle::from_index(idx);
    let (polygon, wireframe, pick_mesh, mesh) = solid_to_instances(&s.creator, &solid, &style);
    let (center, radius) = pick_mesh.bounding_sphere();
    s.scene.add_object(&polygon);
    s.scene.add_object(&wireframe);
    let id_str = id.to_string();
    s.id_to_index.insert(id_str.clone(), idx);
    s.bounding_spheres.push((id_str.clone(), center, radius));
    s.objects.push(SceneObject {
        id,
        name,
        solid: Some(solid),
        mesh,
        polygon,
        wireframe,
        style,
        pick_mesh,
        bim,
    });
    id_str
}

// ---------------------------------------------------------------------------
// SceneController — wasm_bindgen API
// ---------------------------------------------------------------------------

#[wasm_bindgen]
pub struct SceneController {
    event_loop: Option<EventLoop<()>>,
    state: Rc<RefCell<SharedState>>,
    window: Arc<Window>,
}

#[wasm_bindgen]
impl SceneController {
    #[allow(deprecated)]
    #[wasm_bindgen(constructor)]
    pub async fn new(canvas_id: String) -> std::result::Result<SceneController, JsValue> {
        std::panic::set_hook(Box::new(console_error_panic_hook::hook));
        let _ = console_log::init_with_level(log::Level::Info);
        log!("WASM: SceneController::new({})", canvas_id);

        let event_loop = EventLoop::new().unwrap();

        let canvas = web_sys::window()
            .and_then(|w| w.document())
            .and_then(|d| d.get_element_by_id(&canvas_id))
            .and_then(|e| e.dyn_into::<web_sys::HtmlCanvasElement>().ok())
            .expect("canvas not found");

        #[allow(deprecated)]
        let window = {
            let attrs = Window::default_attributes().with_canvas(Some(canvas.clone()));
            Arc::new(event_loop.create_window(attrs).expect("failed to create window"))
        };

        let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            ..Default::default()
        });
        let surface = instance
            .create_surface(wgpu::SurfaceTarget::Canvas(canvas))
            .expect("surface creation failed");
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: Some(&surface),
                force_fallback_adapter: false,
            })
            .await
            .expect("no adapter");
        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor {
                label: Some("Device"),
                required_features: wgpu::Features::empty(),
                required_limits: wgpu::Limits::downlevel_defaults(),
                ..Default::default()
            })
            .await
            .expect("no device");

        let w = window.inner_size().width.max(1);
        let h = window.inner_size().height.max(1);
        let caps = surface.get_capabilities(&adapter);
        let format = caps.formats[0];
        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format,
            width: w,
            height: h,
            present_mode: wgpu::PresentMode::Fifo,
            alpha_mode: caps.alpha_modes[0],
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };
        surface.configure(&device, &config);

        let device_handler = DeviceHandler::new(adapter, device, queue);
        let scene_desc = SceneDescriptor {
            studio: StudioConfig {
                background: wgpu::Color { r: 0.1, g: 0.1, b: 0.15, a: 1.0 },
                camera: {
                    let matrix = Matrix4::look_at_rh(
                        Point3::new(1.5, 1.5, 1.5),
                        Point3::origin(),
                        Vector3::unit_y(),
                    );
                    Camera {
                        matrix: matrix.invert().unwrap(),
                        method: ProjectionMethod::perspective(Rad(PI / 4.0)),
                        near_clip: 0.01,
                        far_clip: 100.0,
                    }
                },
                lights: vec![Light {
                    position: Point3::new(1.0, 1.0, 1.0),
                    color: Vector3::new(1.0, 1.0, 1.0),
                    light_type: LightType::Point,
                }],
            },
            backend_buffer: BackendBufferConfig {
                sample_count: 1,
                ..Default::default()
            },
            render_texture: RenderTextureConfig {
                canvas_size: (w, h),
                format,
            },
        };
        let scene = Scene::new(device_handler, &scene_desc);
        let creator = scene.instance_creator();

        log!("WASM: truck Scene ready. Drag=rotate, Scroll=zoom, Right-click=light.");

        let mut shared = SharedState {
            scene,
            creator,
            surface,
            objects: Vec::new(),
            id_to_index: HashMap::new(),
            selected: None,
            rotate_flag: false,
            prev_cursor: Vector2::zero(),
            touches: HashMap::new(),
            prev_pinch_dist: None,
            interaction: InteractionMode::Idle,
            bounding_spheres: Vec::new(),
            lod_proxies: Vec::new(),
            on_select: None,
            on_drag_complete: None,
            active_sketch: None,
            name_counters: HashMap::new(),
            camera_external: false,
            rsweep_ids: std::collections::HashSet::new(),
        };

        // Start with a default cube
        let default_id = add_solid_to_state(&mut shared, make_cube(1.0).expect("default cube"), "Box", None);
        shared.selected = Some(default_id);

        let state = Rc::new(RefCell::new(shared));

        Ok(SceneController {
            event_loop: Some(event_loop),
            state,
            window,
        })
    }

    #[wasm_bindgen]
    pub fn run(&mut self) {
        let el = self.event_loop.take().expect("run() already called");
        let state = Rc::clone(&self.state);
        let window = Arc::clone(&self.window);
        log!("WASM: Starting render loop.");

        {
            use winit::platform::web::EventLoopExtWebSys;
            #[allow(deprecated)]
            el.spawn(move |ev: Event<()>, target: &winit::event_loop::ActiveEventLoop| {
                match ev {
                    Event::NewEvents(_) => {
                        window.request_redraw();
                    }
                    Event::WindowEvent { event, .. } => match event {
                        WindowEvent::CloseRequested => target.exit(),

                        WindowEvent::RedrawRequested => {
                            let s = state.borrow();
                            let output = match s.surface.get_current_texture() {
                                Ok(t) => t,
                                Err(wgpu::SurfaceError::Lost | wgpu::SurfaceError::Outdated) => {
                                    let config = s.scene.descriptor().render_texture
                                        .compatible_surface_config();
                                    s.surface.configure(s.scene.device(), &config);
                                    return;
                                }
                                Err(e) => { error!("Surface: {:?}", e); return; }
                            };
                            let view = output.texture
                                .create_view(&wgpu::TextureViewDescriptor::default());
                            s.scene.render(&view);
                            output.present();
                        }

                        WindowEvent::Resized(size) => {
                            if size.width > 0 && size.height > 0 {
                                let mut s = state.borrow_mut();
                                let mut desc = s.scene.descriptor_mut();
                                desc.render_texture.canvas_size = (size.width, size.height);
                                let config = desc.render_texture.compatible_surface_config();
                                drop(desc);
                                s.surface.configure(s.scene.device(), &config);
                            }
                        }

                        // --- Mouse: drag to rotate (suppressed during gizmo drag) ---
                        WindowEvent::MouseInput { state: btn_state, button, .. } => {
                            let mut s = state.borrow_mut();
                            let is_dragging = matches!(s.interaction, InteractionMode::Dragging { .. });
                            match button {
                                MouseButton::Left => {
                                    if !is_dragging && !s.camera_external {
                                        s.rotate_flag = btn_state == ElementState::Pressed;
                                    }
                                }
                                MouseButton::Right if btn_state == ElementState::Pressed => {
                                    let studio = s.scene.studio_config_mut();
                                    let cam_pos = studio.camera.position();
                                    if let Some(light) = studio.lights.first_mut() {
                                        match light.light_type {
                                            LightType::Point => { light.position = cam_pos; }
                                            LightType::Uniform => {
                                                let strength = cam_pos.to_vec().magnitude();
                                                light.position = cam_pos / strength;
                                            }
                                        }
                                    }
                                }
                                _ => {}
                            }
                        }

                        WindowEvent::CursorMoved { position, .. } => {
                            let mut s = state.borrow_mut();
                            let pos = Vector2::new(position.x, position.y);
                            let is_dragging = matches!(s.interaction, InteractionMode::Dragging { .. });
                            if s.rotate_flag && !is_dragging && !s.camera_external {
                                let dir2d = pos - s.prev_cursor;
                                if !dir2d.so_small() {
                                    let matrix = &mut s.scene.studio_config_mut().camera.matrix;
                                    let mut axis = dir2d[1] * matrix[0].truncate();
                                    axis += dir2d[0] * matrix[1].truncate();
                                    axis /= axis.magnitude();
                                    let angle = dir2d.magnitude() * 0.01;
                                    let mat = Matrix4::from_axis_angle(axis, Rad(angle));
                                    *matrix = mat.invert().unwrap() * *matrix;
                                }
                            }
                            s.prev_cursor = pos;
                        }

                        // --- Mouse wheel / trackpad: zoom ---
                        WindowEvent::MouseWheel { delta, .. } => {
                            if !state.borrow().camera_external {
                                let y = match delta {
                                    MouseScrollDelta::LineDelta(_, y) => y as f64,
                                    MouseScrollDelta::PixelDelta(pos) => pos.y * 0.01,
                                };
                                let mut s = state.borrow_mut();
                                let camera = &mut s.scene.studio_config_mut().camera;
                                match &mut camera.method {
                                    ProjectionMethod::Parallel { screen_size } => {
                                        *screen_size *= 0.9f64.powf(y);
                                    }
                                    ProjectionMethod::Perspective { .. } => {
                                        let trans = camera.eye_direction() * y * 0.2;
                                        camera.matrix =
                                            Matrix4::from_translation(trans) * camera.matrix;
                                    }
                                }
                            }
                        }

                        // --- Touch: iOS / mobile ---
                        WindowEvent::Touch(touch) => {
                            if !state.borrow().camera_external {
                            let mut s = state.borrow_mut();
                            let pos = Vector2::new(touch.location.x, touch.location.y);
                            match touch.phase {
                                TouchPhase::Started => {
                                    s.touches.insert(touch.id, pos);
                                    s.prev_pinch_dist = None;
                                }
                                TouchPhase::Moved => {
                                    if s.touches.len() == 1 {
                                        if let Some(&prev) = s.touches.get(&touch.id) {
                                            let dir2d = pos - prev;
                                            if !dir2d.so_small() {
                                                let matrix = &mut s.scene.studio_config_mut().camera.matrix;
                                                let mut axis = dir2d[1] * matrix[0].truncate();
                                                axis += dir2d[0] * matrix[1].truncate();
                                                axis /= axis.magnitude();
                                                let angle = dir2d.magnitude() * 0.01;
                                                let mat = Matrix4::from_axis_angle(axis, Rad(angle));
                                                *matrix = mat.invert().unwrap() * *matrix;
                                            }
                                        }
                                    }
                                    if s.touches.len() == 2 {
                                        s.touches.insert(touch.id, pos);
                                        let pts: Vec<_> = s.touches.values().collect();
                                        let dist = (*pts[0] - *pts[1]).magnitude();
                                        if let Some(prev_dist) = s.prev_pinch_dist {
                                            let delta = (dist - prev_dist) * 0.01;
                                            let camera = &mut s.scene.studio_config_mut().camera;
                                            match &mut camera.method {
                                                ProjectionMethod::Parallel { screen_size } => {
                                                    *screen_size *= 0.9f64.powf(delta);
                                                }
                                                ProjectionMethod::Perspective { .. } => {
                                                    let trans = camera.eye_direction() * delta * 0.5;
                                                    camera.matrix =
                                                        Matrix4::from_translation(trans) * camera.matrix;
                                                }
                                            }
                                        }
                                        s.prev_pinch_dist = Some(dist);
                                    } else {
                                        s.touches.insert(touch.id, pos);
                                    }
                                }
                                TouchPhase::Ended | TouchPhase::Cancelled => {
                                    s.touches.remove(&touch.id);
                                    s.prev_pinch_dist = None;
                                }
                            }
                            } // camera_external guard
                        }

                        _ => {}
                    },
                    _ => {}
                }
            });
        }
    }

    // =====================================================================
    // Primitives — each adds a new object to the scene
    // =====================================================================

    #[wasm_bindgen]
    pub fn add_cube(&self, size: f64) -> String {
        log!("WASM: add_cube({})", size);
        let solid = match make_cube(size) {
            Ok(s) => s,
            Err(e) => { error!("add_cube: {}", e); return String::new(); }
        };
        let mut s = self.state.borrow_mut();
        add_solid_to_state(&mut s, solid, "Box", None)
    }

    #[wasm_bindgen]
    pub fn add_sphere(&self, radius: f64) -> String {
        log!("WASM: add_sphere({})", radius);
        let solid = match make_sphere(radius) {
            Ok(s) => s,
            Err(e) => { error!("add_sphere: {}", e); return String::new(); }
        };
        let mut s = self.state.borrow_mut();
        let id = add_solid_to_state(&mut s, solid, "Sphere", None);
        if !id.is_empty() { s.rsweep_ids.insert(id.clone()); }
        id
    }

    #[wasm_bindgen]
    pub fn add_cylinder(&self, radius: f64, height: f64) -> String {
        log!("WASM: add_cylinder({}, {})", radius, height);
        let solid = match make_cylinder(radius, height) {
            Ok(s) => s,
            Err(e) => { error!("add_cylinder: {}", e); return String::new(); }
        };
        let mut s = self.state.borrow_mut();
        add_solid_to_state(&mut s, solid, "Cylinder", None)
    }

    #[wasm_bindgen]
    pub fn add_torus(&self, major_r: f64, minor_r: f64) -> String {
        log!("WASM: add_torus({}, {})", major_r, minor_r);
        let solid = match make_torus(major_r, minor_r) {
            Ok(s) => s,
            Err(e) => { error!("add_torus: {}", e); return String::new(); }
        };
        let mut s = self.state.borrow_mut();
        let id = add_solid_to_state(&mut s, solid, "Torus", None);
        if !id.is_empty() { s.rsweep_ids.insert(id.clone()); }
        id
    }

    // =====================================================================
    // Transforms
    // =====================================================================

    #[wasm_bindgen]
    pub fn translate_object(&self, id: &str, dx: f64, dy: f64, dz: f64) -> bool {
        let mut s = self.state.borrow_mut();
        let idx = match s.id_to_index.get(id) { Some(&i) => i, None => return false };
        let obj_id = s.objects[idx].id;
        let name = s.objects[idx].name.clone();
        let style = s.objects[idx].style.clone();
        let solid = match &s.objects[idx].solid {
            Some(s) => s,
            None => return false, // Not yet supported for raw meshes
        };
        let solid = builder::translated(solid, Vector3::new(dx, dy, dz));
        let (polygon, wireframe, pick_mesh, mesh) = solid_to_instances(&s.creator, &solid, &style);
        let (center, radius) = pick_mesh.bounding_sphere();
        let bim = s.objects[idx].bim.clone();
        s.objects[idx] = SceneObject {
            id: obj_id,
            name,
            solid: Some(solid),
            mesh,
            polygon,
            wireframe,
            style,
            pick_mesh,
            bim,
        };
        // Update bounding sphere for this object (rendered-space coords from pick_mesh)
        if let Some(bs) = s.bounding_spheres.iter_mut().find(|(bid, _, _)| bid == id) {
            bs.1 = center;
            bs.2 = radius;
        }
        rebuild_scene(&mut s);
        true
    }

    #[wasm_bindgen]
    pub fn rotate_object(&self, id: &str, axis_x: f64, axis_y: f64, axis_z: f64, angle_deg: f64) -> bool {
        let mut s = self.state.borrow_mut();
        let idx = match s.id_to_index.get(id) { Some(&i) => i, None => return false };
        let axis = Vector3::new(axis_x, axis_y, axis_z);
        if axis.so_small() { return false; }
        let obj_id = s.objects[idx].id;
        let name = s.objects[idx].name.clone();
        let style = s.objects[idx].style.clone();
        let solid = match &s.objects[idx].solid {
            Some(s) => s,
            None => return false,
        };
        let solid = builder::rotated(
            solid,
            Point3::origin(),
            axis.normalize(),
            Rad(angle_deg.to_radians()),
        );
        let (polygon, wireframe, pick_mesh, mesh) = solid_to_instances(&s.creator, &solid, &style);
        let bim = s.objects[idx].bim.clone();
        s.objects[idx] = SceneObject {
            id: obj_id,
            name,
            solid: Some(solid),
            mesh,
            polygon,
            wireframe,
            style,
            pick_mesh,
            bim,
        };
        rebuild_bounding_spheres(&mut s);
        rebuild_scene(&mut s);
        true
    }

    #[wasm_bindgen]
    pub fn scale_object(&self, id: &str, sx: f64, sy: f64, sz: f64) -> bool {
        let mut s = self.state.borrow_mut();
        let idx = match s.id_to_index.get(id) { Some(&i) => i, None => return false };
        if sx.abs() < 1e-10 || sy.abs() < 1e-10 || sz.abs() < 1e-10 { return false; }
        let obj_id = s.objects[idx].id;
        let name = s.objects[idx].name.clone();
        let style = s.objects[idx].style.clone();
        let solid = match &s.objects[idx].solid {
            Some(s) => s,
            None => return false,
        };
        let solid = builder::scaled(
            solid,
            Point3::origin(),
            Vector3::new(sx, sy, sz),
        );
        let (polygon, wireframe, pick_mesh, mesh) = solid_to_instances(&s.creator, &solid, &style);
        let bim = s.objects[idx].bim.clone();
        s.objects[idx] = SceneObject {
            id: obj_id,
            name,
            solid: Some(solid),
            mesh,
            polygon,
            wireframe,
            style,
            pick_mesh,
            bim,
        };
        rebuild_bounding_spheres(&mut s);
        rebuild_scene(&mut s);
        true
    }

    #[wasm_bindgen]
    pub fn duplicate_object(&self, id: &str) -> String {
        let (solid, style, src_name, bim) = {
            let s = self.state.borrow();
            let idx = match s.id_to_index.get(id) { Some(&i) => i, None => return String::new() };
            let solid = match &s.objects[idx].solid { Some(s) => s.clone(), None => return String::new() };
            (solid, s.objects[idx].style.clone(), s.objects[idx].name.clone(), s.objects[idx].bim.clone())
        };
        // Offset the duplicate so it's visible
        let dup_solid = builder::translated(&solid, Vector3::new(0.5, 0.0, 0.0));
        // Derive kind from source name (e.g. "Box 1" → "Box")
        let kind = src_name.rsplitn(2, ' ').last().unwrap_or("Object");
        let mut s = self.state.borrow_mut();
        let new_id = add_solid_to_state(&mut s, dup_solid, kind, bim.clone());
        // Apply same style as original
        let idx = s.id_to_index[&new_id];
        let obj_id = s.objects[idx].id;
        let name = s.objects[idx].name.clone();
        let dup_solid = match s.objects[idx].solid.clone() { Some(s) => s, None => unreachable!() };
        let (polygon, wireframe, pick_mesh, mesh) = solid_to_instances(&s.creator, &dup_solid, &style);
        s.objects[idx] = SceneObject {
            id: obj_id,
            name,
            solid: Some(dup_solid),
            mesh,
            polygon,
            wireframe,
            style,
            pick_mesh,
            bim,
        };
        rebuild_bounding_spheres(&mut s);
        rebuild_scene(&mut s);
        new_id
    }


    // =====================================================================
    // Boolean operations
    // =====================================================================

    /// Try a boolean op: exact geometry first, then perturbed fallback.
    ///
    /// truck_shapeops fails on axis-aligned/coplanar faces (returns None or degenerate result).
    /// BOOL_PERTURBATION breaks the alignment so truck_shapeops can find intersection curves.
    ///
    /// Previously, subtract/intersect with perturbation would PANIC inside Solid::new() when
    /// the result had degenerate topology. That panic is now fixed upstream (Solid::try_new().ok()?
    /// in truck-shapeops/transversal/integrate/mod.rs), so all failures safely return None.
    /// We can now safely attempt perturbation as a fallback for all boolean ops.
    fn try_bool_op<F>(solid_a: &Solid, solid_b: &Solid, op: F) -> Option<Solid>
    where F: Fn(&Solid, &Solid) -> Option<Solid> + std::panic::RefUnwindSafe
    {
        // First try exact geometry
        let exact = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            op(solid_a, solid_b)
        })).ok().flatten();
        if exact.is_some() { return exact; }
        // Fallback: perturb solid_b to break axis alignment
        let perturbed = builder::translated(solid_b, BOOL_PERTURBATION);
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            op(solid_a, &perturbed)
        })).ok().flatten()
    }

    /// AABB containment check: returns (a_contains_b, b_contains_a).
    /// Uses pick mesh vertex AABB for accurate containment detection.
    ///
    /// The bounding sphere check had false positives for objects with similar sphere radii,
    /// e.g. cube(1) (sphere r≈0.866) vs cylinder(r=0.4, h=1.5) (sphere r≈0.850): the cylinder
    /// sphere fits inside the cube sphere even though the cylinder extends ±0.75 in Z beyond
    /// the cube's ±0.5, causing union/intersect to silently return wrong results.
    /// AABB is per-axis tight and catches this correctly.
    fn check_sphere_containment(s: &SharedState, id_a: &str, id_b: &str) -> (bool, bool) {
        let aabb = |id: &str| -> Option<([f64; 3], [f64; 3])> {
            let &idx = s.id_to_index.get(id)?;
            let pm = &s.objects[idx].pick_mesh;
            if pm.positions.is_empty() { return None; }
            let mut mn = [f64::INFINITY; 3];
            let mut mx = [f64::NEG_INFINITY; 3];
            for p in &pm.positions {
                mn[0] = mn[0].min(p.x); mn[1] = mn[1].min(p.y); mn[2] = mn[2].min(p.z);
                mx[0] = mx[0].max(p.x); mx[1] = mx[1].max(p.y); mx[2] = mx[2].max(p.z);
            }
            Some((mn, mx))
        };
        let (Some((mn_a, mx_a)), Some((mn_b, mx_b))) = (aabb(id_a), aabb(id_b)) else {
            return (false, false);
        };
        // A contains B: B's AABB fits inside A's AABB on all axes (with small epsilon)
        let a_contains_b = (0..3).all(|i| mn_a[i] <= mn_b[i] + 1e-4 && mx_b[i] <= mx_a[i] + 1e-4);
        let b_contains_a = (0..3).all(|i| mn_b[i] <= mn_a[i] + 1e-4 && mx_a[i] <= mx_b[i] + 1e-4);
        (a_contains_b, b_contains_a)
    }

    /// Union two objects, replacing them with the result. Returns new UUID (empty on failure).
    /// Tries truck_shapeops::or first, falls back to De Morgan: A ∪ B = ¬(¬A ∧ ¬B),
    /// then retries both with perturbation for coplanar/axis-aligned faces.
    /// Note: booleans work reliably with cubes + cylinders (tsweep geometry).
    /// Spheres/tori (rsweep/NURBS) may fail — truck-shapeops limitation.
    #[wasm_bindgen]
    pub fn boolean_union(&self, id_a: &str, id_b: &str) -> String {
        log!("WASM: boolean_union({}, {})", id_a, id_b);

        // Extract solids, indices, and containment, then DROP the borrow before the boolean op.
        // This prevents RefCell poisoning if a panic escapes catch_unwind.
        let (solid_a, solid_b, idx_a, idx_b, a_contains_b, b_contains_a) = {
            let s = self.state.borrow();
            // Guard: rsweep geometry (sphere/torus) causes WASM trap in truck-shapeops
            if s.rsweep_ids.contains(id_a) || s.rsweep_ids.contains(id_b) {
                error!("Boolean union: sphere/torus geometry not supported by truck-shapeops in WASM");
                return String::new();
            }
            let idx_a = match s.id_to_index.get(id_a) { Some(&i) => i, None => return String::new() };
            let idx_b = match s.id_to_index.get(id_b) { Some(&i) => i, None => return String::new() };
            if idx_a == idx_b { return String::new(); }
            let sa = match &s.objects[idx_a].solid { Some(s) => s.clone(), None => return String::new() };
            let sb = match &s.objects[idx_b].solid { Some(s) => s.clone(), None => return String::new() };
            let (acb, bca) = Self::check_sphere_containment(&s, id_a, id_b);
            (sa, sb, idx_a, idx_b, acb, bca)
        }; // borrow dropped here

        // Containment short-circuit: avoid WASM trap when one solid is inside the other.
        // "This shell is not oriented and closed" panic in truck_shapeops cannot be caught.
        if a_contains_b {
            log!("WASM: union containment: A⊃B, union=A, removing B");
            let mut s = self.state.borrow_mut();
            s.objects.remove(idx_b);
            s.rsweep_ids.remove(id_b);
            rebuild_id_index(&mut s);
            rebuild_bounding_spheres(&mut s);
            rebuild_scene(&mut s);
            return id_a.to_string();
        }
        if b_contains_a {
            log!("WASM: union containment: B⊃A, union=B, removing A");
            let mut s = self.state.borrow_mut();
            s.objects.remove(idx_a);
            s.rsweep_ids.remove(id_a);
            rebuild_id_index(&mut s);
            rebuild_bounding_spheres(&mut s);
            rebuild_scene(&mut s);
            return id_b.to_string();
        }

        let result = Self::try_bool_op(&solid_a, &solid_b, |a, b| {
            truck_shapeops::or(a, b, 0.05).or_else(|| {
                // De Morgan fallback: A ∪ B = ¬(¬A ∧ ¬B)
                let mut not_a = a.clone(); not_a.not();
                let mut not_b = b.clone(); not_b.not();
                truck_shapeops::and(&not_a, &not_b, 0.05).map(|mut s| { s.not(); s })
            })
        });

        match result {
            Some(solid) => {
                let mut s = self.state.borrow_mut();
                let (lo, hi) = if idx_a < idx_b { (idx_a, idx_b) } else { (idx_b, idx_a) };
                s.objects.remove(hi);
                s.objects.remove(lo);
                rebuild_id_index(&mut s);
                let new_id = add_solid_to_state(&mut s, solid, "Union", None);
                rebuild_bounding_spheres(&mut s);
                rebuild_scene(&mut s);
                new_id
            }
            None => {
                error!("Boolean union failed — objects may not overlap or geometry is unsupported");
                String::new()
            }
        }
    }

    /// Subtract object B from A, replacing both with the result. Returns new UUID (empty on failure).
    #[wasm_bindgen]
    pub fn boolean_subtract(&self, id_a: &str, id_b: &str) -> String {
        log!("WASM: boolean_subtract({}, {})", id_a, id_b);

        let (solid_a, solid_b, idx_a, idx_b, a_contains_b, b_contains_a) = {
            let s = self.state.borrow();
            if s.rsweep_ids.contains(id_a) || s.rsweep_ids.contains(id_b) {
                error!("Boolean subtract: sphere/torus geometry not supported by truck-shapeops in WASM");
                return String::new();
            }
            let idx_a = match s.id_to_index.get(id_a) { Some(&i) => i, None => return String::new() };
            let idx_b = match s.id_to_index.get(id_b) { Some(&i) => i, None => return String::new() };
            if idx_a == idx_b { return String::new(); }
            let sa = match &s.objects[idx_a].solid { Some(s) => s.clone(), None => return String::new() };
            let sb = match &s.objects[idx_b].solid { Some(s) => s.clone(), None => return String::new() };
            let (acb, bca) = Self::check_sphere_containment(&s, id_a, id_b);
            (sa, sb, idx_a, idx_b, acb, bca)
        };

        // Containment: B inside A creates internal void (not representable); A inside B = empty result.
        // Both cases would cause WASM trap — return early with error.
        if a_contains_b || b_contains_a {
            error!("Boolean subtract: one solid is fully inside the other — result would be non-manifold or empty");
            return String::new();
        }

        let result = Self::try_bool_op(&solid_a, &solid_b, |a, b| {
            let mut not_b = b.clone(); not_b.not();
            truck_shapeops::and(a, &not_b, 0.05)
        });

        match result {
            Some(solid) => {
                let mut s = self.state.borrow_mut();
                let (lo, hi) = if idx_a < idx_b { (idx_a, idx_b) } else { (idx_b, idx_a) };
                s.objects.remove(hi);
                s.objects.remove(lo);
                rebuild_id_index(&mut s);
                let new_id = add_solid_to_state(&mut s, solid, "Subtracted", None);
                rebuild_bounding_spheres(&mut s);
                rebuild_scene(&mut s);
                new_id
            }
            None => {
                error!("Boolean subtract failed — objects may not overlap or geometry is unsupported");
                String::new()
            }
        }
    }

    /// Intersect two objects. Returns new UUID (empty on failure).
    #[wasm_bindgen]
    pub fn boolean_intersect(&self, id_a: &str, id_b: &str) -> String {
        log!("WASM: boolean_intersect({}, {})", id_a, id_b);

        let (solid_a, solid_b, idx_a, idx_b, a_contains_b, b_contains_a) = {
            let s = self.state.borrow();
            if s.rsweep_ids.contains(id_a) || s.rsweep_ids.contains(id_b) {
                error!("Boolean intersect: sphere/torus geometry not supported by truck-shapeops in WASM");
                return String::new();
            }
            let idx_a = match s.id_to_index.get(id_a) { Some(&i) => i, None => return String::new() };
            let idx_b = match s.id_to_index.get(id_b) { Some(&i) => i, None => return String::new() };
            if idx_a == idx_b { return String::new(); }
            let sa = match &s.objects[idx_a].solid { Some(s) => s.clone(), None => return String::new() };
            let sb = match &s.objects[idx_b].solid { Some(s) => s.clone(), None => return String::new() };
            let (acb, bca) = Self::check_sphere_containment(&s, id_a, id_b);
            (sa, sb, idx_a, idx_b, acb, bca)
        };

        // Containment: intersection of B-inside-A is B; intersection of A-inside-B is A.
        if a_contains_b {
            log!("WASM: intersect containment: A⊃B, intersection=B, removing A");
            let mut s = self.state.borrow_mut();
            s.objects.remove(idx_a);
            s.rsweep_ids.remove(id_a);
            rebuild_id_index(&mut s);
            rebuild_bounding_spheres(&mut s);
            rebuild_scene(&mut s);
            return id_b.to_string();
        }
        if b_contains_a {
            log!("WASM: intersect containment: B⊃A, intersection=A, removing B");
            let mut s = self.state.borrow_mut();
            s.objects.remove(idx_b);
            s.rsweep_ids.remove(id_b);
            rebuild_id_index(&mut s);
            rebuild_bounding_spheres(&mut s);
            rebuild_scene(&mut s);
            return id_a.to_string();
        }

        let result = Self::try_bool_op(&solid_a, &solid_b, |a, b| {
            truck_shapeops::and(a, b, 0.05)
        });

        match result {
            Some(solid) => {
                let mut s = self.state.borrow_mut();
                let (lo, hi) = if idx_a < idx_b { (idx_a, idx_b) } else { (idx_b, idx_a) };
                s.objects.remove(hi);
                s.objects.remove(lo);
                rebuild_id_index(&mut s);
                let new_id = add_solid_to_state(&mut s, solid, "Intersected", None);
                rebuild_bounding_spheres(&mut s);
                rebuild_scene(&mut s);
                new_id
            }
            None => {
                error!("Boolean intersect failed — objects may not overlap or geometry is unsupported");
                String::new()
            }
        }
    }

    // =====================================================================
    // Scene management
    // =====================================================================

    #[wasm_bindgen]
    pub fn delete_object(&self, id: &str) -> bool {
        let mut s = self.state.borrow_mut();
        let idx = match s.id_to_index.get(id) { Some(&i) => i, None => return false };
        s.rsweep_ids.remove(id);
        s.objects.remove(idx);
        rebuild_id_index(&mut s);
        rebuild_bounding_spheres(&mut s);
        rebuild_scene(&mut s);
        true
    }

    #[wasm_bindgen]
    pub fn clear_scene(&self) {
        let mut s = self.state.borrow_mut();
        s.objects.clear();
        s.id_to_index.clear();
        s.bounding_spheres.clear();
        s.lod_proxies.clear();
        s.name_counters.clear();
        s.rsweep_ids.clear();
        s.interaction = InteractionMode::Idle;
        s.scene.clear_objects();
    }

    #[wasm_bindgen]
    pub fn object_count(&self) -> usize {
        self.state.borrow().objects.len()
    }

    /// Returns all object UUIDs in scene order.
    #[wasm_bindgen]
    pub fn object_ids(&self) -> Vec<String> {
        self.state.borrow().objects.iter().map(|o| o.id.to_string()).collect()
    }

    // =====================================================================
    // Save / Load (JSON serialization of truck Solids)
    // =====================================================================

    /// Export a single object as JSON string by UUID.
    #[wasm_bindgen]
    pub fn export_entry(&self, id: &str) -> String {
        let s = self.state.borrow();
        let idx = match s.id_to_index.get(id) { Some(&i) => i, None => return "null".to_string() };
        let obj = &s.objects[idx];
        let (center, radius) = obj.pick_mesh.bounding_sphere();
        let id_str = obj.id.to_string();
        let entry = ExportEntry {
            is_rsweep: s.rsweep_ids.contains(&id_str),
            id: id_str,
            name: obj.name.clone(),
            solid: obj.solid.clone(),
            mesh: Some(obj.mesh.clone()),
            style: Some(obj.style.clone()),
            bim: obj.bim.clone(),
            bounding_sphere: Some([center.x, center.y, center.z, radius]),
        };
        serde_json::to_string(&entry).unwrap_or_else(|e| {
            error!("export_entry failed: {}", e);
            "null".to_string()
        })
    }

    /// Import a single ExportEntry JSON into the scene (additive, no clear).
    #[wasm_bindgen]
    pub fn import_entry(&self, json: &str) -> JsValue {
        let entry: ExportEntry = match serde_json::from_str(json) {
            Ok(e) => e,
            Err(e) => {
                error!("import_entry failed: {}", e);
                return JsValue::from_str(&format!("{{\"error\":\"{}\"}}", e));
            }
        };
        let mut s = self.state.borrow_mut();
        let id = Uuid::parse_str(&entry.id).unwrap_or_else(|_| Uuid::new_v4());
        let idx = s.objects.len();
        let style = entry.style.unwrap_or_else(|| ObjectStyle::from_index(idx));

        // Solid-first: BRep wireframe shows clean edges; mesh-only for glTF imports.
        if let Some(solid) = entry.solid {
            let (polygon, wireframe, pick_mesh, mesh) = solid_to_instances(&s.creator, &solid, &style);
            let (center, radius) = pick_mesh.bounding_sphere();
            s.scene.add_object(&polygon);
            s.scene.add_object(&wireframe);
            let id_str = id.to_string();
            s.id_to_index.insert(id_str.clone(), idx);
            s.bounding_spheres.push((id_str.clone(), center, radius));
            let name = if entry.name.is_empty() { format!("Object {}", idx + 1) } else { entry.name };
            s.objects.push(SceneObject { id, name, solid: Some(solid), mesh, polygon, wireframe, style, pick_mesh, bim: entry.bim });
            if entry.is_rsweep { s.rsweep_ids.insert(id_str.clone()); }
            return JsValue::from_str(&format!("{{\"objectId\":\"{}\"}}", id_str));
        } else if let Some(mesh) = entry.mesh {
            let (polygon, wireframe, pick_mesh) = mesh_to_instances(&s.creator, &mesh, &style);
            let (center, radius) = pick_mesh.bounding_sphere();
            s.scene.add_object(&polygon);
            s.scene.add_object(&wireframe);
            let id_str = id.to_string();
            s.id_to_index.insert(id_str.clone(), idx);
            s.bounding_spheres.push((id_str.clone(), center, radius));
            let name = if entry.name.is_empty() { format!("Object {}", idx + 1) } else { entry.name };
            s.objects.push(SceneObject { id, name, solid: None, mesh, polygon, wireframe, style, pick_mesh, bim: entry.bim });
            if entry.is_rsweep { s.rsweep_ids.insert(id_str.clone()); }
            return JsValue::from_str(&format!("{{\"objectId\":\"{}\"}}", id_str));
        }
        JsValue::from_str("{\"error\":\"No solid or mesh in entry\"}")
    }

    // =====================================================================
    // Tier Management — ADR-0025 Phase 2
    // =====================================================================

    /// Return bounding spheres + colors for all Hot objects.
    /// Used by the JS tier manager to compute camera distance.
    /// Computes directly from pick_mesh (avoids stale cache / origin+0 fallback bug).
    #[wasm_bindgen]
    pub fn get_bounding_spheres(&self) -> String {
        let s = self.state.borrow();
        let spheres: Vec<serde_json::Value> = s.objects.iter().map(|obj| {
            let id_str = obj.id.to_string();
            let (center, radius) = obj.pick_mesh.bounding_sphere();
            serde_json::json!({
                "objectId": id_str,
                "center": [center.x, center.y, center.z],
                "radius": radius,
                "color": obj.style.albedo,
            })
        }).collect();
        serde_json::to_string(&spheres).unwrap_or_else(|_| "[]".to_string())
    }

    /// Add an LOD proxy (bounding-box wireframe) for a Warm-tier object.
    /// Called after evicting an object from Hot to Warm.
    /// Input JSON: {"objectId":"...","center":[x,y,z],"radius":r,"color":[r,g,b,a]}
    #[wasm_bindgen]
    pub fn add_lod_proxy(&self, json: &str) -> bool {
        #[derive(Deserialize)]
        struct ProxyParams {
            #[serde(rename = "objectId")]
            object_id: String,
            center: [f64; 3],
            radius: f64,
            color: [f64; 4],
        }
        let params: ProxyParams = match serde_json::from_str(json) {
            Ok(p) => p,
            Err(e) => { error!("add_lod_proxy: {}", e); return false; }
        };
        let mut s = self.state.borrow_mut();
        // Remove existing proxy for this ID if any
        s.lod_proxies.retain(|p| p.id != params.object_id);
        // Build AABB edges from bounding sphere
        let c = params.center;
        let r = params.radius;
        let min = [c[0] - r, c[1] - r, c[2] - r];
        let max = [c[0] + r, c[1] + r, c[2] + r];
        let v = [
            Point3::new(min[0], min[1], min[2]),
            Point3::new(max[0], min[1], min[2]),
            Point3::new(max[0], max[1], min[2]),
            Point3::new(min[0], max[1], min[2]),
            Point3::new(min[0], min[1], max[2]),
            Point3::new(max[0], min[1], max[2]),
            Point3::new(max[0], max[1], max[2]),
            Point3::new(min[0], max[1], max[2]),
        ];
        let edges: Vec<(Point3, Point3)> = vec![
            // Bottom face
            (v[0], v[1]), (v[1], v[2]), (v[2], v[3]), (v[3], v[0]),
            // Top face
            (v[4], v[5]), (v[5], v[6]), (v[6], v[7]), (v[7], v[4]),
            // Vertical edges
            (v[0], v[4]), (v[1], v[5]), (v[2], v[6]), (v[3], v[7]),
        ];
        let wire_state = WireFrameState {
            matrix: Matrix4::identity(),
            color: Vector4::new(params.color[0], params.color[1], params.color[2], 0.5),
        };
        let wireframe = s.creator.create_instance(&edges, &wire_state);
        let center = Point3::new(params.center[0], params.center[1], params.center[2]);
        s.lod_proxies.push(LodProxy {
            id: params.object_id,
            wireframe,
            center,
            radius: params.radius,
        });
        rebuild_scene(&mut s);
        true
    }

    /// Remove an LOD proxy for an object about to be promoted (Warm→Hot).
    #[wasm_bindgen]
    pub fn remove_lod_proxy(&self, id: &str) -> bool {
        let mut s = self.state.borrow_mut();
        let before = s.lod_proxies.len();
        s.lod_proxies.retain(|p| p.id != id);
        if s.lod_proxies.len() < before {
            rebuild_scene(&mut s);
            true
        } else {
            false
        }
    }

    /// Export entire scene as JSON string with UUIDs.
    #[wasm_bindgen]
    pub fn export_scene(&self) -> String {
        let s = self.state.borrow();
        let entries: Vec<ExportEntry> = s.objects.iter().map(|obj| {
            let (center, radius) = obj.pick_mesh.bounding_sphere();
            let id_str = obj.id.to_string();
            ExportEntry {
                is_rsweep: s.rsweep_ids.contains(&id_str),
                id: id_str,
                name: obj.name.clone(),
                solid: obj.solid.clone(),
                mesh: Some(obj.mesh.clone()),
                style: Some(obj.style.clone()),
                bim: obj.bim.clone(),
                bounding_sphere: Some([center.x, center.y, center.z, radius]),
            }
        }).collect();
        serde_json::to_string_pretty(&entries).unwrap_or_else(|e| {
            error!("Export failed: {}", e);
            "[]".to_string()
        })
    }

    /// Export entire scene as STEP string.
    #[wasm_bindgen]
    pub fn export_step(&self) -> String {
        use truck_stepio::out::*;
        let s = self.state.borrow();
        log!("WASM: export_step processing {} objects", s.objects.len());
        
        let compressed_solids: Vec<_> = s.objects.iter()
            .filter_map(|obj| {
                if let Some(solid) = &obj.solid {
                    log!("WASM: compressing solid for {}", obj.id);
                    Some(solid.compress())
                } else {
                    log!("WASM: object {} has no solid, skipping", obj.id);
                    None
                }
            })
            .collect();
        
        if compressed_solids.is_empty() {
            error!("WASM: export_step failed — no solids found in {} objects", s.objects.len());
            return String::new();
        }

        let models = StepModels::from_iter(compressed_solids.iter());
        
        CompleteStepDisplay::new(
            models,
            StepHeaderDescriptor {
                organization_system: "truck-webgpu-gui".to_owned(),
                ..Default::default()
            },
        ).to_string()
    }

    /// Export entire scene as OBJ string.
    #[wasm_bindgen]
    pub fn export_obj(&self) -> String {
        use truck_polymesh::obj;
        let s = self.state.borrow();
        let meshes: Vec<_> = s.objects.iter().map(|obj| obj.mesh.clone()).collect();
        
        let mut buf = Vec::new();
        if obj::write_vec(&meshes, &mut buf).is_ok() {
            String::from_utf8_lossy(&buf).into_owned()
        } else {
            String::new()
        }
    }

    /// Export entire scene as STL string (ASCII).
    #[wasm_bindgen]
    pub fn export_stl(&self) -> String {
        use truck_polymesh::stl;
        let s = self.state.borrow();
        let mut meshes = PolygonMesh::default();
        for obj in &s.objects {
            meshes.merge(obj.mesh.clone());
        }
        
        let mut buf = Vec::new();
        if stl::write(&meshes, &mut buf, stl::StlType::Ascii).is_ok() {
            String::from_utf8_lossy(&buf).into_owned()
        } else {
            String::new()
        }
    }

    /// Detect clash between two solids.
    #[wasm_bindgen]
    pub fn clash_detect(&self, id_a: &str, id_b: &str) -> bool {
        let s = self.state.borrow();
        let idx_a = match s.id_to_index.get(id_a) { Some(&i) => i, None => return false };
        let idx_b = match s.id_to_index.get(id_b) { Some(&i) => i, None => return false };
        
        let solid_a = match &s.objects[idx_a].solid { Some(s) => s, None => return false };
        let solid_b = match &s.objects[idx_b].solid { Some(s) => s, None => return false };
        
        // Use a reasonable tolerance for clash detection
        if let Some(result) = truck_shapeops::and(solid_a, solid_b, 0.05) {
            !result.boundaries().is_empty()
        } else {
            false
        }
    }

    /// Import scene from JSON string. Replaces current scene.
    #[wasm_bindgen]
    pub fn import_scene(&self, json: &str) -> bool {
        let entries: Vec<ExportEntry> = match serde_json::from_str(json) {
            Ok(e) => e,
            Err(e) => {
                error!("Import failed: {}", e);
                return false;
            }
        };
        let mut s = self.state.borrow_mut();
        s.objects.clear();
        s.id_to_index.clear();
        s.bounding_spheres.clear();
        s.rsweep_ids.clear();
        s.interaction = InteractionMode::Idle;
        s.scene.clear_objects();
        for entry in entries {
            let id = Uuid::parse_str(&entry.id).unwrap_or_else(|_| Uuid::new_v4());
            let idx = s.objects.len();
            let style = entry.style.unwrap_or_else(|| ObjectStyle::from_index(idx));
            
            // Solid-first: BRep wireframe shows clean edges; mesh-only for glTF imports.
            if let Some(solid) = entry.solid {
                let (polygon, wireframe, pick_mesh, mesh) = solid_to_instances(&s.creator, &solid, &style);
                let (center, radius) = pick_mesh.bounding_sphere();
                s.scene.add_object(&polygon);
                s.scene.add_object(&wireframe);
                let id_str = id.to_string();
                s.id_to_index.insert(id_str.clone(), idx);
                s.bounding_spheres.push((id_str, center, radius));
                let name = if entry.name.is_empty() { format!("Object {}", idx + 1) } else { entry.name };
                s.objects.push(SceneObject { id, name, solid: Some(solid), mesh, polygon, wireframe, style, pick_mesh, bim: entry.bim });
                if entry.is_rsweep { s.rsweep_ids.insert(id.to_string()); }
            } else if let Some(mesh) = entry.mesh {
                let (polygon, wireframe, pick_mesh) = mesh_to_instances(&s.creator, &mesh, &style);
                let (center, radius) = pick_mesh.bounding_sphere();
                s.scene.add_object(&polygon);
                s.scene.add_object(&wireframe);
                let id_str = id.to_string();
                s.id_to_index.insert(id_str.clone(), idx);
                s.bounding_spheres.push((id_str, center, radius));
                let name = if entry.name.is_empty() { format!("Object {}", idx + 1) } else { entry.name };
                s.objects.push(SceneObject { id, name, solid: None, mesh, polygon, wireframe, style, pick_mesh, bim: entry.bim });
                if entry.is_rsweep { s.rsweep_ids.insert(id.to_string()); }
            }
        }
        log!("WASM: Imported {} objects", s.objects.len());
        true
    }

    // =====================================================================
    // Gizmo: picking, drag, callbacks
    // =====================================================================

    /// Get the currently selected object UUID (or null).
    #[wasm_bindgen]
    pub fn get_selected(&self) -> JsValue {
        let s = self.state.borrow();
        match &s.interaction {
            InteractionMode::Selected { object_id } | InteractionMode::Dragging { object_id, .. } => {
                JsValue::from_str(object_id)
            }
            InteractionMode::Idle => JsValue::NULL,
        }
    }

    /// Get the current interaction mode as a string: "idle", "selected", or "dragging".
    #[wasm_bindgen]
    pub fn get_interaction_mode(&self) -> String {
        let s = self.state.borrow();
        match &s.interaction {
            InteractionMode::Idle => "idle".to_string(),
            InteractionMode::Selected { .. } => "selected".to_string(),
            InteractionMode::Dragging { .. } => "dragging".to_string(),
        }
    }

    /// Try to begin a gizmo drag at the given NDC coordinates.
    /// Returns the axis name ("x", "y", "z") if a gizmo arrow was hit, or null.
    /// Must be in Selected mode. Transitions to Dragging on success.
    #[wasm_bindgen]
    pub fn begin_gizmo_drag(&self, ndc_x: f64, ndc_y: f64) -> JsValue {
        let mut s = self.state.borrow_mut();
        let object_id = match &s.interaction {
            InteractionMode::Selected { object_id } => object_id.clone(),
            _ => return JsValue::NULL,
        };

        // Find the selected object's bounding sphere center (gizmo origin)
        let gizmo_origin = s.bounding_spheres.iter()
            .find(|(id, _, _)| *id == object_id)
            .map(|(_, center, _)| *center);
        let gizmo_origin = match gizmo_origin {
            Some(o) => o,
            None => return JsValue::NULL,
        };

        // Check which axis arrow is closest to the click in screen space
        let camera = &s.scene.studio_config().camera;
        let click_ray = camera.ray(Point2::new(ndc_x, ndc_y));

        // Gizmo arrow length (world space) — proportional to camera distance
        let cam_dist = (camera.position() - gizmo_origin).magnitude();
        let arrow_len = cam_dist * 0.25;

        let mut best_axis: Option<Axis> = None;
        let mut best_dist = f64::MAX;

        for axis in [Axis::X, Axis::Y, Axis::Z] {
            let dir = axis.unit_vector();
            let arrow_end = gizmo_origin + dir * arrow_len;

            // Distance from click ray to the line segment (gizmo_origin → arrow_end)
            let dist = ray_to_segment_distance(
                click_ray.origin(), click_ray.direction(),
                gizmo_origin, arrow_end,
            );

            // Threshold: fraction of arrow length (generous for usability)
            let threshold = arrow_len * 0.15;
            if dist < threshold && dist < best_dist {
                best_dist = dist;
                best_axis = Some(axis);
            }
        }

        match best_axis {
            Some(axis) => {
                let axis_name = match axis {
                    Axis::X => "x",
                    Axis::Y => "y",
                    Axis::Z => "z",
                };
                log!("WASM: begin drag axis={}", axis_name);
                s.interaction = InteractionMode::Dragging {
                    object_id,
                    axis,
                    cumulative_delta: [0.0, 0.0, 0.0],
                };
                JsValue::from_str(axis_name)
            }
            None => JsValue::NULL,
        }
    }

    /// Update the gizmo drag with a new NDC position.
    /// Computes the world-space delta along the constrained axis and applies it as live preview.
    #[wasm_bindgen]
    pub fn update_gizmo_drag(&self, ndc_x: f64, ndc_y: f64, prev_ndc_x: f64, prev_ndc_y: f64) {
        // We need to extract drag info, do the translation, then update state
        let drag_info = {
            let s = self.state.borrow();
            match &s.interaction {
                InteractionMode::Dragging { object_id, axis, cumulative_delta } => {
                    Some((object_id.clone(), *axis, *cumulative_delta))
                }
                _ => None,
            }
        };

        let (object_id, axis, mut cumulative_delta) = match drag_info {
            Some(info) => info,
            None => return,
        };

        // Compute world-space delta along the constrained axis
        let delta = {
            let s = self.state.borrow();
            let camera = &s.scene.studio_config().camera;
            let axis_dir = axis.unit_vector();

            // Find gizmo origin
            let gizmo_origin = s.bounding_spheres.iter()
                .find(|(id, _, _)| *id == object_id)
                .map(|(_, center, _)| *center)
                .unwrap_or(Point3::origin());

            // Project axis direction to screen space
            compute_axis_drag_delta(camera, gizmo_origin, axis_dir, ndc_x, ndc_y, prev_ndc_x, prev_ndc_y)
        };

        if delta.abs() < 1e-10 {
            return;
        }

        // Apply the incremental translation (live preview)
        let axis_dir = axis.unit_vector();
        let dx = axis_dir.x * delta;
        let dy = axis_dir.y * delta;
        let dz = axis_dir.z * delta;

        // Use translate_object for the live preview
        // (We need to drop state borrow before calling translate_object)
        self.translate_object(&object_id, dx, dy, dz);

        // Update cumulative delta
        cumulative_delta[0] += dx;
        cumulative_delta[1] += dy;
        cumulative_delta[2] += dz;

        let mut s = self.state.borrow_mut();
        s.interaction = InteractionMode::Dragging {
            object_id,
            axis,
            cumulative_delta,
        };
    }

    /// End the gizmo drag. Returns a JsValue object { objectId, dx, dy, dz } with the total delta.
    #[wasm_bindgen]
    pub fn end_gizmo_drag(&self) -> JsValue {
        let mut s = self.state.borrow_mut();
        match std::mem::replace(&mut s.interaction, InteractionMode::Idle) {
            InteractionMode::Dragging { object_id, cumulative_delta, .. } => {
                log!("WASM: end drag delta=[{:.3}, {:.3}, {:.3}]",
                    cumulative_delta[0], cumulative_delta[1], cumulative_delta[2]);
                s.interaction = InteractionMode::Selected { object_id: object_id.clone() };

                // Call JS callback with the total delta
                if let Some(ref f) = s.on_drag_complete {
                    let _ = f.call4(
                        &JsValue::NULL,
                        &JsValue::from_str(&object_id),
                        &JsValue::from_f64(cumulative_delta[0]),
                        &JsValue::from_f64(cumulative_delta[1]),
                        &JsValue::from_f64(cumulative_delta[2]),
                    );
                }

                // Return the delta info
                let result = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&result, &"objectId".into(), &JsValue::from_str(&object_id));
                let _ = js_sys::Reflect::set(&result, &"dx".into(), &JsValue::from_f64(cumulative_delta[0]));
                let _ = js_sys::Reflect::set(&result, &"dy".into(), &JsValue::from_f64(cumulative_delta[1]));
                let _ = js_sys::Reflect::set(&result, &"dz".into(), &JsValue::from_f64(cumulative_delta[2]));
                result.into()
            }
            other => {
                s.interaction = other;
                JsValue::NULL
            }
        }
    }

    /// Cancel the gizmo drag. Reverses the cumulative translation.
    #[wasm_bindgen]
    pub fn cancel_gizmo_drag(&self) -> bool {
        let drag_info = {
            let s = self.state.borrow();
            match &s.interaction {
                InteractionMode::Dragging { object_id, cumulative_delta, .. } => {
                    Some((object_id.clone(), *cumulative_delta))
                }
                _ => None,
            }
        };

        match drag_info {
            Some((object_id, delta)) => {
                // Reverse the translation
                self.translate_object(&object_id, -delta[0], -delta[1], -delta[2]);
                let mut s = self.state.borrow_mut();
                s.interaction = InteractionMode::Selected { object_id };
                log!("WASM: drag cancelled");
                true
            }
            None => false,
        }
    }

    /// DEPRECATED: No longer needed. Selection now goes through execute("select", ...).
    /// Register a JS callback for when an object is selected (or deselected).
    /// Callback signature: (objectId: string | null) => void
    #[wasm_bindgen]
    pub fn set_on_select(&self, f: js_sys::Function) {
        self.state.borrow_mut().on_select = Some(f);
    }

    /// Register a JS callback for when a gizmo drag completes.
    /// Callback signature: (objectId: string, dx: number, dy: number, dz: number) => void
    #[wasm_bindgen]
    pub fn set_on_drag_complete(&self, f: js_sys::Function) {
        self.state.borrow_mut().on_drag_complete = Some(f);
    }

    // =====================================================================
    // Parametric sketching
    // =====================================================================

    /// Begin a new sketch on the given plane ("xy", "xz", "yz").
    /// Returns the sketch UUID.
    #[wasm_bindgen]
    pub fn begin_sketch(&self, plane: &str) -> String {
        use crate::sketch::{Sketch, SketchPlane};
        let plane = match plane {
            "xz" => SketchPlane::XZ,
            "yz" => SketchPlane::YZ,
            _ => SketchPlane::XY,
        };
        let sketch = Sketch::new(plane);
        let id = sketch.id.to_string();
        log!("WASM: begin_sketch plane={} id={}", plane_str(sketch.plane), &id[..8]);
        self.state.borrow_mut().active_sketch = Some(sketch);
        id
    }

    /// Add a point to the active sketch. Returns point UUID (empty if no sketch).
    #[wasm_bindgen]
    pub fn sketch_add_point(&self, x: f64, y: f64) -> String {
        let mut s = self.state.borrow_mut();
        match s.active_sketch.as_mut() {
            Some(sketch) => {
                let id = sketch.add_point(x, y);
                id.to_string()
            }
            None => {
                error!("WASM: sketch_add_point called with no active sketch");
                String::new()
            }
        }
    }

    /// Add an edge between two points. Returns edge UUID (empty if error).
    #[wasm_bindgen]
    pub fn sketch_add_edge(&self, p0_id: &str, p1_id: &str) -> String {
        let mut s = self.state.borrow_mut();
        let sketch = match s.active_sketch.as_mut() {
            Some(sk) => sk,
            None => { error!("WASM: sketch_add_edge with no active sketch"); return String::new(); }
        };
        let p0 = match uuid::Uuid::parse_str(p0_id) {
            Ok(u) => u, Err(_) => { error!("WASM: invalid p0_id"); return String::new(); }
        };
        let p1 = match uuid::Uuid::parse_str(p1_id) {
            Ok(u) => u, Err(_) => { error!("WASM: invalid p1_id"); return String::new(); }
        };
        sketch.add_edge(p0, p1).to_string()
    }

    /// Add a constraint to the active sketch.
    /// constraint_type: "fixed", "horizontal", "vertical", "distance",
    ///   "horizontal_distance", "vertical_distance", "coincident",
    ///   "parallel", "perpendicular", "equal_length", "midpoint"
    /// params: JSON object with constraint-specific parameters.
    /// Returns constraint UUID (empty if error).
    #[wasm_bindgen]
    pub fn sketch_add_constraint(&self, constraint_type: &str, params: &str) -> String {
        let mut s = self.state.borrow_mut();
        let sketch = match s.active_sketch.as_mut() {
            Some(sk) => sk,
            None => { error!("WASM: sketch_add_constraint with no active sketch"); return String::new(); }
        };

        let params: serde_json::Value = match serde_json::from_str(params) {
            Ok(v) => v,
            Err(e) => { error!("WASM: invalid constraint params: {}", e); return String::new(); }
        };

        let kind = match crate::commands::sketch::parse_constraint_kind(constraint_type, &params) {
            Ok(k) => k,
            Err(e) => { error!("WASM: {}", e); return String::new(); }
        };

        sketch.add_constraint(kind).to_string()
    }

    /// Solve the active sketch. Returns JSON with solved positions:
    /// `[{"id": "uuid", "x": 1.0, "y": 2.0}, ...]`
    /// Returns empty string on error.
    #[wasm_bindgen]
    pub fn sketch_solve(&self) -> String {
        let s = self.state.borrow();
        let sketch = match &s.active_sketch {
            Some(sk) => sk,
            None => { error!("WASM: sketch_solve with no active sketch"); return String::new(); }
        };
        match crate::sketch::solve_sketch(sketch) {
            Ok(solved) => {
                let result: Vec<serde_json::Value> = solved.positions.iter()
                    .map(|(id, x, y)| serde_json::json!({ "id": id.to_string(), "x": x, "y": y }))
                    .collect();
                serde_json::to_string(&result).unwrap_or_default()
            }
            Err(e) => {
                error!("WASM: sketch_solve failed: {}", e);
                String::new()
            }
        }
    }

    /// Extrude the active sketch to a solid. Returns new object UUID.
    /// Adds the solid to the scene and clears the active sketch.
    #[wasm_bindgen]
    pub fn sketch_extrude(&self, height: f64) -> String {
        let sketch = {
            let mut s = self.state.borrow_mut();
            match s.active_sketch.take() {
                Some(sk) => sk,
                None => { error!("WASM: sketch_extrude with no active sketch"); return String::new(); }
            }
        };

        match crate::sketch::sketch_to_solid(&sketch, height) {
            Ok(solid) => {
                log!("WASM: sketch extruded, height={}", height);
                let mut s = self.state.borrow_mut();
                let id = add_solid_to_state(&mut s, solid, "Extruded", None);
                rebuild_scene(&mut s);
                id
            }
            Err(e) => {
                error!("WASM: sketch_extrude failed: {}", e);
                self.state.borrow_mut().active_sketch = Some(sketch);
                String::new()
            }
        }
    }

    /// Cancel the active sketch.
    #[wasm_bindgen]
    pub fn sketch_cancel(&self) {
        let mut s = self.state.borrow_mut();
        if s.active_sketch.take().is_some() {
            log!("WASM: sketch cancelled");
        }
    }

    /// Export active sketch as JSON (for Automerge serialization).
    #[wasm_bindgen]
    pub fn sketch_export(&self) -> String {
        let s = self.state.borrow();
        match &s.active_sketch {
            Some(sketch) => serde_json::to_string(sketch).unwrap_or_default(),
            None => String::new(),
        }
    }

    /// Import a sketch from JSON, replacing the active sketch.
    #[wasm_bindgen]
    pub fn sketch_import(&self, json: &str) -> bool {
        match serde_json::from_str::<crate::sketch::Sketch>(json) {
            Ok(sketch) => {
                log!("WASM: sketch imported, {} points, {} edges, {} constraints",
                    sketch.points.len(), sketch.edges.len(), sketch.constraints.len());
                self.state.borrow_mut().active_sketch = Some(sketch);
                true
            }
            Err(e) => {
                error!("WASM: sketch_import failed: {}", e);
                false
            }
        }
    }

    /// Check if there is an active sketch.
    #[wasm_bindgen]
    pub fn has_active_sketch(&self) -> bool {
        self.state.borrow().active_sketch.is_some()
    }

    // =====================================================================
    // Object style (color + material)
    // =====================================================================

    /// Get object style as JSON: {"albedo":[r,g,b,a],"roughness":f,"reflectance":f,"ambient_ratio":f}
    #[wasm_bindgen]
    pub fn get_object_style(&self, id: &str) -> String {
        let s = self.state.borrow();
        let idx = match s.id_to_index.get(id) { Some(&i) => i, None => return String::new() };
        serde_json::to_string(&s.objects[idx].style).unwrap_or_default()
    }

    /// Get object BIM metadata as JSON (or empty string if none).
    #[wasm_bindgen]
    pub fn get_bim_metadata(&self, id: &str) -> String {
        let s = self.state.borrow();
        let idx = match s.id_to_index.get(id) { Some(&i) => i, None => return String::new() };
        match &s.objects[idx].bim {
            Some(bim) => serde_json::to_string(bim).unwrap_or_default(),
            None => String::new(),
        }
    }

    /// Set object style from JSON. Rebuilds the visual instance.
    #[wasm_bindgen]
    pub fn set_object_style(&self, id: &str, style_json: &str) -> bool {
        let new_style: ObjectStyle = match serde_json::from_str(style_json) {
            Ok(s) => s,
            Err(e) => { error!("set_object_style: {}", e); return false; }
        };
        let mut s = self.state.borrow_mut();
        let idx = match s.id_to_index.get(id) { Some(&i) => i, None => return false };
        let obj_id = s.objects[idx].id;
        let name = s.objects[idx].name.clone();
        let solid = match &s.objects[idx].solid {
            Some(s) => s.clone(),
            None => return false, // Not yet supported for raw meshes
        };
        let (polygon, wireframe, pick_mesh, mesh) = solid_to_instances(&s.creator, &solid, &new_style);
        let bim = s.objects[idx].bim.clone();
        s.objects[idx] = SceneObject {
            id: obj_id,
            name,
            solid: Some(solid),
            mesh,
            polygon,
            wireframe,
            style: new_style,
            pick_mesh,
            bim,
        };
        rebuild_bounding_spheres(&mut s);
        rebuild_scene(&mut s);
        true
    }

    /// Convenience: set just the albedo color without touching other material properties.
    #[wasm_bindgen]
    pub fn set_object_color(&self, id: &str, r: f64, g: f64, b: f64, a: f64) -> bool {
        let mut s = self.state.borrow_mut();
        let idx = match s.id_to_index.get(id) { Some(&i) => i, None => return false };
        let obj_id = s.objects[idx].id;
        let name = s.objects[idx].name.clone();
        let solid = match &s.objects[idx].solid {
            Some(s) => s.clone(),
            None => return false,
        };
        let mut style = s.objects[idx].style.clone();
        style.albedo = [r, g, b, a];
        let (polygon, wireframe, pick_mesh, mesh) = solid_to_instances(&s.creator, &solid, &style);
        let bim = s.objects[idx].bim.clone();
        s.objects[idx] = SceneObject {
            id: obj_id,
            name,
            solid: Some(solid),
            mesh,
            polygon,
            wireframe,
            style,
            pick_mesh,
            bim,
        };
        rebuild_bounding_spheres(&mut s);
        rebuild_scene(&mut s);
        true
    }

    // =====================================================================
    // Misc
    // =====================================================================

    #[wasm_bindgen]
    pub fn set_clear_color(&self, r: f64, g: f64, b: f64, a: f64) {
        let mut s = self.state.borrow_mut();
        s.scene.studio_config_mut().background = wgpu::Color { r, g, b, a };
    }

    /// Debug: return pick mesh stats for each object as JSON.
    #[wasm_bindgen]
    pub fn pick_mesh_stats(&self) -> String {
        let s = self.state.borrow();
        let stats: Vec<serde_json::Value> = s.objects.iter().map(|obj| {
            serde_json::json!({
                "id": obj.id.to_string()[..8],
                "positions": obj.pick_mesh.positions.len(),
                "triangles": obj.pick_mesh.triangles.len(),
            })
        }).collect();
        serde_json::to_string(&stats).unwrap_or_default()
    }

    // =====================================================================
    // Unified command dispatch — replaces JS executeWasm() switch
    // =====================================================================

    /// Execute a command by type name + JSON params, return JSON result.
    /// This is the single entry point for all command dispatch from JS.
    /// Each command deserializes into a typed param struct (source of truth for schema).
    #[wasm_bindgen]
    pub fn execute(&self, cmd_type: &str, params_json: &str) -> String {
        let p: serde_json::Value = serde_json::from_str(params_json).unwrap_or(serde_json::json!({}));

        // Replay ID: if Automerge replay passes a _replayId in params, we'll
        // rename the kernel's freshly-generated UUID to match it after execution.
        // Uses _replayId (not objectId) because objectId is the source reference
        // for commands like duplicate/translate — not the desired result ID.
        let replay_id = p.get("_replayId").and_then(|v| v.as_str()).map(|s| s.to_string());

        let mut result: serde_json::Value = match cmd_type {
            // ── Primitives ──────────────────────────────────────────
            "add_cube" => {
                let params: AddCubeParams = serde_json::from_value(p).unwrap_or(AddCubeParams { size: 1.0 });
                match params.validate() {
                    Err(e) => serde_json::json!({ "error": e }),
                    Ok(()) => serde_json::json!({ "objectId": self.add_cube(params.size) }),
                }
            }
            "add_sphere" => {
                let params: AddSphereParams = serde_json::from_value(p).unwrap_or(AddSphereParams { radius: 1.0 });
                match params.validate() {
                    Err(e) => serde_json::json!({ "error": e }),
                    Ok(()) => serde_json::json!({ "objectId": self.add_sphere(params.radius) }),
                }
            }
            "add_cylinder" => {
                let params: AddCylinderParams = serde_json::from_value(p).unwrap_or(AddCylinderParams { radius: 0.5, height: 1.0 });
                match params.validate() {
                    Err(e) => serde_json::json!({ "error": e }),
                    Ok(()) => serde_json::json!({ "objectId": self.add_cylinder(params.radius, params.height) }),
                }
            }
            "add_torus" => {
                let params: AddTorusParams = serde_json::from_value(p).unwrap_or(AddTorusParams { major_radius: 1.0, minor_radius: 0.3 });
                match params.validate() {
                    Err(e) => serde_json::json!({ "error": e }),
                    Ok(()) => serde_json::json!({ "objectId": self.add_torus(params.major_radius, params.minor_radius) }),
                }
            }

            // ── Transforms ──────────────────────────────────────────
            "translate" => {
                match serde_json::from_value::<TranslateParams>(p) {
                    Ok(params) => {
                        let ok = self.translate_object(&params.object_id, params.dx, params.dy, params.dz);
                        if ok { serde_json::json!({ "success": true }) }
                        else { serde_json::json!({ "error": format!("Object '{}' not found", params.object_id) }) }
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "rotate" => {
                match serde_json::from_value::<RotateParams>(p) {
                    Ok(params) => match params.validate() {
                        Err(e) => serde_json::json!({ "error": e }),
                        Ok(()) => {
                            let ok = self.rotate_object(&params.object_id, params.axis_x, params.axis_y, params.axis_z, params.angle_deg);
                            if ok { serde_json::json!({ "success": true }) }
                            else { serde_json::json!({ "error": format!("Object '{}' not found", params.object_id) }) }
                        }
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "scale" => {
                match serde_json::from_value::<ScaleParams>(p) {
                    Ok(params) => match params.validate() {
                        Err(e) => serde_json::json!({ "error": e }),
                        Ok(()) => {
                            let ok = self.scale_object(&params.object_id, params.sx, params.sy, params.sz);
                            if ok { serde_json::json!({ "success": true }) }
                            else { serde_json::json!({ "error": format!("Object '{}' not found", params.object_id) }) }
                        }
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "duplicate" => {
                match serde_json::from_value::<ObjectIdParam>(p) {
                    Ok(params) => {
                        let id = self.duplicate_object(&params.object_id);
                        if id.is_empty() { serde_json::json!({ "error": "Duplicate failed" }) }
                        else { serde_json::json!({ "objectId": id }) }
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }

            // ── Booleans ────────────────────────────────────────────
            "boolean_union" => {
                match serde_json::from_value::<BooleanParams>(p) {
                    Ok(params) => {
                        let is_rsweep = {
                            let s = self.state.borrow();
                            s.rsweep_ids.contains(&params.id_a) || s.rsweep_ids.contains(&params.id_b)
                        };
                        if is_rsweep {
                            serde_json::json!({ "error": "Boolean ops with sphere/torus geometry are not supported in browser WASM (truck-shapeops limitation). Use cube/cylinder shapes." })
                        } else {
                            let id = self.boolean_union(&params.id_a, &params.id_b);
                            if id.is_empty() { serde_json::json!({ "error": "Union failed: objects may not overlap or geometry is incompatible" }) }
                            else { serde_json::json!({ "objectId": id }) }
                        }
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "boolean_subtract" => {
                match serde_json::from_value::<BooleanParams>(p) {
                    Ok(params) => {
                        let is_rsweep = {
                            let s = self.state.borrow();
                            s.rsweep_ids.contains(&params.id_a) || s.rsweep_ids.contains(&params.id_b)
                        };
                        if is_rsweep {
                            serde_json::json!({ "error": "Boolean ops with sphere/torus geometry are not supported in browser WASM (truck-shapeops limitation). Use cube/cylinder shapes." })
                        } else {
                            let id = self.boolean_subtract(&params.id_a, &params.id_b);
                            if id.is_empty() { serde_json::json!({ "error": "Subtract failed: objects may not overlap or geometry is incompatible" }) }
                            else { serde_json::json!({ "objectId": id }) }
                        }
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "boolean_intersect" => {
                match serde_json::from_value::<BooleanParams>(p) {
                    Ok(params) => {
                        let is_rsweep = {
                            let s = self.state.borrow();
                            s.rsweep_ids.contains(&params.id_a) || s.rsweep_ids.contains(&params.id_b)
                        };
                        if is_rsweep {
                            serde_json::json!({ "error": "Boolean ops with sphere/torus geometry are not supported in browser WASM (truck-shapeops limitation). Use cube/cylinder shapes." })
                        } else {
                            let id = self.boolean_intersect(&params.id_a, &params.id_b);
                            if id.is_empty() { serde_json::json!({ "error": "Intersect failed: objects may not overlap or geometry is incompatible" }) }
                            else { serde_json::json!({ "objectId": id }) }
                        }
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }

            // ── Scene ───────────────────────────────────────────────
            "delete" => {
                match serde_json::from_value::<ObjectIdParam>(p) {
                    Ok(params) => {
                        self.delete_object(&params.object_id);
                        serde_json::json!({ "success": true })
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "clear" => {
                self.clear_scene();
                serde_json::json!({ "success": true })
            }
            "export_scene" => {
                serde_json::json!({ "scene": self.export_scene() })
            }
            "export_step" => {
                let step = self.export_step();
                if step.is_empty() { serde_json::json!({ "error": "Export failed" }) }
                else { serde_json::json!({ "step": step }) }
            }
            "export_obj" => {
                let obj = self.export_obj();
                if obj.is_empty() { serde_json::json!({ "error": "Export failed" }) }
                else { serde_json::json!({ "obj": obj }) }
            }
            "export_stl" => {
                let stl = self.export_stl();
                if stl.is_empty() { serde_json::json!({ "error": "Export failed" }) }
                else { serde_json::json!({ "stl": stl }) }
            }
            "clash_detect" => {
                match serde_json::from_value::<BooleanParams>(p) {
                    Ok(params) => {
                        let clash = self.clash_detect(&params.id_a, &params.id_b);
                        serde_json::json!({ "clash": clash })
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "import_scene" => {
                match serde_json::from_value::<ImportSceneParams>(p) {
                    Ok(params) => {
                        let ok = self.import_scene(&params.json);
                        serde_json::json!({ "success": ok })
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "import_ifc" => {
                match serde_json::from_value::<ImportIfcParams>(p) {
                    Ok(params) => {
                        log!("WASM: import_ifc data length={}", params.data.len());
                        let index = ifc::build_entity_index(&params.data);
                        let ids: Vec<u32> = index.keys().cloned().collect();
                        let mut decoder = ifc::EntityDecoder::with_index(&params.data, index);
                        let router = ifc_lite_geometry::router::GeometryRouter::new();
                        
                        let mut count = 0;
                        let mut s = self.state.borrow_mut();
                        let mut entity_to_uuid = HashMap::new();
                        let mut hierarchy_map: HashMap<u32, BimNodeJson> = HashMap::new();
                        
                        // First pass: extract geometry and metadata
                        for &id in &ids {
                            if let Ok(entity) = decoder.decode_by_id(id) {
                                let type_name: &str = entity.ifc_type.as_str();
                                
                                // Register spatial nodes even if they don't have geometry
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
                                                    StandardAttributes {
                                                        positions,
                                                        ..Default::default()
                                                    },
                                                    Faces::from_iter(faces_vec)
                                                );
                                                
                                                let bim = BimMetadata {
                                                    ifc_type: type_name.to_string(),
                                                    global_id: entity.get_string(0).unwrap_or("").to_string(),
                                                    properties: HashMap::new(),
                                                };
                                                
                                                let uuid = add_mesh_to_state(&mut s, poly, type_name, Some(bim));
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
                        
                        // Second pass: extract relationships
                        for &id in &ids {
                            if let Ok(entity) = decoder.decode_by_id(id) {
                                match entity.ifc_type {
                                    ifc::IfcType::IfcRelAggregates => {
                                        // 4: RelatingObject, 5: RelatedObjects
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
                                        // 4: RelatedElements, 5: RelatingStructure
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
                        
                        rebuild_scene(&mut s);
                        log!("WASM: Imported {} entities from IFC", count);
                        let nodes: Vec<BimNodeJson> = hierarchy_map.into_values().collect();
                        serde_json::json!({ "success": true, "meshCount": count, "hierarchy": nodes })
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "import_step" => {
                match serde_json::from_value::<ImportStepParams>(p) {
                    Ok(params) => {
                        log!("WASM: import_step data length={}", params.data.len());
                        use truck_stepio::r#in::*;
                        match Table::from_step(&params.data) {
                            Some(table) => {
                                let mut count = 0;
                                let mut s = self.state.borrow_mut();
                                
                                for step_solid in table.manifold_solid_brep.values() {
                                    if let Ok(csolid) = table.to_compressed_solid(step_solid) {
                                        for cshell in csolid.boundaries {
                                            // Triangulate the shell directly
                                            let pre = cshell.robust_triangulation(0.01).to_polygon();
                                            let bdd = pre.bounding_box();
                                            let mesh = cshell.robust_triangulation(bdd.diameter() * 0.001).to_polygon();
                                            add_mesh_to_state(&mut s, mesh, "STEP Mesh", None);
                                            count += 1;
                                        }
                                    }
                                }
                                
                                rebuild_scene(&mut s);
                                log!("WASM: Imported {} meshes from STEP", count);
                                serde_json::json!({ "success": true, "meshCount": count })
                            }
                            None => {
                                error!("WASM: STEP parse failed (returned None)");
                                serde_json::json!({ "error": "STEP parse failed" })
                            }
                        }
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }

            // ── Selection ───────────────────────────────────────────
            "select_at" => {
                // Pick + select in one step (combines pick_at + select)
                let params: PickAtParams = serde_json::from_value(p).unwrap_or(PickAtParams { ndc_x: 0.0, ndc_y: 0.0 });
                let mut s = self.state.borrow_mut();
                let picked = pick_object(&s, params.ndc_x, params.ndc_y);
                match picked {
                    Some(ref id) => {
                        s.selected = Some(id.clone());
                        s.interaction = InteractionMode::Selected { object_id: id.clone() };
                    }
                    None => {
                        s.selected = None;
                        s.interaction = InteractionMode::Idle;
                    }
                }
                rebuild_scene(&mut s);
                let selected_id = s.selected.clone();
                match selected_id {
                    Some(id) => serde_json::json!({ "selectedId": id }),
                    None => serde_json::json!({ "selectedId": null }),
                }
            }
            "pick_at" => {
                // Read-only ray-cast: returns pickedId WITHOUT changing selection state
                let params: PickAtParams = serde_json::from_value(p).unwrap_or(PickAtParams { ndc_x: 0.0, ndc_y: 0.0 });
                let s = self.state.borrow();
                let picked = pick_object(&s, params.ndc_x, params.ndc_y);
                serde_json::json!({ "pickedId": picked })
            }
            "select" => {
                // Set selection by ID (or clear if empty/missing)
                let params: SelectParams = serde_json::from_value(p).unwrap_or(SelectParams { id: String::new() });
                let mut s = self.state.borrow_mut();
                if params.id.is_empty() || !s.id_to_index.contains_key(&params.id) {
                    s.selected = None;
                    s.interaction = InteractionMode::Idle;
                } else {
                    s.selected = Some(params.id.clone());
                    s.interaction = InteractionMode::Selected { object_id: params.id };
                }
                rebuild_scene(&mut s);
                let selected_id = s.selected.clone();
                match selected_id {
                    Some(id) => serde_json::json!({ "selectedId": id }),
                    None => serde_json::json!({ "selectedId": null }),
                }
            }
            "deselect" => {
                let mut s = self.state.borrow_mut();
                s.selected = None;
                s.interaction = InteractionMode::Idle;
                rebuild_scene(&mut s);
                serde_json::json!({ "selectedId": null })
            }

            // ── Style ───────────────────────────────────────────────
            "get_object_style" => {
                match serde_json::from_value::<ObjectIdParam>(p) {
                    Ok(params) => {
                        let json = self.get_object_style(&params.object_id);
                        if json.is_empty() { serde_json::json!({ "error": "Not found" }) }
                        else {
                            match serde_json::from_str::<serde_json::Value>(&json) {
                                Ok(v) => serde_json::json!({ "style": v }),
                                Err(_) => serde_json::json!({ "error": "Parse error" }),
                            }
                        }
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "get_bim_metadata" => {
                match serde_json::from_value::<ObjectIdParam>(p) {
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
                }
            }
            "set_style" => {
                match serde_json::from_value::<SetStyleParams>(p) {
                    Ok(params) => {
                        let style_str = serde_json::to_string(&params.style).unwrap_or_default();
                        let ok = self.set_object_style(&params.object_id, &style_str);
                        serde_json::json!({ "success": ok })
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "set_color" => {
                match serde_json::from_value::<SetColorParams>(p) {
                    Ok(params) => {
                        let ok = self.set_object_color(&params.object_id, params.r, params.g, params.b, params.a);
                        serde_json::json!({ "success": ok })
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }

            // ── Sketch ──────────────────────────────────────────────
            "begin_sketch" => {
                match serde_json::from_value::<BeginSketchParams>(p) {
                    Ok(params) => {
                        let id = self.begin_sketch(&params.plane);
                        if id.is_empty() { serde_json::json!({ "error": "begin_sketch failed" }) }
                        else { serde_json::json!({ "sketchId": id }) }
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "sketch_add_point" => {
                match serde_json::from_value::<SketchAddPointParams>(p) {
                    Ok(params) => {
                        let id = self.sketch_add_point(params.x, params.y);
                        if id.is_empty() { serde_json::json!({ "error": "No active sketch" }) }
                        else { serde_json::json!({ "pointId": id }) }
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "sketch_add_edge" => {
                match serde_json::from_value::<SketchAddEdgeParams>(p) {
                    Ok(params) => {
                        let id = self.sketch_add_edge(&params.p0_id, &params.p1_id);
                        if id.is_empty() { serde_json::json!({ "error": "Failed to add edge" }) }
                        else { serde_json::json!({ "edgeId": id }) }
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "sketch_add_constraint" => {
                match serde_json::from_value::<SketchAddConstraintParams>(p) {
                    Ok(params) => {
                        let id = self.sketch_add_constraint(&params.constraint_type, &params.params);
                        if id.is_empty() { serde_json::json!({ "error": "Failed to add constraint" }) }
                        else { serde_json::json!({ "constraintId": id }) }
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "sketch_solve" => {
                let result = self.sketch_solve();
                if result.is_empty() {
                    serde_json::json!({ "error": "Solve failed" })
                } else {
                    match serde_json::from_str::<serde_json::Value>(&result) {
                        Ok(solved) => serde_json::json!({ "solved": solved }),
                        Err(_) => serde_json::json!({ "error": "Solve parse error" }),
                    }
                }
            }
            "sketch_cancel" => {
                self.sketch_cancel();
                serde_json::json!({ "success": true })
            }
            "sketch_export" => {
                let json = self.sketch_export();
                if json.is_empty() { serde_json::json!({ "error": "No active sketch" }) }
                else { serde_json::json!({ "sketchJson": json }) }
            }
            "sketch_extrude" => {
                match serde_json::from_value::<SketchExtrudeParams>(p) {
                    Ok(params) => {
                        if params.sketch_json.is_empty() || params.height <= 0.0 {
                            serde_json::json!({ "error": "Missing sketchJson or height" })
                        } else if !self.sketch_import(&params.sketch_json) {
                            serde_json::json!({ "error": "Invalid sketch JSON" })
                        } else {
                            let id = self.sketch_extrude(params.height);
                            if id.is_empty() { serde_json::json!({ "error": "Extrude failed" }) }
                            else { serde_json::json!({ "objectId": id }) }
                        }
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "quick_rect_extrude" => {
                match serde_json::from_value::<QuickRectExtrudeParams>(p) {
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
                                    let mut s = self.state.borrow_mut();
                                    let id = add_solid_to_state(&mut s, solid, "QuickRect", None);
                                    rebuild_scene(&mut s);
                                    serde_json::json!({ "objectId": id })
                                }
                                Err(e) => {
                                    error!("WASM: quick_rect_extrude failed: {}", e);
                                    serde_json::json!({ "error": format!("Extrude failed: {}", e) })
                                }
                            }
                        }
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }

            // ── Queries ─────────────────────────────────────────────
            // ── Camera ──────────────────────────────────────────────
            "set_camera" => {
                match serde_json::from_value::<SetCameraParams>(p) {
                    Ok(params) => {
                        if params.matrix_world.len() != 16 {
                            return serde_json::json!({ "error": "matrixWorld must have 16 elements" }).to_string();
                        }
                        let mut s = self.state.borrow_mut();
                        // Once JS calls set_camera, Rust stops handling camera events
                        s.camera_external = true;
                        let camera = &mut s.scene.studio_config_mut().camera;
                        // Both Three.js and cgmath use column-major layout:
                        // elements[0..3] = col 0, elements[4..7] = col 1, etc.
                        let m = &params.matrix_world;
                        camera.matrix = Matrix4::new(
                            m[0],  m[1],  m[2],  m[3],   // column 0
                            m[4],  m[5],  m[6],  m[7],   // column 1
                            m[8],  m[9],  m[10], m[11],  // column 2
                            m[12], m[13], m[14], m[15],  // column 3
                        );
                        let fov_rad = params.fov_deg * PI / 180.0;
                        camera.method = ProjectionMethod::perspective(Rad(fov_rad));
                        camera.near_clip = params.near;
                        camera.far_clip = params.far;
                        serde_json::json!({ "success": true })
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }

            // ── Queries ─────────────────────────────────────────────
            "get_state" => {
                let s = self.state.borrow();
                let ids: Vec<String> = s.objects.iter().map(|o| o.id.to_string()).collect();
                let names: HashMap<String, String> = s.objects.iter().map(|o| (o.id.to_string(), o.name.clone())).collect();
                let camera = &s.scene.studio_config().camera;
                let cam_matrix: Vec<f64> = (0..4).flat_map(|c| (0..4).map(move |r| camera.matrix[c][r])).collect();
                let fov_deg = match camera.method {
                    ProjectionMethod::Perspective { fov } => fov.0 * 180.0 / PI,
                    _ => 45.0,
                };
                serde_json::json!({
                    "ready": true,
                    "objectCount": ids.len(),
                    "objectIds": ids,
                    "objectNames": names,
                    "selectedId": s.selected,
                    "interactionMode": match &s.interaction {
                        InteractionMode::Idle => "idle",
                        InteractionMode::Selected { .. } => "selected",
                        InteractionMode::Dragging { .. } => "dragging",
                    },
                    "camera": {
                        "matrixWorld": cam_matrix,
                        "fovDeg": fov_deg,
                        "near": camera.near_clip,
                        "far": camera.far_clip,
                    },
                })
            }
            "rename" => {
                match serde_json::from_value::<RenameParams>(p) {
                    Ok(params) => {
                        let mut s = self.state.borrow_mut();
                        let idx = match s.id_to_index.get(&params.object_id) {
                            Some(&i) => i,
                            None => return serde_json::json!({"error":"not found"}).to_string(),
                        };
                        s.objects[idx].name = params.name;
                        serde_json::json!({ "success": true })
                    }
                    Err(e) => serde_json::json!({ "error": format!("Invalid params: {}", e) }),
                }
            }
            "pick_mesh_stats" => {
                let stats = self.pick_mesh_stats();
                match serde_json::from_str::<serde_json::Value>(&stats) {
                    Ok(v) => serde_json::json!({ "stats": v }),
                    Err(_) => serde_json::json!({ "stats": [] }),
                }
            }

            _ => serde_json::json!({ "error": format!("Unknown command: {}", cmd_type) }),
        };

        // API boundary: if replay provided an objectId and the kernel created
        // an object with a different (fresh) UUID, rename it to match.
        if let Some(ref wanted_id) = replay_id {
            if let Some(actual_id) = result.get("objectId").and_then(|v| v.as_str()).map(|s| s.to_string()) {
                if actual_id != *wanted_id {
                    rename_object(&mut self.state.borrow_mut(), &actual_id, wanted_id);
                    result["objectId"] = serde_json::json!(wanted_id);
                }
            }
        }

        serde_json::to_string(&result).unwrap_or_else(|_| r#"{"error":"serialize failed"}"#.to_string())
    }
}
