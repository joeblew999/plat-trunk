/**
 * server-api.spec.ts — Tests the SyncWorker HTTP API endpoints.
 *
 * Hits the real CF Worker (wrangler + R2) via fetch from the browser.
 * Tests POST /ops, GET /ops, GET /replay, DELETE.
 */
import { test, expect } from '@playwright/test';

const API = 'http://localhost:5198/api';

test.describe('@plat/sync/worker — SyncWorker API', () => {
  test('POST /ops applies op, GET /ops returns it', async ({ request }) => {
    const modelId = `api-ops-${Date.now()}`;

    // Apply an op server-side
    const postRes = await request.post(`${API}/models/${modelId}/ops`, {
      data: {
        id: 'op-1', type: 'test_create', params: { name: 'Widget' },
        enabled: true, timestamp: Date.now(), actorId: 'server', groupId: null,
      },
    });
    expect(postRes.status()).toBe(200);
    const postBody = await postRes.json();
    expect(postBody.opCount).toBe(1);
    expect(postBody.result.executed).toBe('test_create');

    // GET /ops returns the op
    const getRes = await request.get(`${API}/models/${modelId}/ops`);
    expect(getRes.status()).toBe(200);
    const ops = await getRes.json();
    expect(ops.length).toBe(1);
    expect(ops[0].type).toBe('test_create');
    expect(ops[0].id).toBe('op-1');
  });

  test('GET /replay returns only enabled ops', async ({ request }) => {
    const modelId = `api-replay-${Date.now()}`;

    // Add two ops
    await request.post(`${API}/models/${modelId}/ops`, {
      data: { id: 'r1', type: 'op_a', params: {}, enabled: true, timestamp: 1, actorId: 's', groupId: null },
    });
    await request.post(`${API}/models/${modelId}/ops`, {
      data: { id: 'r2', type: 'op_b', params: {}, enabled: false, timestamp: 2, actorId: 's', groupId: null },
    });

    const res = await request.get(`${API}/models/${modelId}/replay`);
    const replay = await res.json();
    expect(replay.length).toBe(1);
    expect(replay[0].type).toBe('op_a');
  });

  test('DELETE removes model', async ({ request }) => {
    const modelId = `api-del-${Date.now()}`;

    await request.post(`${API}/models/${modelId}/ops`, {
      data: { id: 'd1', type: 'op1', params: {}, enabled: true, timestamp: 1, actorId: 's', groupId: null },
    });

    const delRes = await request.delete(`${API}/models/${modelId}`);
    expect(delRes.status()).toBe(200);

    // Ops gone
    const getRes = await request.get(`${API}/models/${modelId}/ops`);
    const ops = await getRes.json();
    expect(ops.length).toBe(0);
  });

  test('POST /sync merges two docs via R2', async ({ request }) => {
    const modelId = `api-sync-${Date.now()}`;

    // Apply op server-side
    await request.post(`${API}/models/${modelId}/ops`, {
      data: { id: 's1', type: 'server_op', params: {}, enabled: true, timestamp: 1, actorId: 'server', groupId: null },
    });

    // Sync with empty browser doc (should get server's op back)
    // We need to send actual Automerge bytes — use the test GUI page to create them
    // For now just verify the endpoint responds
    const syncRes = await request.post(`${API}/models/${modelId}/sync?actorId=browser`, {
      headers: { 'Content-Type': 'application/octet-stream' },
      data: Buffer.alloc(0), // empty — server returns its doc
    });
    // Empty body should still get a response (server adopts empty or returns existing)
    expect(syncRes.status()).toBe(200);
  });

  test('GET /health returns ok', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.status()).toBe(200);
    expect(await res.text()).toBe('ok');
  });
});
