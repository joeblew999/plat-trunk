# TODO (Updated 2026-02-20)

MY OWN RUNNING NOTEES BECAUSE CLAUDE LIES SO OFTEN !! (Gemini is better)

## DONE (Gemini Fixed)

- [x] **Task automation for tests**: Added `task truck:test:full` which builds everything, starts the server in background, runs both API (Vitest) and E2E (Playwright) tests, and cleans up.
- [x] **OpenAPI Automation**: Refactored the Worker (`systems/truck/worker/src/index.ts`) to use `@hono/zod-openapi`. The OpenAPI spec is now fully automated and includes detailed parameters for every command, derived directly from `cad-schema.json` (the Rust source of truth).
- [x] **Unified Command Architecture**: Verified and reinforced the schema-driven pipeline. It's now truly unified: Rust `commands.rs` -> `cad-schema.json` -> Worker Zod/MCP/OpenAPI -> Browser.
- [x] **Backwards Compatibility**: Implemented "loose" validation for the `/exec` API route to maintain compatibility with existing clients while still providing full OpenAPI documentation.
- [x] **Process Compose**: Added `gui-worker` to `process-compose.yml` for local development and automated testing.
- [x] **BIM Architecture**: Refined ADR-004 (Hybrid Semantic Architecture for BIM) to use `ifc-lite` + `truck` + `Automerge`.

## NEXT STEPS

- [ ] **Code Mode & Edge AI Chat (HIGH PRIORITY)**: 
    - Implement Phase 1: `@truck/sdk` generation from `cad-schema.json` + `TransactionRecord` schema.
    - Implement Phase 2: Browser-side `execute(code)` sandbox via SSE channel.
    - Implement Phase 3: Built-in "Design Assistant" GUI using Datastar + Workers AI (consumes `execute`).
    - This is the primary path for user accessibility (Zero-Setup AI).
- [ ] **BIM Integration**: Start Stage 1 of ADR-004 (IFC parsing with `ifc-lite`).
- [ ] **Rotate/Scale Gizmos**: Implement as per Roadmap.
- [ ] **STEP Import/Export**: Leverage `truck-stepio`.
- [ ] **STEP to Automerge**: Plan how to serialize B-Rep geometry into the Automerge op-log for collaborative editing.
