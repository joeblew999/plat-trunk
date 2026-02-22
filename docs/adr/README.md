# Architecture Decision Records (ADR)

This directory contains the ADRs for the **plat-trunk** CAD Kernel Platform.

## Foundation

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-architecture-overview.md) | Architecture Overview | **Implemented** (core layers shipped) |
| [0002](0002-truck-cad-kernel.md) | Truck CAD Kernel | **Implemented** (27 commands, WASM, WebGPU) |
| [0003](0003-automerge-collaboration.md) | Automerge Collaboration | **Implemented** (op log, undo/redo, cross-tab sync) |

## Unified API & Interface

| ADR | Title | Status |
|-----|-------|--------|
| [0005](0005-schema-driven-unified-api.md) | Schema-Driven Unified API | **Implemented** |
| [0010](0010-mcp-openapi-stack.md) | MCP & OpenAPI Stack | **Implemented** |
| [0011](0011-control-plane.md) | Control Plane — State Management as API | **In Progress** (core local/online split shipped, full API surface planned) |
| [0012](0012-ai-surface.md) | AI Surface — Single Source of Truth for AI Discovery | **In Progress** |
| [0006](0006-wasm-boundary.md) | WASM Boundary | **Superseded** (kkrpc replaced by direct `executeWasm()`) |

## Modeling & Graphics

| ADR | Title | Status |
|-----|-------|--------|
| [0004](0004-hybrid-semantic-bim.md) | Hybrid Semantic BIM | **In Progress** (Stage 1: IFC parsing starting) |
| [0007](0007-webgpu-rendering.md) | WebGPU Rendering (Tier 3) | **Future** (Tier 1 browser rendering is shipped) |
| [0008](0008-undo-redo.md) | Undo/Redo Strategy | **Implemented** |
| [0009](0009-parametric-modeling.md) | Parametric Modeling | **Future** (direct modeling shipped, constraints not started) |
| [0013](0013-lit-threejs.md) | Lit + Three.js + Passive WASM | **In Progress** (patterns validated, implementing) |

## Ideas & Research

Additional research and speculative designs are located in [ideas/](ideas/).
