import { Page, expect } from '@playwright/test';
import path from 'path';

/** Directory where doc screenshots are saved */
export const SCREENSHOTS_DIR = path.resolve(__dirname, '../../web/gui/docs/screenshots');

/** Directory where lesson videos are saved */
export const LESSONS_DIR = path.resolve(__dirname, '../../web/gui/docs/lessons');

/** Wait for the WASM SceneController to be ready */
export async function waitForWasm(page: Page) {
  // Wait for the module to load and SceneController to be available
  await page.waitForFunction(() => window['sceneController'] !== undefined, {
    timeout: 30_000,
  });
  // Give the first render a moment to complete
  await page.waitForTimeout(1000);
}

/** Click a button by its ID and wait for the scene to update */
export async function clickButton(page: Page, id: string) {
  await page.click(`#${id}`);
  // Allow the WASM scene to re-render
  await page.waitForTimeout(500);
}

/** Set an input value by ID */
export async function setInput(page: Page, id: string, value: string) {
  await page.fill(`#${id}`, value);
}

/** Take a screenshot of the viewport (canvas area) and save for docs */
export async function docScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${name}.png`),
    fullPage: false,
  });
}

/** Take a screenshot of just the canvas */
export async function canvasScreenshot(page: Page, name: string) {
  const canvas = page.locator('#cad-canvas');
  await canvas.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${name}.png`),
  });
}

/** Get the object count from the scene */
export async function getObjectCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const ctrl = window['sceneController'];
    return ctrl ? ctrl.object_count() : 0;
  });
}

/** Get all object UUIDs from the scene */
export async function getObjectIds(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const ctrl = window['sceneController'];
    return ctrl ? ctrl.object_ids() : [];
  });
}

/** Add a primitive via WASM and return its UUID */
export async function addPrimitive(page: Page, type: string, params: Record<string, number> = {}): Promise<string> {
  return await page.evaluate(({ type, params }) => {
    const ctrl = window['sceneController'];
    switch (type) {
      case 'cube': return ctrl.add_cube(params.size || 1.0);
      case 'sphere': return ctrl.add_sphere(params.radius || 1.0);
      case 'cylinder': return ctrl.add_cylinder(params.radius || 0.5, params.height || 1.0);
      case 'torus': return ctrl.add_torus(params.majorRadius || 1.0, params.minorRadius || 0.3);
      default: throw new Error(`Unknown type: ${type}`);
    }
  }, { type, params });
}
