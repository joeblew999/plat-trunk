# Creating Shapes

## Primitives

Set the **Size** parameter, then click a shape button. Each new shape is automatically offset so objects partially overlap — ready for boolean operations.

| Shape | Description |
|---|---|
| **Cube** | Box with the given edge length |
| **Sphere** | Sphere with the given radius |
| **Cylinder** | Radius = size/2, height = size |
| **Torus** | Major radius = size, tube radius = size x 0.3 |

![Adding a sphere to the scene](/screenshots/02-add-sphere.png)

![Multiple primitives in the scene](/screenshots/04-multiple-primitives.png)

<video controls width="100%">
  <source src="/videos/adding-primitives.webm" type="video/webm">
</video>

## How It Works

Each primitive is created as a full B-Rep (Boundary Representation) solid using the truck CAD kernel compiled to WASM. This means:

- Exact mathematical surfaces (not mesh approximations)
- Boolean operations work correctly
- Export preserves full precision
- Each object gets a UUID for stable identity

## Size Parameter

The size input (default: 1.0, minimum: 0.1) controls the scale of new primitives. Adjust it before clicking a shape button.

## Auto-Offset

New shapes are automatically placed with a small offset from existing objects. This ensures they overlap, which is required for boolean operations to work.
