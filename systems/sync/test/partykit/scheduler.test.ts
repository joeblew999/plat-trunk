/**
 * partywhen tests — durable task scheduling via Durable Objects.
 *
 * Route: /parties/scheduler/:room
 * Scheduler DO persists tasks in SQLite, supports cron/delayed/one-shot.
 *
 * KNOWN ISSUE: partywhen's Scheduler uses ctx.storage.sql in the constructor,
 * which fails in miniflare local dev. These tests document the expected behavior
 * and will pass once deployed or once miniflare is fixed.
 * Upstream: https://github.com/cloudflare/partykit — partywhen SQL init
 *
 * Requires: npx wrangler dev --port 1999 (running)
 */

import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://127.0.0.1:1999/parties/scheduler';

describe('partywhen — scheduler (/parties/scheduler)', () => {
  // TODO: fails in miniflare — Scheduler SQL init crashes in constructor
  it.fails('scheduler returns status with timestamp and disk usage', async () => {
    const room = `scheduler-${Date.now()}`;
    const res = await fetch(`${BASE_URL}/${room}`);
    expect(res.ok).toBe(true);
    const json = await res.json() as any;
    expect(json.status).toBe('reachable');
    expect(json.timestamp).toBeGreaterThan(0);
    expect(typeof json.diskUsage).toBe('number');
  });
});
