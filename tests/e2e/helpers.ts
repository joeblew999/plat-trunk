import { Page, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

/** Hugo static asset directories */
export const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/hugo/static/screenshots');
export const VIDEOS_DIR = path.resolve(__dirname, '../../docs/hugo/static/videos');

/** Directory where example scene JSON files are saved */
export const EXAMPLES_DIR = path.resolve(__dirname, '../../web/gui/examples');

/** Env flags — all gated so normal test runs produce no side effects */
export const CAPTURE_SCREENSHOTS = !!process.env.SCREENSHOTS;
export const CAPTURE_EXAMPLES = !!process.env.EXAMPLES;
export const CAPTURE_VIDEOS = !!process.env.VIDEOS;
export const IS_SLOW = !!process.env.SLOW;

/** Pause between steps — short in fast mode, longer in slow/video mode */
export async function pause(page: Page) {
  await page.waitForTimeout(IS_SLOW ? 500 : 50);
}

// ─── Stable API: cadCommand is the ONLY way to drive tests ─────

/** Wait for WASM SceneController + cadCommand to be ready */
export async function waitForReady(page: Page) {
  await page.waitForFunction(
    () => (window as any).sceneController && typeof (window as any).cadCommand === 'function',
    { timeout: 30_000 },
  );
  await page.waitForTimeout(IS_SLOW ? 1000 : 50);
}
/** @deprecated Use waitForReady */
export const waitForWasm = waitForReady;

/** Execute via cadCommand — the ONE test entry point for mutations */
export async function apiCommand(
  page: Page,
  type: string,
  params: Record<string, unknown> = {},
  opts: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  return await page.evaluate(
    ({ t, p, o }) => (window as any).cadCommand(t, p, { source: 'test', ...o }),
    { t: type, p: params, o: opts },
  );
}

/** Read-only WASM queries (stable, lightweight) */
export async function getObjectCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const ctrl = window['sceneController'];
    return ctrl ? ctrl.object_count() : 0;
  });
}

export async function getObjectIds(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const ctrl = window['sceneController'];
    return ctrl ? ctrl.object_ids() : [];
  });
}

/** Get state from cadCommand (not Datastar signals) */
export async function getState(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => {
    const ctrl = (window as any).sceneController;
    if (!ctrl) return { ready: false };
    return (window as any).cadCommand('get_state', {}, { ephemeral: true, skipAutomerge: true });
  });
}

/** Canvas element locator (data-testid, not element ID) */
export function canvas(page: Page) {
  return page.locator('[data-testid="cad-canvas"]');
}

/** Click a toolbar button by its data-testid */
export async function clickToolbar(page: Page, testId: string) {
  await page.click(`[data-testid="${testId}"]`);
  await pause(page);
}

/** Click an outliner item by object ID */
export async function clickOutlinerItem(page: Page, objectId: string) {
  await page.click(`[data-testid="outliner-item"][data-oid="${objectId}"]`);
  await pause(page);
}

/** Wait for object count to reach expected (polls WASM, not signals) */
export async function waitForObjectCount(
  page: Page,
  expected: number,
  timeoutMs = 5_000,
): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const count = await getObjectCount(page);
    if (count === expected) return count;
    await page.waitForTimeout(100);
  }
  const actual = await getObjectCount(page);
  expect(actual, `object_count() did not reach ${expected} within ${timeoutMs}ms`).toBe(expected);
  return actual;
}

/** Wait for Automerge CadDocumentManager to fully initialize */
export async function waitForAutomerge(page: Page, timeoutMs = 10_000) {
  await page.waitForFunction(
    () => {
      const mgr = (window as any).cadDocManager;
      if (!mgr?.handle) return false;
      const doc = mgr.handle.docSync?.();
      return doc && doc.operations && doc.operations.length > 0;
    },
    { timeout: timeoutMs },
  );
}

// ─── Doc/screenshot helpers ────────────────────────────────────

export async function docScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${name}.png`),
    fullPage: false,
  });
}

export async function canvasScreenshot(page: Page, name: string) {
  const c = canvas(page);
  await c.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${name}.png`),
  });
}

export async function saveExample(page: Page, filename: string) {
  if (!CAPTURE_EXAMPLES) return;
  mkdirSync(EXAMPLES_DIR, { recursive: true });
  const json = await page.evaluate(() => window['sceneController'].export_scene());
  writeFileSync(path.join(EXAMPLES_DIR, `${filename}.json`), json, 'utf-8');
}

export async function saveVideo(page: Page, filename: string) {
  const video = page.video();
  if (!video) return;
  mkdirSync(VIDEOS_DIR, { recursive: true });
  await video.saveAs(path.join(VIDEOS_DIR, `${filename}.webm`));
}

export async function videoPause(page: Page, ms = 800) {
  await page.waitForTimeout(ms);
}
