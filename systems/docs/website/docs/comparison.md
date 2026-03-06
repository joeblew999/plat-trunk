# How We Compare

How this CAD app compares to established tools. We're not trying to replace them — we're building for a different set of trade-offs.

## Quick Comparison

| | This App | Onshape | Fusion 360 | SolidWorks | FreeCAD |
|---|---|---|---|---|---|
| **Runs in browser** | Yes (WebGPU) | Yes (WebGL) | No (desktop) | No (desktop) | No (desktop) |
| **Installation** | None | None | ~3 GB | ~10 GB | ~500 MB |
| **B-Rep kernel** | truck (Rust) | Parasolid | Parasolid | Parasolid | OpenCASCADE |
| **Open source** | Yes | No | No | No | Yes |
| **Cost** | Free | Free tier + paid | Free tier + paid | Paid ($3,995/yr) | Free |
| **AI/MCP tools** | 52+ tools | None | None | None | None |
| **Offline support** | Full (local-first) | Limited | Partial | Full | Full |
| **Collaboration** | Automerge CRDT | Cloud-based | Cloud-based | PDM | None |
| **Deployment** | Cloudflare edge | AWS | Autodesk cloud | On-premise | Local |

## What We Do Better

### Zero Friction
No download, no install, no account. Open a URL and start modeling. Your browser IS the CAD tool.

### AI-Native
52+ MCP tools let AI agents create geometry, run booleans, and export models. No other CAD tool has this. An agent can build a complete bracket with mounting holes in 10 tool calls.

### Local-First
All geometry runs client-side via WebAssembly. No server-side computation, no upload/download cycles. Works offline. Automerge CRDTs handle sync when you reconnect.

### Open & Extensible
The entire stack is open source — Rust CAD kernel, TypeScript UI, Cloudflare Worker API. The schema-driven architecture means adding a new command is one Rust struct.

### Edge-Deployed
No backend servers to maintain. Static assets + Cloudflare Workers. Global latency under 50ms.

## What They Do Better

### Onshape
- Mature parametric feature tree with full constraint history
- Assembly mode with mates and joints
- Large-scale collaboration (100+ users on one model)
- Sheet metal, surfacing, simulation tools
- Parasolid kernel (decades of edge-case hardening)

### Fusion 360
- Integrated CAM (CNC toolpaths, G-code generation)
- Simulation (FEA stress analysis, thermal)
- PCB design (electronics integration)
- Rendering and animation
- Generative design (topology optimization)

### SolidWorks
- Industry-standard for mechanical engineering
- Massive ecosystem of plugins and add-ins
- Certification programs (CSWA/CSWP)
- PDM/PLM integration for enterprise workflows
- Sheet metal, weldments, routing

### FreeCAD
- Full parametric modeling with feature tree
- FEM workbench for simulation
- Architecture/BIM workbench
- CNC path workbench
- Large plugin ecosystem (Python-based)

## Our Sweet Spot

We're best for:
- **Quick concept modeling** — spin up a browser tab, make shapes, export STEP
- **AI-assisted design** — describe what you want, agents build it
- **BIM/IFC review** — import IFC models, inspect metadata, collaborate
- **Prototyping** — fast iteration with boolean ops and sketch-extrude
- **Education** — no install barrier, students start immediately
- **Embedded CAD** — integrate via MCP into any AI workflow

## Architecture Differences

| Aspect | Traditional CAD | This App |
|---|---|---|
| Kernel location | Server or desktop | Browser WASM |
| State management | File-based or cloud DB | Automerge CRDT |
| API | Proprietary SDK | Open MCP + REST + SSE |
| Extension model | Plugins (C++/Python) | Rust WASM + JSON Schema |
| Rendering | OpenGL / DirectX | WebGPU |
| Collaboration | Lock-based or last-write-wins | Conflict-free CRDT merge |
