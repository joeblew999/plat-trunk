# Export & Import

Exchange models with other CAD tools using industry-standard formats.

## Export Formats

| Format | Description | Use Case |
|---|---|---|
| **STEP** | ISO 10303 B-Rep geometry | CNC machining, other CAD tools (Fusion 360, FreeCAD, SolidWorks) |
| **OBJ** | Wavefront mesh | 3D printing slicers, game engines, Blender |
| **STL** | Triangulated mesh | 3D printing (most universal format) |
| **JSON** | Native scene format | Save/restore within the app, cross-tab sync |

### How to Export

1. Build your scene
2. Open the **Export** panel
3. Choose a format (STEP, OBJ, STL, or JSON)
4. The file downloads to your browser

All visible objects in the scene are included in the export.

### Via MCP (AI Agents)

```json
{ "command": "export_step" }
{ "command": "export_obj" }
{ "command": "export_stl" }
{ "command": "export_scene" }
```

Each returns the file content as a string.

## Import Formats

| Format | Description |
|---|---|
| **STEP** | Import B-Rep solids from any CAD tool |
| **IFC** | Import BIM building models with metadata |
| **JSON** | Restore a previously exported scene |

### STEP Import

Import `.step` or `.stp` files from other CAD tools. The geometry is converted to the app's native B-Rep format with full solid editing support (translate, boolean, export).

### IFC / BIM Import

Import `.ifc` building models. Each IFC element becomes a separate object with BIM metadata:

- **IFC Type** (IfcWall, IfcSlab, IfcBeam, etc.)
- **Global ID** (22-character IFC identifier)
- **Properties** visible in the properties panel

The BIM hierarchy is preserved in the Automerge document for collaboration.

### Via MCP (AI Agents)

```json
{ "command": "import_step", "params": { "data": "<STEP file content>" } }
{ "command": "import_ifc", "params": { "data": "<IFC file content>" } }
{ "command": "import_scene", "params": { "json": "<JSON string>" } }
```
