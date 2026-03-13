/**
 * One-liner observability setup for any Hono worker.
 *
 *   import { Hono } from 'hono'
 *   import { setupLog, type LogEnv } from '../../lib/observe'
 *
 *   const app = new Hono<LogEnv>()
 *   const { createLogger } = setupLog(app, 'truck-cad')
 *
 *   // In handlers: c.var.log.info('merge', { modelId })
 *   // createLogger('sync') for worker-side loggers outside request context
 *
 * Wires: LogBuffer + observabilityMiddleware + errorHandler + debug routes + CF dashboard links.
 */

import type { Hono } from 'hono'
import { LogBuffer, type LogBufferOptions, type Logger } from './index'
import { observabilityMiddleware, errorHandler } from './middleware'
import { createLogRoutes } from './endpoint'
import { buildLogConfig } from './config'

// ── Types ─────────────────────────────────────────────────────────────

export interface SetupLogOptions extends LogBufferOptions {
  /** Mount path for debug routes (tail, API). Default: '/api/debug' */
  debugPath?: string
  /** Override production URL for CF dashboard links */
  productionUrl?: string
}

export interface LogUrls {
  /** Local debug route paths (relative, no host) */
  local: { tail: string; api: string }
  /** Production URLs (absolute) — null if no production URL configured */
  production: { tail: string; api: string } | null
  /** CF dashboard links — null if no accountId */
  cf: { logs: string; traces: string; analytics: string } | null
  /** Worker name from cf-deploy.json */
  workerName: string
}

export interface SetupLogResult {
  /** Create a logger for a subsystem — the primary API for worker-side logging */
  createLogger: (system: string, ctx?: Record<string, unknown>) => Logger
  /** Pre-built URLs for viewer, tail, API, CF dashboards */
  urls: LogUrls
  /** Raw buffer — escape hatch for subscribers, getEntries, direct push */
  buffer: LogBuffer
}

// ── Helpers ───────────────────────────────────────────────────────────

function buildUrls(debugPath: string, config: ReturnType<typeof buildLogConfig>): LogUrls {
  const logBase = `${debugPath}/logs`
  const local = { tail: `${logBase}/tail`, api: logBase }

  const production = config.productionUrl
    ? {
        tail: `${config.productionUrl}${logBase}/tail`,
        api: `${config.productionUrl}${logBase}`,
      }
    : null

  const cf = config.accountId
    ? {
        logs: `https://dash.cloudflare.com/${config.accountId}/workers/services/view/${config.workerName}/production/logs/live`,
        traces: `https://dash.cloudflare.com/${config.accountId}/workers/services/view/${config.workerName}/production/observability`,
        analytics: `https://dash.cloudflare.com/${config.accountId}/workers/analytics/overview`,
      }
    : null

  return { local, production, cf, workerName: config.workerName }
}

// ── Setup ─────────────────────────────────────────────────────────────

/**
 * Wire full observability into a Hono app in one call.
 *
 * @param app - Your Hono app instance (use `new Hono<LogEnv>()` for typed c.var.log)
 * @param service - Worker/service name (e.g. 'truck-cad', 'log-demo')
 * @param opts - Optional overrides for buffer config and mount paths
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setupLog(app: Hono<any>, service: string, opts: SetupLogOptions = {}): SetupLogResult {
  const buffer = new LogBuffer({ source: 'worker', service, ...opts })
  const debugPath = opts.debugPath ?? '/api/debug'
  const config = buildLogConfig(service, opts.productionUrl)

  app.use('*', observabilityMiddleware(buffer, service))
  app.onError(errorHandler(buffer))
  app.route(debugPath, createLogRoutes(buffer, config))

  return {
    createLogger: (system, ctx?) => buffer.createLogger(system, ctx),
    urls: buildUrls(debugPath, config),
    buffer,
  }
}
