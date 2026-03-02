# Architecture Decision Records (ADR)

This directory contains the ADRs for the **plat-trunk** CAD Kernel Platform.

## Foundation (Implemented)

| ADR | Title | Status |
|-----|-------|--------|
| [0001](done/0001-architecture-overview.md) | Architecture Overview | **Implemented** |
| [0002](done/0002-truck-cad-kernel.md) | Truck CAD Kernel | **Implemented** |
| [0003](done/0003-automerge-collaboration.md) | Automerge Collaboration | **Implemented** |
| [0005](done/0005-schema-driven-unified-api.md) | Schema-Driven Unified API | **Implemented** |
| [0008](done/0008-undo-redo.md) | Undo/Redo Strategy | **Implemented** |
| [0010](done/0010-mcp-openapi-stack.md) | MCP & OpenAPI Stack | **Implemented** |
| [0006](done/0006-wasm-boundary.md) | WASM Boundary | **Superseded** |

## Active Work & Proposals

| ADR | Title | Status |
|-----|-------|--------|
| [0004](0004-hybrid-semantic-bim.md) | Hybrid Semantic BIM | **In Progress** |
| [0011](0011-control-plane.md) | Control Plane — State Management as API | **Implemented** |
| [0012](0012-ai-surface.md) | AI Surface — AI Discovery | **In Progress** |
| [0013](0013-lit-threejs.md) | Lit + Three.js + Passive WASM Interaction | **Implemented** |
| [0014](0014-mvt.md) | Mapbox Vector Tiles (MVT) for Urban Context | **Proposed** |
| [0015](0015-gltf-ingestion.md) | glTF/GLB Asset Ingestion | **Proposed** |
| [0017](0017-versioned-deployments.md) | Versioned Deployments via Cloudflare Workers | **Implemented** |
| [0018](0018-code-mode-mcp.md) | Code Mode MCP for Efficient API Interaction | **Proposed** |
| [0019](0019-gui-unification.md) | GUI Unification — Single Dispatch, Single Pattern | **Proposed** |
| [0020](0020-mcp-session-reliability.md) | MCP Session Reliability — Startup, Health, Self-Healing | **Proposed** |
| [0021](0021-automerge-replay-integrity.md) | Automerge Replay Integrity — Undo/Redo Fixes | **Implemented** |
| [0022](0022-cf-deploy-toolkit.md) | cf-deploy — Cloudflare Deploy Toolkit (v2) | **Implemented** |
| [0023](0023-reference-frame.md) | Georeferencing — Unified Coordinate Space for CAD, MVT, and IFC | **Proposed** |
| [0024](0024-multi-wasm-modules.md) | Multi-WASM Module Architecture | **Proposed** |
| [0025](0025-tiered-object-scaling.md) | Content-Addressed Storage & Tiered Object Scaling | **Proposed** (Phase 0 urgent) |
| [0026](0026-test-cleanup.md) | Test Cleanup — Review & Hardening of E2E Infrastructure | **Review** |
| [0032](0032-ai-gui.md) | AI GUI — Integrated AI Assistance | **Proposed** |
| [0033](0033-bundle.md) | Bundling — Dual-Mode (Source + Bundle) Distribution | **Proposed** |
| [0034](0034-urdf.md) | URDF Robot Integration | **Proposed** |
| [0035](0035-vite-typescript.md) | Vite + TypeScript for Browser Code | **Implemented** |

## Future Roadmap

| ADR | Title | Status |
|-----|-------|--------|
| [0007](0007-webgpu-rendering.md) | WebGPU Rendering (Tier 3) | **Future** |
| [0009](0009-parametric-modeling.md) | Parametric Modeling | **Future** |
| [0016](0016-servermcp_and_webmcp.md) | Dual MCP (Server + WebMCP) | **Future** |

## Ideas & Research

Additional research and speculative designs are located in [ideas/](ideas/).
