/**
 * SyncDoc E2E — real browser + real wrangler DO + real WebSocket.
 *
 * Each test gets a unique room. Playwright opens two browser contexts
 * (separate cookies/WS connections) that sync ops through the DO.
 */

import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:5199';

/** Create a page with a unique room and actor. */
async function openPeer(
  browser: ReturnType<typeof test['info']>['__proto__'] | any,
  room: string,
  actor: string,
  docId?: string,
): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const params = new URLSearchParams({ room, actor });
  if (docId) params.set('docId', docId);
  await page.goto(`${BASE}/e2e-index.html?${params.toString()}`);
  // Wait for SyncDoc to connect
  await page.waitForSelector('.status.connected', { timeout: 10000 });
  return page;
}

/** Get the docId from the page URL (set by main.ts after create). */
async function getDocId(page: Page): Promise<string> {
  await page.waitForFunction(() => {
    const url = new URL(window.location.href);
    return url.searchParams.has('docId');
  }, { timeout: 5000 });
  const url = new URL(page.url());
  return url.searchParams.get('docId')!;
}

/** Wait for ops-list to show N ops. */
async function waitForOpCount(page: Page, count: number) {
  await page.waitForFunction(
    (n) => document.getElementById('ops-list')?.getAttribute('data-op-count') === String(n),
    count,
    { timeout: 10000 },
  );
}

/** Wait for replay count. */
async function waitForReplayCount(page: Page, count: number) {
  await page.waitForFunction(
    (n) => document.getElementById('ops-list')?.getAttribute('data-replay-count') === String(n),
    count,
    { timeout: 10000 },
  );
}

test.describe('SyncDoc browser E2E', () => {
  test('single peer: add op shows in UI', async ({ browser }) => {
    const room = `e2e-single-${Date.now()}`;
    const page = await openPeer(browser, room, 'user-A');

    // Add an op via exposed function
    await page.evaluate(() => window.addTestOp('add_cube'));

    await waitForOpCount(page, 1);
    const opText = await page.locator('.op').first().textContent();
    expect(opText).toContain('add_cube');
    expect(opText).toContain('user-A');

    await page.screenshot({ path: '../screenshots/01-single-peer-add-op.png' });
    await page.context().close();
  });

  test('two peers: ops converge', async ({ browser }) => {
    const room = `e2e-converge-${Date.now()}`;

    // Peer A creates doc
    const pageA = await openPeer(browser, room, 'user-A');
    const docId = await getDocId(pageA);

    // Peer A adds an op
    await pageA.evaluate(() => window.addTestOp('add_cube'));
    await waitForOpCount(pageA, 1);

    // Peer B joins with same docId
    const pageB = await openPeer(browser, room, 'user-B', docId);

    // B should see A's op
    await waitForOpCount(pageB, 1);
    const opTextB = await pageB.locator('.op').first().textContent();
    expect(opTextB).toContain('add_cube');
    expect(opTextB).toContain('user-A');

    // B adds an op
    await pageB.evaluate(() => window.addTestOp('add_sphere'));

    // Both see 2 ops
    await waitForOpCount(pageA, 2);
    await waitForOpCount(pageB, 2);

    await pageA.screenshot({ path: '../screenshots/02-two-peers-converge-A.png' });
    await pageB.screenshot({ path: '../screenshots/02-two-peers-converge-B.png' });

    await pageA.context().close();
    await pageB.context().close();
  });

  test('undo/redo syncs between peers', async ({ browser }) => {
    const room = `e2e-undo-${Date.now()}`;

    const pageA = await openPeer(browser, room, 'user-A');
    const docId = await getDocId(pageA);

    // A adds op
    await pageA.evaluate(() => window.addTestOp('add_cube'));
    await waitForOpCount(pageA, 1);

    // B joins
    const pageB = await openPeer(browser, room, 'user-B', docId);
    await waitForOpCount(pageB, 1);

    // A undoes
    await pageA.evaluate(() => window.undoLast());
    await waitForReplayCount(pageA, 0);

    // B sees undo
    await waitForReplayCount(pageB, 0);
    const opB = await pageB.locator('.op').first();
    await expect(opB).toHaveClass(/disabled/);

    // A redoes
    await pageA.evaluate(() => window.redoLast());
    await waitForReplayCount(pageA, 1);

    // B sees redo
    await waitForReplayCount(pageB, 1);

    await pageA.screenshot({ path: '../screenshots/03-undo-redo-A.png' });
    await pageB.screenshot({ path: '../screenshots/03-undo-redo-B.png' });

    await pageA.context().close();
    await pageB.context().close();
  });

  test('multiple ops from both peers converge', async ({ browser }) => {
    const room = `e2e-multi-${Date.now()}`;

    const pageA = await openPeer(browser, room, 'user-A');
    const docId = await getDocId(pageA);
    const pageB = await openPeer(browser, room, 'user-B', docId);

    // A adds 2 ops
    await pageA.evaluate(() => { window.addTestOp('add_cube'); window.addTestOp('add_sphere'); });
    await waitForOpCount(pageA, 2);

    // B should see them
    await waitForOpCount(pageB, 2);

    // B adds 1 op
    await pageB.evaluate(() => window.addTestOp('add_cylinder'));

    // Both see 3
    await waitForOpCount(pageA, 3);
    await waitForOpCount(pageB, 3);

    // Replay count = 3 (all enabled)
    await waitForReplayCount(pageA, 3);
    await waitForReplayCount(pageB, 3);

    await pageA.screenshot({ path: '../screenshots/04-multi-ops-A.png' });
    await pageB.screenshot({ path: '../screenshots/04-multi-ops-B.png' });

    await pageA.context().close();
    await pageB.context().close();
  });
});
