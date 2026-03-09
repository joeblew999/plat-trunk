/**
 * Test Infrastructure Health (ADR-0026 Phase 7)
 *
 * Catches infrastructure regressions early:
 * - Bootstrapping completes within budget
 * - Model isolation works (fresh model has default cube only)
 * - Completion contract holds (WASM state available immediately after apiCommand)
 * - IDB cleanup doesn't break load
 * - App ready signal includes all subsystems
 */
import { test, expect } from '@playwright/test';
import { waitForReady, getObjectCount, apiCommand } from './helpers';

test.describe('Test Infrastructure Health', () => {
  test('bootstrapping completes within 5s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/?model=health-check&reset=1');
    await waitForReady(page);
    expect(Date.now() - start).toBeLessThan(5_000);
  });

  test('model isolation — fresh model has default cube only', async ({ page }) => {
    await page.goto(`/?model=isolation-${Date.now()}&reset=1`);
    await waitForReady(page);
    expect(await getObjectCount(page)).toBe(1);
  });

  test('completion contract — WASM state available immediately after apiCommand', async ({ page }) => {
    await page.goto(`/?model=contract-${Date.now()}&reset=1`);
    await waitForReady(page);
    // No pause, no wait — WASM state must be available immediately
    await apiCommand(page, 'add_cube', { size: 1 });
    expect(await getObjectCount(page)).toBe(2);
  });

  test('app ready signal includes all subsystems', async ({ page }) => {
    await page.goto('/?model=ready-check&reset=1');
    await waitForReady(page);

    // Verify all subsystems are actually ready (not just the flag)
    expect(await page.evaluate(() => !!(window as any).sceneController)).toBe(true);
    expect(await page.evaluate(() => typeof (window as any).cadCommand)).toBe('function');
    expect(await page.evaluate(() => !!(window as any).cadDocManager?.handle)).toBe(true);
  });
});
