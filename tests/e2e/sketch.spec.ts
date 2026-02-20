import { test, expect } from '@playwright/test';
import {
  waitForReady, getObjectCount, getObjectIds, pause,
  docScreenshot, CAPTURE_SCREENSHOTS,
} from './helpers';

test.describe('Sketch & Extrude', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const modelId = `test-sketch-${testInfo.testId}`;
    await page.goto(`/?model=${modelId}`);
    await waitForReady(page);
  });

  test('begin_sketch returns UUID', async ({ page }) => {
    const sketchId = await page.evaluate(() => {
      return (window as any).sceneController.begin_sketch('xy');
    });
    expect(sketchId).toMatch(/^[0-9a-f]{8}-/);
  });

  test('sketch_add_point and sketch_add_edge return UUIDs', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      ctrl.begin_sketch('xy');
      const p0 = ctrl.sketch_add_point(0, 0);
      const p1 = ctrl.sketch_add_point(2, 0);
      const edge = ctrl.sketch_add_edge(p0, p1);
      return { p0, p1, edge };
    });
    expect(result.p0).toMatch(/^[0-9a-f]{8}-/);
    expect(result.p1).toMatch(/^[0-9a-f]{8}-/);
    expect(result.edge).toMatch(/^[0-9a-f]{8}-/);
    // All different UUIDs
    expect(new Set([result.p0, result.p1, result.edge]).size).toBe(3);
  });

  test('sketch_add_constraint returns UUID', async ({ page }) => {
    const constraintId = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      ctrl.begin_sketch('xy');
      const p0 = ctrl.sketch_add_point(0, 0);
      return ctrl.sketch_add_constraint('fixed', JSON.stringify({ point_id: p0, x: 0, y: 0 }));
    });
    expect(constraintId).toMatch(/^[0-9a-f]{8}-/);
  });

  test('sketch_solve returns solved positions JSON', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      ctrl.begin_sketch('xy');
      const p0 = ctrl.sketch_add_point(0, 0);
      const p1 = ctrl.sketch_add_point(3, 0);
      ctrl.sketch_add_constraint('fixed', JSON.stringify({ point_id: p0, x: 0, y: 0 }));
      ctrl.sketch_add_constraint('fixed', JSON.stringify({ point_id: p1, x: 3, y: 0 }));
      const solvedJson = ctrl.sketch_solve();
      return { solvedJson, p0, p1 };
    });
    expect(result.solvedJson).toBeTruthy();
    const solved = JSON.parse(result.solvedJson);
    expect(solved).toHaveLength(2);
    // First point should be at (0, 0)
    const sp0 = solved.find((s: any) => s.id === result.p0);
    expect(sp0).toBeTruthy();
    expect(sp0.x).toBeCloseTo(0, 1);
    expect(sp0.y).toBeCloseTo(0, 1);
    // Second point should be at (3, 0)
    const sp1 = solved.find((s: any) => s.id === result.p1);
    expect(sp1).toBeTruthy();
    expect(sp1.x).toBeCloseTo(3, 1);
    expect(sp1.y).toBeCloseTo(0, 1);
  });

  test('sketch_extrude rectangle → new 3D object', async ({ page }) => {
    const beforeCount = await getObjectCount(page);

    const objectId = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      ctrl.begin_sketch('xy');
      // Rectangle: 4 points, 4 edges, constrained
      const p0 = ctrl.sketch_add_point(0, 0);
      const p1 = ctrl.sketch_add_point(2, 0);
      const p2 = ctrl.sketch_add_point(2, 1);
      const p3 = ctrl.sketch_add_point(0, 1);

      const e0 = ctrl.sketch_add_edge(p0, p1);
      const e1 = ctrl.sketch_add_edge(p1, p2);
      const e2 = ctrl.sketch_add_edge(p2, p3);
      const e3 = ctrl.sketch_add_edge(p3, p0);

      ctrl.sketch_add_constraint('fixed', JSON.stringify({ point_id: p0, x: 0, y: 0 }));
      ctrl.sketch_add_constraint('horizontal', JSON.stringify({ edge_id: e0 }));
      ctrl.sketch_add_constraint('horizontal', JSON.stringify({ edge_id: e2 }));
      ctrl.sketch_add_constraint('vertical', JSON.stringify({ edge_id: e1 }));
      ctrl.sketch_add_constraint('vertical', JSON.stringify({ edge_id: e3 }));
      ctrl.sketch_add_constraint('distance', JSON.stringify({ p0_id: p0, p1_id: p1, value: 2 }));
      ctrl.sketch_add_constraint('distance', JSON.stringify({ p0_id: p0, p1_id: p3, value: 1 }));

      return ctrl.sketch_extrude(1.5);
    });

    expect(objectId).toMatch(/^[0-9a-f]{8}-/);
    expect(await getObjectCount(page)).toBe(beforeCount + 1);
    if (CAPTURE_SCREENSHOTS) await docScreenshot(page, '11-sketch-rectangle-extrude');

    // New object should be in the ids list
    const ids = await getObjectIds(page);
    expect(ids).toContain(objectId);
  });

  test('sketch_extrude triangle → new 3D object', async ({ page }) => {
    const beforeCount = await getObjectCount(page);

    const objectId = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      ctrl.begin_sketch('xz');
      const p0 = ctrl.sketch_add_point(0, 0);
      const p1 = ctrl.sketch_add_point(3, 0);
      const p2 = ctrl.sketch_add_point(1.5, 2);

      ctrl.sketch_add_edge(p0, p1);
      ctrl.sketch_add_edge(p1, p2);
      ctrl.sketch_add_edge(p2, p0);

      ctrl.sketch_add_constraint('fixed', JSON.stringify({ point_id: p0, x: 0, y: 0 }));
      ctrl.sketch_add_constraint('fixed', JSON.stringify({ point_id: p1, x: 3, y: 0 }));
      ctrl.sketch_add_constraint('fixed', JSON.stringify({ point_id: p2, x: 1.5, y: 2 }));

      return ctrl.sketch_extrude(2.0);
    });

    expect(objectId).toMatch(/^[0-9a-f]{8}-/);
    expect(await getObjectCount(page)).toBe(beforeCount + 1);
    if (CAPTURE_SCREENSHOTS) await docScreenshot(page, '12-sketch-triangle-extrude');
  });

  test('sketch_cancel clears active sketch', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      ctrl.begin_sketch('xy');
      ctrl.sketch_add_point(0, 0);
      const hasBefore = ctrl.has_active_sketch();
      ctrl.sketch_cancel();
      const hasAfter = ctrl.has_active_sketch();
      return { hasBefore, hasAfter };
    });
    expect(result.hasBefore).toBe(true);
    expect(result.hasAfter).toBe(false);
  });

  test('sketch_export and sketch_import round-trip', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      ctrl.begin_sketch('xy');
      const p0 = ctrl.sketch_add_point(0, 0);
      const p1 = ctrl.sketch_add_point(2, 0);
      ctrl.sketch_add_edge(p0, p1);
      ctrl.sketch_add_constraint('fixed', JSON.stringify({ point_id: p0, x: 0, y: 0 }));

      const json = ctrl.sketch_export();
      ctrl.sketch_cancel(); // clear

      const imported = ctrl.sketch_import(json);
      const hasSketch = ctrl.has_active_sketch();
      const solvedJson = ctrl.sketch_solve();
      return { json, imported, hasSketch, solvedJson };
    });

    expect(result.json).toBeTruthy();
    expect(result.imported).toBe(true);
    expect(result.hasSketch).toBe(true);
    expect(result.solvedJson).toBeTruthy();
    const solved = JSON.parse(result.solvedJson);
    expect(solved).toHaveLength(2);
  });

  test('extrude with < 3 edges fails gracefully', async ({ page }) => {
    const objectId = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      ctrl.begin_sketch('xy');
      const p0 = ctrl.sketch_add_point(0, 0);
      const p1 = ctrl.sketch_add_point(1, 0);
      ctrl.sketch_add_edge(p0, p1);
      // Only 1 edge — cannot form closed loop
      return ctrl.sketch_extrude(1.0);
    });
    // Should return empty string (failure)
    expect(objectId).toBe('');
  });

  test('has_active_sketch tracks state', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      const before = ctrl.has_active_sketch();
      ctrl.begin_sketch('yz');
      const during = ctrl.has_active_sketch();
      ctrl.sketch_cancel();
      const after = ctrl.has_active_sketch();
      return { before, during, after };
    });
    expect(result.before).toBe(false);
    expect(result.during).toBe(true);
    expect(result.after).toBe(false);
  });

  test('extrude on XZ plane produces solid', async ({ page }) => {
    const beforeCount = await getObjectCount(page);

    const objectId = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      ctrl.begin_sketch('xz');
      const p0 = ctrl.sketch_add_point(0, 0);
      const p1 = ctrl.sketch_add_point(1, 0);
      const p2 = ctrl.sketch_add_point(1, 1);
      const p3 = ctrl.sketch_add_point(0, 1);

      ctrl.sketch_add_edge(p0, p1);
      ctrl.sketch_add_edge(p1, p2);
      ctrl.sketch_add_edge(p2, p3);
      ctrl.sketch_add_edge(p3, p0);

      ctrl.sketch_add_constraint('fixed', JSON.stringify({ point_id: p0, x: 0, y: 0 }));
      ctrl.sketch_add_constraint('fixed', JSON.stringify({ point_id: p1, x: 1, y: 0 }));
      ctrl.sketch_add_constraint('fixed', JSON.stringify({ point_id: p2, x: 1, y: 1 }));
      ctrl.sketch_add_constraint('fixed', JSON.stringify({ point_id: p3, x: 0, y: 1 }));

      return ctrl.sketch_extrude(3.0);
    });

    expect(objectId).toMatch(/^[0-9a-f]{8}-/);
    expect(await getObjectCount(page)).toBe(beforeCount + 1);
  });
});
