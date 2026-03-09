# ADR-0005: Scene Graph with Assembly Hierarchy

## Status

Proposed

## Dependencies

- **ADR-0002** (Headless as Core Engine) — must be done first. This ADR refactors the internal storage of `HeadlessController` and `SceneController`, which ADR-0002 stabilises.
- **ADR-0001** (Multi-Actor Sync) — done. The scene graph serialises to `scene.json` and propagates via Automerge. ADR-0001's `export_scene`/`import_scene` path is the integration point.
- **ADR-0004** (WASM Boundary Contracts) — scene graph commands cross the WASM boundary and must conform to the contract pattern.

## Context

The current scene model (`HeadlessController.objects: Vec<HeadlessObject>`, exported as `Vec<ExportEntry>`) is a **flat list**. Every object is a root-level orphan with no parent-child relationships, no transform separate from the solid geometry, and no instancing.

This blocks five capabilities needed to compete with SketchUp and serve architectural/construction users:

1. **Assemblies** — a building is a hierarchy: site → building → storey → rooms → walls/doors/windows. The IFC importer already builds this hierarchy (`BimNodeJson` with `children: Vec<u32>`) but discards it — it never feeds back into the scene structure.

2. **Components and groups** — SketchUp users manage complexity by grouping geometry and creating reusable component instances. This requires parent-child relationships and definition-instance instancing.

3. **Layout / 2D documentation** — the layout projector needs to project a composed scene (all solids with accumulated world transforms). It also needs to filter by hierarchy ("project only the first floor"). A flat list forces projection of everything with no ability to scope.

4. **CQRS tiered mesh loading** — transforms should be separate from geometry so that moving an object doesn't rebuild the solid or re-tessellate. Currently `translate_object()` calls `builder::translated()` then `tessellate_solid()` synchronously — the solid is rebuilt at the new position and re-meshed every time.

5. **Truck `truck-assembly` alignment** — RICOS just shipped `truck-assembly`, which handles STEP assembly DAGs via `Product` and `NextAssemblyUsageOccurrence`. Aligning our scene graph with Truck's assembly model enables native round-tripping: STEP assembly import → scene graph → STEP assembly export with hierarchy preserved.

**Breaking backward compat is allowed** for `scene.json` format (same policy as ADR-0001).

## Decision

Replace the flat `Vec<HeadlessObject>` with a DAG (directed acyclic graph) scene structure. Each node carries an optional solid/mesh, a local transform, optional parent reference, and optional component definition reference.

### Scene node structure

```rust
struct SceneNode {
    id: Uuid,
    name: String,
    node_type: NodeType,
    parent_id: Option<Uuid>,
    /// Local transform relative to parent (identity if None).
    /// World transform = parent.world_transform * local_transform.
    local_transform: Option<Transform>,
    solid: Option<Solid>,
    mesh: Option<PolygonMesh>,
    style: ObjectStyle,
    bim: Option<BimMetadata>,
    bounding_sphere: Option<[f64; 4]>,
}

enum NodeType {
    /// Leaf geometry — a single solid or mesh.
    Object,
    /// Container — groups child nodes, has a local transform but no geometry of its own.
    Group,
    /// Component definition — a reusable template. Not rendered directly.
    ComponentDef,
    /// Component instance — references a ComponentDef by def_id, rendered at local_transform.
    ComponentInstance { def_id: Uuid },
}

struct Transform {
    /// 4×4 column-major matrix. Identity = no transform.
    matrix: [f64; 16],
}
```

### Export format (scene.json v2)

```rust
struct ExportEntryV2 {
    id: String,
    name: String,
    #[serde(rename = "nodeType")]
    node_type: String,              // "object" | "group" | "component_def" | "component_instance"
    #[serde(skip_serializing_if = "Option::is_none")]
    parent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    local_transform: Option<[f64; 16]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    def_id: Option<String>,         // for component_instance
    solid: Option<Solid>,
    mesh: Option<PolygonMesh>,
    #[serde(default)]
    style: Option<ObjectStyle>,
    #[serde(default)]
    bim: Option<BimMetadata>,
    #[serde(skip_serializing_if = "Option::is_none")]
    bounding_sphere: Option<[f64; 4]>,
}
```

**Backward compatibility:** `import_scene` detects v1 (array of entries with no `nodeType`) vs v2 (entries with `nodeType`). V1 entries are imported as `NodeType::Object` with `parent_id: None` and `local_transform: None` — identical to current behavior.

### Scene storage

```rust
struct SceneGraph {
    nodes: Vec<SceneNode>,
    id_to_index: HashMap<String, usize>,
    /// Roots: nodes with parent_id == None, in insertion order.
    root_ids: Vec<Uuid>,
    /// Children lookup: parent_id → [child_ids] in order.
    children: HashMap<Uuid, Vec<Uuid>>,
    /// Component definition lookup: def_id → [instance_ids].
    instances: HashMap<Uuid, Vec<Uuid>>,
}
```

### Transform separation

**Before:** `translate_object()` rebuilds the solid at the new position via `builder::translated()`, then re-tessellates.

**After:** `translate_object()` updates `local_transform` only. The solid stays in its local coordinate system. The renderer (WebGPU) applies the world transform as a model matrix. Tessellation is untouched — the mesh is still valid, just displayed at a different position.

This changes the semantic of transforms from "baked into geometry" to "applied at render time." The solid in model space is the canonical form. The world position is derived by walking the parent chain and accumulating transforms.

**When geometry DOES need rebuilding:** Boolean operations, push/pull, and sketch extrude still modify the solid directly. Only rigid transforms (translate, rotate, scale) become transform-only operations.

### World transform computation

```rust
impl SceneGraph {
    fn world_transform(&self, node_id: Uuid) -> [f64; 16] {
        let node = &self.nodes[self.id_to_index[&node_id.to_string()]];
        let local = node.local_transform
            .map(|t| t.matrix)
            .unwrap_or(IDENTITY_4X4);
        match node.parent_id {
            Some(pid) => mat4_multiply(&self.world_transform(pid), &local),
            None => local,
        }
    }
}
```

### New commands

| Command | Domain | Params | Description |
|---------|--------|--------|-------------|
| `create_group` | scene | `{ childIds: string[] }` | Wrap selected objects in a new Group node |
| `ungroup` | scene | `{ groupId: string }` | Dissolve group, reparent children to group's parent |
| `add_to_group` | scene | `{ groupId: string, childId: string }` | Move object into group |
| `remove_from_group` | scene | `{ childId: string }` | Move object to root level |
| `create_component_def` | scene | `{ sourceIds: string[] }` | Create reusable component from selection |
| `instantiate_component` | scene | `{ defId: string, transform?: [f64;16] }` | Place component instance |
| `make_unique` | scene | `{ instanceId: string }` | Break instance link, copy def geometry |
| `explode` | scene | `{ id: string }` | Dissolve group/instance, merge geometry into parent |

All commands follow the ADR-0004 WASM boundary contract pattern: params struct with `JsonSchema` derive, schema entry in `scene::schema_entries()`, dispatch in `dispatch_scene()`.

### Op log integration

New commands are recorded in the Automerge op log (ADR-0001) like all existing commands. The materialised scene (`scene.json`) includes hierarchy. Replay reconstructs the scene graph.

Example op sequence:
```json
{ "type": "add_cube", "params": { "size": 1 } }
{ "type": "add_cube", "params": { "size": 0.5 } }
{ "type": "create_group", "params": { "childIds": ["uuid-1", "uuid-2"] } }
{ "type": "translate", "params": { "objectId": "uuid-group", "dx": 5, "dy": 0, "dz": 0 } }
```

After replay: a Group node at x=5 containing two cubes at their local positions.

### Impact on CQRS mesh tiers

With transforms separated from geometry:

**Tier 0 (bounding box):** computed from solid in model space, then expanded by world transform. Recomputed only when solid changes, not when transform changes.

**Tier 1/2 (meshes):** tessellated from the solid in model space. Keyed by solid content hash. Moving an object does NOT re-tessellate — the same mesh is rendered at a different model matrix. Mesh cache survives transform changes.

**Tier 3 (layout projections):** the layout projector takes the scene graph, walks it with accumulated world transforms, projects each solid. Per-solid projections (in model space) are cached by solid content hash. Scene composition (inter-solid occlusion) uses world-space positions from the scene graph.

### Impact on mesh sync (R2)

Meshes in R2 are keyed by solid content hash, not by object id or transform. Moving an object doesn't write a new mesh to R2. Only geometry-changing operations (boolean, extrude, push/pull) produce new meshes. Whoever writes the solid writes the mesh (browser or Worker — same Truck WASM).

Content-hash key: `mesh/{solid_content_hash}/tier{N}.bin`

### Impact on layout projector

The layout projector's input is a **scene graph subtree** plus projection parameters. A floor plan viewport specifies: root node (e.g. "First Floor" group), projection direction (top-down), section plane height, scale.

The projector walks the subtree, accumulates world transforms, projects each leaf solid. Hierarchy enables scoping — "project only the first floor" means projecting only the descendants of that group node.

Per-solid projections cached at `projection/{solid_content_hash}/{view_direction}`. Scene composition (inter-solid HLR) recomputed when any participating solid changes or moves, but operates on cached per-solid 2D data rather than raw B-rep.

### Impact on IFC import

Currently `import_ifc` builds `BimNodeJson` hierarchy as a side-channel return value. After this ADR, IFC spatial hierarchy maps directly to the scene graph:

| IFC Entity | NodeType |
|------------|----------|
| `IfcProject` | Group |
| `IfcSite` | Group |
| `IfcBuilding` | Group |
| `IfcBuildingStorey` | Group |
| `IfcWall`, `IfcDoor`, etc. | Object (with BIM metadata) |

`IfcRelAggregates` and `IfcRelContainedInSpatialStructure` → `parent_id` references.

### Impact on truck-assembly alignment

Truck's new `truck-assembly` crate models STEP assemblies as a DAG of `Product` nodes with `NextAssemblyUsageOccurrence` parent-child links and per-instance transforms. Our `SceneGraph` mirrors this:

| truck-assembly | SceneGraph |
|----------------|------------|
| Product (definition) | ComponentDef |
| NextAssemblyUsageOccurrence | ComponentInstance with parent_id + local_transform |
| Leaf shape | Object |
| Assembly node | Group |

STEP assembly import → SceneGraph → STEP assembly export should round-trip without hierarchy loss. Exact API alignment pending — `truck-assembly` is new and undocumented. The scene graph design is independent but mappable.

## Implementation Order

1. **SceneGraph data structure** — replace `Vec<HeadlessObject>` with `SceneGraph` in both `HeadlessController` and `SceneController` (wasm_app). Implement `world_transform()`, `children()`, `walk_subtree()`.

2. **ExportEntry v2** — add `nodeType`, `parent_id`, `local_transform`, `def_id` to export format. Implement v1 backward compat detection in `import_scene`.

3. **Transform separation** — change `translate_object`, `rotate_object`, `scale_object` to update `local_transform` instead of rebuilding geometry. Update browser renderer to apply model matrix from `world_transform()`.

4. **Group commands** — `create_group`, `ungroup`, `add_to_group`, `remove_from_group`, `explode`. Wire into op log.

5. **Component commands** — `create_component_def`, `instantiate_component`, `make_unique`. Wire into op log.

6. **IFC import alignment** — feed IFC spatial hierarchy into scene graph via `parent_id` instead of returning `BimNodeJson` as side-channel.

7. **Outliner UI** — browser panel showing scene tree with expand/collapse, drag-drop reparenting.

Steps 1-3 are the foundation. Step 3 is the performance unlock that enables CQRS mesh tiers. Steps 4-5 enable the SketchUp-competitive feature set. Step 6 aligns with existing IFC work. Step 7 is UI.

## Files affected

### Rust crate (`systems/truck/crate/src/`)
| File | Action | What |
|------|--------|------|
| `lib.rs` | EDIT | Add `SceneGraph`, `SceneNode`, `NodeType`, `Transform` structs |
| `headless.rs` | EDIT | Replace `Vec<HeadlessObject>` with `SceneGraph`. Refactor all methods. Transform separation. |
| `wasm_app.rs` | EDIT | Same refactor as headless, plus WebGPU model matrix from `world_transform()` |
| `commands/scene.rs` | EDIT | Add group/component command schema entries |

### Browser (`systems/truck/web/`)
| File | Action | What |
|------|--------|------|
| `reconcile.ts` | EDIT | Handle scene graph hierarchy in UI reconciliation |
| `history-domain.ts` | EDIT | New op types for group/component commands |
| `outliner.ts` | NEW | Tree view panel for scene hierarchy |

### Worker (`systems/truck/worker/src/`)
| File | Action | What |
|------|--------|------|
| `index.ts` | EDIT | Dispatch new commands via headless |
| `replay.ts` | EDIT | Scene graph in replay cache |

## Consequences

**Positive:**
- Unlocks assembly hierarchy, components, layout projections, and CQRS mesh tiers
- Transform operations become O(1) instead of O(tessellation)
- Mesh cache survives rigid transforms — major performance improvement
- IFC and STEP assemblies import/export with hierarchy preserved
- Aligns with `truck-assembly` for future kernel integration
- Layout projector can scope to subtrees

**Negative:**
- Breaking change to `scene.json` format (mitigated by v1 detection)
- All commands that reference objects by id must handle the DAG (e.g. `delete` must cascade to children)
- World transform computation adds a tree walk — negligible for typical scene depths (<10 levels) but needs caching for deep assemblies
- Boolean operations between objects in different coordinate spaces require transforming one solid into the other's local space before the operation

**Risks:**
- Component instancing with Automerge CRDT: editing a component definition must propagate to all instances. If two users edit the same definition concurrently, Automerge merges the ops but the definition's solid may need conflict resolution.
- `truck-assembly` is brand new and undocumented. Our scene graph design should not depend on its API surface — we should be able to map to it, not be constrained by it.