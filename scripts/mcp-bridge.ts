#!/usr/bin/env bun
/**
 * MCP stdio ↔ HTTP proxy with retry, hot-reload, and self-healing.
 *
 * ADR-0020: stdio connects FIRST (instant), URL resolves lazily on first request.
 * This ensures the MCP client never times out during initialization.
 *
 * Features:
 *   - Instant stdio init (no blocking on HTTP before listening)
 *   - Retry with exponential backoff (survives dev server restarts)
 *   - Schema version polling (hot-reload tools without AI client restart)
 *   - Graceful degradation: returns cad_bridge_status when Worker is down
 *   - Startup log file for post-mortem debugging
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
import { mkdirSync, appendFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const LOCAL_URL = 'http://localhost:8788';
const RETRY_ATTEMPTS = 6;
const RETRY_BASE_MS = 1000;
const POLL_INTERVAL_MS = 30_000;
const startedAt = Date.now();

// --- Logging ---
const LOG_DIR = join(homedir(), '.cache', 'truck-cad');
const LOG_FILE = join(LOG_DIR, 'mcp-bridge.log');

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.error(`[mcp-bridge] ${msg}`);
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG_FILE, line + '\n');
  } catch {
    // Can't write log — not fatal
  }
}

// --- URL Resolution (lazy, non-blocking) ---

let BASE_URL = LOCAL_URL;
let urlResolved = false;

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

/** Resolve the target URL (called lazily on first request) */
async function ensureUrl(): Promise<void> {
  if (urlResolved) return;
  urlResolved = true;

  // Explicit override always wins
  if (process.env.CAD_URL) {
    BASE_URL = process.env.CAD_URL;
    log(`CAD_URL set → ${BASE_URL}`);
    return;
  }

  // Try local dev server first (fastest path)
  if (await isReachable(LOCAL_URL)) {
    BASE_URL = LOCAL_URL;
    log(`Local dev server detected → ${BASE_URL}`);
    return;
  }

  // No local server — check for PR preview
  const prUrl = detectPrPreviewUrl();
  if (prUrl) {
    if (await isReachable(prUrl)) {
      BASE_URL = prUrl;
      log(`PR preview detected → ${BASE_URL}`);
      return;
    }
    log(`PR preview ${prUrl} not reachable, falling back to local`);
  }

  // Default: local (retry logic will handle waiting for server to start)
  BASE_URL = LOCAL_URL;
  log(`Waiting for local dev server → ${BASE_URL}`);
}

// --- HTTP Proxy with Retry ---

async function proxy(body: any): Promise<any> {
  await ensureUrl();
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
        log(`retry ${attempt + 1}/${RETRY_ATTEMPTS} in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw new Error(`Worker unreachable after ${RETRY_ATTEMPTS} attempts: ${lastError?.message}`);
}

// --- Bridge Status Tool (always available, no HTTP needed) ---

const BRIDGE_STATUS_TOOL = {
  name: 'cad_bridge_status',
  description: 'Check bridge connectivity to the CAD Worker. Always available, even when Worker is down.',
  inputSchema: { type: 'object' as const, properties: {} },
};

async function getBridgeStatus(): Promise<any> {
  let workerReachable = false;
  let lastError = '';
  let toolsCount = 0;

  try {
    await ensureUrl();
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3_000) });
    if (res.ok) {
      workerReachable = true;
      const health = await res.json() as any;
      toolsCount = 29; // known from schema
      lastVersion = health.version || lastVersion;
    }
  } catch (err: any) {
    lastError = err?.message || 'Unknown error';
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        bridge: 'connected',
        worker_url: BASE_URL,
        worker_reachable: workerReachable,
        schema_version: lastVersion || 'unknown',
        tools_count: toolsCount,
        uptime_ms: Date.now() - startedAt,
        ...(lastError ? { last_error: lastError, hint: 'Run: task up' } : {}),
      }, null, 2),
    }],
  };
}

// --- Server Setup ---

const server = new Server(
  { name: 'truck-cad-bridge', version: '1.0.0' },
  { capabilities: { tools: { listChanged: true } } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    const response = await proxy({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
    // Prepend bridge status tool to the Worker's tools
    const tools = [BRIDGE_STATUS_TOOL, ...(response.result?.tools || [])];
    return { tools };
  } catch (err: any) {
    // Worker down — return bridge-only tool so session doesn't fail
    log(`tools/list failed (${err.message}), returning bridge-only tool`);
    return { tools: [BRIDGE_STATUS_TOOL] };
  }
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Handle bridge status locally — no proxy needed
  if (request.params.name === 'cad_bridge_status') {
    return getBridgeStatus();
  }

  const response = await proxy({
    jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: request.params.name, arguments: request.params.arguments },
  });
  return response.result;
});

// --- Hot-reload: poll schema version, notify clients on change ---
let lastVersion = '';

async function pollVersion() {
  try {
    const res = await fetch(`${BASE_URL}/api/cad/schema`, { signal: AbortSignal.timeout(3_000) });
    const schema = await res.json() as any;
    const changed = lastVersion && schema.version !== lastVersion;
    if (changed) {
      log(`Schema ${lastVersion} → ${schema.version}, notifying client...`);
    }
    lastVersion = schema.version;
    if (changed) {
      await server.notification({ method: 'notifications/tools/list_changed' });
    }
  } catch {
    // Server might be down — that's fine, retry later
  }
}

// --- Lifecycle: stdio FIRST, URL lazy ---

const transport = new StdioServerTransport();

async function start() {
  log(`Bridge starting (bun ${Bun.version})`);

  // Connect stdio IMMEDIATELY — no blocking on HTTP
  await server.connect(transport);
  log('stdio transport connected');

  // URL resolution + version poll happen in background (non-blocking)
  ensureUrl()
    .then(() => log(`Proxy → ${BASE_URL}/mcp`))
    .then(() => pollVersion())
    .then(() => log(`Ready (${lastVersion || 'no schema yet'})`))
    .catch(() => log('Background URL resolution failed (will retry on request)'));

  setInterval(pollVersion, POLL_INTERVAL_MS);
}

start().catch((err) => {
  log(`Fatal: ${err}`);
  process.exit(1);
});
