#!/usr/bin/env bun
/**
 * MCP stdio ↔ HTTP proxy with retry and hot-reload.
 *
 * Pure proxy: all tool definitions and command dispatch live in the Worker's
 * /mcp endpoint. This bridge just adapts the stdio transport and adds:
 *   - Retry with exponential backoff (survives dev server restarts)
 *   - Schema version polling (hot-reload tools without AI client restart)
 *
 * Works identically for dev and production — just change CAD_URL.
 *
 * Usage:
 *   bun scripts/mcp-bridge.ts                                   # localhost:8788
 *   CAD_URL=https://cad.ubuntusoftware.net bun scripts/mcp-bridge.ts  # production
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// --- Config ---
const BASE_URL = process.env.CAD_URL || 'http://localhost:8788';
const RETRY_ATTEMPTS = 6;
const RETRY_BASE_MS = 1000;
const POLL_INTERVAL_MS = 30_000;

// --- HTTP Proxy with Retry ---
async function proxy(body: any): Promise<any> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 202) return { result: {} };
      return await res.json();
    } catch (err: any) {
      lastError = err;
      if (attempt < RETRY_ATTEMPTS - 1) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt);
        console.error(`[mcp-bridge] retry ${attempt + 1}/${RETRY_ATTEMPTS} in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw new Error(`Worker unreachable after ${RETRY_ATTEMPTS} attempts: ${lastError?.message}`);
}

// --- Server Setup (pure proxy) ---
const server = new Server(
  { name: 'truck-cad-bridge', version: '1.0.0' },
  { capabilities: { tools: { listChanged: true } } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const response = await proxy({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
  return response.result;
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const response = await proxy({
    jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: request.params.name, arguments: request.params.arguments }
  });
  return response.result;
});

// --- Hot-reload: poll schema version, notify clients on change ---
let lastVersion = '';

async function pollVersion() {
  try {
    const res = await fetch(`${BASE_URL}/api/cad/schema`, { signal: AbortSignal.timeout(3_000) });
    const schema = await res.json() as any;
    if (lastVersion && schema.version !== lastVersion) {
      console.error(`[mcp-bridge] Schema ${lastVersion} → ${schema.version}, notifying client...`);
      await server.notification({ method: 'notifications/tools/list_changed' });
    }
    lastVersion = schema.version;
  } catch {
    // Server might be down — that's fine, retry later
  }
}

// --- Lifecycle ---
const transport = new StdioServerTransport();

async function start() {
  await server.connect(transport);
  console.error(`[mcp-bridge] Proxy → ${BASE_URL}/mcp`);

  // Initial version seed + periodic polling for hot-reload
  await pollVersion();
  setInterval(pollVersion, POLL_INTERVAL_MS);
}

start().catch((err) => {
  console.error(`[mcp-bridge] Fatal: ${err}`);
  process.exit(1);
});
