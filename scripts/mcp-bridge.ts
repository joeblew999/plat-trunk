#!/usr/bin/env bun
/**
 * MCP stdio ↔ HTTP proxy with retry and hot-reload.
 *
 * Pure proxy: all tool definitions and command dispatch live in the Worker's
 * /mcp endpoint. This bridge just adapts the stdio transport and adds:
 *   - Retry with exponential backoff (survives dev server restarts)
 *   - Schema version polling (hot-reload tools without AI client restart)
 *   - Auto-detect: local dev server first, PR preview URL as fallback
 *
 * URL resolution (no CAD_URL set):
 *   1. http://localhost:8788 — if dev server is running (quick health check)
 *   2. PR preview URL — if current branch has an open PR on GitHub
 *   3. http://localhost:8788 — fallback (retry will kick in when server starts)
 *
 * Explicit override always wins:
 *   CAD_URL=https://cad.ubuntusoftware.net bun scripts/mcp-bridge.ts
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const LOCAL_URL = 'http://localhost:8788';
const RETRY_ATTEMPTS = 6;
const RETRY_BASE_MS = 1000;
const POLL_INTERVAL_MS = 30_000;

// --- URL Resolution ---

/** Quick health check — returns true if the URL responds within 1.5s */
async function isReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Check if current git branch has an open PR, return its preview URL */
function detectPrPreviewUrl(): string | null {
  try {
    const git = Bun.spawnSync(['git', 'rev-parse', '--abbrev-ref', 'HEAD']);
    const branch = git.stdout.toString().trim();
    if (!branch || branch === 'main' || branch === 'HEAD') return null;

    const gh = Bun.spawnSync(['gh', 'pr', 'view', '--json', 'number,state']);
    if (gh.exitCode !== 0) return null;
    const pr = JSON.parse(gh.stdout.toString());
    if (pr.number && pr.state === 'OPEN') {
      return `https://pr-${pr.number}-truck-cad.gedw99.workers.dev`;
    }
  } catch {
    // git or gh not available — fine, skip
  }
  return null;
}

/** Resolve the target URL with logging */
async function resolveBaseUrl(): Promise<string> {
  // Explicit override always wins
  if (process.env.CAD_URL) {
    console.error(`[mcp-bridge] CAD_URL set → ${process.env.CAD_URL}`);
    return process.env.CAD_URL;
  }

  // Try local dev server first (fastest path)
  if (await isReachable(LOCAL_URL)) {
    console.error(`[mcp-bridge] Local dev server detected → ${LOCAL_URL}`);
    return LOCAL_URL;
  }

  // No local server — check for PR preview
  const prUrl = detectPrPreviewUrl();
  if (prUrl) {
    if (await isReachable(prUrl)) {
      console.error(`[mcp-bridge] PR preview detected → ${prUrl}`);
      return prUrl;
    }
    console.error(`[mcp-bridge] PR preview ${prUrl} not reachable yet, falling back to local`);
  }

  // Default: local (retry logic will handle waiting for server to start)
  console.error(`[mcp-bridge] Waiting for local dev server → ${LOCAL_URL}`);
  return LOCAL_URL;
}

// --- HTTP Proxy with Retry ---
let BASE_URL = LOCAL_URL; // set properly in start()

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
  BASE_URL = await resolveBaseUrl();
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
