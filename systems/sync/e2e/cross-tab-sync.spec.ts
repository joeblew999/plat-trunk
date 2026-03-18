/**
 * Cross-Tab Scene Sync — verifies that WASM scene state propagates between
 * browser tabs via CRDT BroadcastChannel (live) and IDB (on reload).
 *
 * Architecture (ADR-0008 SyncClient):
 *   Tab A records an op → SyncClient.addOp() → IdbStorageAdapter.save()
 *                       → BroadcastChannelSync.send() → Tab B receives
 *   Tab B SyncClient receives broadcast → merge_docs → onRemoteOps → replay
 *
 * Test order matters: Tab B must open BEFORE Tab A changes (BroadcastChannel
 * only delivers to already-open listeners).
 *
 * Lives in systems/sync/e2e/ — sync owns cross-tab behaviour, not truck.
 */
import { test, expect, type Page } from '@playwright/test';

// ── Minimal helpers (sync e2e is self-contained — no truck dep) ───────────────

async function waitForReady(page: Page): Promise<void> {
  await page.waitForFunction(() => !!(window as any).sceneController, { timeout: 30_000 });
}

async function waitForAutomerge(page: Page): Promise<void> {
  await page.waitForFunction(
    () => !!(window as any).cadDocManager?._sync?.modelId,
    { timeout: 10_000 },
  );
}

async function waitForObjectCount(page: Page, count: number, timeout = 8_000): Promise<void> {
  await page.waitForFunction(
    (n) => {
      const ids = (window as any).moduleRouter?.query('objectIds');
      return Array.isArray(ids) && ids.length === n;
    },
    count,
    { timeout },
  );
}

async function apiCommand(page: Page, type: string, params: Record<string, unknown>): Promise<void> {
  await page.evaluate(
    ({ type, params }) => (window as any).cadCommand(type, params),
    { type, params },
  );
}

test.describe('Cross-Tab Scene Sync', () => {
  test('BroadcastChannel: Tab A change appears in Tab B immediately', async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    // Unique model per test run — ?reset=1 wipes IDB for clean state
    const modelId = `sync-bc-${testInfo.testId}`;

    // Tab B opens FIRST — must be listening before Tab A makes changes
    const tabB = await context.newPage();
    await tabB.goto(`/?model=${modelId}&reset=1`);
    await waitForReady(tabB);
    await waitForAutomerge(tabB);

    // Tab A opens (reads same model from IDB, both start at 1 default cube)
    const tabA = await context.newPage();
    await tabA.goto(`/?model=${modelId}`);
    await waitForReady(tabA);
    await waitForAutomerge(tabA);

    await waitForObjectCount(tabA, 1);
    await waitForObjectCount(tabB, 1);

    // Tab A adds a cube → record() writes to IDB and broadcasts
    await apiCommand(tabA, 'add_cube', { size: 1.0 });
    await waitForObjectCount(tabA, 2);

    // Wait for SyncClient to finish saving + broadcasting
    await tabA.waitForFunction(
      () => (window as any).cadDocManager?._sync?.syncLog?.some(
        (e: any) => e.event === 'save_storage'
      ),
      { timeout: 5_000 },
    );

    // Tab B receives via BroadcastChannel → merge_docs → replay → 2 objects
    await waitForObjectCount(tabB, 2, 10_000);

    await context.close();
  });

  test('BroadcastChannel: undo on Tab A propagates to Tab B', async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const modelId = `sync-undo-${testInfo.testId}`;

    // Tab B opens first
    const tabB = await context.newPage();
    await tabB.goto(`/?model=${modelId}&reset=1`);
    await waitForReady(tabB);
    await waitForAutomerge(tabB);

    const tabA = await context.newPage();
    await tabA.goto(`/?model=${modelId}`);
    await waitForReady(tabA);
    await waitForAutomerge(tabA);

    await waitForObjectCount(tabA, 1);
    await waitForObjectCount(tabB, 1);

    // Tab A adds cube → both see 2
    await apiCommand(tabA, 'add_cube', { size: 1.0 });
    await waitForObjectCount(tabA, 2);
    await waitForObjectCount(tabB, 2);

    // Tab A undoes → broadcasts disabled op → both see 1
    await tabA.evaluate(() => (window as any).cadDocManager.undo());
    await waitForObjectCount(tabA, 1);
    await waitForObjectCount(tabB, 1);

    await context.close();
  });
});
