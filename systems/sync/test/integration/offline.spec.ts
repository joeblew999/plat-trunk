import { test, expect, type Page } from '@playwright/test';

async function waitForReady(page: Page) {
  await page.waitForFunction(() => !!(window as any).__sync, { timeout: 15_000 });
}

test.describe('@plat/sync integration — offline/online', () => {
  test('go offline disables sync button, go online re-enables', async ({ page }) => {
    await page.goto(`/?model=off-${Date.now()}&reset=1`);
    await waitForReady(page);

    await page.getByTestId('actor-A-toggle-net').click();
    await page.waitForFunction(() => (window as any).__actors?.[0]?.online === false, { timeout: 3_000 });
    await expect(page.getByTestId('actor-A-sync')).toBeDisabled();

    await page.getByTestId('actor-A-toggle-net').click();
    await page.waitForFunction(() => (window as any).__actors?.[0]?.online === true, { timeout: 3_000 });
  });

  test('ops added while offline persist locally', async ({ page }) => {
    await page.goto(`/?model=off-ops-${Date.now()}&reset=1`);
    await waitForReady(page);

    await page.getByTestId('actor-A-toggle-net').click();
    await page.waitForFunction(() => !(window as any).__actors?.[0]?.online, { timeout: 3_000 });

    await page.getByTestId('actor-A-add-op').click();
    await page.waitForFunction(() => (window as any).__actors?.[0]?.opCount === 1, { timeout: 5_000 });
    expect(await page.getByTestId('actor-A-ops').textContent()).toContain('#1');
  });
});
