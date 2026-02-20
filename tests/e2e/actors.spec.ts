import { test, expect } from '@playwright/test';
import { waitForReady, getObjectCount, clickToolbar, pause, waitForObjectCount } from './helpers';

/**
 * ACTORS TEST
 * This suite verifies that the two primary actors of the system (Human GUI and AI MCP)
 * can interact seamlessly and see each other's changes.
 */

test.describe('Hybrid Actor Workflow', () => {
  // Use a unique model ID per test to avoid interference
  let modelId: string;

  test.beforeEach(async ({ page }, testInfo) => {
    modelId = `test-actors-${testInfo.testId}`;
    
    // 1. Human Actor opens the browser to a specific model
    await page.goto(`/?model=${modelId}`);
    await waitForReady(page);
    
    // Ensure scene is clear for testing
    // WASM might add a default cube on load, so we clear it
    await page.evaluate(() => (window as any).cadCommand('clear'));
    await waitForObjectCount(page, 0);
    
    // Wait for the clear to be reported to the worker
    await pause(page);
  });

  test('AI Actor (API) drives changes, Human Actor (GUI) sees them', async ({ page, request }) => {
    expect(await getObjectCount(page)).toBe(0);

    // 2. AI Actor sends a command via the REST API (simulating MCP tool call)
    const response = await request.post(`/api/cad/${modelId}/sync/add_cube`, {
      data: { size: 1.5 }
    });
    
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.status).toBe('done');
    expect(body.result.objectId).toBeDefined();

    // 3. Human Actor verifies the change is visible in the GUI
    // Use the helper to wait for the count to sync
    await waitForObjectCount(page, 1);
    
    // Verify Datastar signal sync: check if outliner has the item
    const outlinerItem = page.locator(`[data-oid="${body.result.objectId}"]`);
    await expect(outlinerItem).toBeVisible();
  });

  test('Human Actor (GUI) drives changes, AI Actor (API) sees them', async ({ page, request }) => {
    // 1. Human Actor clicks "Add Sphere" in the toolbar
    await clickToolbar(page, 'add-sphere');
    await waitForObjectCount(page, 1);
    
    // 2. AI Actor queries the state via the REST API
    // We poll until the object count is 1 to handle the async reporting from browser -> worker
    let objectCount = 0;
    for (let i = 0; i < 10; i++) {
      const response = await request.get(`/api/cad/${modelId}/state`);
      if (response.ok()) {
        const body = await response.json();
        objectCount = body.state.objectCount;
        if (objectCount === 1) break;
      }
      await page.waitForTimeout(500);
    }
    expect(objectCount).toBe(1);
  });

  test('AI Actor (API) sends sequence, Human Actor (GUI) UI stays in sync', async ({ page, request }) => {
    // AI sends multiple commands
    await request.post(`/api/cad/${modelId}/sync/add_cube`, { data: { size: 1 } });
    const res2 = await request.post(`/api/cad/${modelId}/sync/add_cylinder`, { data: { radius: 0.5, height: 2 } });
    const cylId = (await res2.json()).result.objectId;

    // Human checks GUI count
    await waitForObjectCount(page, 2);

    // AI deletes one
    await request.post(`/api/cad/${modelId}/sync/delete`, { data: { objectId: cylId } });

    // Human verifies UI updated
    await waitForObjectCount(page, 1);
    await expect(page.locator(`[data-oid="${cylId}"]`)).not.toBeVisible();
  });

  test('AI Actor (API) exports scene as STEP', async ({ page, request }) => {
    // 1. Human Actor adds a cube
    await clickToolbar(page, 'add-cube');
    await waitForObjectCount(page, 1);

    // 2. AI Actor calls export_step via sync endpoint
    const response = await request.post(`/api/cad/${modelId}/sync/export_step`, { data: {} });
    expect(response.ok()).toBe(true);
    
    const body = await response.json();
    expect(body.status).toBe('done');
    expect(body.result.step).toContain('ISO-10303-21');
    expect(body.result.step).toContain('DATA;');
  });

  test('AI Actor (API) exports scene as OBJ', async ({ page, request }) => {
    await clickToolbar(page, 'add-sphere');
    await waitForObjectCount(page, 1);

    const response = await request.post(`/api/cad/${modelId}/sync/export_obj`, { data: {} });
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.status).toBe('done');
    expect(body.result.obj).toContain('v ');
    expect(body.result.obj).toContain('f ');
  });

  test('AI Actor (API) exports scene as STL', async ({ page, request }) => {
    await clickToolbar(page, 'add-torus');
    await waitForObjectCount(page, 1);

    const response = await request.post(`/api/cad/${modelId}/sync/export_stl`, { data: {} });
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.status).toBe('done');
    expect(body.result.stl).toContain('solid');
    expect(body.result.stl).toContain('facet normal');
  });
});
