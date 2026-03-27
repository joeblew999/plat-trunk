import { test, expect, type Page } from '@playwright/test';

async function waitForReady(page: Page) {
  await page.waitForFunction(() => !!(window as any).__sync, { timeout: 15_000 });
}

test.describe('@plat/sync integration — GUI basics', () => {
  test('boots and shows actors', async ({ page }) => {
    await page.goto(`/?model=boot-${Date.now()}&reset=1`);
    await waitForReady(page);
    expect(await page.locator('#actor-count').textContent()).toBe('2');
    await expect(page.getByTestId('actor-actor-A')).toBeVisible();
  });

  test('add op renders in ops list', async ({ page }) => {
    await page.goto(`/?model=add-${Date.now()}&reset=1`);
    await waitForReady(page);
    await page.getByTestId('actor-A-add-op').click();
    await page.waitForFunction(() => (window as any).__actors?.[0]?.opCount === 1, { timeout: 5_000 });
    expect(await page.getByTestId('actor-A-ops').textContent()).toContain('#1');
  });

  test('sync between two actors via real server + R2', async ({ page }) => {
    await page.goto(`/?model=sync-${Date.now()}&reset=1`);
    await waitForReady(page);

    await page.getByTestId('actor-A-add-op').click();
    await page.waitForFunction(() => (window as any).__actors?.[0]?.opCount === 1, { timeout: 5_000 });

    // A syncs to server (real HTTP → wrangler → R2)
    await page.evaluate(async () => { await (window as any).__actors[0].client.syncWithServer(); });

    // B syncs from server (real HTTP → wrangler → R2)
    await page.evaluate(async () => { await (window as any).__actors[1].client.syncWithServer(); });

    const bCount = await page.evaluate(async () => await (window as any).__actors[1].client.getOpCount());
    expect(bCount).toBe(1);
  });

  test('sync log shows events', async ({ page }) => {
    await page.goto(`/?model=log-${Date.now()}&reset=1`);
    await waitForReady(page);
    await page.getByTestId('actor-A-add-op').click();
    await page.waitForFunction(() => (window as any).__log?.some((e: any) => e.event === 'add_op'), { timeout: 5_000 });
    expect(await page.getByTestId('log-entries').textContent()).toContain('add_op');
  });
});
