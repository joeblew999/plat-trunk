import { test, expect } from '@playwright/test';
import { waitForWasm, clickButton, setInput, getObjectCount } from './helpers';

test.describe('CAD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);
  });

  test('page loads with WebGPU canvas', async ({ page }) => {
    const canvas = page.locator('#cad-canvas');
    await expect(canvas).toBeVisible();
    // Default scene starts with 1 cube
    const count = await getObjectCount(page);
    expect(count).toBe(1);
  });

  test('add primitives', async ({ page }) => {
    // Start with default cube (index 0)
    expect(await getObjectCount(page)).toBe(1);

    // Add sphere
    await setInput(page, 'sizeParam', '0.8');
    await clickButton(page, 'addSphere');
    expect(await getObjectCount(page)).toBe(2);

    // Add cylinder
    await clickButton(page, 'addCylinder');
    expect(await getObjectCount(page)).toBe(3);

    // Add torus
    await clickButton(page, 'addTorus');
    expect(await getObjectCount(page)).toBe(4);
  });

  test('translate object', async ({ page }) => {
    // Move the default cube
    await setInput(page, 'txVal', '1.0');
    await setInput(page, 'tyVal', '0');
    await setInput(page, 'tzVal', '0');
    await clickButton(page, 'translateBtn');

    // Object should still exist
    expect(await getObjectCount(page)).toBe(1);
  });

  test('boolean subtract (cube - cylinder)', async ({ page }) => {
    // Add a small cylinder through the cube (r=0.25, h=2.0)
    // Must not be coplanar with cube faces — smaller radius works reliably
    const result = await page.evaluate(() => {
      const ctrl = window['sceneController'];
      ctrl.add_cylinder(0.25, 2.0);
      const r = ctrl.boolean_subtract(0, 1);
      if (window['updateObjectList']) window['updateObjectList']();
      return { result: r, count: ctrl.object_count() };
    });
    expect(result.result).toBeGreaterThanOrEqual(0);
    expect(result.count).toBe(1);
  });

  test('boolean union (cube + cube)', async ({ page }) => {
    // Add a smaller cube and offset it
    await setInput(page, 'sizeParam', '0.5');
    await clickButton(page, 'addCube');
    expect(await getObjectCount(page)).toBe(2);

    await page.evaluate(() => { window['selectedObject'] = 1; });
    await setInput(page, 'txVal', '0.7');
    await setInput(page, 'tyVal', '0');
    await setInput(page, 'tzVal', '0');
    await clickButton(page, 'translateBtn');

    await setInput(page, 'boolA', '0');
    await setInput(page, 'boolB', '1');
    await clickButton(page, 'boolUnion');
    await page.waitForTimeout(500);

    expect(await getObjectCount(page)).toBe(1);
  });

  test('delete and clear scene', async ({ page }) => {
    // Add a second cube
    await clickButton(page, 'addCube');
    expect(await getObjectCount(page)).toBe(2);

    // Delete selected (index 0)
    await clickButton(page, 'deleteBtn');
    expect(await getObjectCount(page)).toBe(1);

    // Clear all
    await clickButton(page, 'clearBtn');
    expect(await getObjectCount(page)).toBe(0);
  });

  test('undo and redo', async ({ page }) => {
    // Start with default cube
    expect(await getObjectCount(page)).toBe(1);

    // Add sphere (2 objects)
    await clickButton(page, 'addSphere');
    expect(await getObjectCount(page)).toBe(2);

    // Undo — sphere should be gone
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);
    expect(await getObjectCount(page)).toBe(1);

    // Redo — sphere should come back
    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(500);
    expect(await getObjectCount(page)).toBe(2);

    // Add cylinder (3 objects), then undo twice to get back to 1
    await clickButton(page, 'addCylinder');
    expect(await getObjectCount(page)).toBe(3);

    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);
    expect(await getObjectCount(page)).toBe(2);

    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);
    expect(await getObjectCount(page)).toBe(1);
  });

  test('save and load scene', async ({ page }) => {
    // Add a sphere
    await clickButton(page, 'addSphere');
    expect(await getObjectCount(page)).toBe(2);

    // Export scene JSON
    const json = await page.evaluate(() => {
      return window['sceneController'].export_scene();
    });
    expect(json).toBeTruthy();
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);

    // Clear and re-import
    await clickButton(page, 'clearBtn');
    expect(await getObjectCount(page)).toBe(0);

    await page.evaluate((sceneJson) => {
      window['sceneController'].import_scene(sceneJson);
      if (window['updateObjectList']) window['updateObjectList']();
    }, json);
    await page.waitForTimeout(500);
    expect(await getObjectCount(page)).toBe(2);
  });
});
