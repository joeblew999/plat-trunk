# Styling Objects

Change the color and material properties of any object in the scene.

## Set Color

1. Select an object
2. In the properties panel, use the color picker or enter RGBA values
3. The color updates immediately in the viewport

Colors are stored as RGBA arrays: `[red, green, blue, alpha]` with values from 0.0 to 1.0.

## Material Properties

Each object has a PBR-style material with these properties:

| Property | Range | Description |
|---|---|---|
| **Albedo** | RGBA [0-1] | Base color |
| **Roughness** | 0.0 - 1.0 | Surface roughness (0 = mirror, 1 = matte) |
| **Reflectance** | 0.0 - 1.0 | Fresnel reflectance at normal incidence |
| **Ambient Ratio** | 0.0 - 1.0 | Ambient light contribution |

## Via MCP (AI Agents)

```json
{ "command": "set_color", "params": { "id": "<uuid>", "r": 1.0, "g": 0.0, "b": 0.0, "a": 1.0 } }

{ "command": "set_style", "params": {
    "id": "<uuid>",
    "albedo": [1.0, 0.0, 0.0, 1.0],
    "roughness": 0.3,
    "reflectance": 0.5,
    "ambient_ratio": 0.02
  }
}

{ "command": "get_object_style", "params": { "id": "<uuid>" } }
```

## Persistence

Styles are saved with the scene. Export/import preserves all material properties.
