// models.test.ts — Model persistence tests for the truck CAD system.
//
// Tests REST API for model CRUD: save, get, delete, thumbnail.
// Uses real R2 via Miniflare. These are TRUCK-specific — model storage
// is part of the truck worker, not the shared sync system.

import { describe, it, expect } from 'vitest';
import { req } from './test-helpers';

describe('Model Persistence', () => {
  it('PUT /api/models/:id saves model, then GET returns it', async () => {
    const scene = JSON.stringify([{ id: 'obj1', name: 'Cube 1' }, { id: 'obj2', name: 'Cube 2' }]);
    const res = await req('/api/models/test-model', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Test Model', description: 'A test', scene }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.id).toBe('test-model');
    expect(body.name).toBe('Test Model');
    expect(body.objectCount).toBe(2);
  });

  it('GET /api/models/:id returns manifest', async () => {
    await req('/api/models/get-test', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Get Test', scene: '[]' }),
    });
    const res = await req('/api/models/get-test');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.name).toBe('Get Test');
  });

  it('GET /api/models/nonexistent returns 404', async () => {
    const res = await req('/api/models/nonexistent');
    expect(res.status).toBe(404);
  });

  it('PUT /api/models/:id without name returns 400', async () => {
    const res = await req('/api/models/bad', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scene: '{}' }),
    });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/models/:id removes model', async () => {
    await req('/api/models/to-delete', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Delete Me', scene: '[]' }),
    });
    const res = await req('/api/models/to-delete', { method: 'DELETE' });
    expect(res.status).toBe(200);
    const getRes = await req('/api/models/to-delete');
    expect(getRes.status).toBe(404);
  });

  it('PUT + GET thumbnail round-trips PNG', async () => {
    await req('/api/models/thumb-test', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Thumb Test', scene: '[]' }),
    });
    const fakePng = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    await req('/api/models/thumb-test/thumbnail', { method: 'PUT', body: fakePng });
    const res = await req('/api/models/thumb-test/thumbnail');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
  });
});
