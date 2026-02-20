# [ADR-004] Hybrid Semantic Architecture for Local-First BIM

We need a unified spatial platform that accommodates both Mechanical Engineering (precise B-Rep) and Architectural/BIM (semantic objects) workflows.

## Status

**In Progress** — Stage 1 (Infrastructure) complete. Stage 2 (BIM metadata) and Stage 3 (Hierarchy Sync) partially complete. `import_ifc` command now extracts full semantic hierarchy and metadata into Automerge.

## Context

Mechanical engineers rely on ISO 10303 (STEP) and Boundary Representation (B-Rep) for precise manufacturing data. Architects rely on ISO 16739 (IFC) for semantic building data (walls, windows, spaces) and coordination. 

Existing systems usually force a choice:
- **MCAD (Fusion 360, SolidWorks)**: Great at B-Rep, poor at BIM semantics.
- **BIM (Revit, ArchiCAD)**: Great at semantics, poor at direct B-Rep manipulation.

Our goal is a **Hybrid Semantic Architecture** where B-Rep geometry and BIM semantics coexist in a single Automerge-backed document.

## Decision: ifc-lite + truck + Automerge

We will adopt a multi-layered geometry/semantic engine:

1.  **Geometry Kernel**: [truck](https://github.com/ricosjp/truck) (Rust)
    - Foundation via `truck-modeling` and `truck-topology`.
    - STEP import/export via `truck-stepio`.
    - **Live Clash Detection** via `truck-shapeops` (background boolean intersections).
    - **B-Rep Promotion**: For IFC entities with simple extrusion geometry (e.g., `IfcExtrudedAreaSolid`), we promote the mesh to a native Truck `Solid` to enable hybrid boolean editing.

2.  **Semantic BIM Layer**: [ifc-lite](https://github.com/louistrue/ifc-lite) (Rust/WASM)
    - **Maturity**: v1.8.0. Production-ready for high-performance parsing.
    - Maps building semantics (Walls, Slabs) to Truck geometry and metadata.
    - Preserves GlobalId and PropertySets for every imported element.

3.  **Assembly & Hierarchy**: `truck-assembly` (v0.1.0)
    - Manages spatial hierarchy (Project > Building > Element).
    - Uses a Directed Acyclic Graph (DAG) to represent building assemblies.
    - **Sync Point**: The assembly structure is mirrored in the Automerge document as a tree of UUIDs.

4.  **Sync & State**: [Automerge](https://automerge.org)
    - Delta-sync via Datastar/SSE ensures real-time collaborative design review.
    - **Schema Extension**: The document now includes a `bimHierarchy` field.

## Automerge BIM Schema

The Automerge document is extended to support the semantic hierarchy:

```typescript
type BimNode = {
  id: string;          // Internal UUID matching SceneObject
  globalId: string;    // IFC GlobalId
  type: string;        // e.g. "IfcWall", "IfcWindow"
  name: string;
  children: string[];  // Child UUIDs
  properties: Record<string, any>;
};

type CadDocument = {
  name: string;
  operations: CadOperation[];
  bimHierarchy: Record<string, BimNode>; // Root node usually "IfcProject"
};
```

## B-Rep Mapping Strategy (Stage 2)

To enable **Hybrid Editing** (e.g., punching a hole in an IFC wall using a Truck cylinder), we implement a promotion logic:

1.  **Trivial Geometry**: If an IFC element is a simple extrusion (`IfcExtrudedAreaSolid`) with a linear profile, we rebuild it as a Truck `Solid` using `builder::tsweep`.
2.  **Complex Geometry**: For `IfcFacetedBrep` or complex CSG results, we initially render as `PolygonMesh`. If a boolean operation is requested, we perform a **Mesh-to-Solid conversion** or treat the mesh as a static obstacle for clash detection.
3.  **Metadata Link**: Every `SceneObject` in WASM maintains a reference to its IFC entity index, allowing property panels to display live BIM data.

## Implementation Path

1.  **Stage 1 (IFC Scan)**: [DONE] Integrate `ifc-lite` and implement `import_ifc` command.
2.  **Stage 2 (B-Rep Link)**: [IN PROGRESS] Update `SceneObject` to hold BIM metadata [DONE]. Implement `ifc_to_solid` conversion in Rust for common extrusion types.
3.  **Stage 3 (Assembly Sync)**: [IN PROGRESS] Sync the IFC hierarchy into the Automerge `bimHierarchy` field [DONE]. Integrate `truck-assembly` into the WASM state to manage the spatial DAG.
4.  **Stage 4 (Live Clash)**: Implement background boolean intersection polling using `truck-shapeops`.
