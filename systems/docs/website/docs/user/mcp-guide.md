# AI / MCP Guide

Control the CAD app programmatically using Model Context Protocol (MCP). AI agents like Claude can create geometry, run booleans, and export models through natural language.

## What is MCP?

MCP lets AI agents call tools on your CAD app. Instead of clicking buttons, you describe what you want and the agent executes the right commands.

**Example conversation:**
> "Create a cube, add a cylinder on top, and subtract a hole through the center"

The agent calls `add_cube`, `add_cylinder`, `translate`, and `boolean_subtract` in sequence.

## How It Works

MCP commands are **browser-delegated** — the agent sends commands to the Worker, which pushes them via SSE to your browser. Your browser's WASM engine executes them and posts results back. This means:

- **A browser tab must be open** at the model URL for commands to work
- The agent controls exactly what you see in real time
- All geometry runs client-side (WebGPU) — no server rendering

## Connect an Agent

### Claude Code (Local Dev)

The project `.mcp.json` configures the bridge automatically. Just run `bun run dev` and start Claude Code in the repo.

### Claude Desktop / Claude Code (Production)

```bash
claude mcp add --transport http truck-cad https://cad.ubuntusoftware.net/mcp
```

### Any MCP Client (HTTP)

POST JSON-RPC to the `/mcp` endpoint:

```json
{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }
```

### Local Development

```bash
# Start dev server
bun run dev

# MCP endpoint available at:
# http://localhost:8788/mcp
```

## Available Tools (v0.7.0)

42 WASM commands + 10 control plane tools, all schema-driven from Rust.

### Primitives
| Tool | Description | Key Params |
|---|---|---|
| `add_cube` | Add a cube | `size` (default: 1) |
| `add_sphere` | Add a sphere | `radius` (default: 1) |
| `add_cylinder` | Add a cylinder | `radius` (default: 0.5), `height` (default: 1) |
| `add_torus` | Add a torus | `majorRadius` (default: 1), `minorRadius` (default: 0.3) |

### Transforms
| Tool | Description | Key Params |
|---|---|---|
| `translate` | Move an object | `objectId`, `dx`, `dy`, `dz` |
| `rotate` | Rotate around axis | `objectId`, `angleDeg`, `axisX/Y/Z` |
| `scale` | Scale an object | `objectId`, `sx`, `sy`, `sz` |
| `duplicate` | Copy an object | `objectId` |
| `rename` | Rename an object | `objectId`, `name` |

### Booleans
| Tool | Description | Key Params |
|---|---|---|
| `boolean_union` | Merge A + B | `idA`, `idB` |
| `boolean_subtract` | Cut B from A | `idA`, `idB` |
| `boolean_intersect` | Keep A & B overlap | `idA`, `idB` |
| `clash_detect` | Check if A and B intersect (read-only) | `idA`, `idB` |

### Selection & Scene
| Tool | Description | Key Params |
|---|---|---|
| `select` | Select by ID | `id` |
| `select_at` | Pick + select at screen coords | `ndcX`, `ndcY` |
| `deselect` | Clear selection | — |
| `delete` | Delete an object | `objectId` |
| `clear` | Remove all objects | — |
| `get_state` | Get full scene state | — |
| `pick_at` | Ray-cast pick (read-only) | `ndcX`, `ndcY` |

### Sketch & Extrude
| Tool | Description | Key Params |
|---|---|---|
| `quick_rect_extrude` | One-step rectangle extrusion | `width`, `height`, `depth`, `plane` |
| `begin_sketch` | Start 2D sketch | `plane` ("xy", "xz", "yz") |
| `sketch_add_point` | Add sketch point | `x`, `y` |
| `sketch_add_edge` | Connect two points | `p0Id`, `p1Id` |
| `sketch_add_constraint` | Add constraint | `constraintType`, `params` |
| `sketch_solve` | Solve constraints | — |
| `sketch_extrude` | Extrude sketch to 3D | `height`, `sketchJson` |
| `sketch_export` | Export sketch as JSON | — |
| `sketch_cancel` | Cancel active sketch | — |

### Export
| Tool | Description |
|---|---|
| `export_scene` | Export as JSON |
| `export_step` | Export as STEP (CAD interchange) |
| `export_stl` | Export as STL (3D printing) |
| `export_obj` | Export as OBJ (rendering) |

### Import
| Tool | Description | Key Params |
|---|---|---|
| `import_scene` | Import JSON scene | `json` |
| `import_step` | Import STEP file | `data` |
| `import_ifc` | Import IFC (BIM) | `data` |

### Styling
| Tool | Description | Key Params |
|---|---|---|
| `set_color` | Set RGBA color | `objectId`, `r`, `g`, `b`, `a` |
| `set_style` | Set material (PBR) | `objectId`, `style` |
| `get_object_style` | Get current style | `objectId` |
| `get_bim_metadata` | Get IFC metadata | `objectId` |

### Camera
| Tool | Description | Key Params |
|---|---|---|
| `set_camera` | Set camera transform | `matrixWorld` (16 floats), `fovDeg` |
| `pick_mesh_stats` | Get mesh statistics | — |

### Control Plane (JS layer)
| Tool | Description | Key Params |
|---|---|---|
| `get_status` | System status | — |
| `set_mode` | Switch local/online | `mode` ("local" or "online") |
| `set_automerge` | Toggle Automerge sync | `enabled` |
| `undo` | Undo last operation | — |
| `redo` | Redo last undo | — |
| `create_model` | New document | `name` |
| `save_cloud` | Save to R2 storage | `name` |
| `delete_model` | Delete from storage | `id` |
| `share_model` | Copy share URL | — |
| `clear_data` | Wipe all local data | — |

### Documentation
| Tool | Description |
|---|---|
| `docs_index` | List doc sections |
| `docs_search` | Search docs by keyword |
| `docs_read` | Read a doc page |
| `docs_reference` | Get library reference (automerge, kkrpc) |

### Model Persistence
| Tool | Description | Key Params |
|---|---|---|
| `model_save` | Save scene to cloud | `name` |
| `model_load` | Load saved model | `id` |
| `model_list` | List all saved models | — |
| `model_delete` | Delete saved model | `id` |

## Example: Build a Bracket

```
Agent: I'll create a bracket with mounting holes.

1. add_cube {size: 2}              → base plate
2. scale {objectId: "...", sy: 0.1} → flatten to plate
3. add_cylinder {radius: 0.15}     → hole punch
4. translate {dy: 0.5}             → position through plate
5. boolean_subtract {idA, idB}     → cut first hole
6. add_cylinder {radius: 0.15}     → second hole punch
7. translate {dx: 1}               → offset
8. boolean_subtract {idA, idB}     → cut second hole
9. set_color {r:0.7, g:0.7, b:0.7} → steel gray
10. export_step                     → download for CNC
```

## Example: Quick Box

For simple rectangular shapes, use `quick_rect_extrude` — one tool call instead of the full sketch workflow:

```
Agent: quick_rect_extrude {width: 2, height: 1, depth: 0.5, plane: "xy"}
```

## Schema

The full command schema with all parameters is available at:
- **JSON**: `/api/cad/schema` (local: `http://localhost:8788/api/cad/schema`)
- **OpenAPI**: `/api/cad/schema` rendered through `gen-openapi.ts`
- **Source of truth**: `systems/truck/cad-schema.json` (generated from Rust)
