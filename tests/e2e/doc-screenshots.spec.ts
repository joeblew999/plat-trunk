/**
 * Doc Screenshots — generates screenshots used in the user guide.
 *
 * Run with:  bun run screenshots   (or: npx playwright test --project=screenshots)
 *
 * Screenshots are saved to web/gui/docs/screenshots/ and served on the same domain.
 * When you update features, re-run this to keep docs up to date.
 *
 * Scene setup uses apiCommand() — the unified command dispatcher — so screenshots
 * don't break when button IDs or input names change.
 */
import { test } from '@playwright/test';
import {
  waitForWasm,
  apiCommand,
  docScreenshot,
  canvasScreenshot,
} from './helpers';

test.describe('Documentation Screenshots', () => {
  test('generate all doc screenshots', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // 1. Empty-ish scene — default cube on load
    await docScreenshot(page, '01-initial-scene');

    // 2. Add primitives via unified command path
    await apiCommand(page, 'add_sphere', { size: 0.8 });
    await page.waitForTimeout(300);
    await docScreenshot(page, '02-add-sphere');

    await apiCommand(page, 'add_cylinder', { radius: 0.4, height: 0.8 });
    await page.waitForTimeout(300);
    await docScreenshot(page, '03-add-cylinder');

    await apiCommand(page, 'add_torus', { majorRadius: 0.8, minorRadius: 0.24 });
    await page.waitForTimeout(300);
    await docScreenshot(page, '04-multiple-primitives');

    // 3. Transform — move first object to the right
    const ids = await page.evaluate(() => window['sceneController']?.object_ids() || []);
    if (ids.length > 0) {
      await apiCommand(page, 'translate', { objectId: ids[0], dx: 2.0, dy: 0, dz: 0 });
    }
    await page.waitForTimeout(300);
    await docScreenshot(page, '05-translate');

    // 4. Boolean operations — cube minus cylinder (punched cube)
    await apiCommand(page, 'clear', {});
    await page.waitForTimeout(300);

    const cubeResult = await apiCommand(page, 'add_cube', { size: 1.0 });
    await page.waitForTimeout(300);

    const cylResult = await apiCommand(page, 'add_cylinder', { radius: 0.5, height: 1.0 });
    await page.waitForTimeout(300);
    await docScreenshot(page, '06-boolean-setup');

    // Boolean subtract using object IDs from command results
    const boolIds = await page.evaluate(() => window['sceneController']?.object_ids() || []);
    if (boolIds.length >= 2) {
      await apiCommand(page, 'boolean_subtract', { idA: boolIds[0], idB: boolIds[1] });
    }
    await page.waitForTimeout(500);
    await docScreenshot(page, '07-boolean-subtract');

    // 5. Save/Load
    await docScreenshot(page, '08-save-load');

    // 6. Full UI overview — fresh scene with several objects
    await apiCommand(page, 'clear', {});
    await page.waitForTimeout(300);
    await apiCommand(page, 'add_cube', { size: 1.0 });
    await apiCommand(page, 'add_sphere', { size: 0.7 });
    await apiCommand(page, 'add_cylinder', { radius: 0.25, height: 0.5 });
    await page.waitForTimeout(500);
    await docScreenshot(page, '09-ui-overview');

    // Canvas-only shots (no UI panel)
    await canvasScreenshot(page, '10-canvas-render');
  });
});
