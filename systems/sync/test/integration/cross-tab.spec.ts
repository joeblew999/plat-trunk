import { test, expect, type Page } from '@playwright/test';

async function waitForReady(page: Page) {
  await page.waitForFunction(() => !!(window as any).__sync, { timeout: 15_000 });
}

async function waitForOpCount(page: Page, count: number) {
  await page.waitForFunction(
    async (n: number) => { const c = (window as any).__sync; return c && (await c.getOpCount()) === n; },
    count, { timeout: 8_000 },
  );
}

test.describe('@plat/sync integration — cross-tab BroadcastChannel', () => {
  test('Tab A op arrives at Tab B', async ({ browser }) => {
    const ctx = await browser.newContext();
    const modelId = `bc-${Date.now()}`;
    const tabB = await ctx.newPage();
    await tabB.goto(`/?model=${modelId}&actors=1&reset=1`);
    await waitForReady(tabB);
    const tabA = await ctx.newPage();
    await tabA.goto(`/?model=${modelId}&actors=1`);
    await waitForReady(tabA);

    await tabA.getByTestId('actor-A-add-op').click();
    await waitForOpCount(tabA, 1);
    await waitForOpCount(tabB, 1);
    await ctx.close();
  });

  test('Tab A undo propagates to Tab B', async ({ browser }) => {
    const ctx = await browser.newContext();
    const modelId = `undo-${Date.now()}`;
    const tabB = await ctx.newPage();
    await tabB.goto(`/?model=${modelId}&actors=1&reset=1`);
    await waitForReady(tabB);
    const tabA = await ctx.newPage();
    await tabA.goto(`/?model=${modelId}&actors=1`);
    await waitForReady(tabA);

    await tabA.getByTestId('actor-A-add-op').click();
    await waitForOpCount(tabA, 1);
    await waitForOpCount(tabB, 1);

    await tabA.getByTestId('actor-A-undo').click();
    await tabB.waitForFunction(async () => {
      const c = (window as any).__sync;
      if (!c) return false;
      const ops = await c.getOps();
      return ops.length === 1 && !ops[0].enabled;
    }, { timeout: 8_000 });
    await ctx.close();
  });
});
