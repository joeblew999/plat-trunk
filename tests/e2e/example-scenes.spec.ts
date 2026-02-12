/**
 * Example Scene Generator — builds interesting CAD scenes via Playwright
 * and saves them as JSON files that users can load in the app.
 *
 * Run with:  npx playwright test --project=e2e -g "Generate Example"
 *
 * Generated files go to web/gui/examples/ and are served as static assets.
 * The examples/index.json manifest is also generated/updated.
 */
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { waitForWasm, clickButton, setInput, getObjectCount } from './helpers';

const EXAMPLES_DIR = path.resolve(__dirname, '../../web/gui/examples');

// Ensure output directory exists
mkdirSync(EXAMPLES_DIR, { recursive: true });

/** Export current scene as JSON and save to examples directory */
async function saveExample(
  page: import('@playwright/test').Page,
  filename: string,
  name: string,
  description: string,
) {
  const json = await page.evaluate(() => {
    return window['sceneController'].export_scene();
  });
  expect(json).toBeTruthy();

  const filePath = path.join(EXAMPLES_DIR, `${filename}.json`);
  writeFileSync(filePath, json, 'utf-8');
  console.log(`Example saved: ${filePath}`);

  return { filename: `${filename}.json`, name, description };
}

test.describe('Generate Example Scenes', () => {
  const manifest: Array<{ filename: string; name: string; description: string }> = [];

  test.afterAll(() => {
    // Write the manifest file
    const manifestPath = path.join(EXAMPLES_DIR, 'index.json');
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`Manifest saved: ${manifestPath}`);
  });

  test('default-cube', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Default scene has 1 cube — just export it
    expect(await getObjectCount(page)).toBe(1);

    const entry = await saveExample(page, 'default-cube', 'Default Cube', 'A single unit cube — the starting scene.');
    manifest.push(entry);
  });

  test('punched-cube', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Add a cylinder that overlaps the default cube
    // Use small radius to avoid coplanar issues
    await page.evaluate(() => {
      const ctrl = window['sceneController'];
      ctrl.add_cylinder(0.25, 2.0); // thin cylinder through cube center
    });
    await page.waitForTimeout(500);
    expect(await getObjectCount(page)).toBe(2);

    // Boolean subtract: cube - cylinder = punched cube
    const result = await page.evaluate(() => {
      const ctrl = window['sceneController'];
      return ctrl.boolean_subtract(0, 1);
    });
    await page.waitForTimeout(500);
    expect(result).toBeGreaterThanOrEqual(0);

    const entry = await saveExample(page, 'punched-cube', 'Punched Cube', 'A cube with a cylindrical hole through the center.');
    manifest.push(entry);
  });

  test('two-cubes-union', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Add second cube with offset
    await page.evaluate(() => {
      const ctrl = window['sceneController'];
      const idx = ctrl.add_cube(0.5);
      ctrl.translate_object(idx, 0.7, 0, 0);
    });
    await page.waitForTimeout(500);
    expect(await getObjectCount(page)).toBe(2);

    // Boolean union
    const result = await page.evaluate(() => {
      const ctrl = window['sceneController'];
      return ctrl.boolean_union(0, 1);
    });
    await page.waitForTimeout(500);
    expect(result).toBeGreaterThanOrEqual(0);

    const entry = await saveExample(page, 'two-cubes-union', 'Merged Cubes', 'Two overlapping cubes merged into one solid.');
    manifest.push(entry);
  });

  test('multi-shape', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Add sphere, cylinder, torus — all auto-offset
    await clickButton(page, 'addSphere');
    await clickButton(page, 'addCylinder');
    await clickButton(page, 'addTorus');
    await page.waitForTimeout(500);
    expect(await getObjectCount(page)).toBe(4);

    const entry = await saveExample(page, 'multi-shape', 'All Primitives', 'All four primitive shapes arranged in a row.');
    manifest.push(entry);
  });

  test('stacked-cubes', async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);

    // Add 2 more cubes, translate them up
    await page.evaluate(() => {
      const ctrl = window['sceneController'];
      const idx1 = ctrl.add_cube(1.0);
      ctrl.translate_object(idx1, 0, 1.0, 0);
      const idx2 = ctrl.add_cube(0.7);
      ctrl.translate_object(idx2, 0, 2.2, 0);
    });
    await page.waitForTimeout(500);
    expect(await getObjectCount(page)).toBe(3);

    const entry = await saveExample(page, 'stacked-cubes', 'Stacked Cubes', 'Three cubes stacked vertically in decreasing size.');
    manifest.push(entry);
  });
});
