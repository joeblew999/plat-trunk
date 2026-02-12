// Truck WebGPU CAD — parametric modeler in the browser.
// Uses truck-platform Scene + truck-rendimpl PBR shaders.
// Multi-object scene with boolean operations and save/load.

use std::cell::RefCell;
use std::collections::HashMap;
use std::f64::consts::PI;
use std::rc::Rc;
use std::sync::Arc;

use wasm_bindgen::prelude::*;
use winit::event::*;
use winit::event_loop::EventLoop;
use winit::platform::web::WindowAttributesExtWebSys;
use winit::window::Window;

use truck_meshalgo::prelude::*;
use truck_modeling::*;
use truck_platform::*;
use truck_rendimpl::*;

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

struct SceneObject {
    solid: Solid,
    polygon: PolygonInstance,
    wireframe: WireFrameInstance,
}

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

struct SharedState {
    scene: Scene,
    creator: InstanceCreator,
    surface: wgpu::Surface<'static>,
    objects: Vec<SceneObject>,
    selected: Option<usize>,
    // Mouse interaction
    rotate_flag: bool,
    prev_cursor: Vector2,
    // Touch interaction (iOS / mobile)
    touches: HashMap<u64, Vector2>,
    prev_pinch_dist: Option<f64>,
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

fn color_for_index(idx: usize) -> Vector4 {
    let c = COLORS[idx % COLORS.len()];
    Vector4::new(c[0], c[1], c[2], c[3])
}

// ---------------------------------------------------------------------------
// Geometry: truck solid -> renderable instances
// ---------------------------------------------------------------------------

fn solid_to_instances(
    creator: &InstanceCreator,
    solid: &Solid,
    color: Vector4,
) -> (PolygonInstance, WireFrameInstance) {
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

    let polygon_state = PolygonState {
        matrix: mat.invert().unwrap(),
        material: Material {
            albedo: color,
            roughness: 0.3,
            reflectance: 0.5,
            ambient_ratio: 0.05,
            ..Default::default()
        },
        ..Default::default()
    };
    let wire_state = WireFrameState {
        matrix: mat.invert().unwrap(),
        ..Default::default()
    };

    (
        creator.create_instance(&mesh_solid.to_polygon(), &polygon_state),
        creator.create_instance(&curves, &wire_state),
    )
}

fn rebuild_scene(s: &mut SharedState) {
    s.scene.clear_objects();
    for obj in &s.objects {
        s.scene.add_object(&obj.polygon);
        s.scene.add_object(&obj.wireframe);
    }
}

fn add_solid_to_state(s: &mut SharedState, solid: Solid) -> usize {
    let idx = s.objects.len();
    let color = color_for_index(idx);
    let (polygon, wireframe) = solid_to_instances(&s.creator, &solid, color);
    s.scene.add_object(&polygon);
    s.scene.add_object(&wireframe);
    s.objects.push(SceneObject { solid, polygon, wireframe });
    idx
}

// ---------------------------------------------------------------------------
// Primitive builders
// ---------------------------------------------------------------------------

fn make_cube(size: f64) -> Solid {
    // Build via tsweep (vertex → edge → face → solid).
    // This topology is compatible with truck-shapeops boolean operations.
    // (primitive::cuboid produces topology that shapeops cannot process)
    let half = size / 2.0;
    let v = builder::vertex(Point3::new(-half, -half, -half));
    let e = builder::tsweep(&v, Vector3::new(size, 0.0, 0.0));
    let f = builder::tsweep(&e, Vector3::new(0.0, size, 0.0));
    builder::tsweep(&f, Vector3::new(0.0, 0.0, size))
}

fn make_sphere(radius: f64) -> Solid {
    let north = builder::vertex(Point3::new(0.0, 0.0, radius));
    let south = builder::vertex(Point3::new(0.0, 0.0, -radius));
    let arc = builder::circle_arc(&north, &south, Point3::new(radius, 0.0, 0.0));
    let line = builder::line(&south, &north);
    let wire = Wire::from(vec![arc, line]);
    let face = builder::try_attach_plane(&[wire]).unwrap();
    builder::rsweep(&face, Point3::origin(), Vector3::unit_z(), Rad(2.0 * PI), 36)
}

fn make_cylinder(radius: f64, height: f64) -> Solid {
    let v0 = builder::vertex(Point3::new(radius, 0.0, 0.0));
    let v1 = builder::vertex(Point3::new(-radius, 0.0, 0.0));
    let arc0 = builder::circle_arc(&v0, &v1, Point3::new(0.0, radius, 0.0));
    let arc1 = builder::circle_arc(&v1, &v0, Point3::new(0.0, -radius, 0.0));
    let wire = Wire::from(vec![arc0, arc1]);
    let face = builder::try_attach_plane(&[wire]).unwrap();
    builder::tsweep(&face, Vector3::new(0.0, 0.0, height))
}

fn make_torus(major_r: f64, minor_r: f64) -> Solid {
    let v0 = builder::vertex(Point3::new(major_r + minor_r, 0.0, 0.0));
    let v1 = builder::vertex(Point3::new(major_r - minor_r, 0.0, 0.0));
    let arc0 = builder::circle_arc(&v0, &v1, Point3::new(major_r, 0.0, minor_r));
    let arc1 = builder::circle_arc(&v1, &v0, Point3::new(major_r, 0.0, -minor_r));
    let wire = Wire::from(vec![arc0, arc1]);
    let face = builder::try_attach_plane(&[wire]).unwrap();
    builder::rsweep(&face, Point3::origin(), Vector3::unit_z(), Rad(2.0 * PI), 36)
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
        let mut scene = Scene::new(device_handler, &scene_desc);
        let creator = scene.instance_creator();

        // Start with a default cube
        let solid = make_cube(1.0);
        let (polygon, wireframe) = solid_to_instances(&creator, &solid, color_for_index(0));
        scene.add_object(&polygon);
        scene.add_object(&wireframe);

        log!("WASM: truck Scene ready. Drag=rotate, Scroll=zoom, Right-click=light.");

        let state = Rc::new(RefCell::new(SharedState {
            scene,
            creator,
            surface,
            objects: vec![SceneObject { solid, polygon, wireframe }],
            selected: Some(0),
            rotate_flag: false,
            prev_cursor: Vector2::zero(),
            touches: HashMap::new(),
            prev_pinch_dist: None,
        }));

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

        #[cfg(target_arch = "wasm32")]
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

                        // --- Mouse: drag to rotate ---
                        WindowEvent::MouseInput { state: btn_state, button, .. } => {
                            let mut s = state.borrow_mut();
                            match button {
                                MouseButton::Left => {
                                    s.rotate_flag = btn_state == ElementState::Pressed;
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
                            if s.rotate_flag {
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

                        // --- Touch: iOS / mobile ---
                        WindowEvent::Touch(touch) => {
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
    pub fn add_cube(&self, size: f64) -> usize {
        log!("WASM: add_cube({})", size);
        let solid = make_cube(size);
        let mut s = self.state.borrow_mut();
        add_solid_to_state(&mut s, solid)
    }

    #[wasm_bindgen]
    pub fn add_sphere(&self, radius: f64) -> usize {
        log!("WASM: add_sphere({})", radius);
        let solid = make_sphere(radius);
        let mut s = self.state.borrow_mut();
        add_solid_to_state(&mut s, solid)
    }

    #[wasm_bindgen]
    pub fn add_cylinder(&self, radius: f64, height: f64) -> usize {
        log!("WASM: add_cylinder({}, {})", radius, height);
        let solid = make_cylinder(radius, height);
        let mut s = self.state.borrow_mut();
        add_solid_to_state(&mut s, solid)
    }

    #[wasm_bindgen]
    pub fn add_torus(&self, major_r: f64, minor_r: f64) -> usize {
        log!("WASM: add_torus({}, {})", major_r, minor_r);
        let solid = make_torus(major_r, minor_r);
        let mut s = self.state.borrow_mut();
        add_solid_to_state(&mut s, solid)
    }

    // =====================================================================
    // Transforms
    // =====================================================================

    #[wasm_bindgen]
    pub fn translate_object(&self, idx: usize, dx: f64, dy: f64, dz: f64) -> bool {
        let mut s = self.state.borrow_mut();
        if idx >= s.objects.len() { return false; }
        let solid = builder::translated(&s.objects[idx].solid, Vector3::new(dx, dy, dz));
        let color = color_for_index(idx);
        let (polygon, wireframe) = solid_to_instances(&s.creator, &solid, color);
        s.objects[idx] = SceneObject { solid, polygon, wireframe };
        rebuild_scene(&mut s);
        true
    }

    #[wasm_bindgen]
    pub fn rotate_object(&self, idx: usize, axis_x: f64, axis_y: f64, axis_z: f64, angle_deg: f64) -> bool {
        let mut s = self.state.borrow_mut();
        if idx >= s.objects.len() { return false; }
        let axis = Vector3::new(axis_x, axis_y, axis_z);
        if axis.so_small() { return false; }
        let solid = builder::rotated(
            &s.objects[idx].solid,
            Point3::origin(),
            axis.normalize(),
            Rad(angle_deg.to_radians()),
        );
        let color = color_for_index(idx);
        let (polygon, wireframe) = solid_to_instances(&s.creator, &solid, color);
        s.objects[idx] = SceneObject { solid, polygon, wireframe };
        rebuild_scene(&mut s);
        true
    }

    // =====================================================================
    // Boolean operations
    // =====================================================================

    /// Union two objects, replacing them with the result. Returns new index.
    /// Tries truck_shapeops::or first, falls back to De Morgan: A ∪ B = ¬(¬A ∧ ¬B).
    /// Note: booleans work reliably with cubes + cylinders (tsweep geometry).
    /// Spheres/tori (rsweep/NURBS) may fail — truck-shapeops limitation.
    #[wasm_bindgen]
    pub fn boolean_union(&self, idx_a: usize, idx_b: usize) -> i32 {
        log!("WASM: boolean_union({}, {})", idx_a, idx_b);
        let mut s = self.state.borrow_mut();
        if idx_a >= s.objects.len() || idx_b >= s.objects.len() || idx_a == idx_b { return -1; }

        // Try direct or() first
        let result = truck_shapeops::or(
            &s.objects[idx_a].solid,
            &s.objects[idx_b].solid,
            0.05,
        );
        // Fallback: De Morgan
        let result = result.or_else(|| {
            log!("WASM: or() failed, trying De Morgan fallback");
            let mut not_a = s.objects[idx_a].solid.clone();
            not_a.not();
            let mut not_b = s.objects[idx_b].solid.clone();
            not_b.not();
            truck_shapeops::and(&not_a, &not_b, 0.05).map(|mut s| { s.not(); s })
        });

        match result {
            Some(solid) => {
                let (lo, hi) = if idx_a < idx_b { (idx_a, idx_b) } else { (idx_b, idx_a) };
                s.objects.remove(hi);
                s.objects.remove(lo);
                let idx = add_solid_to_state(&mut s, solid);
                rebuild_scene(&mut s);
                idx as i32
            }
            None => {
                error!("Boolean union failed — try cubes/cylinders (spheres/tori not yet supported for booleans)");
                -1
            }
        }
    }

    /// Subtract object B from A, replacing both with the result. Returns new index.
    /// Note: works reliably with cubes + cylinders. Spheres/tori may fail.
    #[wasm_bindgen]
    pub fn boolean_subtract(&self, idx_a: usize, idx_b: usize) -> i32 {
        log!("WASM: boolean_subtract({}, {})", idx_a, idx_b);
        let mut s = self.state.borrow_mut();
        if idx_a >= s.objects.len() || idx_b >= s.objects.len() || idx_a == idx_b { return -1; }
        let mut not_b = s.objects[idx_b].solid.clone();
        not_b.not();
        let result = truck_shapeops::and(&s.objects[idx_a].solid, &not_b, 0.05);
        match result {
            Some(solid) => {
                let (lo, hi) = if idx_a < idx_b { (idx_a, idx_b) } else { (idx_b, idx_a) };
                s.objects.remove(hi);
                s.objects.remove(lo);
                let idx = add_solid_to_state(&mut s, solid);
                rebuild_scene(&mut s);
                idx as i32
            }
            None => {
                error!("Boolean subtract failed — try cubes/cylinders (spheres/tori not yet supported for booleans)");
                -1
            }
        }
    }

    /// Intersect two objects. Returns new index.
    /// Note: works reliably with cubes + cylinders. Spheres/tori may fail.
    #[wasm_bindgen]
    pub fn boolean_intersect(&self, idx_a: usize, idx_b: usize) -> i32 {
        log!("WASM: boolean_intersect({}, {})", idx_a, idx_b);
        let mut s = self.state.borrow_mut();
        if idx_a >= s.objects.len() || idx_b >= s.objects.len() || idx_a == idx_b { return -1; }
        let result = truck_shapeops::and(&s.objects[idx_a].solid, &s.objects[idx_b].solid, 0.05);
        match result {
            Some(solid) => {
                let (lo, hi) = if idx_a < idx_b { (idx_a, idx_b) } else { (idx_b, idx_a) };
                s.objects.remove(hi);
                s.objects.remove(lo);
                let idx = add_solid_to_state(&mut s, solid);
                rebuild_scene(&mut s);
                idx as i32
            }
            None => {
                error!("Boolean intersect failed — try cubes/cylinders (spheres/tori not yet supported for booleans)");
                -1
            }
        }
    }

    // =====================================================================
    // Scene management
    // =====================================================================

    #[wasm_bindgen]
    pub fn delete_object(&self, idx: usize) -> bool {
        let mut s = self.state.borrow_mut();
        if idx >= s.objects.len() { return false; }
        s.objects.remove(idx);
        rebuild_scene(&mut s);
        true
    }

    #[wasm_bindgen]
    pub fn clear_scene(&self) {
        let mut s = self.state.borrow_mut();
        s.objects.clear();
        s.scene.clear_objects();
    }

    #[wasm_bindgen]
    pub fn object_count(&self) -> usize {
        self.state.borrow().objects.len()
    }

    #[wasm_bindgen]
    pub fn select_object(&self, idx: usize) {
        self.state.borrow_mut().selected = if idx < self.state.borrow().objects.len() {
            Some(idx)
        } else {
            None
        };
    }

    // =====================================================================
    // Save / Load (JSON serialization of truck Solids)
    // =====================================================================

    /// Export entire scene as JSON string. This is the file format.
    #[wasm_bindgen]
    pub fn export_scene(&self) -> String {
        let s = self.state.borrow();
        let solids: Vec<_> = s.objects.iter().map(|obj| &obj.solid).collect();
        serde_json::to_string_pretty(&solids).unwrap_or_else(|e| {
            error!("Export failed: {}", e);
            "[]".to_string()
        })
    }

    /// Import scene from JSON string. Replaces current scene.
    #[wasm_bindgen]
    pub fn import_scene(&self, json: &str) -> bool {
        let solids: Vec<Solid> = match serde_json::from_str(json) {
            Ok(s) => s,
            Err(e) => {
                error!("Import failed: {}", e);
                return false;
            }
        };
        let mut s = self.state.borrow_mut();
        s.objects.clear();
        s.scene.clear_objects();
        for solid in solids {
            add_solid_to_state(&mut s, solid);
        }
        log!("WASM: Imported {} objects", s.objects.len());
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
}
