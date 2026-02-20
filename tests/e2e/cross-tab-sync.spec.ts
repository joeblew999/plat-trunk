/**
 * Cross-Tab Automerge Scene Sync — verifies that WASM scene state
 * propagates between browser tabs via Automerge BroadcastChannel.
 *
 * Flow: Tab A cadCommand() → applyOperation() → handle.change()
 *       → BroadcastChannel → Tab B handle.on('change') → _replayScene()
 *       → Tab B's WASM scene rebuilt from op log
 *
 * Both tabs share the same Automerge document via /model/:id URL routing.
 * This tests actual geometry sync, not just Datastar UI signals.
 *
 * Run with:  npx playwright test --project=sync
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
  test('WASM scene syncs from Tab A to Tab B via Automerge BroadcastChannel', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    // --- Tab A: open app with /model/new, wait for WASM + Automerge ---
    const tabA = await context.newPage();
    await tabA.goto('/model/new');
    await waitForReady(tabA);
    await waitForAutomerge(tabA);

    // Tab A starts with 1 object (default cube, now tracked in Automerge op log)
    expect(await getObjectCount(tabA)).toBe(1);

    // Get Tab A's model URL for sharing (after redirect from /model/new)
    const modelUrl = new URL(tabA.url()).pathname;
    expect(modelUrl).toMatch(/^\/model\//);

    // --- Tab B: join the same model via URL ---
    const tabB = await context.newPage();
    await tabB.goto(modelUrl);
    await waitForReady(tabB);
    await waitForAutomerge(tabB);

    // Tab B replays the op log → should have 1 object (the default cube)
    await waitForObjectCount(tabB, 1);

    // --- Tab A: add a cube ---
    await apiCommand(tabA, 'add_cube', { size: 1.0 });
    expect(await getObjectCount(tabA)).toBe(2);

    // Tab B: WASM scene should update via Automerge sync + _replayScene()
    await waitForObjectCount(tabB, 2);

    // --- Tab A: add a sphere ---
    await apiCommand(tabA, 'add_sphere', { radius: 0.8 });
    expect(await getObjectCount(tabA)).toBe(3);

    // Tab B: should see the sphere too
    await waitForObjectCount(tabB, 3);

    await context.close();
  });

  test('undo on Tab A triggers scene rebuild on Tab B', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const tabA = await context.newPage();
    await tabA.goto('/model/new');
    await waitForReady(tabA);
    await waitForAutomerge(tabA);

    const modelUrl = new URL(tabA.url()).pathname;

    const tabB = await context.newPage();
    await tabB.goto(modelUrl);
    await waitForReady(tabB);
    await waitForAutomerge(tabB);
    await waitForObjectCount(tabB, 1);

    // Tab A: add cube (now 2 objects)
    await apiCommand(tabA, 'add_cube', { size: 1.0 });
    await waitForObjectCount(tabB, 2);

    // Tab A: undo via Automerge (sets enabled=false, replays)
    await tabA.evaluate(() => (window as any).cadDocManager.undo());
    expect(await getObjectCount(tabA)).toBe(1);

    // Tab B: should see undo via Automerge BroadcastChannel sync
    await waitForObjectCount(tabB, 1);

    await context.close();
  });
});
