// schema.test.ts — Schema contract tests for the truck CAD system.
//
// Tests that the /api/cad/schema and /api/openapi.json endpoints return
// correct, stable schemas that match the committed cad-schema.json artifact.
// These are TRUCK-specific — another system would have its own schema tests.

import { describe, it, expect } from 'vitest';
import cadSchema from '../../cad-schema.json';
import { json } from './test-helpers';

describe('CAD Schema', () => {
  it('GET /api/cad/schema returns cad-schema.json with all commands', async () => {
    const { status, body } = await json('/api/cad/schema');
    expect(status).toBe(200);
    expect(body.module).toBe('cad');
    expect(body.version).toBeDefined();
    const cmdNames = Object.keys(body.commands);
    expect(cmdNames.length).toBeGreaterThanOrEqual(20);
    expect(cmdNames).toContain('add_cube');
    expect(cmdNames).toContain('boolean_union');
    expect(cmdNames).toContain('translate');
    expect(cmdNames).toContain('select');
    expect(cmdNames).toContain('pick_at');
    expect(body.commands.add_cube.description).toBeDefined();
    expect(body.commands.add_cube.params).toBeDefined();
    expect(typeof body.commands.add_cube.ephemeral).toBe('boolean');
    expect(typeof body.commands.add_cube.readonly).toBe('boolean');
  });

  it('schema commands deep-equal committed cad-schema.json (catches add/delete/rename)', async () => {
    const { body } = await json('/api/cad/schema');
    expect(body.commands).toEqual(cadSchema.commands);
  });

  it('ephemeral commands are marked correctly', async () => {
    const { body } = await json('/api/cad/schema');
    expect(body.commands.select.ephemeral).toBe(true);
    expect(body.commands.deselect.ephemeral).toBe(true);
    expect(body.commands.pick_at.ephemeral).toBe(true);
    expect(body.commands.get_state.ephemeral).toBe(true);
    expect(body.commands.add_cube.ephemeral).toBe(false);
    expect(body.commands.translate.ephemeral).toBe(false);
    expect(body.commands.boolean_subtract.ephemeral).toBe(false);
  });

  it('readonly commands are marked correctly', async () => {
    const { body } = await json('/api/cad/schema');
    expect(body.commands.pick_at.readonly).toBe(true);
    expect(body.commands.export_scene.readonly).toBe(true);
    expect(body.commands.get_state.readonly).toBe(true);
    expect(body.commands.add_cube.readonly).toBe(false);
  });
});

describe('OpenAPI Spec', () => {
  it('GET /api/openapi.json returns valid OpenAPI 3.1 spec', async () => {
    const { status, body } = await json('/api/openapi.json');
    expect(status).toBe(200);
    expect(body.openapi).toBe('3.1.0');
    expect(body.info.title).toBe('Truck CAD API');
    expect(body.paths).toBeDefined();
    expect(body.paths['/api/cad/{modelId}/async/add_cube']).toBeDefined();
    expect(body.paths['/api/cad/{modelId}/sync/add_cube']).toBeDefined();
    expect(body.paths['/api/cad/{modelId}/events']).toBeDefined();
    expect(body.paths['/api/cad/{modelId}/state']).toBeDefined();
    expect(body.paths['/api/health']).toBeDefined();
  });
});
