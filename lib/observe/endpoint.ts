/**
 * Hono routes for the structured log buffer.
 *
 * Prefer setupLog() for one-liner setup. Use createLogRoutes() directly only
 * when you need custom mount paths or non-standard wiring.
 *
 *   import { createLogRoutes } from '../../lib/observe/endpoint'
 *   app.route('/api/debug', createLogRoutes(buffer, buildLogConfig('truck-cad')))
 */

import { Hono, type Context } from 'hono'
import { LogBuffer, type LogEntry, type LogSource, type LogLevel, type LogKind, type EntryFilter } from './index'
import type { LogRoutesConfig } from './config'
import { LogEntryArraySchema } from './shared/schemas.zod'

export type { LogRoutesConfig }

interface CfLinks {
  workerName: string | null
  productionUrl: string | null
  cfLogs: string | null
  cfTraces: string | null
  cfAnalytics: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────

/** Extract EntryFilter from query string — shared by GET /logs and GET /logs/tail */
function parseFilter(c: Context): EntryFilter {
  const q = (k: string) => c.req.query(k) || undefined
  return {
    source: q('source') as LogSource | undefined,
    system: q('system'),
    kind: q('kind') as LogKind | undefined,
    level: q('level') as LogLevel | undefined,
    event: q('event'),
    since: q('since') ?? undefined,
    limit: q('limit') ? Number(q('limit')) : undefined,
  }
}

function buildCfLinks(config?: LogRoutesConfig): CfLinks {
  const none: CfLinks = { workerName: null, productionUrl: null, cfLogs: null, cfTraces: null, cfAnalytics: null }
  if (!config?.workerName) return none
  const productionUrl = config.productionUrl || null
  if (!config.accountId) return { ...none, workerName: config.workerName, productionUrl }

  const base = `https://dash.cloudflare.com/${config.accountId}/workers/services/view/${config.workerName}/production`
  return {
    workerName: config.workerName,
    productionUrl,
    cfLogs: `${base}/logs/live`,
    cfTraces: `${base}/observability`,
    cfAnalytics: `https://dash.cloudflare.com/${config.accountId}/workers/analytics/overview`,
  }
}

const LOG_BASE = '/api/debug/logs'

function urlSet(base: string) {
  return { tail: `${base}/tail`, api: base }
}

// ── Route factory ─────────────────────────────────────────────────────

export function createLogRoutes(buffer: LogBuffer, config?: LogRoutesConfig): Hono {
  const buf = buffer
  const cfg = config

  const routes = new Hono()
  const cf = buildCfLinks(cfg)

  // GET /logs — JSON buffer dump with filters
  routes.get('/logs', (c) => {
    const entries = buf.getEntries(parseFilter(c))
    return c.json({ count: entries.length, entries })
  })

  // GET /logs/tail — SSE stream (poll-based, CF Workers safe)
  routes.get('/logs/tail', (c) => {
    const filter = parseFilter(c)
    const encoder = new TextEncoder()
    let lastTs = ''
    let sentAtLastTs = 0  // count of entries already sent with lastTs
    let aborted = false

    const stream = new ReadableStream({
      async start(controller) {
        c.req.raw.signal.addEventListener('abort', () => {
          aborted = true
          try { controller.close() } catch {}
        })

        // History
        for (const e of buf.getEntries({ ...filter, limit: 50 })) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`))
          if (e.ts > lastTs) { lastTs = e.ts; sentAtLastTs = 1 }
          else if (e.ts === lastTs) sentAtLastTs++
        }

        // Poll loop (500ms)
        while (!aborted) {
          await new Promise(r => setTimeout(r, 500))
          if (aborted) break
          const fresh = buf.getEntries({ ...filter, since: lastTs })
          // Skip entries we already sent: all with ts < lastTs, plus sentAtLastTs entries with ts === lastTs
          let skipCount = sentAtLastTs
          for (const e of fresh) {
            if (e.ts < lastTs) continue
            if (e.ts === lastTs && skipCount > 0) { skipCount--; continue }
            try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`)) }
            catch { aborted = true; break }
            if (e.ts > lastTs) { lastTs = e.ts; sentAtLastTs = 1 }
            else if (e.ts === lastTs) sentAtLastTs++
          }
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    })
  })

  // POST /logs/ingest — browser → worker flush
  // Validated against Rust-derived JSON Schema via generated Zod (shared/schemas.zod.ts)
  routes.post('/logs/ingest', async (c) => {
    const body = await c.req.json()
    const result = LogEntryArraySchema.safeParse(body)
    if (!result.success) {
      return c.json({ error: 'invalid log entries', issues: result.error.issues }, 400)
    }
    buf.ingest(result.data as LogEntry[])
    return c.json({ ingested: result.data.length })
  })

  // DELETE /logs — clear buffer
  routes.delete('/logs', (c) => { buf.clear(); return c.json({ cleared: true }) })

  // GET /logs/urls — all URLs as JSON (for scripts + agents)
  routes.get('/logs/urls', (c) => c.json({
    workerName: cf.workerName,
    local: urlSet(LOG_BASE),
    production: cf.productionUrl ? urlSet(`${cf.productionUrl}${LOG_BASE}`) : null,
    cf: cf.cfLogs ? { logs: cf.cfLogs, traces: cf.cfTraces, analytics: cf.cfAnalytics } : null,
  }))

  return routes
}

