/**
 * API Commands — verifies the unified cadCommand() dispatcher works correctly
 * from the browser context. All scene mutations go through the same code path
 * that GUI buttons, HTTP API, and keyboard shortcuts use.
 *
 * Run with:  npx playwright test e2e/api-commands.spec.ts --project=e2e
 */
import { test, expect } from '@playwright/test';
import { waitForWasm, apiCommand, getObjectCount, getObjectIds } from './helpers';

test.describe('Unified cadCommand() Dispatcher', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);
    // Clear the default cube so tests start clean
    await apiCommand(page, 'clear', {});
  });

  test('cadCommand is available on window', async ({ page }) => {
    const available = await page.evaluate(() => typeof (window as any).cadCommand === 'function');
    expect(available).toBe(true);
  });

  test('add_cube returns UUID and increments object count', async ({ page }) => {
    const result = await apiCommand(page, 'add_cube', { size: 1.5 });
    expect(result.objectId).toBeDefined();
    expect(typeof result.objectId).toBe('string');
    // UUID v4 format
    expect(result.objectId).toMatch(/^[0-9a-f]{8}-/);
    expect(result.objectCount).toBe(1);
  });

  test('add_sphere returns UUID', async ({ page }) => {
    const result = await apiCommand(page, 'add_sphere', { size: 1.0 });
    expect(result.objectId).toBeDefined();
    expect(result.objectCount).toBe(1);
  });

  test('add_cylinder returns UUID', async ({ page }) => {
    const result = await apiCommand(page, 'add_cylinder', { radius: 0.5, height: 2.0 });
    expect(result.objectId).toBeDefined();
    expect(result.objectCount).toBe(1);
  });

  test('add_torus returns UUID', async ({ page }) => {
    const result = await apiCommand(page, 'add_torus', { majorRadius: 1.0, minorRadius: 0.3 });
    expect(result.objectId).toBeDefined();
    expect(result.objectCount).toBe(1);
  });

  test('multiple primitives accumulate', async ({ page }) => {
    await apiCommand(page, 'add_cube', { size: 1.0 });
    await apiCommand(page, 'add_sphere', { size: 0.8 });
    await apiCommand(page, 'add_cylinder', { radius: 0.3, height: 1.0 });
    const count = await getObjectCount(page);
    expect(count).toBe(3);
  });

  test('translate moves object without error', async ({ page }) => {
    const add = await apiCommand(page, 'add_cube', { size: 1.0 });
    const result = await apiCommand(page, 'translate', {
      objectId: add.objectId,
      dx: 2.0, dy: 1.0, dz: -0.5,
    });
    expect(result.error).toBeUndefined();
    expect(result.objectCount).toBe(1);
  });

  test('delete removes object', async ({ page }) => {
    const add = await apiCommand(page, 'add_cube', { size: 1.0 });
    expect(await getObjectCount(page)).toBe(1);

    await apiCommand(page, 'delete', { objectId: add.objectId });
    expect(await getObjectCount(page)).toBe(0);
  });

  test('clear removes all objects', async ({ page }) => {
    await apiCommand(page, 'add_cube', { size: 1.0 });
    await apiCommand(page, 'add_sphere', { size: 1.0 });
    expect(await getObjectCount(page)).toBe(2);

    await apiCommand(page, 'clear', {});
    expect(await getObjectCount(page)).toBe(0);
  });

  test('boolean_subtract produces result', async ({ page }) => {
    // Reload to get a fresh default cube (beforeEach clears the scene)
    await page.goto('/');
    await waitForWasm(page);
    // Direct WASM — booleans need render-initialized meshes from page load
    const result = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      const cubeId = ctrl.object_ids()[0];
      const cylId = ctrl.add_cylinder(0.25, 2.0);
      const resultId = ctrl.boolean_subtract(cubeId, cylId);
      return { resultId, count: ctrl.object_count() };
    });
    expect(result.resultId).toBeDefined();
    expect(result.count).toBe(1);
  });

  test('boolean_union merges two objects', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);
    const result = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      const cubeA = ctrl.object_ids()[0];
      const cubeB = ctrl.add_cube(0.5);
      ctrl.translate_object(cubeB, 0.7, 0, 0);
      const resultId = ctrl.boolean_union(cubeA, cubeB);
      return { resultId, count: ctrl.object_count() };
    });
    expect(result.resultId).toBeDefined();
    expect(result.count).toBe(1);
  });

  test('export_scene and import_scene round-trip', async ({ page }) => {
    await apiCommand(page, 'add_cube', { size: 1.0 });
    await apiCommand(page, 'add_sphere', { size: 0.8 });
    const idsBefore = await getObjectIds(page);
    expect(idsBefore).toHaveLength(2);

    const exportResult = await apiCommand(page, 'export_scene', {});
    expect(exportResult.scene).toBeDefined();

    await apiCommand(page, 'clear', {});
    expect(await getObjectCount(page)).toBe(0);

    await apiCommand(page, 'import_scene', { json: exportResult.scene });
    const idsAfter = await getObjectIds(page);
    expect(idsAfter).toHaveLength(2);
    // UUIDs are stable through export/import
    expect(idsAfter).toEqual(idsBefore);
  });

  test('buildUIState returns consistent state', async ({ page }) => {
    await apiCommand(page, 'add_cube', { size: 1.0 });
    const state = await page.evaluate(() => (window as any).buildUIState());
    expect(state.ready).toBe(true);
    expect(state.objectCount).toBe(1);
    expect(state.objectIds).toHaveLength(1);
    expect(typeof state.canUndo).toBe('boolean');
    expect(typeof state.canRedo).toBe('boolean');
  });

  test('unknown command type returns error', async ({ page }) => {
    const result = await apiCommand(page, 'nonexistent_command', {});
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Unknown command type');
  });
});
