# ADR-0015: glTF/GLB Asset Ingestion

## Status
Proposed

## Context
Standard 3D assets (furniture, vehicles, vegetation) are typically provided in glTF/GLB formats. We need a way to bring these assets into our `truck` CAD environment so they can be used for "Scene Dressing" and interior coordination.

## Decision
We will implement a native Rust glTF parser that maps external assets to `truck` rendering primitives.

### 1. Parsing Strategy
*   **Crate:** `gltf-rs`.
*   **Mapping:** GLB binary buffers will be parsed into `truck_polymesh::PolygonMesh` objects.
*   **Materials:** glTF PBR properties (base color, roughness, metalness) will be mapped to the `truck_webgpu_gui::ObjectStyle` struct.

### 2. Scene Integration
*   **Selectability:** glTF assets will be added to the scene as standard `SceneObject` instances. This means they will have UUIDs, appear in the outliner, and be selectable via `pick_at`.
*   **Passive Camera:** Like all other layers, glTF assets will be rendered using the camera matrix provided by the Lit/Three.js conductor (See **ADR-0013**).
*   **Shared Depth:** glTF assets will share the same `Depth32Float` buffer as the CAD models (B-reps) and the city (MVT, see **ADR-0014**), ensuring perfect spatial intersection.

## Consequences

### Positive
*   **Rich Scenes:** High-fidelity visuals for assets that don't need B-rep precision (e.g., a chair vs. a structural beam).
*   **Common Pipeline:** Unified rendering and selection logic for all mesh-based assets.

### Negative / Risks
*   **Loss of Precision:** Converting glTF back to B-rep is not supported; these are "display-only" assets.
*   **Performance:** High-poly glTF models can impact WebGPU frame rates.
*   **Mitigation:** Provide a "Proxy Mesh" toggle for high-poly assets during gizmo interaction.
