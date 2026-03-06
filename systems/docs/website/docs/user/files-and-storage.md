# Files & Storage

Save, load, export, and import your models.

## Cloud Storage (R2)

Models are saved to Cloudflare R2 — persistent, globally available, no account needed.

### Save

Click **Save** in the File panel. Each save stores:
- Full B-Rep scene JSON (lossless)
- Auto-captured thumbnail
- Model name and metadata

### Gallery

The Gallery panel shows all saved models with thumbnails. Click to load, right-click to delete.

### URL-Based Models

Each model has a unique URL: `/model/{id}`. Share the URL to let others view the model. Navigate to `/model/new` for a fresh document.

## Export Formats

Download your model in industry-standard formats:

| Format | Extension | Use Case |
|---|---|---|
| **STEP** | `.step` / `.stp` | CNC machining, CAD interchange (Fusion 360, FreeCAD, SolidWorks) |
| **OBJ** | `.obj` | Game engines, Blender, rendering |
| **STL** | `.stl` | 3D printing (most universal) |
| **JSON** | `.json` | Native format — full B-Rep, lossless |

All visible objects are included in the export.

## Import Formats

| Format | Description |
|---|---|
| **STEP** | B-Rep solids from any CAD tool — full editing support |
| **IFC** | BIM building models with metadata (IfcWall, IfcSlab, etc.) |
| **JSON** | Restore a previously exported native scene |

### IFC / BIM Import

Each IFC element becomes a separate object with metadata:
- IFC Type (IfcWall, IfcSlab, IfcBeam, etc.)
- Global ID (22-character identifier)
- Properties visible in the BIM panel

## Local Persistence

- **IndexedDB** — Automerge document bytes persisted locally
- **Cross-tab sync** — BroadcastChannel keeps all tabs in sync
- **Offline** — works without network, syncs when reconnected

## Via MCP (AI Agents)

### Cloud Storage
- `save_cloud` — `{ name }` — save to R2
- `model_list` — list all saved models
- `model_load` — `{ id }` — load a saved model
- `model_delete` — `{ id }` — delete a saved model
- `create_model` — fresh document

### Export
- `export_step` — returns STEP string
- `export_obj` — returns OBJ string
- `export_stl` — returns STL string
- `export_scene` — returns native JSON string

### Import
- `import_step` — `{ data: "<STEP content>" }`
- `import_ifc` — `{ data: "<IFC content>" }`
- `import_scene` — `{ json: "<JSON string>" }`
