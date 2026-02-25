import { test, expect } from '@playwright/test';
import {
  waitForReady, getObjectCount, getObjectIds, canvas,
  apiCommand, docScreenshot, docCapture, saveExample,
  waitForObjectCount,
  CAPTURE_SCREENSHOTS, CAPTURE_EXAMPLES,
} from './helpers';

// ─── CAD Operations (cadCommand layer) ─────────────────────────
// ALL operations via cadCommand() — same entry point as MCP/API.

test.describe('CAD Operations', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const modelId = `test-cad-${testInfo.testId}`;
    await page.goto(`/?model=${modelId}&reset=1`);
    await waitForReady(page);
  });

  test('page loads with WebGPU canvas and default cube', async ({ page }) => {
    await expect(canvas(page)).toBeVisible();
    expect(await getObjectCount(page)).toBe(1);
    if (CAPTURE_SCREENSHOTS) await docScreenshot(page, '01-initial-scene');
    if (CAPTURE_EXAMPLES) await saveExample(page, 'default-cube');
  });

  test('add primitives via cadCommand return UUIDs', async ({ page }) => {
    // Default cube is already present
    expect(await getObjectCount(page)).toBe(1);

    // Verify default cube has UUID format
    const initialIds = await getObjectIds(page);
    expect(initialIds).toHaveLength(1);
    expect(initialIds[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

    const sphere = await apiCommand(page, 'add_sphere', { radius: 0.8 });
    expect(sphere.objectId).toMatch(/^[0-9a-f]{8}-/);
    expect(await getObjectCount(page)).toBe(2);
    await docCapture(page, '02-add-sphere');

    const cyl = await apiCommand(page, 'add_cylinder', { radius: 0.5, height: 1.0 });
    expect(cyl.objectId).toMatch(/^[0-9a-f]{8}-/);
    expect(await getObjectCount(page)).toBe(3);
    await docCapture(page, '03-add-cylinder');

    const torus = await apiCommand(page, 'add_torus', { majorRadius: 1.0, minorRadius: 0.3 });
    expect(torus.objectId).toMatch(/^[0-9a-f]{8}-/);
    expect(await getObjectCount(page)).toBe(4);
    await docCapture(page, '04-multiple-primitives');
    if (CAPTURE_EXAMPLES) await saveExample(page, 'multi-shape');

    // All IDs are unique
    const ids = await getObjectIds(page);
    expect(new Set(ids).size).toBe(4);
  });

  test('translate object by UUID', async ({ page }) => {
    const ids = await getObjectIds(page);
    const cubeId = ids[0];

    const result = await apiCommand(page, 'translate', { objectId: cubeId, dx: 1.0, dy: 0, dz: 0 });
    expect(result.success).toBe(true);
    expect(await getObjectCount(page)).toBe(1);
    await docCapture(page, '05-translate');

    // UUID stays the same after translate
    const idsAfter = await getObjectIds(page);
    expect(idsAfter[0]).toBe(cubeId);
  });

  test('select and deselect sets interaction mode', async ({ page }) => {
    const ids = await getObjectIds(page);

    // select returns selectedId and sets mode
    const result = await apiCommand(page, 'select', { id: ids[0] }, { ephemeral: true });
    expect(result.selectedId).toBe(ids[0]);
    const modeSelected = await page.evaluate(() =>
      (window as any).sceneController.get_interaction_mode()
    );
    expect(modeSelected).toBe('selected');

    // deselect clears it and sets idle mode
    const desel = await apiCommand(page, 'deselect', {}, { ephemeral: true });
    expect(desel.selectedId).toBeFalsy();
    const modeIdle = await page.evaluate(() =>
      (window as any).sceneController.get_interaction_mode()
    );
    expect(modeIdle).toBe('idle');
  });

  test('pick_at returns pickedId (read-only)', async ({ page }) => {
    const countBefore = await getObjectCount(page);
    const pick = await apiCommand(page, 'pick_at', { ndcX: 0, ndcY: 0 }, { ephemeral: true });
    // Center of canvas should hit the default cube
    if (pick.pickedId) {
      expect(pick.pickedId).toMatch(/^[0-9a-f]{8}-/);
    }
    // pick_at is read-only — no side effects
    expect(await getObjectCount(page)).toBe(countBefore);
  });

  test('boolean subtract via cadCommand', async ({ page }) => {
    const ids = await getObjectIds(page);
    const cubeId = ids[0];
    const cylResult = await apiCommand(page, 'add_cylinder', { radius: 0.25, height: 2.0 });
    const cylId = cylResult.objectId as string;
    await docCapture(page, '06-boolean-setup');

    const subResult = await apiCommand(page, 'boolean_subtract', { idA: cubeId, idB: cylId });
    expect(subResult.objectId).toMatch(/^[0-9a-f]{8}-/);
    expect(await getObjectCount(page)).toBe(1);
    await docCapture(page, '07-boolean-subtract');
    if (CAPTURE_EXAMPLES) await saveExample(page, 'punched-cube');

    const idsAfter = await getObjectIds(page);
    expect(idsAfter).toHaveLength(1);
    expect(idsAfter[0]).toBe(subResult.objectId);
  });

  test('boolean union via cadCommand', async ({ page }) => {
    const ids = await getObjectIds(page);
    const cubeA = ids[0];
    const cubeResult = await apiCommand(page, 'add_cube', { size: 0.5 });
    const cubeB = cubeResult.objectId as string;
    await apiCommand(page, 'translate', { objectId: cubeB, dx: 0.7, dy: 0, dz: 0 });

    const unionResult = await apiCommand(page, 'boolean_union', { idA: cubeA, idB: cubeB });
    expect(unionResult.objectId).toMatch(/^[0-9a-f]{8}-/);
    expect(await getObjectCount(page)).toBe(1);
    if (CAPTURE_EXAMPLES) await saveExample(page, 'two-cubes-union');
  });

  test('delete and clear scene', async ({ page }) => {
    await apiCommand(page, 'add_cube', { size: 1.0 });
    expect(await getObjectCount(page)).toBe(2);

    const ids = await getObjectIds(page);
    await apiCommand(page, 'delete', { objectId: ids[0] });
    expect(await getObjectCount(page)).toBe(1);

    await apiCommand(page, 'clear');
    expect(await getObjectCount(page)).toBe(0);
  });

  test('undo and redo via cadCommand', async ({ page }) => {
    expect(await getObjectCount(page)).toBe(1);

    await apiCommand(page, 'add_sphere', { radius: 0.8 });
    expect(await getObjectCount(page)).toBe(2);

    // Undo via keyboard (exercises the UI wiring)
    await page.keyboard.press('Control+z');
    await waitForObjectCount(page, 1);

    await page.keyboard.press('Control+Shift+z');
    await waitForObjectCount(page, 2);

    await apiCommand(page, 'add_cylinder', { radius: 0.5, height: 1.0 });
    expect(await getObjectCount(page)).toBe(3);

    await page.keyboard.press('Control+z');
    await waitForObjectCount(page, 2);

    await page.keyboard.press('Control+z');
    await waitForObjectCount(page, 1);
  });

  test('undo after boolean subtract', async ({ page }) => {
    const ids0 = await getObjectIds(page);
    const cubeId = ids0[0];
    const cylResult = await apiCommand(page, 'add_cylinder', { radius: 0.25, height: 2.0 });
    expect(await getObjectCount(page)).toBe(2);

    const cylId = cylResult.objectId as string;
    const subResult = await apiCommand(page, 'boolean_subtract', { idA: cubeId, idB: cylId });
    expect(subResult.objectId).toBeDefined();
    expect(await getObjectCount(page)).toBe(1);

    await page.keyboard.press('Control+z');
    await waitForObjectCount(page, 2);
  });

  test('undo after delete', async ({ page }) => {
    expect(await getObjectCount(page)).toBe(1);
    const ids = await getObjectIds(page);

    await apiCommand(page, 'delete', { objectId: ids[0] });
    await waitForObjectCount(page, 0);

    await page.keyboard.press('Control+z');
    await waitForObjectCount(page, 1);
  });

  test('export/import round-trip preserves UUIDs and structure', async ({ page }) => {
    await apiCommand(page, 'add_sphere', { radius: 1.0 });
    const idsBefore = await getObjectIds(page);
    expect(idsBefore).toHaveLength(2);

    const exportResult = await apiCommand(page, 'export_scene');
    const json = exportResult.scene as string;
    expect(json).toBeTruthy();

    // Verify JSON structure
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toHaveProperty('id');
    expect(parsed[0]).toHaveProperty('solid');

    await apiCommand(page, 'clear');
    expect(await getObjectCount(page)).toBe(0);

    await apiCommand(page, 'import_scene', { json });
    const idsAfter = await getObjectIds(page);
    expect(idsAfter).toEqual(idsBefore);
    await docCapture(page, '08-save-load');
  });

  test('set_style and set_color via cadCommand', async ({ page }) => {
    const ids = await getObjectIds(page);
    const style = { albedo: [0.8, 0.2, 0.5, 0.9], roughness: 0.8, reflectance: 0.2, ambient_ratio: 0.1 };
    await apiCommand(page, 'set_style', { objectId: ids[0], style });

    // Read back via cadCommand
    const getResult = await apiCommand(page, 'get_object_style', { objectId: ids[0] }, { ephemeral: true });
    const s = (getResult as any).style;
    expect(s.roughness).toBeCloseTo(0.8);
    expect(s.reflectance).toBeCloseTo(0.2);
    expect(s.albedo[3]).toBeCloseTo(0.9);

    // set_color shorthand
    await apiCommand(page, 'set_color', { objectId: ids[0], r: 1.0, g: 0.0, b: 0.0, a: 1.0 });
    const colorResult = await apiCommand(page, 'get_object_style', { objectId: ids[0] }, { ephemeral: true });
    const cs = (colorResult as any).style;
    expect(cs.albedo[0]).toBeCloseTo(1.0);
    expect(cs.albedo[1]).toBeCloseTo(0.0);
    expect(cs.albedo[2]).toBeCloseTo(0.0);
  });

  test('style persists through export/import', async ({ page }) => {
    const ids = await getObjectIds(page);
    await apiCommand(page, 'set_color', { objectId: ids[0], r: 0.5, g: 0.25, b: 0.75, a: 0.9 });

    const exportResult = await apiCommand(page, 'export_scene');
    await apiCommand(page, 'clear');
    await apiCommand(page, 'import_scene', { json: exportResult.scene as string });

    const idsAfter = await getObjectIds(page);
    expect(idsAfter).toHaveLength(1);
    const persistResult = await apiCommand(page, 'get_object_style', { objectId: idsAfter[0] }, { ephemeral: true });
    const ps = (persistResult as any).style;
    expect(ps.albedo[0]).toBeCloseTo(0.5);
    expect(ps.albedo[1]).toBeCloseTo(0.25);
    expect(ps.albedo[2]).toBeCloseTo(0.75);
    expect(ps.albedo[3]).toBeCloseTo(0.9);
  });

  test('unknown command returns error', async ({ page }) => {
    const result = await apiCommand(page, 'nonexistent_command', {});
    expect(result.error).toBeDefined();
  });
});

// ─── Gizmo Interaction (low-level WASM, latency-sensitive) ─────
// These use direct WASM calls — gizmo drag stays direct per ADR-0013.

test.describe('Gizmo Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);
  });

  test('begin_gizmo_drag on axis arrow', async ({ page }) => {
    const ids = await getObjectIds(page);
    // ADR-0013: gizmo drag is direct WASM for 60fps latency
    await apiCommand(page, 'select', { id: ids[0] }, { ephemeral: true });

    const axis = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      return ctrl.begin_gizmo_drag(0.15, 0);
    });
    if (axis) {
      expect(['x', 'y', 'z']).toContain(axis);
      const mode = await page.evaluate(() =>
        (window as any).sceneController.get_interaction_mode()
      );
      expect(mode).toBe('dragging');
    }
  });

  test('cancel_gizmo_drag reverses translation', async ({ page }) => {
    const before: string = await page.evaluate(() =>
      (window as any).sceneController.export_scene()
    );

    const ids = await getObjectIds(page);
    // ADR-0013: gizmo drag is direct WASM for 60fps latency
    await apiCommand(page, 'select', { id: ids[0] }, { ephemeral: true });

    const dragResult = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      const axis = ctrl.begin_gizmo_drag(0.15, 0);
      if (axis) {
        ctrl.update_gizmo_drag(0.25, 0, 0.15, 0);
        ctrl.cancel_gizmo_drag();
        return { cancelled: true, mode: ctrl.get_interaction_mode() };
      }
      return { cancelled: false, mode: ctrl.get_interaction_mode() };
    });

    if (dragResult.cancelled) {
      expect(dragResult.mode).toBe('selected');
      const after: string = await page.evaluate(() =>
        (window as any).sceneController.export_scene()
      );
      expect(after).toBe(before);
    }
  });

  test('canvas click selects, Escape deselects', async ({ page }) => {
    const modeBefore = await page.evaluate(() =>
      (window as any).sceneController.get_interaction_mode()
    );
    expect(modeBefore).toBe('idle');

    const c = canvas(page);
    const box = await c.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForFunction(
      () => (window as any).sceneController.get_interaction_mode() === 'selected',
      { timeout: 5_000 },
    );

    // Escape deselects
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () => (window as any).sceneController.get_interaction_mode() === 'idle',
      { timeout: 5_000 },
    );
  });
});
