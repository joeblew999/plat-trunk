// Shared test helpers for truck worker tests.
// All test files import from here instead of duplicating setup.

import { SELF } from 'cloudflare:test';

export async function req(path: string, init?: RequestInit) {
  return SELF.fetch(`https://test-host${path}`, init);
}

export async function json(path: string, init?: RequestInit) {
  const res = await req(path, init);
  return { status: res.status, body: await res.json() as any };
}

export async function mcpCall(body: unknown): Promise<{ status: number; body: any }> {
  const res = await req('/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept': 'application/json, text/event-stream' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() as any };
}

export const INIT_MSG = {
  jsonrpc: '2.0', id: 0, method: 'initialize',
  params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } },
};

/** Build a full op object for testing. */
export function makeOp(type: string, params: Record<string, unknown>, actorId = 'test-actor') {
  return {
    id: crypto.randomUUID(), type, params,
    enabled: true, timestamp: Date.now(), actorId, groupId: null,
  };
}
