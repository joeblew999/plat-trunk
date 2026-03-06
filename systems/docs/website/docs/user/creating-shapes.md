# Creating Shapes

## Primitives

Click a shape button to add it to the scene. Each new shape is automatically offset so objects partially overlap — ready for boolean operations.

| Shape | Description | Default |
|---|---|---|
| **Cube** | Box with the given edge length | size: 1 |
| **Sphere** | Sphere with the given radius | radius: 1 |
| **Cylinder** | Cylinder with given radius and height | radius: 0.5, height: 1 |
| **Torus** | Torus with major and minor radius | major: 1, minor: 0.3 |

## Quick Rectangle Extrude

For parametric boxes, use **Quick Rect Extrude** — creates a constrained rectangle sketch and extrudes in one step:
- Set width, height, and depth
- Choose plane (XY, XZ, or YZ)
- One click → 3D solid

## How It Works

Each primitive is created as a full B-Rep (Boundary Representation) solid using the truck CAD kernel compiled to WASM. This means:

- Exact mathematical surfaces (not mesh approximations)
- Boolean operations work correctly
- Export preserves full precision (STEP, OBJ, STL)
- Each object gets a UUID for stable identity

## Auto-Offset

New shapes are automatically placed with a small offset from existing objects. This ensures they overlap, which is useful for boolean operations.

## Via MCP (AI Agents)

- `add_cube` — `{ size }` (default: 1)
- `add_sphere` — `{ radius }` (default: 1)
- `add_cylinder` — `{ radius, height }` (defaults: 0.5, 1)
- `add_torus` — `{ majorRadius, minorRadius }` (defaults: 1, 0.3)
- `quick_rect_extrude` — `{ width, height, depth, plane }` (plane default: "xy")
