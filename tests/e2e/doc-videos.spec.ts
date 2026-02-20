/**
 * Doc video recordings — each test produces a .webm for a Hugo user guide page.
 *
 * Videos:
 *   getting-started.webm   → docs/user/getting-started.md
 *   adding-primitives.webm → docs/user/creating-shapes.md
 *   transforms.webm        → docs/user/moving-objects.md
 *   boolean-subtract.webm  → docs/user/boolean-operations.md
 *   save-and-load.webm     → docs/user/save-load.md
 *
 * Run: xplat task truck:test:videos
 *   or: cd tests && bun x playwright test --project=docs
 */
import { test } from '@playwright/test';
import { mkdirSync } from 'fs';
import path from 'path';
import {
  waitForReady, apiCommand, videoPause, canvas,
  getObjectIds, VIDEOS_DIR,
} from './helpers';

test.describe.configure({ mode: 'serial' });

test.describe('Doc Videos', () => {
  // Save video after each test — must close page first so Playwright finalizes the recording
  test.afterEach(async ({ page }, testInfo) => {
    const video = page.video();
    await page.close();
    if (video) {
      mkdirSync(VIDEOS_DIR, { recursive: true });
      await video.saveAs(path.join(VIDEOS_DIR, `${testInfo.title}.webm`));
    }
  });

  test('getting-started', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);
    await videoPause(page, 1500);

    const box = await canvas(page).boundingBox();
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.move(cx, cy);
      await videoPause(page, 500);
      await page.mouse.down();
      for (let i = 0; i < 20; i++) {
        await page.mouse.move(cx + i * 4, cy - i * 2, { steps: 2 });
        await page.waitForTimeout(30);
      }
      await page.mouse.up();
      await videoPause(page, 500);

      await page.mouse.click(cx, cy);
      await videoPause(page, 1000);

      await page.mouse.wheel(0, -200);
      await videoPause(page, 500);
      await page.mouse.wheel(0, 200);
      await videoPause(page, 1000);
    }
  });

  test('adding-primitives', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);
    await videoPause(page, 1000);

    await apiCommand(page, 'add_cube', { size: 1.0 });
    await videoPause(page, 1000);

    await apiCommand(page, 'add_sphere', { radius: 0.8 });
    await videoPause(page, 1000);

    await apiCommand(page, 'add_cylinder', { radius: 0.4, height: 1.0 });
    await videoPause(page, 1000);

    await apiCommand(page, 'add_torus', { majorRadius: 0.8, minorRadius: 0.25 });
    await videoPause(page, 1500);
  });

  test('transforms', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);
    await videoPause(page, 800);

    const ids = await getObjectIds(page);
    const cubeId = ids[0];

    await apiCommand(page, 'translate', { objectId: cubeId, dx: 1.5, dy: 0, dz: 0 });
    await videoPause(page, 1000);

    await apiCommand(page, 'translate', { objectId: cubeId, dx: 0, dy: 1.0, dz: 0 });
    await videoPause(page, 1000);

    await apiCommand(page, 'translate', { objectId: cubeId, dx: 0, dy: 0, dz: -1.0 });
    await videoPause(page, 1000);

    await apiCommand(page, 'translate', { objectId: cubeId, dx: -1.5, dy: -1.0, dz: 1.0 });
    await videoPause(page, 1000);
  });

  test('boolean-subtract', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);
    await videoPause(page, 800);

    const ids = await getObjectIds(page);
    const cubeId = ids[0];
    await videoPause(page, 800);

    const cylResult = await apiCommand(page, 'add_cylinder', { radius: 0.25, height: 2.0 });
    const cylId = cylResult.objectId as string;
    await videoPause(page, 1200);

    await apiCommand(page, 'boolean_subtract', { idA: cubeId, idB: cylId });
    await videoPause(page, 1500);

    const box = await canvas(page).boundingBox();
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.down({ button: 'left' });
      for (let i = 0; i < 30; i++) {
        await page.mouse.move(cx + i * 5, cy + i * 2, { steps: 2 });
        await page.waitForTimeout(30);
      }
      await page.mouse.up();
      await videoPause(page, 1500);
    }
  });

  test('save-and-load', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);
    await videoPause(page, 800);

    await apiCommand(page, 'add_sphere', { radius: 0.8 });
    await videoPause(page, 800);

    await apiCommand(page, 'add_cylinder', { radius: 0.3, height: 1.0 });
    await videoPause(page, 800);

    const exportResult = await apiCommand(page, 'export_scene');
    const json = exportResult.scene as string;
    await videoPause(page, 1000);

    await apiCommand(page, 'clear');
    await videoPause(page, 1200);

    await apiCommand(page, 'import_scene', { json });
    await videoPause(page, 1500);
  });
});
