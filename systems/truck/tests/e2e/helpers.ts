import { Page, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { SCREENSHOTS_DIR, VIDEOS_DIR, EXAMPLES_DIR } from '../paths';
import cadSchema from '../../cad-schema.json';

/** Union of all valid CAD command names — derived from the committed schema.
 *  Rename a command in Rust → bun run build:truck → TypeScript error here. */
export type CadCommandName = keyof typeof cadSchema['commands'];

export { SCREENSHOTS_DIR, VIDEOS_DIR, EXAMPLES_DIR };

/** Env flags — all gated so normal test runs produce no side effects */
export const CAPTURE_SCREENSHOTS = !!process.env.SCREENSHOTS;
export const CAPTURE_EXAMPLES = !!process.env.EXAMPLES;
export const CAPTURE_VIDEOS = !!process.env.VIDEOS;
export const IS_SLOW = !!process.env.SLOW;
export const DOCS_MODE = !!process.env.DOCS;

/** @deprecated Use waitForObjectCount/waitForSelectedId/animationFrame instead. */
export async function pause(page: Page) {
  await page.waitForTimeout(IS_SLOW ? 500 : 50);
}

/** Pure animation delay — only for visual pauses (video recording, etc.) */
export async function animationFrame(page: Page) {
  await page.waitForTimeout(IS_SLOW ? 500 : 50);
}

// ─── Stable API: cadCommand is the ONLY way to drive tests ─────

/**
 * Wait for the app to be fully ready (ADR-0026 Phase 1).
 *
 * Checks the single `window.__appReady` flag set after ALL init phases complete:
 * WASM SceneController, cadCommand, Automerge cadDocManager.
 *
 * NO trailing sleep — if __appReady is true, the app is ready. Period.
 */
export async function waitForReady(page: Page) {
  await page.waitForFunction(
    () => (window as any).__appReady === true,
    { timeout: 30_000 },
  );
}
/** @deprecated Use waitForReady */
export const waitForWasm = waitForReady;

/**
 * Execute a cadCommand via the page — the ONE test entry point for mutations.
 *
 * Completion contract (ADR-0026):
 * - On return: WASM state is updated (object_count, object_ids, etc.)
 * - NOT on return: Automerge recording, Datastar reconcile, Lit re-render,
 *   SSE push, tier manager reaction, IndexedDB blob write.
 *
 * For WASM assertions: assert immediately after apiCommand().
 * For UI/Automerge/SSE assertions: use waitForObjectCount(), waitForSelectedId(), etc.
 */
export async function apiCommand(
  page: Page,
  type: CadCommandName,
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

/** Click a toolbar button by its data-testid — caller waits for the specific effect */
export async function clickToolbar(page: Page, testId: string) {
  await page.click(`[data-testid="${testId}"]`);
}

/** Click an outliner item by object ID — caller waits for the specific effect */
export async function clickOutlinerItem(page: Page, objectId: string) {
  await page.click(`[data-testid="outliner-item"][data-oid="${objectId}"]`);
}

/** Wait for object count to reach expected (polls WASM, not signals) */
export async function waitForObjectCount(
  page: Page,
  expected: number,
  timeoutMs = 15_000,
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

/** Wait for selection to match expected ID (polls WASM, not Datastar) */
export async function waitForSelectedId(page: Page, expectedId: string, timeoutMs = 5_000) {
  await page.waitForFunction(
    (id) => {
      const ctrl = (window as any).sceneController;
      return ctrl?.get_selected_id?.() === id;
    },
    expectedId,
    { timeout: timeoutMs },
  );
}

/** Wait for arbitrary WASM state condition */
export async function waitForWasmState(
  page: Page,
  checkFn: string,
  timeoutMs = 5_000,
) {
  await page.waitForFunction(new Function('return ' + checkFn) as () => boolean, { timeout: timeoutMs });
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

/** Get the Automerge document URL for sharing */
export async function getAutomergeUrl(page: Page): Promise<string> {
  return await page.evaluate(() => (window as any).cadDocManager.documentUrl);
}

// ─── Doc/screenshot helpers ────────────────────────────────────

/** Visual pause — only takes effect in DOCS mode */
export async function docPause(page: Page, ms = 800) {
  if (DOCS_MODE) await page.waitForTimeout(ms);
}

/** Screenshot at a named point — only in DOCS mode */
export async function docCapture(page: Page, name: string) {
  if (!DOCS_MODE) return;
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
}

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
  await page.close(); // finalize video recording
  mkdirSync(VIDEOS_DIR, { recursive: true });
  await video.saveAs(path.join(VIDEOS_DIR, `${filename}.webm`));
}

export async function videoPause(page: Page, ms = 800) {
  await page.waitForTimeout(ms);
}
