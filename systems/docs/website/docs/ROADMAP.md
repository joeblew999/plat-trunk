# Roadmap

## v0.1 — Direct Modeling Foundation

- [x] WebGPU-based 3D viewer with truck B-Rep kernel (WASM)
- [x] 4 primitives: cube, sphere, cylinder, torus
- [x] Boolean operations: union, subtract, intersect
- [x] Translate transform
- [x] Save/load scenes as JSON (full B-Rep, no tessellation loss)
- [x] Responsive UI: desktop sidebar, mobile bottom sheet + dock
- [x] Auto-offset primitives — new objects partially overlap, ready for booleans
- [x] Deployed to Cloudflare Workers + custom domain

## v0.2 — Undo/Redo + Gizmo

- [x] UUID identity — every object has a stable UUID v4
- [x] Undo/redo with Ctrl+Z / Ctrl+Shift+Z
- [x] Operation grouping — related ops as single undo steps
- [x] Timeline UI — visual strip with clickable chips
- [x] Click-to-select — ray-cast picking
- [x] Translate gizmo — 3-axis colored arrows, drag to move
- [x] Automerge integration — CRDT-based op log
- [x] Cross-tab sync — BroadcastChannel

## v0.3 — Parametric Modeling

- [x] ezpz constraint solver — 11 constraint types
- [x] Sketch mode — 2D sketch on XY/XZ/YZ planes
- [x] Extrude — 2D profile → 3D solid via truck `tsweep`
- [x] Quick rectangle — one-click constrained rectangle
- [x] Sketch export/import — JSON for Automerge replay

## v0.4–v0.5 — MCP + API

- [x] MCP endpoint (JSON-RPC 2.0) — 42 WASM commands + 10 control plane tools
- [x] MCP bridge (`scripts/mcp-bridge.ts`) — stdio ↔ HTTP proxy with retry + hot-reload
- [x] Schema-driven design — Rust `#[derive(JsonSchema)]` → cad-schema.json → OpenAPI → TypeScript types
- [x] openapi-fetch + openapi-typescript — end-to-end typed API client
- [x] STEP/OBJ/STL export
- [x] STEP/IFC import with BIM metadata
- [x] Rotate and scale transforms
- [x] Duplicate and rename

## v0.6 — Platform Architecture

- [x] N-worker topology — plat-router dispatches to sub-workers via service bindings
- [x] truck-sync Rust crate — plugin-agnostic CRDT op log (10 WASM exports, 10 tests)
- [x] R2 model persistence — save/load/list/delete with thumbnails
- [x] Gallery UI — model browser with thumbnails and create/delete
- [x] VitePress documentation site
- [x] Cloudflare deploy pipeline (`cf-deploy.ts`)

## v0.7 — Browser Refactor (Current)

- [x] TypeScript migration — all `.js` → `.ts` with strict types
- [x] Schema-driven dispatch — `dispatch.ts` routes commands via schema classification
- [x] `WasmResult` / `CadOptions` typed interfaces — no more `any` at WASM boundary
- [x] Browser code split: `dispatch.ts`, `reconcile.ts`, `schema.ts`, `types.ts`
- [x] Boolean ops stabilized — `Solid::try_new`, exact-then-perturbed fallback, AABB containment
- [x] `quick_rect_extrude` — one-step parametric box creation
- [x] Model persistence MCP tools — save, load, list, delete
- [x] Documentation MCP tools — docs_index, docs_search, docs_read
- [x] 30+ API tests, typecheck zero errors

## Next — Multi-Actor Sync (ADR-0001)

- [ ] Server-side headless WASM for MCP (no browser required for data-plane commands)
- [ ] R2 Automerge doc persistence (replace D1 op-log)
- [ ] Browser ↔ server Automerge sync
- [ ] Presence (who's editing what)
- [ ] Replay from Automerge doc

## Future

- [ ] Rotation gizmo — circular handles
- [ ] Scale gizmo — square handles
- [ ] Arc/circle sketch entities
- [ ] Revolve — `rsweep` for rotational sweeps
- [ ] Face-based sketch planes
- [ ] Feature tree UI
- [ ] Snap-to-grid
- [ ] Multi-select
- [ ] Assembly mode — multi-part with mates/joints

## Known Limitations

- ~20% of Android devices (primarily Samsung) lack WebGPU support
- No sketch overlay visualization on canvas
- Sketch planes limited to XY, XZ, YZ (no face-based planes yet)
