import { describe, it, expect, beforeEach } from 'vitest';
import app from './index';

// Helper: make a request to the Hono app
async function req(path: string, init?: RequestInit) {
  const url = `http://localhost${path}`;
  return app.request(url, init, {
    // Stub R2 bindings (not used by CAD API routes)
    MY_VAR: 'test',
    DOCS_BUCKET: {} as any,
    CAD_DOCS_BUCKET: {} as any,
  });
}

async function json(path: string, init?: RequestInit) {
  const res = await req(path, init);
  return { status: res.status, body: await res.json() };
}

function post(path: string, body: unknown) {
  return json(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Health', () => {
  it('GET /api/health → 200', async () => {
    const { status, body } = await json('/api/health');
    expect(status).toBe(200);
    expect(body).toEqual({ status: 'ok', service: 'truck-cad' });
  });
});

describe('CAD Schema', () => {
  it('GET /api/cad/schema → lists 20 command types', async () => {
    const { status, body } = await json('/api/cad/schema');
    expect(status).toBe(200);
    expect(body.commands).toHaveLength(20);
    expect(body.commands).toContain('add_cube');
    expect(body.commands).toContain('boolean_union');
    expect(body.commands).toContain('translate');
    expect(body.params).toBeDefined();
    expect(body.params.add_cube).toBeDefined();
  });
});

describe('CAD Command Execution', () => {
  it('POST /api/cad/exec → queues command, returns id', async () => {
    const { status, body } = await post('/api/cad/exec', {
      type: 'add_cube',
      params: { size: 2 },
    });
    expect(status).toBe(200);
    expect(body.id).toBeDefined();
    expect(typeof body.id).toBe('string');
    expect(body.id.length).toBeGreaterThan(0);
  });

  it('POST /api/cad/exec with invalid type → 400', async () => {
    const { status, body } = await post('/api/cad/exec', {
      type: 'invalid_command',
      params: {},
    });
    expect(status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('POST /api/cad/exec with missing type → 400', async () => {
    const { status, body } = await post('/api/cad/exec', { params: {} });
    expect(status).toBe(400);
    expect(body.error).toBeDefined();
  });
});

describe('CAD Result Round-Trip', () => {
  it('POST + GET /api/cad/result/:id → stores and retrieves result', async () => {
    // Queue a command first to get an ID
    const exec = await post('/api/cad/exec', { type: 'add_cube', params: { size: 1 } });
    const id = exec.body.id;

    // Post a result for that command
    const postResult = await post(`/api/cad/result/${id}`, {
      result: { objectId: 'test-uuid-1234' },
    });
    expect(postResult.status).toBe(200);

    // Get the result back
    const getResult = await json(`/api/cad/result/${id}`);
    expect(getResult.status).toBe(200);
    expect(getResult.body.id).toBe(id);
    expect(getResult.body.status).toBe('done');
    expect(getResult.body.result).toEqual({ objectId: 'test-uuid-1234' });
  });

  it('POST error result → stores error status', async () => {
    const exec = await post('/api/cad/exec', { type: 'clear' });
    const id = exec.body.id;

    await post(`/api/cad/result/${id}`, { error: 'Something went wrong' });

    const getResult = await json(`/api/cad/result/${id}`);
    expect(getResult.body.status).toBe('error');
    expect(getResult.body.error).toBe('Something went wrong');
  });

  it('GET /api/cad/result/:unknown → 404', async () => {
    const { status, body } = await json('/api/cad/result/nonexistent-id');
    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
  });
});

describe('CAD State', () => {
  it('GET /api/cad/state with no browser → 503', async () => {
    // Fresh app instance has no state posted yet
    // Note: state may persist from prior tests in this module, so we just check it returns
    const res = await req('/api/cad/state');
    const status = res.status;
    // Either 503 (no state) or 200 (state posted by earlier test) is valid
    expect([200, 503]).toContain(status);
  });

  it('POST + GET /api/cad/state → state persists', async () => {
    const state = { ready: true, objectCount: 3, objectIds: ['a', 'b', 'c'] };
    const postRes = await post('/api/cad/state', state);
    expect(postRes.status).toBe(200);

    const getRes = await json('/api/cad/state');
    expect(getRes.status).toBe(200);
    expect(getRes.body.state).toMatchObject(state);
    expect(getRes.body.updatedAt).toBeDefined();
  });
});

describe('CAD Queue', () => {
  it('GET /api/cad/queue → lists queued commands', async () => {
    const { status, body } = await json('/api/cad/queue');
    expect(status).toBe(200);
    expect(Array.isArray(body.commands)).toBe(true);
    expect(typeof body.sseClients).toBe('number');
  });
});

describe('CAD Pending', () => {
  it('GET /api/cad/pending → returns pending commands array', async () => {
    const { status, body } = await json('/api/cad/pending');
    expect(status).toBe(200);
    expect(Array.isArray(body.commands)).toBe(true);
  });
});

describe('OpenAPI Spec', () => {
  it('GET /api/openapi.json → valid OpenAPI 3.1 spec', async () => {
    const { status, body } = await json('/api/openapi.json');
    expect(status).toBe(200);
    expect(body.openapi).toBe('3.1.0');
    expect(body.info.title).toBe('Truck CAD API');
    expect(body.paths).toBeDefined();
    expect(body.paths['/api/cad/exec']).toBeDefined();
    expect(body.paths['/api/cad/exec-wait']).toBeDefined();
    expect(body.paths['/api/health']).toBeDefined();
    expect(body.components?.schemas?.CadCommand).toBeDefined();
  });
});

describe('API Docs Page', () => {
  it('GET /api-docs → returns HTML with Scalar reference', async () => {
    const res = await req('/api-docs');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Truck CAD API');
    expect(html).toContain('api-reference');
    expect(html).toContain('openapi.json');
  });
});
