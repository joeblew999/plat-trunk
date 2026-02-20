import { test, expect } from '@playwright/test';
import { waitForReady, getObjectCount, getObjectIds, apiCommand, pause } from './helpers';
import fs from 'fs';
import path from 'path';

test.describe('BIM / IFC Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);
    // Clear default cube
    await apiCommand(page, 'clear');
  });

  test('import IFC and verify BIM metadata', async ({ page }) => {
    const ifcPath = path.resolve(__dirname, '../../.src/ifc-lite/tests/models/ara3d/AC20-FZK-Haus.ifc');
    const ifcData = fs.readFileSync(ifcPath, 'utf-8');

    // 1. Import IFC
    const result = await apiCommand(page, 'import_ifc', { data: ifcData });
    expect(result.success).toBe(true);
    expect(result.meshCount).toBeGreaterThan(0);

    // 2. Wait for objects to be registered in WASM
    const count = await getObjectCount(page);
    expect(count).toBe(result.meshCount);

    // 3. Select the first imported object
    const ids = await getObjectIds(page);
    await apiCommand(page, 'select', { id: ids[0] });
    await pause(page);

    // 4. Verify BIM metadata in UI signals
    const bimType = await page.evaluate(() => (window as any)._ds.root.bimType);
    const bimId = await page.evaluate(() => (window as any)._ds.root.bimId);

    expect(bimType).toBeTruthy();
    expect(bimId).toBeTruthy();
    // GlobalId in IFC is 22 chars long
    expect(bimId.length).toBe(22);

    // 5. Verify UI display
    const propsPanel = page.locator('[data-testid="props-panel"]');
    await expect(propsPanel).toBeVisible();
    await expect(propsPanel.locator('text=BIM')).toBeVisible();
    await expect(propsPanel.locator(`text=${bimType}`)).toBeVisible();
    await expect(propsPanel.locator(`text=${bimId}`)).toBeVisible();

    // 6. Verify BIM hierarchy in Automerge document
    const hierarchy = await page.evaluate(() => {
      const mgr = (window as any).cadDocManager;
      if (!mgr?.handle) return null;
      return mgr.handle.docSync().bimHierarchy;
    });

    expect(hierarchy).toBeTruthy();
    expect(Object.keys(hierarchy).length).toBeGreaterThan(0);
    
    // Find our selected object in the hierarchy
    const node = Object.values(hierarchy as any).find((n: any) => n.id === ids[0]) as any;
    expect(node).toBeTruthy();
    expect(node.globalId).toBe(bimId);
    expect(node.type).toBe(bimType);
  });
});
