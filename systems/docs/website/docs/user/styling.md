# Styling Objects

Change the color and material properties of any object in the scene.

## Set Color

1. Select an object
2. In the Style panel, use the color picker or enter a hex value
3. Adjust opacity with the slider
4. The color updates immediately in the viewport

Colors are stored as RGBA with values from 0.0 to 1.0.

## Material Properties

Each object has a PBR-style material with these properties:

| Property | Range | Description |
|---|---|---|
| **Albedo** | RGBA [0-1] | Base color |
| **Roughness** | 0.0 - 1.0 | Surface roughness (0 = mirror, 1 = matte) |
| **Reflectance** | 0.0 - 1.0 | Fresnel reflectance at normal incidence |
| **Ambient Ratio** | fixed 0.05 | Ambient light contribution |

## Live Preview

Moving the sliders gives a live preview (WASM-only, no Automerge recording). The style is committed when you release the slider or click Apply.

## Via MCP (AI Agents)

- `set_color` — `{ objectId, r, g, b, a }` (values 0.0–1.0, defaults: r=1, g=0, b=0, a=1)
- `set_style` — `{ objectId, style: { albedo: [r,g,b,a], roughness, reflectance, ambient_ratio } }`
- `get_object_style` — `{ objectId }` → returns current style

## Persistence

Styles are saved with the scene. Export/import preserves all material properties.
