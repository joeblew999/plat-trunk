/**
 * shared/mcp.ts — MCP server factory for the observe log buffer.
 *
 * Mounts a JSON-RPC 2.0 endpoint at POST /mcp on any Hono app.
 * Each demo worker mounts this with its own buffer (local queries).
 * demo-main mounts a federated version that queries all demos via service bindings.
 *
 * Tools (inputSchema derived from Rust structs via schemars → schemas.json):
 *   query_logs  — filter entries by level/system/kind/source/event/since/limit
 *   get_trace   — all entries for a W3C traceId
 *   get_stats   — count, dropped, service, source
 *   clear_logs  — clear the buffer
 *
 * AI agent setup (add to .mcp.json):
 *   { "observe": { "url": "http://localhost:3333/mcp" } }
 *   { "observe": { "url": "http://localhost:3335/mcp" } }  ← demo-main (federated)
 */

import { Hono } from 'hono'
import type { LogBuffer, LogEntry, EntryFilter } from '../index'

// ── Tool schemas — pulled from schemars output (schemas.json) ─────────────────
// We inline the relevant parts so mcp.ts has zero runtime file-read dependencies.
// Run `bun run gen:types` if Rust types change, then update these to match schemas.json.

const LOG_LEVEL_SCHEMA = { type: 'string', enum: ['debug', 'info', 'warn', 'error'] }
const LOG_KIND_SCHEMA  = { type: 'string', enum: ['http', 'app', 'error'] }

const ENTRY_FILTER_SCHEMA = {
  type: 'object',
  description: 'All fields optional. Combine freely.',
  properties: {
    source: { type: 'string', description: 'Log source: browser | worker | custom' },
    system: { type: 'string', description: 'Subsystem name, e.g. sync, truck' },
    kind:   LOG_KIND_SCHEMA,
    level:  LOG_LEVEL_SCHEMA,
    event:  { type: 'string', description: 'Event name to match exactly' },
    since:  { type: 'string', format: 'date-time', description: 'ISO timestamp — return entries with ts >= since' },
    limit:  { type: 'integer', minimum: 1, maximum: 1000, description: 'Max entries to return' },
  },
}

const TOOLS = [
  {
    name: 'query_logs',
    description: 'Query log entries from the buffer. Filter by level, system, kind, source, event, since (ISO timestamp), limit. Returns matching entries sorted by timestamp.',
    inputSchema: ENTRY_FILTER_SCHEMA,
  },
  {
    name: 'get_trace',
    description: 'Get all log entries for a specific W3C trace ID. Useful for following a request across systems.',
    inputSchema: {
      type: 'object',
      required: ['traceId'],
      properties: {
        traceId: { type: 'string', description: 'W3C trace ID — 32 lowercase hex chars from the traceparent header' },
      },
    },
  },
  {
    name: 'get_stats',
    description: 'Get buffer statistics: total entry count, dropped count (rate-limited), service name, and source.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'clear_logs',
    description: 'Clear the in-memory log buffer. Use with caution — entries cannot be recovered after clearing.',
    inputSchema: { type: 'object', properties: {} },
  },
]

// ── JSON-RPC 2.0 types ────────────────────────────────────────────────────────

interface McpRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

function ok(id: string | number, result: unknown) {
  return { jsonrpc: '2.0' as const, id, result }
}
function mcpErr(id: string | number, code: number, message: string) {
  return { jsonrpc: '2.0' as const, id, error: { code, message } }
}

// ── Tool handler ──────────────────────────────────────────────────────────────

async function callTool(name: string, args: Record<string, unknown>, buffer: LogBuffer): Promise<string> {
  switch (name) {
    case 'query_logs': {
      const filter = args as EntryFilter
      const entries = buffer.getEntries(filter)
      return JSON.stringify({ count: entries.length, entries }, null, 2)
    }
    case 'get_trace': {
      const traceId = String(args.traceId ?? '')
      if (!traceId) return JSON.stringify({ error: 'traceId is required' })
      const entries = buffer.getEntries({}).filter((e: LogEntry) => e.traceId === traceId)
      return JSON.stringify({ traceId, count: entries.length, entries }, null, 2)
    }
    case 'get_stats': {
      const entries = buffer.getEntries({})
      const dropped = buffer.drainDropped()
      return JSON.stringify({
        count: entries.length,
        dropped,
        source: buffer.source,
        service: buffer.service,
      }, null, 2)
    }
    case 'clear_logs': {
      buffer.clear()
      return JSON.stringify({ cleared: true })
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

// ── Mount on a Hono app ───────────────────────────────────────────────────────

export function mountMcpRoutes(app: Hono<any>, buffer: LogBuffer): void {
  app.post('/mcp', async (c) => {
    const req = await c.req.json<McpRequest>()
    const { id, method, params = {} } = req

    switch (method) {
      case 'initialize':
        return c.json(ok(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'plat-observe', version: '0.1.0' },
        }))

      case 'tools/list':
        return c.json(ok(id, { tools: TOOLS }))

      case 'tools/call': {
        const { name, arguments: toolArgs = {} } = params as { name: string; arguments: Record<string, unknown> }
        const text = await callTool(name, toolArgs, buffer)
        return c.json(ok(id, { content: [{ type: 'text', text }] }))
      }

      default:
        return c.json(mcpErr(id, -32601, `Method not found: ${method}`), 400)
    }
  })
}

// ── Federated mount (demo-main) ───────────────────────────────────────────────
//
// Calls each sub-worker's /mcp endpoint via CF service bindings and merges results.
// The federated tools add a `source` prefix so the agent knows which worker responded.

export interface FederatedSource {
  name: string
  binding: { fetch(r: Request): Promise<Response> }
}

export function mountFederatedMcpRoutes(app: Hono<any>, sources: FederatedSource[]): void {
  // Build federated tools — each source gets its own query_logs + get_trace
  const federatedTools = [
    {
      name: 'list_sources',
      description: 'List all available observe workers and their names.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'query_all_logs',
      description: `Query logs from ALL workers (${sources.map(s => s.name).join(', ')}) and merge results, sorted by timestamp.`,
      inputSchema: ENTRY_FILTER_SCHEMA,
    },
    ...sources.map(s => ({
      name: `query_logs_${s.name}`,
      description: `Query logs from the ${s.name} worker only.`,
      inputSchema: ENTRY_FILTER_SCHEMA,
    })),
    ...sources.map(s => ({
      name: `get_trace_${s.name}`,
      description: `Get all entries for a trace ID from the ${s.name} worker.`,
      inputSchema: {
        type: 'object',
        required: ['traceId'],
        properties: { traceId: { type: 'string' } },
      },
    })),
    {
      name: 'get_stats_all',
      description: 'Get buffer stats from all workers.',
      inputSchema: { type: 'object', properties: {} },
    },
  ]

  app.post('/mcp', async (c) => {
    const req = await c.req.json<McpRequest>()
    const { id, method, params = {} } = req

    switch (method) {
      case 'initialize':
        return c.json(ok(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'plat-observe-federated', version: '0.1.0' },
        }))

      case 'tools/list':
        return c.json(ok(id, { tools: federatedTools }))

      case 'tools/call': {
        const { name, arguments: toolArgs = {} } = params as { name: string; arguments: Record<string, unknown> }
        const text = await callFederatedTool(name, toolArgs, sources)
        return c.json(ok(id, { content: [{ type: 'text', text }] }))
      }

      default:
        return c.json(mcpErr(id, -32601, `Method not found: ${method}`), 400)
    }
  })
}

async function callFederatedTool(
  name: string,
  args: Record<string, unknown>,
  sources: FederatedSource[],
): Promise<string> {
  if (name === 'list_sources') {
    return JSON.stringify({ sources: sources.map(s => s.name) })
  }

  if (name === 'query_all_logs') {
    const results = await Promise.all(sources.map(s => proxyMcpCall(s, 'query_logs', args)))
    const allEntries: (LogEntry & { _source: string })[] = []
    for (const { name: srcName, result } of results) {
      const r = JSON.parse(result)
      for (const e of r.entries ?? []) {
        allEntries.push({ ...e, _source: srcName })
      }
    }
    allEntries.sort((a, b) => a.ts < b.ts ? -1 : 1)
    return JSON.stringify({ count: allEntries.length, entries: allEntries }, null, 2)
  }

  if (name === 'get_stats_all') {
    const results = await Promise.all(sources.map(s => proxyMcpCall(s, 'get_stats', {})))
    const stats: Record<string, unknown> = {}
    for (const { name: srcName, result } of results) {
      stats[srcName] = JSON.parse(result)
    }
    return JSON.stringify(stats, null, 2)
  }

  // Routed single-source tools: query_logs_{name}, get_trace_{name}
  for (const prefix of ['query_logs_', 'get_trace_']) {
    if (name.startsWith(prefix)) {
      const srcName = name.slice(prefix.length)
      const src = sources.find(s => s.name === srcName)
      if (!src) return JSON.stringify({ error: `Unknown source: ${srcName}` })
      const tool = prefix === 'query_logs_' ? 'query_logs' : 'get_trace'
      const { result } = await proxyMcpCall(src, tool, args)
      return result
    }
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` })
}

async function proxyMcpCall(
  src: FederatedSource,
  tool: string,
  args: Record<string, unknown>,
): Promise<{ name: string; result: string }> {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: tool, arguments: args },
  })
  const resp = await src.binding.fetch(new Request('http://worker/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }))
  const json = await resp.json<any>()
  const text = json?.result?.content?.[0]?.text ?? JSON.stringify(json?.error ?? {})
  return { name: src.name, result: text }
}
