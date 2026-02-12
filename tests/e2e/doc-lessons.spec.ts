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

    // Pause to show the initial scene
    await page.waitForTimeout(2000);

    // Show the UI panel — hover over elements
    await page.hover('#addCube');
    await page.waitForTimeout(500);
    await page.hover('#sizeParam');
    await page.waitForTimeout(500);

    // Add a cube
    await clickButton(page, 'addCube');
    await page.waitForTimeout(1500);

    await saveLesson(page, 'getting-started');
  });

  test('adding-primitives', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Add each primitive type with a pause between
    await setInput(page, 'sizeParam', '0.8');
    await page.waitForTimeout(500);

    await clickButton(page, 'addSphere');
    await page.waitForTimeout(1500);

    await clickButton(page, 'addCylinder');
    await page.waitForTimeout(1500);

    await clickButton(page, 'addTorus');
    await page.waitForTimeout(1500);

    // Show the object list
    await page.waitForTimeout(1000);

    await saveLesson(page, 'adding-primitives');
  });

  test('transforms', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Move the default cube
    await setInput(page, 'txVal', '1.5');
    await setInput(page, 'tyVal', '0');
    await setInput(page, 'tzVal', '0');
    await page.waitForTimeout(500);

    await clickButton(page, 'translateBtn');
    await page.waitForTimeout(2000);

    // Move it up
    await setInput(page, 'txVal', '0');
    await setInput(page, 'tyVal', '1.0');
    await setInput(page, 'tzVal', '0');
    await clickButton(page, 'translateBtn');
    await page.waitForTimeout(2000);

    await saveLesson(page, 'transforms');
  });

  test('boolean-subtract', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Start with default cube, add a cylinder to punch through it
    await page.waitForTimeout(1000);

    // Add cylinder (r=0.25, h=2.0) via evaluate for reliability
    await page.evaluate(() => {
      const ctrl = window['sceneController'];
      ctrl.add_cylinder(0.25, 2.0);
      if (window['updateObjectList']) window['updateObjectList']();
    });
    await page.waitForTimeout(1500);

    // Boolean subtract: cube - cylinder
    await setInput(page, 'boolA', '0');
    await setInput(page, 'boolB', '1');
    await page.waitForTimeout(500);

    await clickButton(page, 'boolSubtract');
    await page.waitForTimeout(2500);

    await saveLesson(page, 'boolean-subtract');
  });

  test('boolean-union', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Add a second smaller cube, offset it
    await setInput(page, 'sizeParam', '0.5');
    await clickButton(page, 'addCube');
    await page.waitForTimeout(1000);

    // Move the second cube (index 1)
    await page.evaluate(() => { window['selectedObject'] = 1; });
    await setInput(page, 'txVal', '0.7');
    await setInput(page, 'tyVal', '0');
    await setInput(page, 'tzVal', '0');
    await clickButton(page, 'translateBtn');
    await page.waitForTimeout(1500);

    // Union
    await setInput(page, 'boolA', '0');
    await setInput(page, 'boolB', '1');
    await page.waitForTimeout(500);

    await clickButton(page, 'boolUnion');
    await page.waitForTimeout(2500);

    await saveLesson(page, 'boolean-union');
  });

  test('save-and-load', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Add a sphere to make the scene interesting
    await clickButton(page, 'addSphere');
    await page.waitForTimeout(1000);

    // Save — show the save button click
    await page.hover('#saveBtn');
    await page.waitForTimeout(500);
    // Don't actually click save (triggers download dialog) — just show the hover
    await page.waitForTimeout(1500);

    // Show clear + load workflow concept
    await page.hover('#clearBtn');
    await page.waitForTimeout(500);
    await page.hover('#loadBtn');
    await page.waitForTimeout(1500);

    await saveLesson(page, 'save-and-load');
  });

  test('full-workflow', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Full workflow: create, transform, boolean, manage
    await page.waitForTimeout(1000);

    // Add sphere
    await setInput(page, 'sizeParam', '0.7');
    await clickButton(page, 'addSphere');
    await page.waitForTimeout(1000);

    // Add cylinder
    await setInput(page, 'sizeParam', '0.5');
    await clickButton(page, 'addCylinder');
    await page.waitForTimeout(1000);

    // Move cylinder
    await page.evaluate(() => { window['selectedObject'] = 2; });
    await setInput(page, 'txVal', '1.5');
    await setInput(page, 'tyVal', '0');
    await setInput(page, 'tzVal', '0');
    await clickButton(page, 'translateBtn');
    await page.waitForTimeout(1500);

    // Delete the cylinder
    await clickButton(page, 'deleteBtn');
    await page.waitForTimeout(1500);

    // Clear all
    await clickButton(page, 'clearBtn');
    await page.waitForTimeout(1500);

    await saveLesson(page, 'full-workflow');
  });
});
