/**
 * WASM API routes — mount onto any Hono app.
 *
 * Works in both Bun dev workers and CF Workers (no Bun-specific APIs).
 *
 *   import { mountWasmRoutes } from '../shared/wasm-routes'
 *   mountWasmRoutes(app)
 *
 * Mounts:
 *   GET  /api/demo/wasm/version  — crate version, proves WASM loaded
 *   GET  /api/demo/wasm/sample   — sampling decision (?rate=0.5&seed=N)
 *   POST /api/demo/wasm/scrub    — scrub sensitive fields from a JSON log entry
 */

import type { Hono } from 'hono'
import { loadObserveWasm } from './wasm'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mountWasmRoutes(app: Hono<any>): void {
  app.get('/api/demo/wasm/version', async (c) => {
    try {
      const wasm = await loadObserveWasm()
      return c.json({ version: wasm.observe_version(), status: 'ok' })
    } catch (e: unknown) {
      return c.json({ error: 'wasm not built — run: bun run build:wasm', detail: (e as Error)?.message }, 503)
    }
  })

  app.get('/api/demo/wasm/sample', async (c) => {
    try {
      const rate = parseFloat(c.req.query('rate') ?? '0.5')
      const seed = parseInt(c.req.query('seed') ?? String(Date.now() & 0xffffffff), 10)
      const wasm = await loadObserveWasm()
      return c.json({ keep: wasm.sample_keep(rate, seed), rate, seed })
    } catch (e: unknown) {
      return c.json({ error: 'wasm not built — run: bun run build:wasm', detail: (e as Error)?.message }, 503)
    }
  })

  app.post('/api/demo/wasm/scrub', async (c) => {
    try {
      const body = await c.req.text()
      const wasm = await loadObserveWasm()
      return new Response(wasm.scrub_entry(body), { headers: { 'Content-Type': 'application/json' } })
    } catch (e: unknown) {
      return c.json({ error: 'wasm not built — run: bun run build:wasm', detail: (e as Error)?.message }, 503)
    }
  })
}
