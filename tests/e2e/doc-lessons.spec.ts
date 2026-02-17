/**
 * Doc Lessons — records walkthrough videos used in the user guide.
 *
 * Run with:  npx playwright test --project=lessons
 *
 * Each test = one lesson video. Playwright records the full browser session.
 * After recording, videos are copied to web/gui/docs/lessons/ and served
 * on the same domain alongside the app.
 *
 * Naming: use topic-based names (not numbered) so adding/reordering lessons
 * doesn't break existing URLs. The display order is controlled by the docs
 * drawer in index.html, not by file names.
 *
 * Re-run when features change to keep lesson videos up to date.
 */
import { test } from '@playwright/test';
import { mkdirSync } from 'fs';
import path from 'path';
import {
  waitForWasm,
  clickButton,
  setInput,
  getObjectIds,
  LESSONS_DIR,
} from './helpers';

// Ensure output directory exists
mkdirSync(LESSONS_DIR, { recursive: true });

/** Copy the auto-recorded video to the lessons folder with a clean name */
async function saveLesson(page: import('@playwright/test').Page, name: string) {
  // Close page to finalize the video, then wait for the saved path
  await page.close();
  await page.video()?.saveAs(path.join(LESSONS_DIR, `${name}.webm`));
  console.log(`Lesson saved: ${path.join(LESSONS_DIR, `${name}.webm`)}`);
}

test.describe('Lesson Videos', () => {
  test('getting-started', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Show empty scene
    await page.waitForTimeout(1500);

    // Create a cube — the first object
    await clickButton(page, 'addCube');
    await page.waitForTimeout(2000);

    // Add a sphere next to it (auto-offset places it overlapping)
    await clickButton(page, 'addSphere');
    await page.waitForTimeout(2000);

    // Show the scene list
    await page.waitForTimeout(1000);

    await saveLesson(page, 'getting-started');
  });

  test('adding-primitives', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Create all 4 primitive types — auto-offset spreads them out
    await clickButton(page, 'addCube');
    await page.waitForTimeout(1500);

    await clickButton(page, 'addSphere');
    await page.waitForTimeout(1500);

    await clickButton(page, 'addCylinder');
    await page.waitForTimeout(1500);

    await clickButton(page, 'addTorus');
    await page.waitForTimeout(2000);

    // Scene now has 4 objects spread along X axis
    await page.waitForTimeout(1000);

    await saveLesson(page, 'adding-primitives');
  });

  test('transforms', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Start with default cube
    await page.waitForTimeout(1000);

    // Move it far right
    await setInput(page, 'txVal', '2.0');
    await setInput(page, 'tyVal', '0');
    await setInput(page, 'tzVal', '0');
    await clickButton(page, 'translateBtn');
    await page.waitForTimeout(1500);

    // Move it up
    await setInput(page, 'txVal', '0');
    await setInput(page, 'tyVal', '2.0');
    await setInput(page, 'tzVal', '0');
    await clickButton(page, 'translateBtn');
    await page.waitForTimeout(1500);

    // Move it forward
    await setInput(page, 'txVal', '0');
    await setInput(page, 'tyVal', '0');
    await setInput(page, 'tzVal', '2.0');
    await clickButton(page, 'translateBtn');
    await page.waitForTimeout(2000);

    await saveLesson(page, 'transforms');
  });

  test('boolean-subtract', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Show the cube alone first
    await page.waitForTimeout(1500);

    // Add a cylinder — auto-offset places it partially inside the cube
    await clickButton(page, 'addCylinder');
    await page.waitForTimeout(2000);

    // Show both objects overlapping (pause so viewer sees the "before")
    await page.waitForTimeout(1500);

    // Set up boolean selection: A = cube, B = cylinder
    const ids = await getObjectIds(page);
    await page.evaluate(({ a, b }) => {
      (window as any).boolSelA = a;
      (window as any).boolSelB = b;
    }, { a: ids[0], b: ids[1] });
    await page.waitForTimeout(800);

    // SUBTRACT — punch the cylinder out of the cube
    await clickButton(page, 'boolSubtract');
    await page.waitForTimeout(3000);

    await saveLesson(page, 'boolean-subtract');
  });

  test('boolean-union', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Show the cube alone first
    await page.waitForTimeout(1500);

    // Add a second cube — auto-offset places it overlapping
    await clickButton(page, 'addCube');
    await page.waitForTimeout(2000);

    // Show both cubes overlapping (pause so viewer sees the "before")
    await page.waitForTimeout(1500);

    // Set up boolean selection: A = first cube, B = second cube
    const ids = await getObjectIds(page);
    await page.evaluate(({ a, b }) => {
      (window as any).boolSelA = a;
      (window as any).boolSelB = b;
    }, { a: ids[0], b: ids[1] });
    await page.waitForTimeout(800);

    // UNION — merge the two cubes into one solid
    await clickButton(page, 'boolUnion');
    await page.waitForTimeout(3000);

    await saveLesson(page, 'boolean-union');
  });

  test('save-and-load', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Build an interesting scene: cube + sphere
    await clickButton(page, 'addSphere');
    await page.waitForTimeout(1500);

    // Hover save button to highlight it
    await page.hover('#saveBtn');
    await page.waitForTimeout(1000);

    // Hover clear button
    await page.hover('#clearBtn');
    await page.waitForTimeout(1000);

    // Hover load button
    await page.hover('#loadBtn');
    await page.waitForTimeout(2000);

    await saveLesson(page, 'save-and-load');
  });

  test('full-workflow', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);
    await page.waitForTimeout(1000);

    // Step 1: Add a sphere
    await clickButton(page, 'addSphere');
    await page.waitForTimeout(1500);

    // Step 2: Add a cylinder (auto-offset overlaps with sphere)
    await clickButton(page, 'addCylinder');
    await page.waitForTimeout(1500);

    // Step 3: Move the cylinder up — select it first by UUID
    const ids = await getObjectIds(page);
    // ids: [defaultCube, sphere, cylinder]
    const cylinderId = ids[ids.length - 1];
    await page.evaluate((id) => { (window as any).selectedObjectId = id; }, cylinderId);
    await setInput(page, 'txVal', '0');
    await setInput(page, 'tyVal', '1.0');
    await setInput(page, 'tzVal', '0');
    await clickButton(page, 'translateBtn');
    await page.waitForTimeout(2000);

    // Step 4: Boolean subtract — punch cylinder from cube
    await page.evaluate(({ a, b }) => {
      (window as any).boolSelA = a;
      (window as any).boolSelB = b;
    }, { a: ids[0], b: cylinderId });
    await page.waitForTimeout(500);
    await clickButton(page, 'boolSubtract');
    await page.waitForTimeout(2500);

    // Step 5: Delete the sphere
    const idsAfterBool = await getObjectIds(page);
    // Find the sphere (still in scene after boolean consumed cube + cylinder)
    const sphereId = idsAfterBool.find((id: string) => id !== idsAfterBool[0]) || idsAfterBool[1];
    if (sphereId) {
      await page.evaluate((id) => { (window as any).selectedObjectId = id; }, sphereId);
      await clickButton(page, 'deleteBtn');
      await page.waitForTimeout(1500);
    }

    // Step 6: Clear all
    await clickButton(page, 'clearBtn');
    await page.waitForTimeout(1500);

    await saveLesson(page, 'full-workflow');
  });
});
