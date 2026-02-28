# AI / MCP Guide

Control the CAD app programmatically using Model Context Protocol (MCP). AI agents like Claude can create geometry, run booleans, and export models through natural language.

## What is MCP?

MCP lets AI agents call tools on your CAD app. Instead of clicking buttons, you describe what you want and the agent executes the right commands.

**Example conversation:**
> "Create a cube, add a cylinder on top, and subtract a hole through the center"

The agent calls `add_cube`, `add_cylinder`, `translate`, and `boolean_subtract` in sequence.

## Connect an Agent

### Claude Desktop / Claude Code

```bash
claude mcp add --transport http truck-cad https://cad.ubuntusoftware.net/mcp
```

### Any MCP Client (HTTP)

POST JSON-RPC to `https://cad.ubuntusoftware.net/mcp`:

```json
{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }
```

### Local Development

```bash
claude mcp add --transport http truck-cad http://localhost:8788/mcp
```

## Available Tools

The app exposes 29+ MCP tools organized by category:

### Primitives
- `add_cube`, `add_sphere`, `add_cylinder`, `add_torus`

### Transforms
- `translate`, `rotate`, `scale`, `duplicate`, `rename`

### Booleans
- `boolean_union`, `boolean_subtract`, `boolean_intersect`

### Selection & Scene
- `select`, `deselect`, `delete`, `clear`, `get_state`

### Sketch
- `begin_sketch`, `sketch_add_point`, `sketch_add_edge`, `sketch_add_constraint`, `sketch_solve`, `sketch_extrude`, `sketch_cancel`

### Export
- `export_step`, `export_obj`, `export_stl`, `export_scene`

### Import
- `import_step`, `import_ifc`, `import_scene`

### Styling
- `set_color`, `set_style`, `get_object_style`

### Analysis
- `clash_detect`, `get_bim_metadata`, `pick_at`

## Example: Build a Bracket

```
Agent: I'll create a bracket by starting with a base plate and adding mounting holes.

1. add_cube → base plate (2x0.2x1)
2. add_cylinder → first hole
3. translate → position hole
4. boolean_subtract → cut hole from plate
5. add_cylinder → second hole
6. translate → position second hole
7. boolean_subtract → cut second hole
8. export_step → download for CNC
```

## Schema

The full command schema with all parameters is available at:
- **JSON**: `https://cad.ubuntusoftware.net/api/cad/schema`
- **LLM-friendly**: `https://cad.ubuntusoftware.net/llms.txt`
