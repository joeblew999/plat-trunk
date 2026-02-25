# ADR-0025: Content-Addressed Storage & Tiered Object Scaling

## Status

**Phases 0-3 Implemented + E2E Tested** — Full tiered object lifecycle with 8 tier-specific + 50 total Playwright e2e tests (all passing). Progressive loading, auto-eviction/promotion, GUI indicators, selection protection all verified. Nine bugs fixed during hardening (see Known Issues). Phases 4-5 proposed.

Key files: blob-store.js, state.js, history.js, object-store.js, tier-manager.js, cad-viewport.js, index.html, wasm_app.rs, headless.rs, tier.spec.ts.

## Context

The platform runs a CAD kernel in the browser via WASM + WebGPU. Every object in the scene lives simultaneously in three places:

1. **WASM heap** — full B-Rep `Solid` + tessellated `PolygonMesh` (the geometry)
2. **GPU VRAM** — `PolygonInstance` + `WireFrameInstance` + depth/pick buffers (the rendering)
3. **Automerge op log** — `{ type, params, enabled }` operations in IndexedDB (the persistence)

This works for small models (10-50 objects). But the platform targets real-world use cases that are orders of magnitude larger:

| Use case | Object count | Data sources | Coordinate scale |
|----------|-------------|--------------|-----------------|
| Single building design | 50-200 | CAD | Local |
| IFC building import | 1,000-10,000 | IFC (ADR-0004) | Building-local |
| City block (MVT + IFC) | 10,000-100,000 | MVT + IFC (ADR-0023) | Georeferenced |
| Urban planning (Tokyo test) | 100,000+ | MVT + IFC + CAD (ADR-0023) | Mercator, 15M+ metres |

### Browser Memory Limits

| Resource | Practical limit | What fills it |
|----------|----------------|---------------|
| WASM linear memory | ~4 GB (browser-enforced) | `Solid` B-Rep topology + `PolygonMesh` vertices/indices |
| GPU VRAM | ~1-2 GB (shared with OS) | Vertex/index buffers, depth buffers, pick buffers |
| IndexedDB | ~50% of free disk (browser quota) | Automerge documents, snapshots |
| JS heap | ~4 GB (V8/SpiderMonkey) | Automerge op log, Lit component state |

A single `SceneObject` ([wasm_app.rs:132-142](crates/truck-webgpu-gui/src/wasm_app.rs#L132-L142)) holds:

```rust
struct SceneObject {
    id: Uuid,
    name: String,
    solid: Option<Solid>,        // B-Rep topology — varies wildly (1 KB cube to 1 MB freeform)
    mesh: PolygonMesh,           // tessellated triangles — O(face count)
    polygon: PolygonInstance,    // GPU vertex/index buffers
    wireframe: WireFrameInstance,// GPU edge buffers
    style: ObjectStyle,          // color, opacity, visibility
    pick_mesh: PickMesh,         // CPU-side picking mesh
    bim: Option<BimMetadata>,    // IFC properties if imported
}
```

**Rough per-object memory cost** (typical architectural element):
- `Solid` B-Rep: 10-100 KB
- `PolygonMesh` + `PickMesh`: 5-50 KB
- GPU instances: 5-50 KB VRAM
- **Total: ~20-200 KB per object**

At 200 KB/object, the 4 GB WASM limit means **~20,000 objects max** before the browser crashes. Real IFC buildings routinely have 5,000-15,000 elements. Two buildings + MVT city context = OOM.

### What We Already Have

The full serialization round-trip and per-object operations are already built and working:

| Capability | Implementation | Where |
|-----------|---------------|-------|
| **Truck-native serialization** | `ExportEntry` with `Option<Solid>` + `Option<PolygonMesh>` + styles + BIM metadata | [wasm_app.rs:144-155](crates/truck-webgpu-gui/src/wasm_app.rs#L144-L155) |
| **Scene export** | `export_scene()` → JSON array of `ExportEntry` | [wasm_app.rs:1459-1473](crates/truck-webgpu-gui/src/wasm_app.rs#L1459-L1473) |
| **Scene import + GPU rebuild** | `import_scene(json)` → parse `ExportEntry[]`, create `PolygonInstance` + `WireFrameInstance` + `PickMesh` via `solid_to_instances()` / `mesh_to_instances()` | [wasm_app.rs:1563-1606](crates/truck-webgpu-gui/src/wasm_app.rs#L1563-L1606) |
| **Per-entry deserialization** | The loop inside `import_scene()` already handles one `ExportEntry` at a time (Solid → GPU instances OR Mesh → GPU instances) | [wasm_app.rs:1577-1602](crates/truck-webgpu-gui/src/wasm_app.rs#L1577-L1602) |
| **Per-object deletion + GPU free** | `delete_object(id)` removes from WASM memory, rebuilds scene index | [wasm_app.rs:1421-1429](crates/truck-webgpu-gui/src/wasm_app.rs#L1421-L1429) |
| **Periodic snapshots** | Every 10 ops, `export_scene()` stored in Automerge doc | [history.js:150-162](web/gui/history.js#L150-L162) |
| **Replay from snapshot** | `_replayScene()` finds nearest snapshot, replays remaining ops | [history.js:279-337](web/gui/history.js#L279-L337) |
| **IndexedDB persistence** | Automerge docs in `cad-docs` database | [history.js:51](web/gui/history.js#L51) |
| **Plugin-independent renderer** | `cad-renderer` (ADR-0024 Phase 2) owns GPU resources independently | ADR-0024 |

**The serialization round-trip is proven.** `export_scene()` → JSON → `import_scene()` already works end-to-end, including GPU instance rebuild. The missing piece is **per-object granularity** — today `import_scene()` clears everything and imports all entries; `_replayScene()` replays ALL ops. Selective loading requires extracting the per-entry loop body into a standalone `import_entry()` function (~20 lines of new Rust) and a per-object IndexedDB store (pure JS).

-----

## Problem

**All objects must be fully materialized in WASM memory + GPU to be visible.** There is no intermediate representation — an object is either fully loaded (B-Rep + mesh + GPU buffers + pick mesh) or not present at all.

This means:
1. **Opening a large model loads everything** — 10,000 IFC elements all materialize at once
2. **No progressive loading** — the user sees nothing until replay completes
3. **No eviction** — once loaded, objects stay in WASM memory until the page is closed
4. **No LOD** — a distant MVT building consumes the same memory as the object being edited
5. **Snapshots are all-or-nothing** — `export_scene()` serializes every object, `_replayScene()` deserializes every object

As models grow toward the georeferenced scale described in ADR-0023 (city blocks, multiple IFC buildings, MVT context layers), the browser will run out of memory.

-----

## Decision

Introduce a three-tier object lifecycle where objects move between tiers based on editing proximity and camera distance. The tiers use the serialization formats already built.

### Tier 1: Hot (WASM + GPU)

**What:** Objects actively being edited or interacted with. Full `SceneObject` in WASM memory, full GPU buffers for rendering, picking, and gizmo interaction.

**Budget:** 50-500 objects (~10-100 MB WASM, ~10-100 MB VRAM)

**This is today's behavior** — every object is Hot. The change is making it the *exception* rather than the default for large models.

### Tier 2: Warm (IndexedDB + LOD proxy)

**What:** Objects visible but not being edited. Stored as serialized `ExportEntry` JSON in IndexedDB. A simplified LOD mesh (bounding box or decimated hull) is on the GPU for visual context.

**Budget:** 1,000-20,000 objects (~50-500 MB IndexedDB, ~5-50 MB VRAM for LOD proxies)

**Format:** The truck-native `ExportEntry` ([wasm_app.rs:144-155](crates/truck-webgpu-gui/src/wasm_app.rs#L144-L155)) already contains everything needed to reconstruct a Hot object:

```json
{
  "id": "uuid",
  "name": "Wall-042",
  "solid": { /* truck Solid B-Rep topology */ },
  "mesh": { "positions": [...], "indices": [...] },
  "style": { "color": [0.8, 0.8, 0.8, 1.0] },
  "bim": { "ifc_class": "IfcWall", "properties": {...} }
}
```

**Promotion to Hot:** When the user clicks a Warm object (detected via LOD proxy pick mesh) or navigates close enough, the `ExportEntry` is read from IndexedDB, deserialized in WASM, and the object becomes Hot. Reverse: idle Hot objects are serialized and demoted to Warm.

### Tier 3: Cold (R2 / cloud storage)

**What:** Objects not currently needed — archived models, historical snapshots, models from other sessions. Stored as full `export_scene()` JSON snapshots on Cloudflare R2.

**Budget:** Unlimited (R2 storage)

**Promotion to Warm:** When a model is opened, its Cold snapshot is downloaded, individual `ExportEntry` objects are written to IndexedDB (Warm), and the viewport-visible subset is promoted to Hot.

### Tier Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Tier 1: HOT                               │
│          WASM memory + GPU buffers                           │
│     Full SceneObject — edit, boolean, gizmo, pick            │
│                                                              │
│     Budget: 50-500 objects                                   │
│     Latency: 0 ms (in-memory)                                │
├───────────────────────┬─────────────────────────────────────┤
│         ▲ promote     │  ▼ evict                             │
│    (click / camera)   │  (idle / distance)                   │
├───────────────────────┴─────────────────────────────────────┤
│                    Tier 2: WARM                               │
│          IndexedDB + LOD proxy on GPU                        │
│     Serialized ExportEntry — visible, not editable           │
│                                                              │
│     Budget: 1K-20K objects                                   │
│     Latency: 10-50 ms (IDB read + WASM deserialize)         │
├───────────────────────┬─────────────────────────────────────┤
│         ▲ download    │  ▼ archive                           │
│    (model open)       │  (model close / GC)                  │
├───────────────────────┴─────────────────────────────────────┤
│                    Tier 3: COLD                               │
│          R2 / cloud storage                                  │
│     Full export_scene() snapshot — not loaded                │
│                                                              │
│     Budget: unlimited                                        │
│     Latency: network (100-500 ms)                            │
└─────────────────────────────────────────────────────────────┘
```

-----

## Implementation Plan

### Phase 0: Extract Blobs from Automerge (urgent fix)

**Goal:** Stop storing large binary data inside the Automerge CRDT document. This is broken today, not a future concern.

**The problem right now:** `cadCommand()` ([state.js:288](web/gui/state.js#L288)) passes the full `params` object to `history.record()`, which stores it verbatim in the Automerge op log ([history.js:134](web/gui/history.js#L134)). For import commands, `params` contains the entire file:

| Op type | What's in `params` | Size in Automerge |
|---------|-------------------|-------------------|
| `add_cube` | `{ size: 1.0 }` | ~20 bytes |
| `translate` | `{ objectId, x, y, z }` | ~80 bytes |
| `import_scene` | `{ json: "...(full ExportEntry[] JSON)..." }` | **1-500 MB** |
| `import_ifc` | `{ data: "...(full IFC file text)..." }` | **5-50 MB** |
| `import_step` | `{ data: "...(full STEP file text)..." }` | **1-20 MB** |

On top of that, every 10 ops a snapshot stores the entire `export_scene()` output as an inline string in the Automerge doc ([history.js:156](web/gui/history.js#L156)). Three snapshots are kept — that's 3× the full scene geometry, inside the CRDT.

**What this breaks:**
- Automerge doc bloats to hundreds of MB after one IFC import
- IndexedDB storage grows unbounded (every snapshot is a full scene copy)
- Undo/redo of imports is slow (the huge op stays in the doc, toggled enabled/disabled)
- Automerge sync would transfer the full blob through the CRDT — unusable for collaboration
- The CRDT metadata overhead on large opaque strings makes it worse

**The fix — content-addressed blob store:**

Separate the data into two stores with different characteristics:

```
Automerge doc (small, syncable, CRDT-mergeable):
  operations: [
    { type: "add_cube", params: { size: 1.0 }, ... },                    // 20 bytes
    { type: "import_ifc", params: { blobRef: "sha256-abc123" }, ... },    // 80 bytes (ref only)
    { type: "translate", params: { objectId: "...", x: 1 }, ... },        // 80 bytes
  ]
  snapshots: [
    { blobRef: "sha256-def456", atOpIndex: 30 },   // ref only, not inline
  ]

Blob store (large, content-addressed, synced separately):
  "sha256-abc123" → raw IFC file text (50 MB)
  "sha256-def456" → export_scene() JSON (10 MB)
```

**Implementation:**

1. **New blob store** — `cad-blobs` IndexedDB database, keyed by content hash (SHA-256):

```javascript
// blob-store.js
async function storeBlob(data) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  const key = 'sha256-' + [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,'0')).join('');
  await blobDb.put('blobs', { key, data, size: data.length, createdAt: Date.now() });
  return key;  // this is what goes into the Automerge op
}

async function getBlob(key) {
  const record = await blobDb.get('blobs', key);
  return record?.data;
}
```

2. **Update `cadCommand()`** — for import ops, store the file data in the blob store and replace `params` with a reference before recording:

```javascript
// In cadCommand(), before mgr.record():
if (['import_scene', 'import_ifc', 'import_step'].includes(type)) {
  const dataKey = type === 'import_scene' ? 'json' : 'data';
  const blobRef = await storeBlob(params[dataKey]);
  params = { ...params, [dataKey]: undefined, blobRef };
}
```

3. **Update `_replayScene()`** — when replaying an import op with `blobRef`, fetch the blob first:

```javascript
// In replay loop:
if (op.params.blobRef && !op.params.json && !op.params.data) {
  const blob = await getBlob(op.params.blobRef);
  const dataKey = op.type === 'import_scene' ? 'json' : 'data';
  op.params = { ...op.params, [dataKey]: blob };
}
cadCommand(op.type, op.params, REPLAY);
```

4. **Update snapshots** — store snapshot data in the blob store, not inline:

```javascript
// In record(), snapshot section:
const sceneJson = ctrl.export_scene();
const blobRef = await storeBlob(sceneJson);
d.snapshots.push({ blobRef, atOpIndex: d.operations.length });
```

**Content-addressing gives us deduplication for free:** If the same IFC file is imported twice, only one copy is stored. If two snapshots have the same scene state, one blob.

**Result:** The Automerge doc stays small (ops are ~100 bytes each, snapshot refs are ~80 bytes). Large data lives in IndexedDB (`cad-blobs`), addressed by content hash. This is the foundation for everything else — per-object storage, cross-device sync, R2 upload all work with content-addressed blobs.

### Phase 1: Per-Object IndexedDB Store

**Goal:** Store and retrieve individual `ExportEntry` objects by ID, independent of Automerge.

**What already works today** — the full serialization round-trip is proven:

| Capability | Function | Line | Status |
|-----------|----------|------|--------|
| Serialize all objects | `export_scene()` → `ExportEntry[]` JSON | [wasm_app.rs:1459](crates/truck-webgpu-gui/src/wasm_app.rs#L1459) | **Working** |
| Deserialize + rebuild GPU | `import_scene(json)` → parse entries, create instances | [wasm_app.rs:1563](crates/truck-webgpu-gui/src/wasm_app.rs#L1563) | **Working** |
| Delete one object + free GPU | `delete_object(id)` → remove + rebuild scene | [wasm_app.rs:1421](crates/truck-webgpu-gui/src/wasm_app.rs#L1421) | **Working** |
| Periodic snapshots → IDB | Every 10 ops, `export_scene()` stored in Automerge doc | [history.js:150](web/gui/history.js#L150) | **Working** |
| Replay from snapshot | `_replayScene()` finds nearest snapshot, replays remaining | [history.js:279](web/gui/history.js#L279) | **Working** |

The per-entry import loop inside `import_scene()` ([wasm_app.rs:1577-1602](crates/truck-webgpu-gui/src/wasm_app.rs#L1577-L1602)) already handles a single `ExportEntry` — it parses the Solid/Mesh, calls `solid_to_instances()` or `mesh_to_instances()` to create GPU buffers, and pushes to the scene. The only difference from a standalone `import_entry()` is that `import_scene()` calls `clear()` first and processes them in a loop.

**What's actually new** (all small):

1. **`import_entry(json)`** — extract the per-entry loop body from `import_scene()` (lines 1577-1602) into its own function. No `clear()`, adds one object to the existing scene. ~20 lines of Rust.

2. **`export_entry(objectId)`** — filter `export_scene()` to one object by ID. ~10 lines of Rust.

3. **Per-object IndexedDB store** — a new `cad-objects` database keyed by `{modelId}/{objectId}`. Parse snapshot `ExportEntry[]` and write each entry individually:

```javascript
// object-store.js
const db = await openDB('cad-objects', 1, {
  upgrade(db) {
    const store = db.createObjectStore('entries', { keyPath: 'key' });
    store.createIndex('model', 'modelId');
    store.createIndex('tier', 'tier');
  }
});

// Write a Warm object
await db.put('entries', {
  key: `${modelId}/${objectId}`,
  modelId,
  objectId,
  tier: 'warm',
  entry: exportEntryJson,     // truck-native ExportEntry
  lodMesh: simplifiedMesh,    // bounding box or decimated hull
  lastAccessed: Date.now(),
});

// Promote: read one object back to WASM
const record = await db.get('entries', `${modelId}/${objectId}`);
wasmInstance.import_entry(record.entry);
```

4. **`lod_mesh(objectId)`** — export a bounding box mesh for the LOD proxy. ~15 lines of Rust (compute AABB from `PolygonMesh` positions, return 8 vertices + 12 edges).

**Eviction** already works — `delete_object(id)` removes the object from WASM memory, frees GPU instances, and rebuilds the scene index. This IS the evict-to-Warm path: serialize first (`export_entry`), write to IDB, then `delete_object` to free memory.

### Phase 2: Camera-Based Tier Management

**Goal:** Automatically promote/evict objects based on camera distance and user interaction.

**Tier manager** runs after each camera update (debounced to ~10 fps, not 60):

```
for each object in scene:
  distance = camera_distance(object.bounding_sphere)
  if object is Hot AND distance > FAR_THRESHOLD AND not selected AND idle > 30s:
    evict to Warm (serialize → IDB, replace with LOD proxy)
  if object is Warm AND distance < NEAR_THRESHOLD:
    promote to Hot (IDB read → WASM deserialize → full GPU buffers)
```

**Thresholds** are scene-dependent:
- For a single building: `NEAR = 50m`, `FAR = 200m`
- For a city block (ADR-0023): `NEAR = 100m`, `FAR = 1000m`
- User-adjustable via a "detail level" control

**LOD proxy rendering** (Warm objects on GPU):
- Option A: Bounding box wireframe (cheapest — 12 edges per object)
- Option B: Decimated hull mesh (better visual — 50-200 triangles)
- Option C: Texture impostor (billboard — one quad per object)

Start with Option A (bounding box). It's trivial to compute from the existing `PolygonMesh` bounding sphere and gives adequate visual context for distant objects.

### Phase 3: Progressive Model Loading

**Goal:** Large models load incrementally — the user sees viewport-visible objects first.

Today `_replayScene()` ([history.js:279-337](web/gui/history.js#L279-L337)) replays all ops sequentially before the user sees anything. For 10,000 objects, this can take 30+ seconds.

**New loading sequence:**
1. Load the Automerge document (op log + snapshots)
2. Find nearest snapshot — this contains `ExportEntry[]` for all objects
3. **Write all entries to IndexedDB as Warm** (bulk `put` — fast, no WASM)
4. Compute bounding spheres from the `mesh` field in each `ExportEntry`
5. Determine which objects are in the initial viewport (camera frustum test)
6. **Promote viewport-visible objects to Hot** (import to WASM, full GPU)
7. Show LOD proxies for remaining Warm objects
8. As the user navigates, Phase 2 tier management takes over

**Time to first paint:** Instead of loading 10,000 objects (~30s), we load ~100 viewport-visible objects (~300ms) + LOD proxies for the rest (~100ms).

### Phase 4: Cloud Tier (R2)

**Goal:** Models persist beyond the browser. Cold storage on Cloudflare R2.

**Upload:** When the user explicitly saves (or on auto-save interval):
1. `export_scene()` → full snapshot JSON
2. Upload to R2 via Worker: `PUT /api/models/{modelId}/snapshot`
3. Store metadata in D1: `{ modelId, version, objectCount, size, timestamp }`

**Download:** When a model is opened that isn't in IndexedDB:
1. Fetch snapshot from R2: `GET /api/models/{modelId}/snapshot`
2. Parse `ExportEntry[]` → bulk write to IndexedDB (Warm)
3. Promote viewport-visible objects to Hot
4. Tier management takes over

**Incremental sync (future):** Instead of uploading full snapshots, diff against the previous version and upload only changed `ExportEntry` objects. The Automerge op log provides the change list.

### Phase 5: Spatial Index (connects to ADR-0023)

**Goal:** Use georeferencing to make tier decisions spatially aware.

For georeferenced scenes (ADR-0023), camera distance alone isn't sufficient — you need to know which objects are *in front of* the camera, not just *near* it.

**Spatial index** (R-tree or grid):
- Each object's bounding sphere → spatial cell
- Camera frustum → query spatial index for visible cells
- Objects in visible cells → promote to Hot
- Objects in nearby cells → keep as Warm
- Objects in distant cells → eligible for eviction to Cold

The `GeoReference` struct from ADR-0023 provides the coordinate transform. The RTC (Relative-To-Center) offset handling is essential here — large Mercator coordinates must be centroid-subtracted to avoid `f32` precision issues when computing camera distances.

**This is where ADR-0023 and ADR-0025 converge:** The georef system provides the spatial coordinate frame; the tiered architecture manages what's loaded within that frame. Tokyo-scale scenes (100K+ objects) require both.

-----

## Consequences

### Replay Changes

Today's `_replayScene()` is simple: iterate ops, call `cadCommand()` for each. With tiers, replay becomes:

1. **Snapshot → Warm tier** (bulk IndexedDB write, no WASM)
2. **Remaining ops → selective replay** (only for Hot objects)
3. **Warm → Hot promotion** triggers replay of that object's ops from the snapshot point

This means the Automerge op log needs to be **indexable by object ID** — currently ops are just `{ type, params }` with no explicit object tracking. Phase 1 should add an `objectId` field to ops where applicable (most commands already have it in `params`).

### Undo/Redo with Tiers

Undo must work across tiers:
- Undo on a Hot object: works as today (toggle `enabled`, replay)
- Undo on a Warm object: promote to Hot first, then undo
- The user shouldn't know or care which tier an object is in

### Plugin Interaction (ADR-0024)

ADR-0024 splits the kernel into plugins (`cad-core`, `cad-bim`, `cad-mvt`, etc.). Tier management is a **core responsibility** — it lives in `cad-core` (or the Hono router layer), not in individual plugins.

Each plugin produces `ExportEntry` objects via `export_scene()`. The tier manager treats all `ExportEntry` objects uniformly regardless of which plugin created them.

### Sync Architecture — Ops vs Blobs

The blob extraction (Phase 0) creates a clean separation of concerns for sync:

| Data | Characteristics | Sync mechanism | Store |
|------|----------------|----------------|-------|
| **Ops** (add, translate, boolean, undo) | Small (~100 bytes), frequent, mergeable | **Automerge CRDT** | `cad-docs` (IndexedDB) |
| **Import files** (IFC, STEP, scene JSON) | Large (1-500 MB), rare, immutable | **Content-addressed blobs** | `cad-blobs` (IndexedDB → R2) |
| **Snapshots** (export_scene checkpoints) | Large (1-100 MB), periodic, immutable | **Content-addressed blobs** | `cad-blobs` (IndexedDB → R2) |
| **Per-object geometry** (ExportEntry) | Medium (10-200 KB), per-object, mutable | **Content-addressed blobs** | `cad-objects` (IndexedDB → R2) |

**Same-device sync (Automerge only):** Ops sync across tabs via Automerge's built-in BroadcastChannel. Blobs are already in shared IndexedDB — no sync needed.

**Cross-device sync (Automerge + R2):**
1. Automerge syncs ops via sync server (small, fast, real-time)
2. When a new device encounters a `blobRef` it doesn't have locally, it fetches the blob from R2
3. Blobs are immutable + content-addressed → cacheable, deduplicable, no conflict resolution needed

**The key insight:** Automerge is excellent for syncing ops (small, incremental, CRDT-mergeable). It's terrible for syncing large opaque blobs (no meaningful merge, huge transfer). Separating them means each sync mechanism handles what it's good at.

### What This Does NOT Solve

- **GPU instancing** — rendering 100K identical objects cheaply (e.g., forest of trees). This is a renderer optimization in `cad-renderer`, orthogonal to tier management.
- **Geometry simplification** — computing LOD meshes from B-Rep solids. Phase 2 uses bounding boxes; real LOD is a separate concern.
- **Collaborative editing** — multiple users editing the same large model. Automerge handles the CRDT merge, but tier management per-user (what's Hot for me vs. you) is a separate problem.
- **Streaming geometry** — progressive transmission of B-Rep data (e.g., coarse mesh first, then refinement). This is a transport optimization, not a storage tier.

-----

## Sequencing

```
Phase 0: Extract blobs from Automerge                            ← urgent fix (broken today)
  ↓
Phase 1: Per-object IDB store + WASM import/export per object    ← tier foundation
  ↓
Phase 2: Camera-based tier management (auto promote/evict)       ← first visible benefit
  ↓
Phase 3: Progressive model loading (snapshot → Warm → Hot)       ← large model support
  ↓
ADR-0024 Phase 2: Plugin split lands cad-renderer                ← renderer owns LOD proxies
  ↓
Phase 4: R2 cloud tier (Cold storage)                            ← persistence beyond browser
  ↓
ADR-0023 Phase 5: Tokyo test with georef                         ← drives Phase 5
  ↓
Phase 5: Spatial index for geo-aware tier decisions              ← city-scale models
```

**Phase 0 is the urgent fix** — the Automerge doc is already bloated with inline file data and snapshot blobs. This must be fixed before any scaling work makes sense. Content-addressed blob store + reference-only ops.

**Phase 1 builds on Phase 0** — the blob store from Phase 0 becomes the foundation for per-object storage. `ExportEntry` blobs are content-addressed the same way import file blobs are.

-----

## Existing Code

| File | What | Relevance |
|------|------|-----------|
| [state.js:288](web/gui/state.js#L288) | `mgr.record(type, params, ...)` — full params to Automerge | **Phase 0 fix** — must strip blobs before recording |
| [history.js:134](web/gui/history.js#L134) | `params: { ...params }` stored verbatim in op | **Phase 0 fix** — import file data goes inline |
| [history.js:156](web/gui/history.js#L156) | `json: ctrl.export_scene()` inline in snapshot | **Phase 0 fix** — full scene blob in Automerge doc |
| [ui.js:70](web/gui/ui.js#L70) | `cadCommand('import_scene', { json: reader.result })` | Full file content passed as param |
| [wasm_app.rs:132-142](crates/truck-webgpu-gui/src/wasm_app.rs#L132-L142) | `SceneObject` struct | What a Hot object contains |
| [wasm_app.rs:144-155](crates/truck-webgpu-gui/src/wasm_app.rs#L144-L155) | `ExportEntry` struct | Serialization format for Warm tier |
| [wasm_app.rs:1421-1429](crates/truck-webgpu-gui/src/wasm_app.rs#L1421-L1429) | `delete_object(id)` | Eviction — already works |
| [wasm_app.rs:1459-1473](crates/truck-webgpu-gui/src/wasm_app.rs#L1459-L1473) | `export_scene()` | Bulk export — needs per-object variant |
| [wasm_app.rs:1563-1606](crates/truck-webgpu-gui/src/wasm_app.rs#L1563-L1606) | `import_scene()` + per-entry loop | Round-trip proven — extract `import_entry()` |
| [history.js:279-337](web/gui/history.js#L279-L337) | `_replayScene()` | Must handle blobRefs + progressive loading |
| [history.js:51](web/gui/history.js#L51) | IndexedDB adapter (`cad-docs`) | Automerge store; new stores are separate |
| ADR-0023 | Georeferencing — GeoReference struct, RTC offset | Spatial index for Phase 5 |
| ADR-0024 | Multi-WASM plugins — cad-renderer independence | Renderer owns LOD proxy rendering |

## Known Issues / Tech Debt

Discovered during Phase 2 implementation and browser testing.

### 1. ~~`cadCommand()` is async — broke all sync callers~~ (FIXED)

**Root cause:** `cadCommand` was made `async` in Phase 0 (for `storeBlob` + `mgr.record`). This silently broke every caller that doesn't `await` it — they get a Promise, not the result. Affected: `pick_at` (selection broken), `set_camera` (camera never pushed), `addShape` (auto-offset broken), `zoomTo`, `deselect`, and the tier manager.

**Note:** Issue originally diagnosed as "reconcile() strips camera data" — that was wrong. The spread merge `{ ...result, ...state }` preserves camera. The real problem was all callers getting a Promise instead of the result.

**Fix (applied):** Added `cadQuery()` — a sync function for non-recording WASM commands. `cadCommand` with `record: false` now delegates to `cadQuery` internally, so it also returns synchronously. Updated all callers in `cad-viewport.js` and `tier-manager.js` to use `cadQuery`. Made `addShape` async + await.

### 2. ~~Stale IndexedDB entries survive Wipe and accumulate across sessions~~ (FIXED)

**Root cause:** The Wipe button (`clear_data`) only called `localStorage.clear()`. The `cad-blobs` and `cad-objects` IndexedDB databases were never cleared. This caused:
- `listObjects()` returning ghost objects from previous sessions
- `promoteObject()` importing stale geometry into WASM
- Tier manager's `_warmSpheres` map getting out of sync with IDB

**Fix (applied):**
- Wipe handler now also calls `indexedDB.deleteDatabase('cad-blobs')` and `indexedDB.deleteDatabase('cad-objects')`
- Added `clearObjects(modelId)` to `object-store.js` for model-scoped cleanup
- `resetTierState()` in `tier-manager.js` now clears both in-memory maps AND IDB entries
- `_replayScene()` in `history.js` calls `resetTierState()` before rebuilding the scene

### 3. ~~Tier manager tick re-entrancy~~ (FIXED)

**Root cause:** `tick()` is async (IDB reads/writes). If a tick was in-progress when the next interval fired, two ticks could run concurrently, potentially double-evicting or double-promoting the same object.

**Fix (applied):** Added `_tickInProgress` guard — subsequent ticks are skipped while one is running.

### 4. ~~Legacy snapshot format not handled in replay~~ (FIXED)

**Root cause:** `_replayScene()` had a comment saying "Supports both legacy inline (snap.json) and blobRef" but the code only handled `blobRef`. Models created before Phase 0 (with inline `snap.json` snapshots) would silently lose fast replay and fall back to full op-by-op replay. Additionally, `!snap.atOpIndex` was falsy for `atOpIndex === 0`.

**Fix (applied):** Snapshot loading now checks for `snap.blobRef` first, then falls back to `snap.json` (legacy inline). Changed `!snap.atOpIndex` to `snap.atOpIndex == null`.

### 5. ~~Selection state lost during Automerge replay~~ (FIXED)

**Root cause:** `clear_scene()` clears `s.selected` in WASM, and `import_scene()` does not restore it. The tier manager's selected-object guard was ineffective during replay.

**Fix (applied):** `_replayScene()` now issues `cadCommand('select', { id: newSel })` after replay to restore selection in WASM (not just Datastar signals). The tier manager's "never evict selected" guard works correctly across replays. E2E test in tier.spec.ts verifies this.

### 7. ~~Newly created objects evicted immediately~~ (FIXED)

**Root cause:** `_lastInteraction.get(objectId)` returns `undefined` for objects never "touched" (selected/edited). The idle check `now - (undefined || 0)` is always > IDLE_TIMEOUT, making freshly created objects immediately eviction-eligible.

**Fix (applied):** When the tier manager first sees an object with no interaction record, it sets `_lastInteraction.set(objectId, now)` and skips eviction for that tick. This gives objects at least one full idle timeout cycle before they can be evicted.

### 8. ~~Blob params contain `undefined` — Automerge rejects~~ (FIXED)

**Root cause:** Phase 0 blob extraction did `recordParams = { ...params, [dataKey]: undefined, blobRef }`. Automerge's `push()` rejects `undefined` values with `RangeError: Cannot assign undefined value`.

**Fix (applied):** Changed to `delete recordParams[dataKey]` instead of setting to `undefined`. Fixed 3 previously-failing e2e tests (save/load, export/import, BIM import).

### 9. ~~`waitForReady()` didn't wait for Automerge initialization~~ (FIXED)

**Root cause:** `waitForReady()` in `tests/e2e/helpers.ts` only checked for `window.sceneController` and `typeof cadCommand === 'function'`. Automerge's `CadDocManager` initializes asynchronously and takes longer than WASM. Operations executed in WASM but never got recorded to Automerge (handle was null), so undo had nothing to undo. This was the root cause of 3 pre-existing undo test failures.

**Fix (applied):** Added `&& (window as any).cadDocManager?.handle` to the `waitForReady()` check, ensuring tests wait for full bootstrapping (WASM + cadCommand + Automerge handle).

### 10. ~~`undo()`/`redo()` didn't await `_replayScene()`~~ (FIXED)

**Root cause:** `undo()`, `redo()`, and `rollback()` in `history.js` called `this._replayScene()` without `await`. Since `_replayScene()` is async (IDB reads, tier reset, WASM import), the functions returned before replay completed. `handleJsCommand` in `state.js` also didn't await the undo/redo calls.

**Fix (applied):** Made `undo()`, `redo()`, `rollback()` async with `await this._replayScene()`. Updated `handleJsCommand` in `state.js` to `await mgr.undo()` / `await mgr.redo()`.

### 11. ~~`_replayScene()` had no try/finally on `_replayInProgress`~~ (FIXED)

**Root cause:** If `_replayScene()` threw an error, the `_replayInProgress` guard flag would stay `true` forever, silently blocking all future undo/redo/replay operations.

**Fix (applied):** Wrapped the body of `_replayScene()` in `try {} finally { this._replayInProgress = false; }`.

### 12. ~~`<cad-outliner>` missing `data-oid` attribute~~ (FIXED)

**Root cause:** The Lit web component `<cad-outliner>` rendered `data-testid="outliner-item"` and `title="${id}"` on outliner buttons, but never `data-oid="${id}"`. The actors e2e test used `[data-oid="${objectId}"]` locator to verify API-driven changes were visible in the GUI.

**Fix (applied):** Added `data-oid="${id}"` to the button element in `cad-outliner.js`.

### 13. ~~`createDocument()` didn't await `record()`~~ (FIXED)

**Root cause:** In `history.js` `createDocument()`, the initial `this.record('add_cube', ...)` call was not awaited. The subsequent `_localOpCount = this._getDocOpCount()` could read 0 before the op was written.

**Fix (applied):** Added `await` before `this.record('add_cube', ...)`.

### 6. ~~`get_bounding_spheres()` falls back to origin+0 for cache misses~~ (FIXED)

**Root cause:** `get_bounding_spheres()` looked up object IDs in the `bounding_spheres` vec via linear search. If the ID wasn't found (stale cache after delete/re-add), it returned `(Point3::origin(), 0.0)` — making distant objects appear at the origin with zero radius. The tier manager would never evict them (distance 0 from any camera near origin).

**Fix (applied):** `get_bounding_spheres()` now computes directly from `obj.pick_mesh.bounding_sphere()`, bypassing the cache entirely. The `SharedState.bounding_spheres` vec is still maintained for picking but is no longer the source of truth for tier management.

## Phase 3 Implementation: Progressive Model Loading

### How It Works

When `_replayScene()` loads a snapshot with >= 50 entries, it uses the progressive path instead of the monolithic `import_scene()`:

1. **Parse snapshot** → `ExportEntry[]` with `bounding_sphere` on each entry
2. **Scan remaining ops** → collect object IDs that must be Hot (needed for post-snapshot replay)
3. **Frustum cull** via `THREE.Frustum.intersectsSphere()` using the `<cad-viewport>` camera — no custom math, just the already-loaded Three.js
4. **Hot** = viewport-visible + needed-by-ops → `import_entry()` each into WASM
5. **Warm** = rest → `bulkPutObjects()` to IDB + `add_lod_proxy()` for visual context
6. **`registerWarmObjects()`** → tier manager knows about Warm objects for future promotion
7. **Replay remaining ops** → only targets Hot objects (all referenced IDs were included in step 2)

### Verified Test (61-object spatially-distributed model)

Objects placed in 4 spatial groups to exercise frustum culling realistically:
- **Group A** (15 objects): Near origin (in camera frustum)
- **Group B** (15 objects): Behind camera (x ≈ -100)
- **Group C** (15 objects): Far left (z ≈ -100)
- **Group D** (15 objects): Far below (y ≈ -100)
- **+1** pre-existing object from prior session

Spatial spread: x=[-97, 26], y=[-100, 25], z=[-3, 26]. Camera at (1.5, 1.5, 1.5).

| Metric | Value |
|--------|-------|
| Total objects | 61 |
| Initial Hot (frustum-visible) | 8 |
| Initial Warm (IDB + LOD proxy) | 53 |
| Hot + Warm = Total | 8 + 53 = 61 |
| Tier manager promotions (dist < 50) | 32 |
| Steady-state Hot | 40 |
| Steady-state Warm | 21 |
| Footer display | `Objects: 61 (40 hot, 21 warm)` |

### Rust: `ExportEntry.bounding_sphere`

Added `bounding_sphere: Option<[f64; 4]>` to `ExportEntry` (both `wasm_app.rs` and `headless.rs`). Populated by `export_entry()` and `export_scene()` from the object's `pick_mesh.bounding_sphere()`. Format: `[cx, cy, cz, radius]`.

- `#[serde(default, skip_serializing_if = "Option::is_none")]` — backward-compatible with old serialized data
- Enables JS to do viewport frustum culling without loading geometry from IDB

### JS: `object-store.js` Phase 3 API

| Function | Purpose | Status |
|----------|---------|--------|
| `bulkPutObjects(modelId, items)` | Batch-import `ExportEntry[]` from snapshot to IDB in single transaction | **Verified** |
| `listObjectsWithSpheres(modelId)` | Return `{objectId, boundingSphere}[]` for viewport culling without loading geometry | **Verified** |
| `putObject()` updated | Now extracts and stores `boundingSphere` from ExportEntry JSON | **Verified** |

### JS: `tier-manager.js` Phase 3 API

| Function | Purpose | Status |
|----------|---------|--------|
| `registerWarmObjects(sphereMap)` | Register Warm objects from progressive load (never were Hot) | **Verified** |

### Threshold

`PROGRESSIVE_THRESHOLD = 50` — models with < 50 objects use the existing monolithic path (fast enough). Progressive loading only kicks in for larger models where the split matters.

### GUI Tier Indicators

The tier system publishes live stats to the UI via Datastar signals:

- **Footer**: `Objects: N (X hot, Y warm)` — parenthetical only shown when warmCount > 0
- **Viewport HUD**: `N obj` — shows total (Hot + Warm)
- **Live Signals panel**: `objectCount` (total), `warmCount` (Warm tier)
- **Console**: `[Progressive] X Hot, Y Warm, Z remaining ops` on load; `[TierManager] promote/evict {id} dist={d}` on each tier transition

Implementation:
- `window.__warmCount` published by tier-manager.js on each evict/promote tick + registerWarmObjects + resetTierState
- `state.js` `reconcileMetadata()` reads `window.__warmCount`, sets `r.objectCount = ids.length + wc` and `r.warmCount = wc`
- `_publishWarmCount()` triggers a reconcile via `window.reconcile({})` to push signal updates to DOM (uses reconcile directly, NOT cadCommand — avoids recording spurious get_state ops in Automerge)

### What Remains for Phase 4 (R2 Cloud Tier)

1. **Worker R2 endpoints** — `PUT /api/models/{modelId}/snapshot` and `GET /api/models/{modelId}/snapshot`
2. **D1 metadata table** — `{ modelId, version, objectCount, size, timestamp }`
3. **Client upload/download** — triggered by explicit Save / model open

### What Remains for Phase 5 (Spatial Index)

1. **R-tree or grid index** — spatial data structure for 100K+ objects
2. **ADR-0023 GeoReference integration** — RTC offset for large Mercator coordinates
3. **Frustum + spatial query** — combine camera frustum with spatial index for geo-aware tier decisions

## E2E Test Coverage (`tests/e2e/tier.spec.ts`)

| Test | What it exercises |
|------|-------------------|
| evict and promote via export/import per-object | Single-object IDB round-trip |
| bounding_sphere present in export_entry | Rust ExportEntry.bounding_sphere population |
| warmCount signal and footer update on eviction | Datastar warmCount signal, footer display |
| clearObjects removes IDB entries on wipe | Model-scoped IDB cleanup |
| bulkPutObjects and listObjectsWithSpheres | Phase 3 batch IDB API + bounding sphere storage |
| selection restored after replay preserves WASM state | Fix #5 verification — WASM select after replay |
| progressive load splits Hot/Warm by frustum | Full progressive path (55+ objects, THREE.Frustum) |
| tier manager auto-evicts on zoom out, auto-promotes on zoom in | Real tier manager cycle with `setThresholds({ idle: 0 })` |

All 8 tier tests pass. Full suite: 50/50 tests passing (including 3 undo tests in cad.spec.ts and 1 actors test that were previously failing — fixed by bugs #9, #10, #12).

-----

## References

- ADR-0023: Georeferencing (spatial index, RTC offset for large coordinates)
- ADR-0024: Multi-WASM Module Architecture (plugin split, renderer independence)
- ADR-0003: Automerge Collaboration (op log, replay, IndexedDB persistence)
- ADR-0008: Undo/Redo Strategy (replay-based undo, ties to tier-aware replay)
- IndexedDB API: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- Cloudflare R2: https://developers.cloudflare.com/r2/
