#!/usr/bin/env bun
// gen-openapi.ts — Full API type generation chain (no running server needed).
//
// ┌─ CHAIN ──────────────────────────────────────────────────────────────────┐
// │  Rust (#[derive(JsonSchema)])                                            │
// │    → bun run build:truck     → systems/truck/cad-schema.json            │
// │    → bun run gen:openapi     → systems/truck/web/openapi.json (gitign.) │
// │    → bun run gen:api-types   → systems/truck/web/api-types.ts (commit.) │
// │    → bun run build:truck-web → systems/truck/web/dist/                  │
// └──────────────────────────────────────────────────────────────────────────┘
//
// This script handles steps 2 + 3: generate openapi.json from cad-schema.json,
// then run openapi-typescript and prepend a chain-origin comment to api-types.ts.
//
// Usage:
//   bun run gen:api-types          (full chain: gen-openapi + openapi-typescript)
//   bun run gen:openapi            (openapi.json only — for inspection)
//   bun run build:truck-web        (calls gen:api-types automatically)

import cadSchema from '../systems/truck/cad-schema.json';
import { writeFileSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';

const version: string = (cadSchema as any).version || '1.0.0';
const OPENAPI_OUT = 'systems/truck/web/openapi.json';
const API_TYPES_OUT = 'systems/truck/web/api-types.ts';

// ── Schema components (mirrors Worker Zod schemas in systems/truck/worker/src/index.ts) ──

const components: Record<string, any> = {
  schemas: {
    StatusOk: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['ok'] } },
      required: ['status'],
    },
    ErrorResponse: {
      type: 'object',
      properties: { error: { type: 'string' } },
      required: ['error'],
    },
    ModelManifest: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        objectCount: { type: 'number' },
        version: { type: 'string' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
        hasThumbnail: { type: 'boolean' },
      },
      required: ['id', 'name', 'objectCount', 'version', 'createdAt', 'updatedAt', 'hasThumbnail'],
    },
    ModelSaveBody: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        scene: { type: 'string' },
      },
      required: ['name', 'scene'],
    },
    ModelDeleteResponse: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['deleted'] } },
      required: ['status'],
    },
    SceneStateBody: {
      type: 'object',
      properties: { broadcast: { type: 'boolean' } },
      additionalProperties: true,
    },
    CommandResultBody: {
      type: 'object',
      properties: {
        result: {},
        error: { type: 'string' },
      },
    },
    CommandQueued: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: { type: 'string', enum: ['queued', 'no_clients'] },
        sseClients: { type: 'number' },
      },
      required: ['id', 'status', 'sseClients'],
    },
    CommandResult: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: { type: 'string', enum: ['done', 'error', 'timeout'] },
        result: {},
        error: { type: 'string' },
      },
      required: ['id', 'status'],
    },
  },
};

// ── Static paths (mirrors routes registered in systems/truck/worker/src/index.ts) ──

const paths: Record<string, any> = {
  '/api/health': {
    get: { tags: ['system'], summary: 'Health', responses: { 200: { description: 'OK' } } },
  },
  '/api/test-wasm': {
    get: { tags: ['system'], summary: 'Test headless WASM', responses: { 200: { description: 'Result' } } },
  },
  '/api/models': {
    get: {
      tags: ['models'],
      summary: 'List all saved models',
      responses: {
        200: {
          description: 'Model list',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ModelManifest' } } } },
        },
      },
    },
  },
  '/api/models/{id}': {
    get: {
      tags: ['models'],
      summary: 'Get model manifest',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'default-cube' }],
      responses: {
        200: { description: 'Manifest', content: { 'application/json': { schema: { $ref: '#/components/schemas/ModelManifest' } } } },
        404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    put: {
      tags: ['models'],
      summary: 'Save model',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'default-cube' }],
      requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ModelSaveBody' } } } },
      responses: {
        200: { description: 'Saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/ModelManifest' } } } },
        400: { description: 'Invalid', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    delete: {
      tags: ['models'],
      summary: 'Delete model',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'default-cube' }],
      responses: {
        200: { description: 'Deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/ModelDeleteResponse' } } } },
        404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },
  '/api/models/{id}/scene': {
    get: {
      tags: ['models'],
      summary: 'Get model scene JSON',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Scene JSON' },
        404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },
  '/api/models/{id}/thumbnail': {
    get: {
      tags: ['models'],
      summary: 'Get thumbnail',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'PNG image' },
        404: { description: 'No thumbnail', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    put: {
      tags: ['models'],
      summary: 'Upload thumbnail',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/StatusOk' } } } },
        404: { description: 'Model not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },
  '/api/cad/{modelId}/events': {
    get: {
      tags: ['cad'],
      summary: 'SSE stream',
      parameters: [{ name: 'modelId', in: 'path', required: true, schema: { type: 'string' }, example: 'default' }],
      responses: { 200: { description: 'Event stream' } },
    },
  },
  '/api/cad/{modelId}/state': {
    get: {
      tags: ['cad'],
      summary: 'Get scene state',
      parameters: [{ name: 'modelId', in: 'path', required: true, schema: { type: 'string' }, example: 'default' }],
      responses: {
        200: { description: 'State', content: { 'application/json': { schema: {} } } },
        503: { description: 'No browser connected', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    post: {
      tags: ['cad'],
      summary: 'Update scene state',
      parameters: [{ name: 'modelId', in: 'path', required: true, schema: { type: 'string' }, example: 'default' }],
      requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/SceneStateBody' } } } },
      responses: {
        200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/StatusOk' } } } },
      },
    },
  },
  '/api/cad/{modelId}/result/{id}': {
    post: {
      tags: ['cad'],
      summary: 'Report command result',
      parameters: [
        { name: 'modelId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CommandResultBody' } } } },
      responses: {
        200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/StatusOk' } } } },
        404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },
  '/api/cad/{modelId}/pending': {
    get: {
      tags: ['cad'],
      summary: 'Get pending commands',
      parameters: [{ name: 'modelId', in: 'path', required: true, schema: { type: 'string' }, example: 'default' }],
      responses: { 200: { description: 'Commands' } },
    },
  },
  '/api/cad/{modelId}/queue': {
    get: {
      tags: ['cad'],
      summary: 'Get full queue',
      parameters: [{ name: 'modelId', in: 'path', required: true, schema: { type: 'string' }, example: 'default' }],
      responses: { 200: { description: 'Queue' } },
    },
  },
  '/api/cad/schema': {
    get: {
      tags: ['cad'],
      summary: 'Get schema',
      responses: { 200: { description: 'Schema' } },
    },
  },
};

// ── Dynamic paths from cad-schema.json commands (mirrors mountModule() in index.ts) ──

const schema = cadSchema as any;
for (const [name, def] of Object.entries(schema.commands) as [string, any][]) {
  const schemaName = `${name}Request`;

  const props: Record<string, any> = {};
  if (def.params?.properties) {
    for (const [pname, prop] of Object.entries(def.params.properties) as [string, any][]) {
      props[pname] = { type: prop.type || 'string' };
      if (prop.description) props[pname].description = prop.description;
      if (prop.default !== undefined) props[pname].default = prop.default;
    }
  }
  components.schemas[schemaName] = {
    type: 'object',
    properties: props,
    ...(def.params?.required?.length ? { required: def.params.required } : {}),
  };

  const params = [{ name: 'modelId', in: 'path', required: true, schema: { type: 'string' }, example: 'default' }];
  const reqBody = { content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } } };

  paths[`/api/cad/{modelId}/async/${name}`] = {
    post: {
      tags: ['cad-commands'],
      summary: def.description,
      parameters: params,
      requestBody: reqBody,
      responses: {
        200: { description: 'Queued', content: { 'application/json': { schema: { $ref: '#/components/schemas/CommandQueued' } } } },
      },
    },
  };

  paths[`/api/cad/{modelId}/sync/${name}`] = {
    post: {
      tags: ['cad-commands'],
      summary: `${def.description} (waits for result)`,
      parameters: params,
      requestBody: reqBody,
      responses: {
        200: { description: 'Result', content: { 'application/json': { schema: { $ref: '#/components/schemas/CommandResult' } } } },
        504: { description: 'Timeout' },
      },
    },
  };
}

// ── Step 1: Write openapi.json ────────────────────────────────────────────────

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Truck CAD API',
    version,
    description: 'Professional 3D CAD control via SSE + WASM.',
    // Chain provenance — visible in openapi.json and API docs UI
    'x-generated-from': 'systems/truck/cad-schema.json',
    'x-generated-by': 'scripts/gen-openapi.ts (bun run gen:api-types)',
    'x-chain': 'Rust → cad-schema.json → gen:openapi → openapi.json → gen:api-types → api-types.ts',
  },
  tags: [
    { name: 'cad-commands', description: 'Modeling operations (schema-driven from Rust cad-schema.json)' },
    { name: 'cad', description: 'Core service: SSE, state, command queue' },
    { name: 'models', description: 'Model persistence (R2)' },
    { name: 'system', description: 'Health + WASM diagnostics' },
  ],
  paths,
  components,
};

writeFileSync(OPENAPI_OUT, JSON.stringify(spec, null, 2));
const pathCount = Object.keys(paths).length;
const cmdCount = Object.keys(schema.commands).length;
console.log(`[1/3] ✓ ${OPENAPI_OUT}  (${pathCount} paths, ${cmdCount} Rust commands, v${version})`);

// ── Step 2: Run openapi-typescript ───────────────────────────────────────────

// Only run openapi-typescript if invoked as gen:api-types (not gen:openapi-only).
// gen:openapi script in package.json calls this file AND stops here (no --gen-types flag).
// gen:api-types in package.json passes --gen-types to continue with steps 2+3.
const genTypes = process.argv.includes('--gen-types');
if (!genTypes) {
  console.log(`       (pass --gen-types to also generate ${API_TYPES_OUT})`);
  process.exit(0);
}

const result = spawnSync('bun', ['x', 'openapi-typescript', OPENAPI_OUT, '-o', API_TYPES_OUT], {
  stdio: 'pipe',
  encoding: 'utf8',
});
if (result.status !== 0) {
  console.error('[2/3] ✗ openapi-typescript failed:');
  console.error(result.stderr || result.stdout);
  process.exit(1);
}
console.log(`[2/3] ✓ openapi-typescript → ${API_TYPES_OUT}`);

// ── Step 3: Prepend chain-origin comment to api-types.ts ─────────────────────

const HEADER = `// GENERATED — do not edit directly.
// Chain: Rust (#[derive(JsonSchema)]) → cad-schema.json → scripts/gen-openapi.ts → openapi.json → openapi-typescript → api-types.ts
// Re-generate: bun run gen:api-types  (no server needed — reads cad-schema.json directly)
// Source:       systems/truck/cad-schema.json  (built by: bun run build:truck)
// Used by:      systems/truck/web/api-client.ts  via openapi-fetch createClient<paths>

`;

const existing = readFileSync(API_TYPES_OUT, 'utf8');
writeFileSync(API_TYPES_OUT, HEADER + existing);
console.log(`[3/3] ✓ chain-origin header prepended to ${API_TYPES_OUT}`);
