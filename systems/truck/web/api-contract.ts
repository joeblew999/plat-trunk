// api-contract.ts — Compile-time contract for all browser API calls.
//
// Exercises every client.* call pattern used by the browser .ts files.
// Produces NO runtime output — exists only for `tsc --noEmit`.
//
// If a route changes in index.ts, regenerate api-types.ts and this file will
// fail to compile, telling you exactly which callers need updating.
//
// To check:  bun run typecheck  (in systems/truck/web/)
// To regen:  bun run gen:api-types  (requires server running on :8789)
//
// WHY openapi-fetch instead of hc<AppType>:
//   hc<AppType> with OpenAPIHono + createRoute() + .route() chaining does NOT
//   correctly propagate route types through Hono's RPC client inference.
//
//   openapi-fetch types come from /api/openapi.json (the spec the worker already
//   generates from its Zod schemas). Proper "codegen off Rust" architecture:
//     Rust cad-schema.json → Worker → /api/openapi.json → api-types.ts → here
//
// CAD command routes (/api/cad/{modelId}/async/{name}) are dispatched via SSE,
// not direct browser fetch. Result posting uses /api/cad/{modelId}/result/{id}.

import { client } from './api-client';
import type { components } from './api-types.generated';

async function _checkResponseTypes() {
  // ── state.ts: save_cloud ────────────────────────────────────────────────
  const { data: saved } = await client.PUT('/api/models/{id}', {
    params: { path: { id: 'model-id' } },
    body: { name: 'My Model', scene: '[]' },
  });
  const _saved: components['schemas']['ModelManifest'] | undefined = saved;

  // ── state.ts: delete_model ──────────────────────────────────────────────
  const { data: deleted } = await client.DELETE('/api/models/{id}', {
    params: { path: { id: 'model-id' } },
  });
  const _deleted: components['schemas']['ModelDeleteResponse'] | undefined = deleted;

  // ── cad-gallery.ts: refresh ─────────────────────────────────────────────
  const { data: models } = await client.GET('/api/models', {});
  const _models: components['schemas']['ModelManifest'][] = models ?? [];

  // ── worker-relay.ts: handleCommand result post ──────────────────────────
  const { data: resultOk } = await client.POST('/api/cad/{modelId}/result/{id}', {
    params: { path: { modelId: 'default', id: 'cmd-uuid' } },
    body: { result: { objectId: 'abc' } },
  });
  const _ok: components['schemas']['StatusOk'] | undefined = resultOk;

  // ── worker-relay.ts: state sync on SSE connect ──────────────────────────
  await client.POST('/api/cad/{modelId}/state', {
    params: { path: { modelId: 'default' } },
    body: { ready: true, objectCount: 0, objectIds: [] },
  });
}
