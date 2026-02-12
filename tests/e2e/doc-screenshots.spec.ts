/**
 * Doc Screenshots — generates screenshots used in the user guide.
 *
 * Run with:  bun run screenshots   (or: npx playwright test --project=screenshots)
 *
 * Screenshots are saved to web/gui/docs/screenshots/ and served on the same domain.
 * When you update features, re-run this to keep docs up to date.
 */
import { test } from '@playwright/test';
import {
  waitForWasm,
  clickButton,
  setInput,
  docScreenshot,
  canvasScreenshot,
} from './helpers';

test.describe('Documentation Screenshots', () => {
  test('generate all doc screenshots', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // 1. Empty-ish scene — default cube on load
    await docScreenshot(page, '01-initial-scene');

    // 2. Add primitives
    await setInput(page, 'sizeParam', '0.8');
    await clickButton(page, 'addSphere');
    await page.waitForTimeout(300);
    await docScreenshot(page, '02-add-sphere');

    await clickButton(page, 'addCylinder');
    await page.waitForTimeout(300);
    await docScreenshot(page, '03-add-cylinder');

    await clickButton(page, 'addTorus');
    await page.waitForTimeout(300);
    await docScreenshot(page, '04-multiple-primitives');

    // 3. Transform — move cube to the right
    await page.evaluate(() => { window['selectedObject'] = 0; });
    await setInput(page, 'txVal', '2.0');
    await setInput(page, 'tyVal', '0');
    await setInput(page, 'tzVal', '0');
    await clickButton(page, 'translateBtn');
    await page.waitForTimeout(300);
    await docScreenshot(page, '05-translate');

    // 4. Boolean operations — cube minus cylinder (punched cube)
    await clickButton(page, 'clearBtn');
    await page.waitForTimeout(300);

    await setInput(page, 'sizeParam', '1.0');
    await clickButton(page, 'addCube');
    await page.waitForTimeout(300);

    await setInput(page, 'sizeParam', '1.0');
    await clickButton(page, 'addCylinder');
    await page.waitForTimeout(300);
    await docScreenshot(page, '06-boolean-setup');

    // Boolean subtract: cube - cylinder
    await setInput(page, 'boolA', '0');
    await setInput(page, 'boolB', '1');
    await clickButton(page, 'boolSubtract');
    await page.waitForTimeout(500);
    await docScreenshot(page, '07-boolean-subtract');

    // 5. Save/Load
    await docScreenshot(page, '08-save-load');

    // 6. Full UI overview — fresh scene with several objects
    await clickButton(page, 'clearBtn');
    await page.waitForTimeout(300);
    await setInput(page, 'sizeParam', '1.0');
    await clickButton(page, 'addCube');
    await setInput(page, 'sizeParam', '0.7');
    await clickButton(page, 'addSphere');
    await setInput(page, 'sizeParam', '0.5');
    await clickButton(page, 'addCylinder');
    await page.waitForTimeout(500);
    await docScreenshot(page, '09-ui-overview');

    // Canvas-only shots (no UI panel)
    await canvasScreenshot(page, '10-canvas-render');
  });
});
