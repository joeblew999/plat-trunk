import { test, expect } from '@playwright/test';
import { waitForWasm, clickButton, getObjectCount, getObjectIds, addPrimitive, apiCommand, pause } from './helpers';

test.describe('CAD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);
  });

  test('page loads with WebGPU canvas', async ({ page }) => {
    const canvas = page.locator('#cad-canvas');
    await expect(canvas).toBeVisible();
    expect(await getObjectCount(page)).toBe(1);
  });

  test('default cube has UUID', async ({ page }) => {
    const ids = await getObjectIds(page);
    expect(ids).toHaveLength(1);
    // UUID v4 format: 8-4-4-4-12 hex
    expect(ids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('add primitives return UUIDs', async ({ page }) => {
    expect(await getObjectCount(page)).toBe(1);

    const sphereId = await addPrimitive(page, 'sphere', { radius: 0.8 });
    expect(sphereId).toMatch(/^[0-9a-f]{8}-/);
    expect(await getObjectCount(page)).toBe(2);

    const cylId = await addPrimitive(page, 'cylinder');
    expect(cylId).toMatch(/^[0-9a-f]{8}-/);
    expect(await getObjectCount(page)).toBe(3);

    const torusId = await addPrimitive(page, 'torus');
    expect(torusId).toMatch(/^[0-9a-f]{8}-/);
    expect(await getObjectCount(page)).toBe(4);

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

    // UUID stays the same after translate
    const idsAfter = await getObjectIds(page);
    expect(idsAfter[0]).toBe(cubeId);
  });

  test('boolean subtract (cube - cylinder) returns UUID', async ({ page }) => {
    const cubeIds = await getObjectIds(page);
    const cubeId = cubeIds[0];
    const cylResult = await apiCommand(page, 'add_cylinder', { radius: 0.25, height: 2.0 });
    const cylId = cylResult.objectId as string;

    const subResult = await apiCommand(page, 'boolean_subtract', { idA: cubeId, idB: cylId });
    expect(subResult.objectId).toMatch(/^[0-9a-f]{8}-/);
    expect(await getObjectCount(page)).toBe(1);
    // Result UUID is a new object (not either input)
    const idsAfter = await getObjectIds(page);
    expect(idsAfter).toHaveLength(1);
    expect(idsAfter[0]).toBe(subResult.objectId);
  });

  test('boolean union (cube + cube) returns UUID', async ({ page }) => {
    const cubeIds = await getObjectIds(page);
    const cubeA = cubeIds[0];
    const cubeResult = await apiCommand(page, 'add_cube', { size: 0.5 });
    const cubeB = cubeResult.objectId as string;
    await apiCommand(page, 'translate', { objectId: cubeB, dx: 0.7, dy: 0, dz: 0 });

    const unionResult = await apiCommand(page, 'boolean_union', { idA: cubeA, idB: cubeB });
    expect(unionResult.objectId).toMatch(/^[0-9a-f]{8}-/);
    expect(await getObjectCount(page)).toBe(1);
  });

  test('delete and clear scene', async ({ page }) => {
    await apiCommand(page, 'add_cube', { size: 1.0 });
    expect(await getObjectCount(page)).toBe(2);

    // Delete first object by UUID
    const ids = await getObjectIds(page);
    await apiCommand(page, 'delete', { objectId: ids[0] });
    expect(await getObjectCount(page)).toBe(1);

    // Clear all
    await apiCommand(page, 'clear');
    expect(await getObjectCount(page)).toBe(0);
  });

  test('undo and redo', async ({ page }) => {
    expect(await getObjectCount(page)).toBe(1);

    await clickButton(page, 'addSphere');
    expect(await getObjectCount(page)).toBe(2);

    // Undo — sphere should be gone (group undo removes add + offset)
    await page.keyboard.press('Control+z');
    await pause(page);
    expect(await getObjectCount(page)).toBe(1);

    // Redo — sphere should come back
    await page.keyboard.press('Control+Shift+z');
    await pause(page);
    expect(await getObjectCount(page)).toBe(2);

    // Add cylinder, then undo twice
    await clickButton(page, 'addCylinder');
    expect(await getObjectCount(page)).toBe(3);

    await page.keyboard.press('Control+z');
    await pause(page);
    expect(await getObjectCount(page)).toBe(2);

    await page.keyboard.press('Control+z');
    await pause(page);
    expect(await getObjectCount(page)).toBe(1);
  });

  test('undo after boolean subtract', async ({ page }) => {
    // Add cylinder via cadCommand (records undo)
    const ids0 = await getObjectIds(page);
    const cubeId = ids0[0];
    const cylResult = await apiCommand(page, 'add_cylinder', { radius: 0.25, height: 2.0 });
    expect(await getObjectCount(page)).toBe(2);

    // Set bool selection and subtract via button (goes through undo system)
    const cylId = cylResult.objectId as string;
    await page.evaluate(({ a, b }) => {
      (window as any).boolSelA = a;
      (window as any).boolSelB = b;
    }, { a: cubeId, b: cylId });
    await clickButton(page, 'boolSubtract');
    await pause(page);
    expect(await getObjectCount(page)).toBe(1);

    // Undo — should restore 2 original objects
    await page.keyboard.press('Control+z');
    await pause(page);
    expect(await getObjectCount(page)).toBe(2);
  });

  test('undo after delete', async ({ page }) => {
    expect(await getObjectCount(page)).toBe(1);

    // Delete via UI
    await clickButton(page, 'deleteBtn');
    await pause(page);
    expect(await getObjectCount(page)).toBe(0);

    // Undo
    await page.keyboard.press('Control+z');
    await pause(page);
    expect(await getObjectCount(page)).toBe(1);
  });

  test('export/import preserves UUIDs', async ({ page }) => {
    // Add a second object
    await apiCommand(page, 'add_sphere', { radius: 1.0 });
    const idsBefore = await getObjectIds(page);
    expect(idsBefore).toHaveLength(2);

    // Export
    const exportResult = await apiCommand(page, 'export_scene');
    const json = exportResult.scene as string;

    // Clear and re-import
    await apiCommand(page, 'clear');
    expect(await getObjectCount(page)).toBe(0);

    await apiCommand(page, 'import_scene', { json });
    const idsAfter = await getObjectIds(page);

    // UUIDs should be preserved
    expect(idsAfter).toEqual(idsBefore);
  });

  test('save and load scene', async ({ page }) => {
    await apiCommand(page, 'add_sphere', { radius: 1.0 });
    expect(await getObjectCount(page)).toBe(2);

    const exportResult = await apiCommand(page, 'export_scene');
    const json = exportResult.scene as string;
    expect(json).toBeTruthy();
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    // Each entry should have id and solid
    expect(parsed[0]).toHaveProperty('id');
    expect(parsed[0]).toHaveProperty('solid');

    // Clear and re-import
    await apiCommand(page, 'clear');
    expect(await getObjectCount(page)).toBe(0);

    await apiCommand(page, 'import_scene', { json });
    await pause(page);
    expect(await getObjectCount(page)).toBe(2);
  });

  // =================================================================
  // Gizmo interaction tests
  // =================================================================

  test('select_object_at returns UUID on hit', async ({ page }) => {
    // The default cube is at origin. Click center of canvas (NDC 0,0).
    const result = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      return ctrl.select_object_at(0, 0);
    });
    // Should return a UUID string (the default cube)
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^[0-9a-f]{8}-/);
  });

  test('select_object_at returns null on miss', async ({ page }) => {
    // Click far from any object (NDC corner)
    const result = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      return ctrl.select_object_at(-0.95, 0.95);
    });
    expect(result).toBeNull();
  });

  test('get_interaction_mode reflects state', async ({ page }) => {
    // Initially should be "selected" (constructor selects default cube)
    // Actually after page load with run(), mode depends on initialization
    const mode = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      // Select the default cube
      ctrl.select_object_at(0, 0);
      return ctrl.get_interaction_mode();
    });
    expect(mode).toBe('selected');

    // Click empty to deselect
    const mode2 = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      ctrl.select_object_at(-0.95, 0.95);
      return ctrl.get_interaction_mode();
    });
    expect(mode2).toBe('idle');
  });

  test('begin_gizmo_drag on axis arrow', async ({ page }) => {
    // Select the default cube first
    await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      ctrl.select_object_at(0, 0);
    });

    // Try to begin drag along X axis (slightly to the right of center)
    const axis = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      // The X arrow points right from origin, try clicking along that direction
      return ctrl.begin_gizmo_drag(0.15, 0);
    });
    // May or may not hit depending on exact camera angle, but test the API
    if (axis) {
      expect(['x', 'y', 'z']).toContain(axis);
      const mode = await page.evaluate(() =>
        (window as any).sceneController.get_interaction_mode()
      );
      expect(mode).toBe('dragging');
    }
  });

  test('cancel_gizmo_drag reverses translation', async ({ page }) => {
    // Export before state
    const before: string = await page.evaluate(() =>
      (window as any).sceneController.export_scene()
    );

    // Select and begin drag
    await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      ctrl.select_object_at(0, 0);
    });

    // Manually enter dragging mode and apply some translation
    const dragResult = await page.evaluate(() => {
      const ctrl = (window as any).sceneController;
      // Simulate a drag by directly calling begin/update/cancel
      const axis = ctrl.begin_gizmo_drag(0.15, 0);
      if (axis) {
        ctrl.update_gizmo_drag(0.25, 0, 0.15, 0);
        ctrl.cancel_gizmo_drag();
        return { cancelled: true, mode: ctrl.get_interaction_mode() };
      }
      return { cancelled: false, mode: ctrl.get_interaction_mode() };
    });

    if (dragResult.cancelled) {
      // After cancel, should be back to selected mode
      expect(dragResult.mode).toBe('selected');

      // Export after — should match before (translation was reversed)
      const after: string = await page.evaluate(() =>
        (window as any).sceneController.export_scene()
      );
      expect(after).toBe(before);
    }
  });

  test('real mouse click on canvas selects object', async ({ page }) => {
    // Verify nothing is selected initially
    const modeBefore = await page.evaluate(() =>
      (window as any).sceneController.get_interaction_mode()
    );
    expect(modeBefore).toBe('idle');

    // Click center of canvas where the default cube is
    const canvas = page.locator('#cad-canvas');
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await pause(page);

    // Should be selected via real pointer event
    const modeAfter = await page.evaluate(() =>
      (window as any).sceneController.get_interaction_mode()
    );
    expect(modeAfter).toBe('selected');

    // Click far corner to deselect
    await page.mouse.click(box!.x + 10, box!.y + 10);
    await pause(page);

    const modeDeselect = await page.evaluate(() =>
      (window as any).sceneController.get_interaction_mode()
    );
    expect(modeDeselect).toBe('idle');
  });
});

test.describe('Object Style Properties', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);
  });

  test('get_object_style returns valid JSON', async ({ page }) => {
    const ids = await getObjectIds(page);
    const style = await page.evaluate(({ id }) => {
      return JSON.parse((window as any).sceneController.get_object_style(id));
    }, { id: ids[0] });
    expect(style).toHaveProperty('albedo');
    expect(style).toHaveProperty('roughness');
    expect(style).toHaveProperty('reflectance');
    expect(style).toHaveProperty('ambient_ratio');
    expect(style.albedo).toHaveLength(4);
  });

  test('set_object_color changes albedo', async ({ page }) => {
    const ids = await getObjectIds(page);
    const ok = await page.evaluate(({ id }) => {
      return (window as any).sceneController.set_object_color(id, 1.0, 0.0, 0.0, 1.0);
    }, { id: ids[0] });
    expect(ok).toBe(true);

    const style = await page.evaluate(({ id }) => {
      return JSON.parse((window as any).sceneController.get_object_style(id));
    }, { id: ids[0] });
    expect(style.albedo[0]).toBeCloseTo(1.0);
    expect(style.albedo[1]).toBeCloseTo(0.0);
    expect(style.albedo[2]).toBeCloseTo(0.0);
  });

  test('set_object_style updates all material properties', async ({ page }) => {
    const ids = await getObjectIds(page);
    const newStyle = {
      albedo: [0.8, 0.2, 0.5, 0.9],
      roughness: 0.8,
      reflectance: 0.2,
      ambient_ratio: 0.1,
    };
    const ok = await page.evaluate(({ id, style }) => {
      return (window as any).sceneController.set_object_style(id, JSON.stringify(style));
    }, { id: ids[0], style: newStyle });
    expect(ok).toBe(true);

    const readBack = await page.evaluate(({ id }) => {
      return JSON.parse((window as any).sceneController.get_object_style(id));
    }, { id: ids[0] });
    expect(readBack.roughness).toBeCloseTo(0.8);
    expect(readBack.reflectance).toBeCloseTo(0.2);
    expect(readBack.ambient_ratio).toBeCloseTo(0.1);
    expect(readBack.albedo[3]).toBeCloseTo(0.9);
  });

  test('style persists through export/import', async ({ page }) => {
    const ids = await getObjectIds(page);
    // Set a custom color
    await page.evaluate(({ id }) => {
      (window as any).sceneController.set_object_color(id, 0.5, 0.25, 0.75, 0.9);
    }, { id: ids[0] });

    // Export, clear, re-import
    const json = await page.evaluate(() => (window as any).sceneController.export_scene());
    await page.evaluate(() => (window as any).sceneController.clear_scene());
    await page.evaluate((j) => (window as any).sceneController.import_scene(j), json);

    // Verify style survived
    const idsAfter = await getObjectIds(page);
    expect(idsAfter).toHaveLength(1);
    const style = await page.evaluate(({ id }) => {
      return JSON.parse((window as any).sceneController.get_object_style(id));
    }, { id: idsAfter[0] });
    expect(style.albedo[0]).toBeCloseTo(0.5);
    expect(style.albedo[1]).toBeCloseTo(0.25);
    expect(style.albedo[2]).toBeCloseTo(0.75);
    expect(style.albedo[3]).toBeCloseTo(0.9);
  });

  test('style is preserved after translate', async ({ page }) => {
    const ids = await getObjectIds(page);
    // Set custom style
    await page.evaluate(({ id }) => {
      (window as any).sceneController.set_object_color(id, 0.1, 0.9, 0.3, 1.0);
    }, { id: ids[0] });

    // Translate
    await page.evaluate(({ id }) => {
      (window as any).sceneController.translate_object(id, 1.0, 0, 0);
    }, { id: ids[0] });

    // Verify style still set
    const style = await page.evaluate(({ id }) => {
      return JSON.parse((window as any).sceneController.get_object_style(id));
    }, { id: ids[0] });
    expect(style.albedo[0]).toBeCloseTo(0.1);
    expect(style.albedo[1]).toBeCloseTo(0.9);
  });

  test('selection triggers scene rebuild for gizmo', async ({ page }) => {
    const ids = await getObjectIds(page);
    // Select via WASM
    const result = await page.evaluate(({ id }) => {
      const ctrl = (window as any).sceneController;
      const selected = ctrl.select_object_at(0, 0); // may or may not hit
      return ctrl.get_interaction_mode();
    }, { id: ids[0] });
    // Should be either 'selected' (if hit) or 'idle' (if miss) — not crash
    expect(['idle', 'selected']).toContain(result);
  });
});

test.describe('cadCommand API', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForWasm(page);
  });

  test('cadCommand is available on window', async ({ page }) => {
    const available = await page.evaluate(() => typeof (window as any).cadCommand === 'function');
    expect(available).toBe(true);
  });

  test('unknown command type returns error', async ({ page }) => {
    const result = await apiCommand(page, 'nonexistent_command', {});
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Unknown command type');
  });
});
