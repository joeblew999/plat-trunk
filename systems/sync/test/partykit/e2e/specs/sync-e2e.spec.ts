/**
 * PartyKit full E2E — real browser + real wrangler DO + real PartyKit clients.
 *
 * Tests ALL routes:
 *   /parties/ops       → SyncDoc ops (automerge-repo)
 *   /parties/presence  → ephemeral cursor broadcast (PartySocket)
 *   /parties/pub-sub   → topic pub/sub (PartySocket)
 *   /parties/rpc       → JSON-RPC (PartySocket)
 *
 * Each test uses unique rooms. Playwright opens separate browser contexts
 * (isolated cookies/WS connections) for multi-peer tests.
 */

import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:5199';

async function openPeer(
  browser: any,
  room: string,
  actor: string,
  docId?: string,
): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const params = new URLSearchParams({ room, actor });
  if (docId) params.set('docId', docId);
  await page.goto(`${BASE}/e2e-index.html?${params.toString()}`);
  await page.waitForSelector('.status.connected', { timeout: 10000 });
  return page;
}

async function getDocId(page: Page): Promise<string> {
  await page.waitForFunction(() => new URL(window.location.href).searchParams.has('docId'), { timeout: 5000 });
  return new URL(page.url()).searchParams.get('docId')!;
}

async function waitForOpCount(page: Page, count: number) {
  await page.waitForFunction(
    (n) => document.getElementById('ops-list')?.getAttribute('data-op-count') === String(n),
    count, { timeout: 10000 },
  );
}

async function waitForReplayCount(page: Page, count: number) {
  await page.waitForFunction(
    (n) => document.getElementById('ops-list')?.getAttribute('data-replay-count') === String(n),
    count, { timeout: 10000 },
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// OPS — SyncDoc over automerge-repo
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Ops — SyncDoc (/parties/ops)', () => {
  test('single peer adds op', async ({ browser }) => {
    const page = await openPeer(browser, `e2e-single-${Date.now()}`, 'user-A');
    await page.evaluate(() => window.addTestOp('add_cube'));
    await waitForOpCount(page, 1);
    await expect(page.locator('.op').first()).toContainText('add_cube');
    await page.screenshot({ path: '../screenshots/01-ops-single.png' });
    await page.context().close();
  });

  test('two peers converge', async ({ browser }) => {
    const room = `e2e-converge-${Date.now()}`;
    const pageA = await openPeer(browser, room, 'user-A');
    const docId = await getDocId(pageA);
    await pageA.evaluate(() => window.addTestOp('add_cube'));
    await waitForOpCount(pageA, 1);

    const pageB = await openPeer(browser, room, 'user-B', docId);
    await waitForOpCount(pageB, 1);
    await pageB.evaluate(() => window.addTestOp('add_sphere'));
    await waitForOpCount(pageA, 2);
    await waitForOpCount(pageB, 2);

    await pageA.screenshot({ path: '../screenshots/02-ops-converge-A.png' });
    await pageB.screenshot({ path: '../screenshots/02-ops-converge-B.png' });
    await pageA.context().close();
    await pageB.context().close();
  });

  test('undo/redo syncs', async ({ browser }) => {
    const room = `e2e-undo-${Date.now()}`;
    const pageA = await openPeer(browser, room, 'user-A');
    const docId = await getDocId(pageA);
    await pageA.evaluate(() => window.addTestOp('add_cube'));
    await waitForOpCount(pageA, 1);

    const pageB = await openPeer(browser, room, 'user-B', docId);
    await waitForOpCount(pageB, 1);

    await pageA.evaluate(() => window.undoLast());
    await waitForReplayCount(pageB, 0);
    await expect(pageB.locator('.op').first()).toHaveClass(/disabled/);

    await pageA.evaluate(() => window.redoLast());
    await waitForReplayCount(pageB, 1);

    await pageA.screenshot({ path: '../screenshots/03-ops-undo-A.png' });
    await pageB.screenshot({ path: '../screenshots/03-ops-undo-B.png' });
    await pageA.context().close();
    await pageB.context().close();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PRESENCE — PartySocket ephemeral broadcast
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Presence — PartySocket (/parties/presence)', () => {
  test('cursor broadcast between peers', async ({ browser }) => {
    const room = `e2e-presence-${Date.now()}`;
    const pageA = await openPeer(browser, room, 'user-A');
    const pageB = await openPeer(browser, room, 'user-B');

    // Wait for both presence sockets to connect
    await pageA.waitForFunction(() => window.presenceSocket?.readyState === 1, { timeout: 5000 });
    await pageB.waitForFunction(() => window.presenceSocket?.readyState === 1, { timeout: 5000 });
    await new Promise(r => setTimeout(r, 300));

    // A sends cursor
    await pageA.evaluate(() => window.sendCursor(150, 250));

    // B should receive it
    await pageB.waitForFunction(
      () => document.getElementById('presence-messages')?.getAttribute('data-msg-count') === '1',
      { timeout: 5000 },
    );

    const msgText = await pageB.locator('.msg').first().textContent();
    expect(msgText).toContain('150');
    expect(msgText).toContain('250');
    expect(msgText).toContain('user-A');

    // Switch to presence tab for screenshot
    await pageB.click('.tab[data-panel="presence"]');
    await pageB.screenshot({ path: '../screenshots/04-presence-cursor.png' });

    await pageA.context().close();
    await pageB.context().close();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PUBSUB — PartySocket with topic filtering
// ═════════════════════════════════════════════════════════════════════════════

test.describe('PubSub — partysub (/parties/pub-sub)', () => {
  test('topic message reaches subscriber', async ({ browser }) => {
    const room = `e2e-pubsub-${Date.now()}`;
    const pageA = await openPeer(browser, room, 'user-A');
    const pageB = await openPeer(browser, room, 'user-B');

    await pageA.waitForFunction(() => window.pubsubSocket?.readyState === 1, { timeout: 5000 });
    await pageB.waitForFunction(() => window.pubsubSocket?.readyState === 1, { timeout: 5000 });
    await new Promise(r => setTimeout(r, 300));

    // A publishes on 'updates' topic
    await pageA.evaluate(() => window.publishTopic('updates', { text: 'hello from A' }));

    // B should receive (both subscribed to 'updates' by default)
    await pageB.waitForFunction(
      () => document.getElementById('pubsub-messages')?.getAttribute('data-msg-count') === '1',
      { timeout: 5000 },
    );

    const msgText = await pageB.locator('#pubsub-messages .msg').first().textContent();
    expect(msgText).toContain('updates');
    expect(msgText).toContain('hello from A');

    await pageB.click('.tab[data-panel="pubsub"]');
    await pageB.screenshot({ path: '../screenshots/05-pubsub-topic.png' });

    await pageA.context().close();
    await pageB.context().close();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// RPC — partyfn JSON-RPC
// ═════════════════════════════════════════════════════════════════════════════

test.describe('RPC — partyfn (/parties/rpc)', () => {
  test('echo + add + greet RPCs', async ({ browser }) => {
    const room = `e2e-rpc-${Date.now()}`;
    const page = await openPeer(browser, room, 'user-A');

    await page.waitForFunction(() => window.rpcSocket?.readyState === 1, { timeout: 5000 });

    // Echo
    const echoResult = await page.evaluate(() => window.rpcCall('echo', { hello: 'world' }));
    expect(echoResult.hello).toBe('world');

    // Add
    const addResult = await page.evaluate(() => window.rpcCall('add', { a: 3, b: 7 }));
    expect(addResult.sum).toBe(10);

    // Greet
    const greetResult = await page.evaluate(() => window.rpcCall('greet', { name: 'PartyKit' }));
    expect(greetResult.message).toBe('Hello, PartyKit!');

    await page.waitForFunction(
      () => document.getElementById('rpc-results')?.getAttribute('data-result-count') === '3',
      { timeout: 5000 },
    );

    await page.click('.tab[data-panel="rpc"]');
    await page.screenshot({ path: '../screenshots/06-rpc-calls.png' });

    await page.context().close();
  });
});
