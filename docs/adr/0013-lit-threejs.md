# ADR-0013: Architecture Strategy: Lit + Three.js + Truck (Passive WASM)

## Status
Proposed (Revised for Multi-Actor Stability)

## Context
The current architecture uses an "Active WASM" model where the Rust kernel (via `winit`) owns the camera and captures mouse/touch events directly. This creates friction when integrating with modern high-level UI frameworks like Lit and makes it difficult for external actors (AI via MCP or scripts via OpenAPI) to synchronize or manipulate the 3D view.

## Decision
We will transition to a **"Passive WASM"** architecture where the JavaScript Lit component acts as the **Conductor** and the Rust WASM module acts as the **Instrument**.

### 1. The Conductor (Lit + Three.js)
The frontend UI will transition to Lit Web Components. 
*   **Math Library:** We will use a "dummy" Three.js `PerspectiveCamera` managed by `OrbitControls` to handle high-level interaction (mouse, touch, zoom, gimbal lock).
*   **Heartbeat:** The Lit `requestAnimationFrame` loop becomes the system heartbeat. On every frame, it extracts the 4x4 View-Projection matrix and pushes it to WASM.

### 2. Camera as a Command (Single Dispatch Path)
To maintain the **ADR-005 (Schema-Driven API)** and support **MCP/OpenAPI actors**, the Camera is promoted to a first-class command.

*   **New Command:** `cadCommand('set_camera', { matrix: Float32Array })`.
*   **MCP/OpenAPI Support:** This automatically generates a `cad_set_camera` tool. External AI actors can now "look" at specific points or set specific viewports programmatically.
*   **Telemetry:** Because the camera state flows through `cadCommand`, the Worker can broadcast view changes to other tabs, enabling "Follow the Leader" collaborative sessions.

### 3. Traffic Controller (Gizmo vs. Orbit)
To preserve the 60fps performance of the WASM Gizmo, the Lit component will act as a traffic controller for events:

1.  **On PointerDown:** JS calls `begin_gizmo_drag(ndcX, ndcY)`.
2.  **Locking:** If WASM returns an active axis, JS disables `OrbitControls`.
3.  **Sync:** During `PointerMove`, JS updates the WASM camera matrix *before* calling `update_gizmo_drag`.
4.  **Release:** On `PointerUp`, `OrbitControls` is re-enabled.

### 4. Rendering Pipeline
All rendering remains inside the single WebGPU context managed by Rust. High-level UI and interaction logic is decoupled from the kernel, but the kernel remains responsible for the final draw call into the `wgpu` surface.

For integration with external spatial data sources (glTF, MVT), see **ADR-0014**.

## Consequences

### Positive
*   **Headless Capability:** AI agents can now fully control the view and calculate spatial coordinates via MCP.
*   **Deterministic Testing:** Playwright tests can "snap" to exact matrices via `apiCommand` instead of simulated mouse drags.
*   **UI Ergonomics:** Standard Web Components (Lit) and battle-tested math (Three.js) improve developer velocity.
*   **Unified Sync:** The "Single Dispatch Path" remains the one-and-only way to change engine state.

### Negative / Risks
*   **Matrix Overhead:** Pushing a 16-float array 60 times per second adds a negligible but non-zero overhead to the WASM boundary.
*   **Event Latency:** We must ensure the traffic controller doesn't introduce lag between mouse input and gizmo response.

## Action Plan

### Epic 1: Frontend & Interaction
*   [ ] Ticket 1.1: Initialize Lit + Three.js "Dummy" Camera loop.
*   [ ] Ticket 1.2: Implement `InteractionManager` (Traffic Controller) for Gizmo/Orbit locking.

### Epic 2: WASM & Schema
*   [ ] Ticket 2.1: Add `set_camera` to `commands.rs` and `wasm_app.rs`.
*   [ ] Ticket 2.2: Refactor `SharedState` to use "Passive" camera matrix for all picking and gizmo logic.
*   [ ] Ticket 2.3: Update `get_state` to return current matrix for AI spatial context.
