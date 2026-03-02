// api-client.ts — Typed fetch client for the truck-cad API.
//
// Architecture:
//   Rust cad-schema.json → Worker → /api/openapi.json → openapi-typescript → api-types.ts → here
//
// This replaces the previous hc<AppType> approach (Hono RPC client).
// hc<AppType> was broken because OpenAPIHono + createRoute() + .route() chaining
// does not correctly propagate types through Hono's RPC client inference.
// openapi-fetch is spec-driven: types come from the GENERATED API spec, not from
// worker TypeScript source. This is the proper "codegen off Rust" architecture.
//
// Regenerate api-types.ts from a running server:
//   cd systems/truck/web && bun run gen:api-types

import createClient from 'openapi-fetch';
import type { paths } from './api-types';

// Typed fetch client. Paths defined in api-types.ts — generated from /api/openapi.json.
// Usage:
//   const { data, error } = await client.GET('/api/models', {});
//   const { data, error } = await client.PUT('/api/models/{id}', { params: { path: { id } }, body: { name, scene } });
//   const { data, error } = await client.DELETE('/api/models/{id}', { params: { path: { id } } });
export const client = createClient<paths>({ baseUrl: '/' });
