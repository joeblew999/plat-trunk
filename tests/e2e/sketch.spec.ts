import { test, expect } from '@playwright/test';
import {
  waitForReady, getObjectCount, getObjectIds,
  docCapture,
} from './helpers';

test.describe('Sketch & Extrude', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const modelId = `test-sketch-${testInfo.testId}`;
    await page.goto(`/?model=${modelId}&reset=1`);
    await waitForReady(page);
  });

  test('sketch geometry — points, edges, constraints, solve, active state', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;

      // has_active_sketch tracks state
      const beforeSketch = ctrl.has_active_sketch();

      // begin_sketch returns UUID
      const sketchId = ctrl.begin_sketch('xy');

      const duringSketch = ctrl.has_active_sketch();

      // sketch_add_point and sketch_add_edge return UUIDs
      const p0 = ctrl.sketch_add_point(0, 0);
      const p1 = ctrl.sketch_add_point(3, 0);
      const edge = ctrl.sketch_add_edge(p0, p1);

      // sketch_add_constraint returns UUID
      const c0 = ctrl.sketch_add_constraint('fixed', JSON.stringify({ point_id: p0, x: 0, y: 0 }));
      const c1 = ctrl.sketch_add_constraint('fixed', JSON.stringify({ point_id: p1, x: 3, y: 0 }));

      // sketch_solve returns solved positions JSON
      const solvedJson = ctrl.sketch_solve();

      ctrl.sketch_cancel();
      const afterCancel = ctrl.has_active_sketch();

      return { sketchId, p0, p1, edge, c0, c1, solvedJson, beforeSketch, duringSketch, afterCancel };
    });

    // UUIDs
    expect(result.sketchId).toMatch(/^[0-9a-f]{8}-/);
    expect(result.p0).toMatch(/^[0-9a-f]{8}-/);
    expect(result.p1).toMatch(/^[0-9a-f]{8}-/);
    expect(result.edge).toMatch(/^[0-9a-f]{8}-/);
    expect(result.c0).toMatch(/^[0-9a-f]{8}-/);
    // All different
    expect(new Set([result.p0, result.p1, result.edge]).size).toBe(3);

    // has_active_sketch
    expect(result.beforeSketch).toBe(false);
    expect(result.duringSketch).toBe(true);
    expect(result.afterCancel).toBe(false);

    // Solve
    const solved = JSON.parse(result.solvedJson);
    expect(solved).toHaveLength(2);
    const sp0 = solved.find((s: any) => s.id === result.p0);
    expect(sp0.x).toBeCloseTo(0, 1);
    expect(sp0.y).toBeCloseTo(0, 1);
    const sp1 = solved.find((s: any) => s.id === result.p1);
    expect(sp1.x).toBeCloseTo(3, 1);
    expect(sp1.y).toBeCloseTo(0, 1);
  });

  test('sketch extrude — rectangle, triangle, XZ plane, failure case', async ({ page }) => {
    const beforeCount = await getObjectCount(page);

    // Rectangle extrude on XY plane
    const rectId = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      ctrl.begin_sketch('xy');
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
    expect(rectId).toMatch(/^[0-9a-f]{8}-/);
    expect(await getObjectCount(page)).toBe(beforeCount + 1);
    const ids = await getObjectIds(page);
    expect(ids).toContain(rectId);
    await docCapture(page, '11-sketch-rectangle-extrude');

    // Triangle extrude on XZ plane
    const triId = await page.evaluate(() => {
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
    expect(triId).toMatch(/^[0-9a-f]{8}-/);
    expect(await getObjectCount(page)).toBe(beforeCount + 2);

    // XZ plane square extrude
    const xzId = await page.evaluate(() => {
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
    expect(xzId).toMatch(/^[0-9a-f]{8}-/);
    expect(await getObjectCount(page)).toBe(beforeCount + 3);

    // Failure case: extrude with < 3 edges fails gracefully
    const failId = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      ctrl.begin_sketch('xy');
      const p0 = ctrl.sketch_add_point(0, 0);
      const p1 = ctrl.sketch_add_point(1, 0);
      ctrl.sketch_add_edge(p0, p1);
      return ctrl.sketch_extrude(1.0);
    });
    expect(failId).toBe('');
  });

  test('sketch export/import round-trip + cancel', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;

      // Build a sketch
      ctrl.begin_sketch('xy');
      const p0 = ctrl.sketch_add_point(0, 0);
      const p1 = ctrl.sketch_add_point(2, 0);
      ctrl.sketch_add_edge(p0, p1);
      ctrl.sketch_add_constraint('fixed', JSON.stringify({ point_id: p0, x: 0, y: 0 }));

      // Export
      const json = ctrl.sketch_export();

      // Cancel clears active sketch
      const hasBefore = ctrl.has_active_sketch();
      ctrl.sketch_cancel();
      const hasAfterCancel = ctrl.has_active_sketch();

      // Import restores it
      const imported = ctrl.sketch_import(json);
      const hasAfterImport = ctrl.has_active_sketch();
      const solvedJson = ctrl.sketch_solve();

      return { json, hasBefore, hasAfterCancel, imported, hasAfterImport, solvedJson };
    });

    expect(result.json).toBeTruthy();
    expect(result.hasBefore).toBe(true);
    expect(result.hasAfterCancel).toBe(false);
    expect(result.imported).toBe(true);
    expect(result.hasAfterImport).toBe(true);
    const solved = JSON.parse(result.solvedJson);
    expect(solved).toHaveLength(2);
  });
});
