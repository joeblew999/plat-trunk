---
title: CAD Documentation
type: docs
---

# Next-Gen Hybrid CAD with MCP Integration

A B-Rep 3D modeler running entirely in your browser using WebGPU. Built on [truck](https://github.com/ricosjp/truck) (Rust) with collaborative editing via Automerge CRDT.

Our platform bridges the gap between traditional desktop power and modern cloud agility, offering a **local-first, cloud-synced** architecture specifically designed for the era of AI-driven engineering.

### 1. Hybrid Cloud/Offline Engine

Unlike existing "cloud-only" solutions (e.g., Onshape), our system operates natively in the browser while maintaining a persistent local state.

- **Offline Resilience**: Design and modify geometry without an internet connection.
- **Browser-Based Persistence**: Save and manage complex models directly within browser storage, eliminating the need for heavy local installations.
- **Instant Sync**: Automatically reconcile changes with the cloud once reconnected, ensuring a "single source of truth" for teams.

### 2. Real-Time Collaborative Environment

The engine is built for multi-user synchronization, allowing distributed teams to co-author 3D geometry in real-time. This eliminates version-control friction and enables instantaneous design reviews and collaborative modeling sessions.

### 3. Agentic AI Control via MCP

The platform is built from the ground up to be **Agent-Ready**. By implementing the Model Context Protocol (MCP), we expose the underlying geometry engine to Large Language Models (LLMs).

- **AI-Driven Modeling**: Allows any AI agent (e.g., Claude, GPT-4) to programmatically drive the CAD environment.
- **Natural Language Interaction**: Users can describe geometry or constraints, and the AI executes the commands via the MCP server.

### 4. Industry-Standard Interoperability

To ensure seamless integration into existing manufacturing workflows, the platform supports high-fidelity exports:

- **STEP**: For downstream CNC, CAM, and high-precision engineering.
- **STL**: For rapid prototyping and 3D printing workflows.

---

## Market Positioning

Current CAD solutions force users to compromise: they must choose between **collaboration** (Onshape), **offline power** (SolidWorks/FreeCAD), or **AI readiness** (emerging prototypes). This platform creates a new category by unifying all three.

### vs. Onshape (Cloud-Native)

| | Onshape | Us |
|---|---|---|
| Real-time collaboration | Yes | Yes |
| Offline capability | No | **Yes** |
| Browser-based persistence | No (server-side) | **Yes** |

Onshape is the gold standard for real-time collaboration, but has zero offline capability. We match the collaboration and fix the biggest weakness.

### vs. Autodesk Fusion (Hybrid)

| | Fusion | Us |
|---|---|---|
| Cloud + local processing | Yes (cached) | **Yes (true local-first)** |
| STEP/STL export | Yes | Yes |
| Native AI/MCP control | No (plugins required) | **Yes (built-in)** |

Fusion's offline mode is "cached" — you can't start new projects offline. Our platform creates a native MCP bridge, making the geometry engine directly accessible to AI agents without middleware.

### vs. FreeCAD (Local-First Open Source)

| | FreeCAD | Us |
|---|---|---|
| Fully offline | Yes | Yes |
| All file formats | Yes | Yes (STEP/STL) |
| Real-time collaboration | No | **Yes** |

FreeCAD has no real-time collaboration. We provide the real-time sync that FreeCAD lacks while keeping local-first performance.

---

## Sections

- [User Guide]({{< relref "/docs/user" >}}) — Getting started, sketch workflow, known issues
- [Technical Docs]({{< relref "/docs/technical" >}}) — Architecture, schema pipeline, extrude pipeline
- [Architecture Decisions]({{< relref "/docs/adr" >}}) — ADRs for truck, Automerge, schema-driven API, WebGPU
- [Roadmap]({{< relref "/docs/roadmap" >}}) — Feature status and plans
