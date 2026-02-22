/**
 * Cross-Tab Automerge Scene Sync — verifies that WASM scene state
 * propagates between browser tabs via Automerge BroadcastChannel.
 */
import { test, expect } from '@playwright/test';
import {
  waitForReady,
  waitForAutomerge,
  waitForObjectCount,
  getObjectCount,
  apiCommand,
} from './helpers';

test.describe('Cross-Tab Automerge Scene Sync', () => {
  test('WASM scene syncs from Tab A to Tab B via Automerge BroadcastChannel', async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const modelId = `sync-test-${testInfo.testId}`;

    // --- Tab A: open app, wait for WASM + Automerge ---
    const tabA = await context.newPage();
    await tabA.goto(`/?model=${modelId}`);
    await waitForReady(tabA);
    await waitForAutomerge(tabA);

    // Get the Automerge doc URL to share with Tab B
    const docUrl = await tabA.evaluate(() => (window as any).cadDocManager.handle.url);

    // Tab A starts with 1 object (default cube)
    await waitForObjectCount(tabA, 1);

    // --- Tab B: join the same model + document via URL ---
    const tabB = await context.newPage();
    await tabB.goto(`/?model=${modelId}&doc=${docUrl}`);
    await waitForReady(tabB);
    await waitForAutomerge(tabB);

    // Tab B should sync the state
    await waitForObjectCount(tabB, 1);

    // --- Tab A: add a cube ---
    await apiCommand(tabA, 'add_cube', { size: 1.0 });
    await waitForObjectCount(tabA, 2);

    // Tab B: WASM scene should update via Automerge sync
    await waitForObjectCount(tabB, 2);

    await context.close();
  });

  test('undo on Tab A triggers scene rebuild on Tab B', async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const modelId = `undo-sync-test-${testInfo.testId}`;

    const tabA = await context.newPage();
    await tabA.goto(`/?model=${modelId}`);
    await waitForReady(tabA);
    await waitForAutomerge(tabA);

    const docUrl = await tabA.evaluate(() => (window as any).cadDocManager.handle.url);

    const tabB = await context.newPage();
    await tabB.goto(`/?model=${modelId}&doc=${docUrl}`);
    await waitForReady(tabB);
    await waitForAutomerge(tabB);
    await waitForObjectCount(tabB, 1);

    // Tab A: add cube (now 2 objects)
    await apiCommand(tabA, 'add_cube', { size: 1.0 });
    await waitForObjectCount(tabA, 2);
    await waitForObjectCount(tabB, 2);

    // Tab A: undo via Automerge
    await tabA.evaluate(() => (window as any).cadDocManager.undo());
    await waitForObjectCount(tabA, 1);

    // Tab B: should see undo via sync
    await waitForObjectCount(tabB, 1);

    await context.close();
  });
});
