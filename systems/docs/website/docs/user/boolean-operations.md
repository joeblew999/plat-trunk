# Boolean Operations

Combine overlapping objects using CSG (Constructive Solid Geometry).

## Operations

| Operation | Description |
|---|---|
| **Union** | Merge A and B into one solid |
| **Subtract** | Cut B out of A |
| **Intersect** | Keep only the overlapping region |

## How to Use

1. Click an object to select it as **A**, then Shift+click a second object for **B**
2. Click the operation button (Union, Subtract, or Intersect)
3. The two input objects are replaced with the result

The result gets a new UUID. Both input objects are removed from the scene.

## Clash Detection

Check if two objects overlap without modifying them:
1. Select A and B as above
2. Click **Clash Detect**
3. Shows "CLASH DETECTED!" or "No clash"

## Requirements

- Objects **must overlap** for boolean operations to work
- Objects must be valid B-Rep solids

## Stability

Boolean operations work for all shape combinations (cubes, spheres, cylinders, tori):
- Exact intersection attempted first
- Falls back to perturbed intersection on failure
- AABB containment check rejects degenerate cases gracefully

## Via MCP (AI Agents)

- `boolean_union` — `{ idA, idB }`
- `boolean_subtract` — `{ idA, idB }`
- `boolean_intersect` — `{ idA, idB }`
- `clash_detect` — `{ idA, idB }` (read-only)

## Undo

Boolean operations can be undone with **Ctrl+Z**. Undo replays the scene without the boolean operation, restoring both original objects.
