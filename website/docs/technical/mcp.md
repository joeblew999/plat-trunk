# MCP and API Stack

## Stack

| Layer | Technology | Purpose |
|---|---|---|
| Server | Hono + Zod | Isomorphic HTTP API with validation |
| Auth | Better-Auth | TypeScript authentication |
| Docs | @hono/zod-openapi | Auto-generated OpenAPI documentation |
| AI | @hono/mcp | Model Context Protocol integration |

## Cloudflare Worker

The CAD API runs as a Cloudflare Worker (`systems/truck/worker/`):

- Hono router for API endpoints
- Static asset serving for the web GUI
- R2 bucket bindings for document storage
- Deployed to `truck-cad.gedw99.workers.dev` and `cad.ubuntusoftware.net`
