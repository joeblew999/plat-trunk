/**
 * UI Interaction Tests — verifies toolbar buttons, outliner clicks,
 * canvas interaction, properties panel, and status bar.
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
  canvas,
  pause,
} from './helpers';

test.describe('Toolbar UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);
  });

  test('toolbar add-cube button creates object', async ({ page }) => {
    const before = await getObjectCount(page);
    await clickToolbar(page, 'add-cube');
    expect(await getObjectCount(page)).toBe(before + 1);
  });

  test('toolbar add-sphere button creates object', async ({ page }) => {
    const before = await getObjectCount(page);
    await clickToolbar(page, 'add-sphere');
    expect(await getObjectCount(page)).toBe(before + 1);
  });

  test('toolbar add-cylinder button creates object', async ({ page }) => {
    const before = await getObjectCount(page);
    await clickToolbar(page, 'add-cylinder');
    expect(await getObjectCount(page)).toBe(before + 1);
  });

  test('toolbar add-torus button creates object', async ({ page }) => {
    const before = await getObjectCount(page);
    await clickToolbar(page, 'add-torus');
    expect(await getObjectCount(page)).toBe(before + 1);
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
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);
  });

  test('Ctrl+Z undoes, Ctrl+Shift+Z redoes', async ({ page }) => {
    await apiCommand(page, 'add_cube', { size: 1 });
    expect(await getObjectCount(page)).toBe(2);

    await page.keyboard.press('Control+z');
    await pause(page);
    expect(await getObjectCount(page)).toBe(1);

    await page.keyboard.press('Control+Shift+z');
    await pause(page);
    expect(await getObjectCount(page)).toBe(2);
  });

  test('Escape deselects', async ({ page }) => {
    const ids = await getObjectIds(page);
    await apiCommand(page, 'select', { id: ids[0] }, { ephemeral: true });

    await page.keyboard.press('Escape');
    await pause(page);

    const mode = await page.evaluate(() =>
      (window as any).sceneController.get_interaction_mode(),
    );
    expect(mode).toBe('idle');
  });

  test('Delete key removes selected object', async ({ page }) => {
    const ids = await getObjectIds(page);
    await apiCommand(page, 'select', { id: ids[0] }, { ephemeral: true });

    await page.keyboard.press('Delete');
    await pause(page);
    expect(await getObjectCount(page)).toBe(0);
  });
});

test.describe('Outliner UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
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

    // Click first → A
    await clickOutlinerItem(page, ids[0]);
    // Click second → B
    await clickOutlinerItem(page, ids[1]);

    // Boolean button should be enabled (boolReady = true)
    const boolReady = await page.evaluate(() => (window as any)._ds?.root?.boolReady);
    expect(boolReady).toBe(true);
  });
});

test.describe('Canvas Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);
  });

  test('canvas click selects object (pick_at + select)', async ({ page }) => {
    const box = await canvas(page).boundingBox();
    expect(box).toBeTruthy();

    // Click center of canvas (should hit the default cube)
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await pause(page);

    const mode = await page.evaluate(() =>
      (window as any).sceneController.get_interaction_mode(),
    );
    expect(mode).toBe('selected');
  });

  test('Escape after canvas select deselects', async ({ page }) => {
    const box = await canvas(page).boundingBox();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await pause(page);

    await page.keyboard.press('Escape');
    await pause(page);

    const mode = await page.evaluate(() =>
      (window as any).sceneController.get_interaction_mode(),
    );
    expect(mode).toBe('idle');
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
    await pause(page);
    await expect(propsPanel).toBeVisible();

    // Deselect → panel hidden (data-show="$selectedId" → display: none when '')
    await apiCommand(page, 'deselect', {}, { ephemeral: true });
    await pause(page);
    await expect(propsPanel).not.toBeVisible();
  });
});

test.describe('Status Bar', () => {
  test('status bar is visible', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);
    const status = page.locator('[data-testid="status-bar"]');
    await expect(status).toBeVisible();
  });
});
