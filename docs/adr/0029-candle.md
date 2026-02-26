

ADR 0029: Hybrid Edge-Container AI Architecture

# Here is the comprehensive Architectural Decision Record (ADR) for your project. This document serves as the final specification for the system we've designed, optimized for the Cloudflare 2026 stack.

Gemini wrote this and left out heaps of this ADR it seems

we are using hono, zop, open api and mpc.

we are generating the open api off the rust. we alread do that in truck ? 

1. Status

Propsoed but needs review.

2. Context

We require a system that runs high-performance AI inference using Rust and the Candle ML framework. Standard serverless environments (like basic Cloudflare Workers) cannot handle the memory or binary size of these models. Furthermore, we need a Single Source of Truth for our API to prevent type drift between our native Rust code and our TypeScript orchestration layer.

WHERE to put this on the file system ? 

- it feels like its own thing to me, and we have all the bits needsed.
- a task file for it which can use the cf.config and cf task and version gui ? 
- use .src to clone the candle source, so we can also run its demos too.
- we all the other bits we have. I think the cf.config can use this but should be its own for now.


3. Decision
We will implement a tri-tier architecture on Cloudflare:
 * Orchestrator (Edge): A Cloudflare Worker using Hono, Zod, and MCP for routing and "brain" logic.
 * Inference (Container): A native Cloudflare Container running a specialized Rust binary with the Candle framework.
 * Intelligence (Managed): Workers AI (Managed GPUs) for general reasoning and tool orchestration.
4. Detailed Design
4.1. Single Source of Truth (Schema-First)
 * The Authority: The Rust crate (candle-backend) defines all input/output structures using utoipa.
 * The Sync: A pre-build step exports the OpenAPI schema to openapi.json.
 * The Consumer: The Hono worker imports this JSON via openapi-zod-client to generate runtime Zod validators.
4.2. Tool Orchestration via MCP
The Hono worker acts as an MCP Host.
 * Discovery: Workers AI identifies user intent and requests a "tool."
 * Execution: Hono translates this into a Service Binding call to the Candle Container.
 * Security: All container communication happens over the private Cloudflare backbone (Service Bindings).
5. Technical Specifications
Infrastructure (wrangler.jsonc)
{
  "name": "ai-command-center",
  "compatibility_date": "2026-02-25",
  "containers": [
    {
      "name": "CANDLE_ENGINE",
      "image": "./candle-backend/Dockerfile",
      "class_name": "InferenceEngine",
      "max_instances": 10
    }
  ],
  "durable_objects": {
    "bindings": [{ "class_name": "InferenceEngine", "name": "CANDLE_SERVICE" }]
  },
  "ai": { "binding": "AI" }
}

Build & Sync Script
{
  "scripts": {
    "sync": "cd backend && cargo run --bin export_schema && cp openapi.json ../worker/schema.json",
    "codegen": "npm run sync && npx openapi-zod-client worker/schema.json -o worker/src/schemas.ts",
    "deploy": "npm run codegen && wrangler deploy"
  }
}

6. Consequences
Positive
 * Type Safety: 100% synchronization between Rust and TypeScript.
 * Native Speed: Bypasses WASM limitations for multi-threaded Candle inference.
 * Scalability: Cloudflare automatically scales the containers based on demand.
Negative
 * Complexity: Requires a sophisticated CI/CD pipeline to maintain the schema sync.
 * Cost: Containers on Cloudflare have a higher base cost than standard Workers but are cheaper than dedicated GPU VMs.
7. Compliance & Safety
 * Isolation: The Candle Container has no public ingress; it is reachable only via the Hono Worker.
 * Validation: Every request is validated by Zod at the Edge before hitting the Rust engine.
 
