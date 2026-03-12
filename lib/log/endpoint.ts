/**
 * Hono routes for the structured log buffer.
 *
 * Prefer setupLog() for one-liner setup. Use createLogRoutes() directly only
 * when you need custom mount paths or non-standard wiring.
 *
 *   import { createLogRoutes } from '../../lib/log/endpoint'
 *   app.route('/api/debug', createLogRoutes(buffer, buildLogConfig('truck-cad')))
 */

import { Hono, type Context } from 'hono'
import { LogBuffer, type LogEntry, type LogSource, type LogLevel, type LogKind, type EntryFilter } from './index'
import type { LogRoutesConfig } from './config'

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
  return { viewer: `${base}/viewer`, tail: `${base}/tail`, api: base }
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
  routes.post('/logs/ingest', async (c) => {
    const entries = await c.req.json<LogEntry[]>()
    if (!Array.isArray(entries)) return c.json({ error: 'expected array of LogEntry' }, 400)
    buf.ingest(entries)
    return c.json({ ingested: entries.length })
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

  // GET /logs/viewer — built-in log viewer
  routes.get('/logs/viewer', (c) => c.html(VIEWER_HTML))

  return routes
}

// ── Viewer HTML ───────────────────────────────────────────────────────
// Zero hardcoded URLs — fetches /urls at runtime.

const VIEWER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>plat-trunk log viewer</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1a1a2e;color:#e0e0e0;font-family:'SF Mono','Fira Code',monospace;font-size:13px}
.cf-bar{position:sticky;top:0;z-index:11;background:#0f3460;padding:6px 12px;display:flex;gap:12px;align-items:center;font-size:11px;border-bottom:1px solid #1a1a2e}
.cf-bar a{color:#60a5fa;text-decoration:none}.cf-bar a:hover{text-decoration:underline}
.cf-label{color:#a78bfa;font-weight:600}
.urls-btn{background:#1a1a2e;color:#60a5fa;border:1px solid #0f3460;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:11px;font-family:inherit;margin-left:auto}
.urls-panel{display:none;background:#0a1628;padding:10px 14px;font-size:11px;border-bottom:1px solid #0f3460;line-height:1.8}
.urls-panel.open{display:block}
.urls-panel a{color:#60a5fa;text-decoration:none;word-break:break-all}.urls-panel a:hover{text-decoration:underline}
.urls-panel .sl{color:#a78bfa;font-weight:600;margin-top:4px}
.toolbar{position:sticky;top:27px;background:#16213e;padding:8px 12px;display:flex;gap:8px;align-items:center;border-bottom:1px solid #0f3460;z-index:10}
.toolbar select,.toolbar input{background:#1a1a2e;color:#e0e0e0;border:1px solid #0f3460;padding:4px 8px;border-radius:4px;font-family:inherit;font-size:12px}
.toolbar button{background:#e94560;color:#fff;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px}
.toolbar button:hover{background:#c81e45}
.toolbar .status{margin-left:auto;font-size:11px;opacity:.7}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}
.dot.live{background:#4ade80;animation:pulse 2s infinite}.dot.dead{background:#ef4444}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
#log{padding:4px 0}
.entry{padding:2px 12px;display:flex;gap:8px;border-bottom:1px solid #1a1a2e}
.entry:hover{background:#16213e}
.entry .ts{color:#666;min-width:85px}
.entry .src{min-width:60px}.src.browser{color:#60a5fa}.src.worker{color:#a78bfa}
.entry .tag{min-width:150px;font-weight:600}
.entry .data{color:#94a3b8;word-break:break-all}
.entry.debug .tag{color:#666}.entry.info .tag{color:#4ade80}.entry.warn .tag{color:#fbbf24}
.entry.error{background:#2d1b1b}.entry.error .tag{color:#f87171}
.count{background:#0f3460;padding:2px 8px;border-radius:10px;font-size:11px}
</style>
</head>
<body>
<div class="cf-bar" id="cfBar" style="display:none"></div>
<div class="urls-panel" id="urlsPanel"></div>
<div class="toolbar">
  <select id="fSource"><option value="">all sources</option><option value="browser">browser</option><option value="worker">worker</option></select>
  <select id="fSystem"><option value="">all systems</option></select>
  <select id="fLevel"><option value="">all levels</option><option value="debug">debug+</option><option value="info">info+</option><option value="warn">warn+</option><option value="error">error</option></select>
  <input id="fEvent" placeholder="event filter" style="width:120px">
  <button onclick="clearLogs()">clear</button>
  <span class="count" id="count">0</span>
  <span class="status"><span class="dot" id="dot"></span><span id="connStatus">connecting...</span></span>
</div>
<div id="log"></div>
<script>
const $=id=>document.getElementById(id)
const logEl=$('log'),countEl=$('count'),dotEl=$('dot'),statusEl=$('connStatus')
const cfBar=$('cfBar'),urlsPanel=$('urlsPanel')
const systems=new Set()
let total=0,sse

fetch('urls').then(r=>r.json()).then(u=>{
  if(!u.workerName)return
  const L=[]
  if(u.production)L.push('<a href="'+u.production.viewer+'" target="_blank">prod viewer</a>')
  if(u.cf){L.push('<a href="'+u.cf.logs+'" target="_blank">CF Logs</a>');L.push('<a href="'+u.cf.traces+'" target="_blank">CF Traces</a>');L.push('<a href="'+u.cf.analytics+'" target="_blank">CF Analytics</a>')}
  L.push('<button class="urls-btn" onclick="toggleUrls()">urls</button>')
  cfBar.innerHTML='<span class="cf-label">'+u.workerName+'</span> '+L.join(' ')
  cfBar.style.display='flex'
  const o=location.origin,R=[]
  function row(label,url,ext){R.push('  '+label+': <a href="'+(ext?url:o+url)+'"'+(ext?' target="_blank"':'')+'>'+( ext?url:o+url)+'</a>')}
  R.push('<span class="sl">Local</span>');row('viewer',u.local.viewer);row('tail',u.local.tail);row('api',u.local.api)
  if(u.production){R.push('<span class="sl">Deployed</span>');row('viewer',u.production.viewer,1);row('tail',u.production.tail,1);row('api',u.production.api,1)}
  if(u.cf){R.push('<span class="sl">CF Dashboards</span>');row('logs',u.cf.logs,1);row('traces',u.cf.traces,1);row('analytics',u.cf.analytics,1)}
  urlsPanel.innerHTML=R.join('<br>')
})

function toggleUrls(){urlsPanel.classList.toggle('open')}

function connect(){
  const p=new URLSearchParams()
  const src=$('fSource').value,sys=$('fSystem').value,lvl=$('fLevel').value,evt=$('fEvent').value
  if(src)p.set('source',src);if(sys)p.set('system',sys);if(lvl)p.set('level',lvl);if(evt)p.set('event',evt)
  if(sse)sse.close()
  logEl.innerHTML='';total=0;dotEl.className='dot';statusEl.textContent='connecting...'
  sse=new EventSource('tail'+(p.toString()?'?'+p:''))
  sse.onopen=()=>{dotEl.className='dot live';statusEl.textContent='live'}
  sse.onerror=()=>{dotEl.className='dot dead';statusEl.textContent='reconnecting...'}
  sse.onmessage=e=>addEntry(JSON.parse(e.data))
}

function addEntry(e){
  if(!systems.has(e.system)){systems.add(e.system);const o=document.createElement('option');o.value=e.system;o.textContent=e.system;$('fSystem').appendChild(o)}
  const d=new Date(e.ts),ts=d.toLocaleTimeString('en',{hour12:false})+'.'+String(d.getMilliseconds()).padStart(3,'0')
  const data=Object.keys(e).filter(k=>!['ts','source','system','event','level'].includes(k)).map(k=>k+'='+JSON.stringify(e[k])).join(' ')
  const div=document.createElement('div');div.className='entry '+e.level
  div.innerHTML='<span class="ts">'+ts+'</span><span class="src '+e.source+'">'+e.source+'</span><span class="tag">['+e.system+':'+e.event+']</span><span class="data">'+data+'</span>'
  logEl.appendChild(div);total++;countEl.textContent=total;div.scrollIntoView({block:'end'})
}

function clearLogs(){fetch('.',{method:'DELETE'});logEl.innerHTML='';total=0;countEl.textContent='0'}

$('fSource').onchange=connect;$('fSystem').onchange=connect;$('fLevel').onchange=connect;$('fEvent').onchange=connect
connect()
</script>
</body>
</html>`
