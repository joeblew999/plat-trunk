# ADR-0040: Generative UI Layer — MCP Apps

**Status:** Draft — Design Intent  
**Date:** 2026-03-22  
**Author:** Gerard Webb  
**Deciders:** Gerard Webb  
**Supersedes:** —  
**Related:** ~~ADR-0001~~ (superseded — now PartyKit sync), ~~ADR-0008~~ (superseded), ADR-0009 (Observability), ADR-0038 (Versioning/R2), ADR-0039 (Tauri v2)

---

## Context

plat-trunk exposes a Hono-based MCP server with 29–52+ tools that allow any AI agent to author and edit 3D geometry via the Truck Rust kernel (compiled to WASM). Tool inputs and outputs are plain JSON, with schemas generated from Rust structs via `schemars::JsonSchema` into `cad-schema.json`. This schema is the single source of truth for the entire API contract, validated in CI via the `api-contract` check (landed 2026-03-18, `main bf28633`).

The current state:

- **AI ↔ Model** — working. Any MCP-compatible AI (Claude, Gemini, etc.) can call CAD tools and receive JSON results.
- **AI ↔ User** — missing. Tool outputs are plain JSON. No rich UI layer exists for external MCP hosts (Claude Desktop, VS Code, RICOS partner tooling) or the plat-trunk web shell.

**MCP Apps (SEP-1865)** is the official MCP extension, co-authored by Anthropic and OpenAI, ratified January 26 2026. It is the correct and only standard solution for this problem. MCP servers declare `ui://` resources alongside tool outputs. Hosts render them in sandboxed iframes. Already supported in Claude, ChatGPT, VS Code, Goose, and Postman.

The official SDK is `@modelcontextprotocol/ext-apps` (Apache 2.0, v1.2.2 current stable, 553k+ npm downloads). The spec version in use is `2026-01-26` (stable). The extension identifier is `io.modelcontextprotocol/ui`.

A2UI (Google, Lit renderer) was also evaluated and remains the correct approach for the plat-trunk owned web shell at `cad.ubuntusoftware.net`. That is a separate concern and will be addressed in a follow-on ADR. This ADR covers MCP Apps only.

---

## Decision

plat-trunk's Hono MCP server will implement MCP Apps using `@modelcontextprotocol/ext-apps/server`. Tool responses will include `ui://` resource declarations and `structuredContent` payloads alongside existing plain JSON outputs.

Two UI surface types are in scope for the initial implementation:

**Surface 1 — 3D CAD Geometry Viewer**  
The primary surface. Renders the output of geometry-producing tools (create_solid, boolean_op, extrude_face, fillet_edge, etc.) as an interactive 3D scene. Uses Three.js (r181) in the iframe for WebGL rendering. The model receives the tool result as `structuredContent` containing geometry data (solid_id, face/edge/vertex counts, bounding box, mesh data or R2 reference). OrbitControls provide interactive rotation/zoom.

**Surface 2 — Generic Content Surface**  
All other tool outputs that benefit from richer display than plain text: markdown responses, operation status cards, export results, parameter summaries. Uses a lightweight vanilla JS renderer in the iframe, styled with host CSS variables from `McpUiHostContext.styles`. No framework dependency.

Both surfaces share a single `App` class lifecycle (not React hooks — see Implementation section).

---

## Why Not React in the Iframe

The `@modelcontextprotocol/ext-apps` SDK provides both:
- `useApp()` — React hook (requires React 18+)
- `App` class — framework-agnostic, vanilla JS

The threejs-server reference example uses React (`useApp` + `useState`). plat-trunk will use the `App` class directly for two reasons:

1. The iframe HTML is a self-contained static bundle served from CF Workers assets. Adding React adds ~150KB to every tool's iframe payload for no benefit.
2. Consistency with the Lit philosophy on the main shell — no React anywhere in plat-trunk.

The `App` class exposes the same callbacks (`ontoolinput`, `ontoolinputpartial`, `ontoolresult`, `onhostcontextchanged`) as the React hook, just imperatively.

---

## SDK Contract (v1.2.2)

### Server-side imports

```typescript
import {
  registerAppTool,      // wraps server.registerTool with _meta.ui normalisation
  registerAppResource,  // wraps server.registerResource with MIME type default
  RESOURCE_MIME_TYPE,   // "text/html;profile=mcp-app"
  EXTENSION_ID,         // "io.modelcontextprotocol/ui"
  getUiCapability,      // reads client capabilities.extensions[EXTENSION_ID]
} from "@modelcontextprotocol/ext-apps/server";
```

### Key types

```typescript
// Tool metadata — _meta.ui shape
interface McpUiToolMeta {
  resourceUri?: string;                  // "ui://plat-trunk/..."
  visibility?: ("model" | "app")[];      // default: ["model", "app"]
}

// Resource metadata — _meta.ui shape on resource content item
interface McpUiResourceMeta {
  csp?: {
    connectDomains?: string[];   // fetch/WebSocket origins
    resourceDomains?: string[];  // scripts/styles/images origins
  };
  domain?: string;               // stable origin for CORS allowlists
  prefersBorder?: boolean;       // request visible border from host
}

// Host context received by iframe on connect + changes
interface McpUiHostContext {
  theme?: "light" | "dark";
  styles?: { variables?: Record<McpUiStyleVariableKey, string | undefined> };
  displayMode?: "inline" | "fullscreen" | "pip";
  containerDimensions?: { height?: number; width?: number; ... };
  platform?: "web" | "desktop" | "mobile";
  locale?: string;
  timeZone?: string;
}
```

### Iframe-side App class lifecycle

```typescript
import { App } from "@modelcontextprotocol/ext-apps";

const app = new App({ name: "plat-trunk-view", version: "1.0.0" });

app.ontoolinput = (params) => {
  // params.arguments = complete structuredContent from tool response
  // Called once streaming is finished
};

app.ontoolinputpartial = (params) => {
  // params.arguments = partial structuredContent during streaming
  // Used for progressive rendering
};

app.ontoolresult = (params) => {
  // params = CallToolResult — the full MCP tool result
};

app.onhostcontextchanged = (params) => {
  // Apply host theme/styles to document
  applyHostContext(params);
};

await app.connect(); // initiates ui/initialize handshake
```

---

## Architecture

```
Rust structs (schemars::JsonSchema)
    │
    ▼  cargo build / codegen
cad-schema.json  ◄── single source of truth
    │
    ├──► MCP tool definitions (Hono/Zod)          [existing]
    ├──► ui:// resource HTML templates             [new — Phase 1]
    └──► structuredContent shape per tool          [new — Phase 1]

─────────────────────────────────────────────────────────────────

Runtime — external MCP host (Claude Desktop, VS Code, RICOS):

  User prompt
      │
      ▼
  AI agent  ──MCP tool call──►  Hono MCP server (CF Workers)
                                    │
                                    ├── content[0].text  (text fallback)
                                    └── structuredContent (geometry/result data)
                                        + _meta.ui.resourceUri → "ui://plat-trunk/cad-viewer"
                                    │
                                    ▼
                              Host fetches ui:// resource
                              → returns HTML bundle
                                    │
                                    ▼
                              Host renders sandboxed iframe
                                    │
                              postMessage JSON-RPC
                              ui/notifications/tool-input → structuredContent
                                    │
                                    ▼
                              App.ontoolinput() → render 3D scene or generic surface
```

---

## Surface Definitions

### Surface 1: CAD Geometry Viewer (`ui://plat-trunk/cad-viewer`)

**Linked to:** all geometry-producing tools — `create_solid`, `boolean_op`, `extrude_face`, `fillet_edge`, `revolve_face`, `sweep`, `loft`, and any future solid-producing tools.

**`structuredContent` shape** (generated from `cad-schema.json`):

```typescript
interface CadViewerPayload {
  solid_id: string;
  operation: string;          // tool name that produced this solid
  face_count: number;
  edge_count: number;
  vertex_count: number;
  bounding_box: {
    min: [number, number, number];
    max: [number, number, number];
  };
  mesh?: {                    // optional inline triangle mesh for preview
    vertices: number[];       // flat Float32Array-compatible
    normals: number[];
    indices: number[];
  };
  r2_key?: string;            // if mesh is too large, reference to R2 object
}
```

**Iframe implementation:**
- Three.js r181 (same version as official threejs-server example) loaded from CDN declared in `csp.resourceDomains`
- OrbitControls for interactive rotation/zoom
- Transparent background (`alpha: true`, `setClearColor(0x000000, 0)`) — composites over host UI
- Streaming shimmer: while `ontoolinputpartial` fires, show a loading state with partial parameter values (solid_id, operation name)
- On `ontoolinput`: render the mesh from `structuredContent.mesh` if present, otherwise fetch from `structuredContent.r2_key`
- Host theme applied via CSS custom properties from `McpUiHostContext.styles.variables`
- `prefersBorder: false` — the 3D canvas handles its own visual boundary

**CSP:**
```typescript
csp: {
  resourceDomains: [
    "https://cdn.jsdelivr.net",   // Three.js
  ],
  connectDomains: [
    "<CF_WORKERS_URL>",           // R2 mesh fetch if needed
  ],
}
```

### Surface 2: Generic Content Surface (`ui://plat-trunk/generic`)

**Linked to:** all non-geometry tools — `export_step`, `export_iges`, `get_solid_info`, `list_solids`, `get_bounding_box`, and any tool that returns structured data or status.

**`structuredContent` shape:**

```typescript
interface GenericPayload {
  type: "markdown" | "status" | "export" | "table" | "error";
  title?: string;
  content: string;             // markdown string for type=markdown
  data?: Record<string, unknown>;  // key-value pairs for type=status/export
  rows?: Record<string, unknown>[]; // for type=table
  severity?: "info" | "success" | "warning" | "error"; // for type=status/error
}
```

**Iframe implementation:**
- Vanilla JS only, no framework
- Markdown rendered via `marked.js` (loaded from CDN)
- Table rendered as a styled HTML table from `rows`
- Status card renders `data` as key-value pairs with severity colour
- Export result shows filename, format, R2 key, and a download trigger via `app.downloadFile()`
- Host theme applied via CSS custom properties
- `prefersBorder: true` — generic surfaces benefit from host-provided visual boundary

---

## Server Implementation Pattern

```typescript
// server/mcp-apps.ts — registration module

import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const CAD_VIEWER_URI  = "ui://plat-trunk/cad-viewer";
const GENERIC_URI     = "ui://plat-trunk/generic";

export function registerUiResources(
  server: McpServer,
  cadViewerHtml: string,   // bundled at build time from cad-schema.json
  genericHtml: string,
) {
  // Resource: CAD geometry viewer
  registerAppResource(
    server,
    "CAD Geometry Viewer",
    CAD_VIEWER_URI,
    {
      description: "Interactive 3D viewer for Truck kernel geometry",
      _meta: {
        ui: {
          prefersBorder: false,
          csp: {
            resourceDomains: ["https://cdn.jsdelivr.net"],
            connectDomains: [CF_WORKERS_URL],
          },
        },
      },
    },
    async () => ({
      contents: [{
        uri: CAD_VIEWER_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: cadViewerHtml,
      }],
    }),
  );

  // Resource: Generic content surface
  registerAppResource(
    server,
    "Generic Content",
    GENERIC_URI,
    {
      description: "Generic surface for status, export results, and data",
      _meta: { ui: { prefersBorder: true } },
    },
    async () => ({
      contents: [{
        uri: GENERIC_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: genericHtml,
      }],
    }),
  );
}

// Tool registration example — fillet_edge
export function registerFilletEdge(server: McpServer) {
  registerAppTool(
    server,
    "fillet_edge",
    {
      title: "Fillet Edge",
      description: "Apply fillet to edges on a solid",
      inputSchema: {
        solid_id:  z.string().describe("ID of the solid to modify"),
        edge_loop: z.string().describe("Edge loop identifier"),
        radius:    z.number().positive().describe("Fillet radius in mm"),
      },
      _meta: {
        ui: {
          resourceUri: CAD_VIEWER_URI,
          visibility: ["model"],   // AI-only callable, not UI-invoked
        },
      },
    },
    async (args) => {
      const result = await applyFillet(args); // calls Truck WASM
      return {
        // Text fallback — mandatory, used by text-only hosts
        content: [{
          type: "text",
          text: `Filleted ${args.edge_loop} on ${args.solid_id} at r=${args.radius}mm. `
              + `Result: ${result.face_count} faces, ${result.edge_count} edges.`,
        }],
        // Structured payload — received by iframe via ontoolinput
        structuredContent: {
          solid_id:    result.solid_id,
          operation:   "fillet_edge",
          face_count:  result.face_count,
          edge_count:  result.edge_count,
          vertex_count: result.vertex_count,
          bounding_box: result.bounding_box,
          mesh:        result.mesh_inline ?? undefined,
          r2_key:      result.mesh_r2_key ?? undefined,
        } satisfies CadViewerPayload,
      };
    },
  );
}

// Tool registration example — export_step (generic surface)
export function registerExportStep(server: McpServer) {
  registerAppTool(
    server,
    "export_step",
    {
      title: "Export STEP",
      description: "Export solid to STEP AP214 format",
      inputSchema: {
        solid_id: z.string(),
        format:   z.enum(["AP203", "AP214"]).default("AP214"),
      },
      _meta: {
        ui: {
          resourceUri: GENERIC_URI,
          visibility: ["model"],
        },
      },
    },
    async (args) => {
      const result = await exportStep(args);
      return {
        content: [{
          type: "text",
          text: `Exported ${args.solid_id} to STEP ${args.format}. R2 key: ${result.r2_key}`,
        }],
        structuredContent: {
          type:     "export",
          title:    `STEP Export — ${args.solid_id}`,
          content:  `Exported as STEP ${args.format}`,
          data: {
            solid_id: args.solid_id,
            format:   args.format,
            r2_key:   result.r2_key,
            size_bytes: result.size_bytes,
            timestamp: new Date().toISOString(),
          },
        } satisfies GenericPayload,
      };
    },
  );
}
```

---

## CI Contract Extension

The `api-contract` check is extended to validate UI surface payloads:

```
ci: api-contract check
    ✓ Hono/Zod routes match cad-schema.json                  [existing]
    ✓ MCP tool definitions match cad-schema.json             [existing]
    ✓ CadViewerPayload fields match cad-schema.json          [new]
    ✓ All geometry tools reference CAD_VIEWER_URI            [new]
    ✓ All export/info tools reference GENERIC_URI            [new]
    ✓ text fallback present on all registerAppTool calls     [new]
```

A Rust struct rename regenerates `cad-schema.json`. CI then fails on any `structuredContent` shape that references a stale field name. Nothing drifts silently.

---

## Text Fallback — Mandatory

Per the MCP Apps spec, all UI-enabled tools MUST return meaningful `content[0].text` for hosts that do not support MCP Apps. This includes:

- RICOS tooling during the partnership warm-up period before they adopt MCP Apps
- Any future MCP client that plat-trunk connects to
- The existing plat-trunk test suite which operates at the JSON level

The text fallback is not a second-class citizen — it must be a complete, useful response.

---

## Build Integration

The iframe HTML bundles (`cad-viewer.html`, `generic.html`) are built as part of the existing Hono CF Workers build:

```
src/ui/
  cad-viewer/
    app.ts          ← App class lifecycle, Three.js render
    styles.ts       ← host CSS variable application
  generic/
    app.ts          ← App class lifecycle, markdown/table/status render
  build.ts          ← bundles each into self-contained HTML string
                      referenced at server startup
```

The `cad-viewer/app.ts` imports field names from a TypeScript type generated from `cad-schema.json` — the same codegen that produces Hono/Zod routes. This is the enforcement mechanism: the iframe type and the `structuredContent` shape on the server both derive from the same generated source.

---

## Consequences

**Positive:**

- Any MCP-compatible host (Claude, ChatGPT, VS Code, RICOS tooling) gets interactive CAD tool UI without per-host integration work.
- Two surfaces (`cad-viewer`, `generic`) cover 100% of current tool output types. New surface types can be added incrementally.
- Vanilla JS in iframes — no React, no framework overhead, consistent with Lit philosophy.
- `structuredContent` types derived from `cad-schema.json` — same alignment guarantee as the rest of the API contract.
- Text fallback is mandatory and validated in CI — no host is left behind.
- The `threejs-server` official example (in `modelcontextprotocol/ext-apps`) provides a validated reference for the 3D surface pattern.

**Negative / Risks:**

- The iframe HTML bundles must be kept small. Three.js from CDN means `csp.resourceDomains` must declare `cdn.jsdelivr.net`. If jsdelivr is unavailable the 3D viewer degrades to text fallback.
- `structuredContent` is not yet part of the stable MCP SDK types (it is in active use in the spec and examples but TypeScript types may lag). Validate at runtime with Zod.
- Mesh data inline in `structuredContent` has a practical size limit. Large solids must use the `r2_key` path. The threshold (inline vs R2) needs empirical tuning once real geometry is flowing through.

---

## Deferred

- A2UI + Lit for the plat-trunk owned web shell (`cad.ubuntusoftware.net`) — separate ADR
- Additional surface types (parameter forms, assembly tree, sketch viewer, sync status) — follow-on once Phase 1 is shipped
- `visibility: ["app"]` tools (UI-initiated tool calls back to server) — not needed for Phase 1
- `app.downloadFile()` integration for STEP export download — deferred until generic surface is implemented
- Mesh size threshold determination (inline vs R2) — needs profiling with real Truck output

---

## References

- MCP Apps spec (2026-01-26): https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx
- ext-apps repository: https://github.com/modelcontextprotocol/ext-apps
- ext-apps npm: https://www.npmjs.com/package/@modelcontextprotocol/ext-apps (v1.2.2)
- threejs-server reference example: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/threejs-server
- MCP Apps announcement: https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/
- SEP-1865 discussion: https://github.com/modelcontextprotocol/modelcontextprotocol/pull/1865
- CF Workers + MCP Apps deployment pattern: https://www.mcpjam.com/blog/mcp-app-cloudflare
