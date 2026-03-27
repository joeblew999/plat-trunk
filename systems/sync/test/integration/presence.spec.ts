import { test, expect, type Page } from '@playwright/test';

async function waitForReady(page: Page) {
  await page.waitForFunction(() => !!(window as any).__sync, { timeout: 15_000 });
}

test.describe('@plat/sync integration — presence', () => {
  test('setPresence shows in presence bar', async ({ page }) => {
    await page.goto(`/?model=pres-${Date.now()}&reset=1`);
    await waitForReady(page);

    await page.getByTestId('actor-A-presence').click();
    await page.waitForFunction(
      () => document.getElementById('presence-bar')?.textContent?.includes('actor-A'),
      { timeout: 5_000 },
    );
    expect(await page.locator('#presence-bar').textContent()).toContain('actor-A');
  });
});
