/**
 * Cross-Tab SSE Signal Sync — verifies that Datastar signals propagate
 * between browser tabs via the Worker SSE broadcast.
 *
 * Flow: Tab A action → cadCommand() POSTs state with broadcast:true
 *       → Worker sets pendingSignals → SSE loop sends datastar-patch-signals
 *       → Tab B's api-bridge applies signals to Datastar reactive store
 *
 * Note: Only UI signals sync (objectCount, canUndo, selectedId, etc.),
 * NOT the actual WASM scene. Each tab has its own SceneController.
 *
 * Run with:  npx playwright test --project=sync
 */
import { test, expect } from '@playwright/test';
import { waitForWasm, apiCommand } from './helpers';

/** Read a Datastar signal value from the page */
async function getSignal(page: import('@playwright/test').Page, key: string): Promise<unknown> {
  return page.evaluate((k) => {
    const ds = (window as any)._ds;
    return ds?.root?.[k] ?? null;
  }, key);
}

/** Wait for a Datastar signal to reach an expected value (with timeout) */
async function waitForSignal(
  page: import('@playwright/test').Page,
  key: string,
  expected: unknown,
  timeoutMs = 5000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const val = await getSignal(page, key);
    if (val === expected) return val;
    await page.waitForTimeout(100);
  }
  const actual = await getSignal(page, key);
  expect(actual, `Signal "${key}" did not reach ${expected} within ${timeoutMs}ms`).toBe(expected);
  return actual;
}

test.describe('Cross-Tab SSE Signal Sync', () => {
  test('signals propagate from Tab A to Tab B via Worker SSE', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const tabA = await context.newPage();
    const tabB = await context.newPage();

    // Load app in both tabs
    await tabA.goto('/');
    await waitForWasm(tabA);
    await tabB.goto('/');
    await waitForWasm(tabB);

    // Give SSE connections time to establish
    await tabA.waitForTimeout(2000);

    // Verify api-bridge and Datastar are ready on Tab B
    const bridgeReady = await tabB.evaluate(() => !!(window as any).apiBridge);
    expect(bridgeReady).toBe(true);
    const dsReady = await tabB.evaluate(() => !!(window as any)._ds?.root);
    expect(dsReady).toBe(true);

    // Both tabs start with 1 object (default cube)
    expect(await tabA.evaluate(() => (window as any).sceneController.object_count())).toBe(1);
    expect(await tabB.evaluate(() => (window as any).sceneController.object_count())).toBe(1);

    // --- Tab A: add a cube ---
    await apiCommand(tabA, 'add_cube', { size: 1.0 });
    expect(await tabA.evaluate(() => (window as any).sceneController.object_count())).toBe(2);

    // Tab B: Datastar objectCount signal should arrive via SSE
    await waitForSignal(tabB, 'objectCount', 2);

    // Tab B's own WASM scene is unchanged — only display signals sync
    expect(await tabB.evaluate(() => (window as any).sceneController.object_count())).toBe(1);

    // canUndo should also have been broadcast
    const tabBCanUndo = await getSignal(tabB, 'canUndo');
    expect(tabBCanUndo).toBe(true);

    // Add another shape — signals update again
    await apiCommand(tabA, 'add_sphere', { size: 0.8 });
    await waitForSignal(tabB, 'objectCount', 3);

    await context.close();
  });
});
