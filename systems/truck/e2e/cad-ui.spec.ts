/**
 * UI Interaction Tests — verifies toolbar buttons, outliner clicks,
 * canvas interaction, properties panel.
 *
 * These tests verify that the GUI wires correctly to cadCommand().
 * All selectors use data-testid attributes (NOT element IDs).
 *
 * Run with:  npx playwright test --project=ui
 */
import { test, expect } from '@playwright/test';
import {
  waitForReady,
  getObjectCount,
  getObjectIds,
  apiCommand,
  clickToolbar,
  clickOutlinerItem,
  waitForObjectCount,
} from './helpers';

test.describe('Toolbar UI', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const modelId = `test-ui-${testInfo.testId}`;
    await page.goto(`/?model=${modelId}&reset=1`);
    await waitForReady(page);
  });

  test('toolbar buttons create objects (cube, sphere, cylinder, torus)', async ({ page }) => {
    const before = await getObjectCount(page);
    for (const shape of ['add-cube', 'add-sphere', 'add-cylinder', 'add-torus']) {
      await clickToolbar(page, shape);
    }
    expect(await getObjectCount(page)).toBe(before + 4);
  });

  test('toolbar delete button removes selected object', async ({ page }) => {
    const ids = await getObjectIds(page);
    await apiCommand(page, 'select', { id: ids[0] }, { ephemeral: true });
    await clickToolbar(page, 'delete');
    expect(await getObjectCount(page)).toBe(0);
  });

  test('toolbar clear button removes all objects', async ({ page }) => {
    await apiCommand(page, 'add_cube', { size: 1 });
    expect(await getObjectCount(page)).toBe(2);
    await clickToolbar(page, 'clear');
    expect(await getObjectCount(page)).toBe(0);
  });
});

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const modelId = `test-shortcuts-${testInfo.testId}`;
    await page.goto(`/?model=${modelId}&reset=1`);
    await waitForReady(page);
  });

  test('Escape deselects', async ({ page }) => {
    const ids = await getObjectIds(page);
    await apiCommand(page, 'select', { id: ids[0] }, { ephemeral: true });

    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () => (window as any).sceneController.get_interaction_mode() === 'idle',
      { timeout: 5_000 },
    );
  });

  test('Delete key removes selected object', async ({ page }) => {
    const ids = await getObjectIds(page);
    await apiCommand(page, 'select', { id: ids[0] }, { ephemeral: true });
    // Wait for selection to be reflected in Datastar (keyboard handler reads selectedId signal)
    await page.waitForFunction(
      () => !!(window as any)._ds?.root?.selectedId,
      { timeout: 5_000 },
    );

    await page.keyboard.press('Delete');
    await waitForObjectCount(page, 0);
  });
});

test.describe('Outliner UI', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const modelId = `test-outliner-${testInfo.testId}`;
    await page.goto(`/?model=${modelId}&reset=1`);
    await waitForReady(page);
  });

  test('outliner shows objects with data-oid', async ({ page }) => {
    await apiCommand(page, 'add_cube', { size: 1 });
    const ids = await getObjectIds(page);

    const items = page.locator('[data-testid="outliner-item"]');
    await expect(items).toHaveCount(ids.length);
  });

  test('outliner click selects object', async ({ page }) => {
    const ids = await getObjectIds(page);
    await clickOutlinerItem(page, ids[0]);

    const mode = await page.evaluate(() =>
      (window as any).sceneController.get_interaction_mode(),
    );
    expect(mode).toBe('selected');
  });

  test('outliner A+B selection for boolean', async ({ page }) => {
    await apiCommand(page, 'add_cube', { size: 1 });
    const ids = await getObjectIds(page);
    expect(ids.length).toBeGreaterThanOrEqual(2);

    // Clear auto-selection from add_cube, then select A → B
    await apiCommand(page, 'deselect', {}, { ephemeral: true });
    await apiCommand(page, 'select', { id: ids[0] }, { ephemeral: true });
    await apiCommand(page, 'select', { id: ids[1] }, { ephemeral: true });

    const state = await page.evaluate(() => {
      const r = (window as any)._ds?.root;
      return { boolSelA: r?.boolSelA, boolSelB: r?.boolSelB, boolReady: r?.boolReady };
    });
    expect(state.boolReady).toBe(true);
  });
});

test.describe('Properties Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);
  });

  test('shows when object selected, hides when deselected', async ({ page }) => {
    const propsPanel = page.locator('[data-testid="props-panel"]');
    const ids = await getObjectIds(page);

    // Select → panel visible (Datastar data-show sets display)
    await apiCommand(page, 'select', { id: ids[0] }, { ephemeral: true });
    await expect(propsPanel).toBeVisible();

    // Deselect → panel hidden (data-show="$selectedId" → display: none when '')
    await apiCommand(page, 'deselect', {}, { ephemeral: true });
    await expect(propsPanel).not.toBeVisible();
  });
});
