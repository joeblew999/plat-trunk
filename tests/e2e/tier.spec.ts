/**
 * tier.spec.ts — E2E tests for ADR-0025 Tiered Object Scaling.
 *
 * Exercises:
 *   - Per-object eviction / promotion round-trip
 *   - Bounding sphere in export_entry
 *   - warmCount signal and footer tier stats
 *   - IDB cleanup via clearObjects
 *   - bulkPutObjects + listObjectsWithSpheres
 *   - Selection state preserved across replay
 *   - Progressive loading (snapshot → frustum → Hot/Warm split)
 *   - Zoom in/out → promote/evict cycle
 */
import { test, expect } from '@playwright/test';
import { waitForReady, apiCommand, getObjectCount, getObjectIds, pause, IS_SLOW } from './helpers';

// ── Helpers ─────────────────────────────────────────────────────

/** Get tier stats from WASM + tier manager */
async function getTierStats(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const ctrl = (window as any).sceneController;
    if (!ctrl) return { hot: 0, warm: 0, total: 0 };
    const spheres = JSON.parse(ctrl.get_bounding_spheres());
    const tm = await import('/tier-manager.js');
    const warm = tm.warmCount();
    return { hot: spheres.length, warm, total: spheres.length + warm };
  });
}

/** Get footer text from status bar */
async function getFooterText(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="status-bar"]');
    return el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  });
}

/** Get Datastar signal values for tier stats */
async function getSignals(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const r = (window as any)._ds?.root;
    return { objectCount: r?.objectCount ?? 0, warmCount: r?.warmCount ?? 0 };
  });
}

/** Create N cubes at a given position offset. Returns array of objectIds. */
async function createCubesAt(
  page: import('@playwright/test').Page,
  count: number,
  offset: { dx: number; dy: number; dz: number },
) {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const r = await apiCommand(page, 'add_cube', { size: 0.5 });
    const id = r.objectId as string;
    await apiCommand(page, 'translate', {
      objectId: id,
      dx: offset.dx + (i % 5) * 2,
      dy: offset.dy + Math.floor(i / 5) * 2,
      dz: offset.dz,
    });
    ids.push(id);
  }
  return ids;
}

/** Force a snapshot in the Automerge document */
async function forceSnapshot(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const mgr = (window as any).cadDocManager;
    if (mgr?.forceSnapshot) mgr.forceSnapshot();
  });
  await pause(page);
}

/** Zoom via wheel events on the canvas */
async function zoom(page: import('@playwright/test').Page, deltaY: number, steps: number) {
  const canvas = page.locator('[data-testid="cad-canvas"]');
  for (let i = 0; i < steps; i++) {
    await canvas.evaluate(
      (el, dy) => el.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true })),
      deltaY,
    );
    await page.waitForTimeout(30);
  }
}

/** Wait for tier manager to stabilize (no more promotions/evictions) */
async function waitForTierStable(page: import('@playwright/test').Page, timeoutMs = 10_000) {
  let lastHot = -1;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await page.waitForTimeout(500);
    const stats = await getTierStats(page);
    if (stats.hot === lastHot) return stats;
    lastHot = stats.hot;
  }
  return getTierStats(page);
}

// ── Tests ───────────────────────────────────────────────────────

test.describe('ADR-0025 Tier System', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const modelId = `test-tier-${testInfo.testId}`;
    await page.goto(`/?model=${modelId}`);
    await waitForReady(page);
    // Clear scene to avoid pre-existing objects from Automerge doc replay
    await apiCommand(page, 'clear');
    await pause(page);
  });

  test('evict and promote via export/import per-object', async ({ page }) => {
    const cube = await apiCommand(page, 'add_cube', { size: 1 });
    const cubeId = cube.objectId as string;
    const countAfterCreate = await getObjectCount(page);
    expect(countAfterCreate).toBe(1);

    // Evict to IDB (Warm)
    const evicted = await page.evaluate(async (id) => {
      const { evictObject } = await import('/object-store.js');
      return evictObject('default', id);
    }, cubeId);
    expect(evicted).toBe(true);
    expect(await getObjectCount(page)).toBe(countAfterCreate - 1);

    // Promote back to WASM (Hot)
    const promoted = await page.evaluate(async (id) => {
      const { promoteObject } = await import('/object-store.js');
      return promoteObject('default', id);
    }, cubeId);
    expect(promoted).toBeTruthy();
    expect(await getObjectCount(page)).toBe(countAfterCreate);
  });

  test('bounding_sphere present in export_entry', async ({ page }) => {
    const cube = await apiCommand(page, 'add_cube', { size: 2 });
    const cubeId = cube.objectId as string;

    const entry = await page.evaluate((id) => {
      const ctrl = (window as any).sceneController;
      return JSON.parse(ctrl.export_entry(id));
    }, cubeId);

    expect(entry.bounding_sphere).toBeDefined();
    expect(entry.bounding_sphere).toHaveLength(4);
    expect(entry.bounding_sphere[3]).toBeGreaterThan(0);
  });

  test('warmCount signal and footer update on eviction', async ({ page }) => {
    await apiCommand(page, 'add_cube', { size: 1 });
    const c2 = await apiCommand(page, 'add_cube', { size: 1 });
    const hotCount = await getObjectCount(page);
    expect(hotCount).toBe(2);

    // Signals should show 0 warm initially
    let signals = await getSignals(page);
    expect(signals.warmCount).toBe(0);

    // Evict first object
    const ids = await getObjectIds(page);
    await page.evaluate(async (id) => {
      const { evictObject } = await import('/object-store.js');
      await evictObject('default', id);
      // Publish warm count (tier manager does this during tick)
      (window as any).__warmCount = 1;
      (window as any).cadCommand('get_state', {}, { reconcile: true });
    }, ids[0]);
    await pause(page);

    // WASM has 1 fewer, warm count is 1, total unchanged
    expect(await getObjectCount(page)).toBe(hotCount - 1);
    signals = await getSignals(page);
    expect(signals.warmCount).toBe(1);
    expect(signals.objectCount).toBe(hotCount); // total = hot + warm

    // Footer should show the breakdown
    const footer = await getFooterText(page);
    expect(footer).toContain(`Objects: ${hotCount}`);
    expect(footer).toContain('hot');
    expect(footer).toContain('warm');
  });

  test('clearObjects removes IDB entries on wipe', async ({ page }) => {
    const cube = await apiCommand(page, 'add_cube', { size: 1 });
    const cubeId = cube.objectId as string;

    // Evict to IDB
    await page.evaluate(async (id) => {
      const { evictObject } = await import('/object-store.js');
      await evictObject('default', id);
    }, cubeId);

    // Verify it's in IDB
    const listBefore = await page.evaluate(async () => {
      const { listObjects } = await import('/object-store.js');
      return listObjects('default');
    });
    expect(listBefore.length).toBeGreaterThanOrEqual(1);

    // Clear
    await page.evaluate(async () => {
      const { clearObjects } = await import('/object-store.js');
      await clearObjects('default');
    });

    // Verify IDB is empty
    const listAfter = await page.evaluate(async () => {
      const { listObjects } = await import('/object-store.js');
      return listObjects('default');
    });
    expect(listAfter).toHaveLength(0);
  });

  test('bulkPutObjects and listObjectsWithSpheres', async ({ page }) => {
    await apiCommand(page, 'add_cube', { size: 1 });
    await apiCommand(page, 'add_sphere', { radius: 0.5 });
    const ids = await getObjectIds(page);

    // Use a unique model key to avoid collisions
    const bulkModel = `test-bulk-${Date.now()}`;
    const result = await page.evaluate(async ({ objectIds, modelKey }) => {
      const ctrl = (window as any).sceneController;
      const { bulkPutObjects, listObjectsWithSpheres, clearObjects } = await import('/object-store.js');

      const items = objectIds.map((id: string) => ({
        objectId: id,
        entryJson: ctrl.export_entry(id),
      }));

      await clearObjects(modelKey);
      await bulkPutObjects(modelKey, items);
      const spheres = await listObjectsWithSpheres(modelKey);
      await clearObjects(modelKey);
      return spheres;
    }, { objectIds: ids, modelKey: bulkModel });

    expect(result).toHaveLength(ids.length);
    for (const item of result) {
      expect(item.objectId).toBeTruthy();
      expect(item.boundingSphere).toBeDefined();
      expect(item.boundingSphere).toHaveLength(4);
    }
  });

  test('selection restored after replay preserves WASM selected state', async ({ page }) => {
    await apiCommand(page, 'add_cube', { size: 1 });
    await apiCommand(page, 'add_cube', { size: 1 });
    const ids = await getObjectIds(page);

    // Select the first cube
    await apiCommand(page, 'select', { id: ids[0] }, { ephemeral: true });
    await pause(page);

    // Verify WASM knows about the selection
    const wasmSelected = await page.evaluate(() => {
      const state = (window as any).cadQuery('get_state', {}, { reconcile: false });
      return state?.selectedId ?? null;
    });
    expect(wasmSelected).toBe(ids[0]);

    // Trigger an undo (which causes a replay)
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(IS_SLOW ? 2000 : 500);

    // After replay, WASM should still have a selected object
    const wasmSelectedAfter = await page.evaluate(() => {
      const state = (window as any).cadQuery('get_state', {}, { reconcile: false });
      return state?.selectedId ?? null;
    });
    expect(wasmSelectedAfter).toBeTruthy();
  });
});

test.describe('ADR-0025 Progressive Loading', () => {
  test.setTimeout(120_000);

  test('progressive load splits Hot/Warm by frustum', async ({ page }, testInfo) => {
    const modelId = `test-progressive-${testInfo.testId}`;
    await page.goto(`/?model=${modelId}`);
    await waitForReady(page);
    await apiCommand(page, 'clear');
    await pause(page);

    // Create 55 objects (above PROGRESSIVE_THRESHOLD=50):
    // Group A: 15 near origin (should be Hot after reload)
    // Group B: 15 at x=-100 (should be Warm — far away)
    // Group C: 15 at y=-100 (should be Warm — far away)
    // Padding: 10 near origin
    await createCubesAt(page, 15, { dx: 0, dy: 0, dz: 0 });
    await createCubesAt(page, 15, { dx: -100, dy: 0, dz: 0 });
    await createCubesAt(page, 15, { dx: 0, dy: -100, dz: 0 });
    await createCubesAt(page, 10, { dx: 1, dy: 1, dz: 1 });

    // With the first-seen timestamp fix, tier manager won't evict during creation.
    // All 55 objects should be Hot.
    expect(await getObjectCount(page)).toBe(55);

    // Force snapshot — only captures Hot objects currently in WASM
    await forceSnapshot(page);
    await page.waitForTimeout(500);

    // Reload — triggers _replayScene → progressive path
    await page.goto(`/?model=${modelId}`);
    await waitForReady(page);

    // Wait for Automerge doc to load and scene to rebuild
    await page.waitForFunction(
      () => {
        const mgr = (window as any).cadDocManager;
        return mgr?.handle?.docSync?.()?.operations?.length > 0;
      },
      { timeout: 30_000 },
    );

    // Wait for tier manager to settle
    const stats = await waitForTierStable(page);

    // All 55 should be preserved, with a Hot/Warm split
    expect(stats.total).toBe(55);
    expect(stats.hot).toBeGreaterThan(0);
    expect(stats.warm).toBeGreaterThan(0);
    expect(stats.hot).toBeLessThan(55);

    // Footer should show breakdown
    const footer = await getFooterText(page);
    expect(footer).toContain('Objects: 55');
    expect(footer).toContain('hot');
    expect(footer).toContain('warm');
  });

  test('tier manager auto-evicts on zoom out, auto-promotes on zoom in', async ({ page }, testInfo) => {
    const modelId = `test-zoom-real-${testInfo.testId}`;
    await page.goto(`/?model=${modelId}`);
    await waitForReady(page);
    await apiCommand(page, 'clear');
    await pause(page);

    // Lower idle timeout to 0 so tier manager can evict immediately
    // (production default is 30s — too slow for tests)
    await page.evaluate(async () => {
      const tm = await import('/tier-manager.js');
      tm.setThresholds({ idle: 0 });
    });

    // Create 5 objects near origin
    for (let i = 0; i < 5; i++) {
      await apiCommand(page, 'add_cube', { size: 0.5 });
    }
    expect(await getObjectCount(page)).toBe(5);

    // Deselect all — selected objects are protected from eviction
    await apiCommand(page, 'select', { id: '' }, { ephemeral: true });

    const before = await getTierStats(page);
    expect(before.hot).toBe(5);
    expect(before.warm).toBe(0);

    // Zoom WAY out — push objects beyond FAR_THRESHOLD (200)
    // Camera starts at (1.5, 1.5, 1.5). Zoom out ~50 steps at deltaY=300
    // should move camera far enough that objects at origin exceed FAR_THRESHOLD.
    await zoom(page, 300, 50);

    // Wait for tier manager ticks to evict (idle=0, so no idle wait needed)
    // MAX_EVICTIONS_PER_TICK=2 at 10Hz → ~2.5s to evict all 5
    await page.waitForTimeout(IS_SLOW ? 6000 : 4000);
    const afterZoomOut = await waitForTierStable(page);

    // Tier manager should have evicted some objects to Warm
    expect(afterZoomOut.warm).toBeGreaterThan(0);
    expect(afterZoomOut.total).toBe(5);

    // Zoom back in close to origin — objects should auto-promote
    await zoom(page, -300, 50);
    await page.waitForTimeout(IS_SLOW ? 6000 : 4000);
    const afterZoomIn = await waitForTierStable(page);

    // Hot count should increase as objects are promoted back
    expect(afterZoomIn.hot).toBeGreaterThan(afterZoomOut.hot);
    expect(afterZoomIn.total).toBe(5);

    // Restore default thresholds
    await page.evaluate(async () => {
      const tm = await import('/tier-manager.js');
      tm.setThresholds({ idle: 30000 });
    });
  });
});
