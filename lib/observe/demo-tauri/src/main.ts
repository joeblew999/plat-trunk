/**
 * observe-tauri control panel.
 *
 * Manages the two demo worker windows and provides a native-vs-WASM parity
 * panel using tauri-specta typed commands.
 *
 * The demo UI itself lives in the WebviewWindow at localhost:3333 / :3334 —
 * this file only handles the native Tauri shell controls.
 */

import { commands, type WorkerStatus } from './bindings'

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  await refreshStatus()
  const version = await commands.nativeVersion()
  const el = document.getElementById('native-version')
  if (el) el.textContent = `plat-observe v${version} (native)`
}

// ── Worker status ─────────────────────────────────────────────────────────────

async function refreshStatus() {
  const workers = await commands.listWorkers()
  renderWorkers(workers)
}

function renderWorkers(workers: WorkerStatus[]) {
  const el = document.getElementById('workers')
  if (!el) return
  el.innerHTML = workers.map(w => `
    <div class="worker ${w.running ? 'running' : 'stopped'}">
      <span class="name">${w.name}</span>
      <span class="port">:${w.port}</span>
      <span class="status">${w.running ? '● running' : '○ stopped'}</span>
      <a href="${w.url}" target="_blank">${w.url}</a>
      ${w.running
        ? `<button onclick="stopWorker('${w.name}')">stop</button>`
        : `<button onclick="startWorker('${w.name}')">start</button>`
      }
    </div>
  `).join('')
}

// ── Worker controls ───────────────────────────────────────────────────────────

const w = globalThis as any

w.startWorker = async (name: string) => {
  await commands.startWorker(name)
  // Wait briefly for the process to bind its port, then refresh
  setTimeout(refreshStatus, 1500)
}

w.stopWorker = async (name: string) => {
  await commands.stopWorker(name)
  await refreshStatus()
}

// ── Native parity panel ───────────────────────────────────────────────────────

w.nativeScrub = async () => {
  const entry = { event: 'login', password: 'hunter2', token: 'secret-tok', userId: 'u1' }
  const result = await commands.nativeScrub(JSON.stringify(entry))
  log('scrub', result.changed
    ? `[REDACTED] ✓  ${result.scrubbed}`
    : `unchanged: ${result.scrubbed}`)
}

w.nativeSample = async (rate: number) => {
  const seed = Date.now() & 0xffffffff
  const result = await commands.nativeSample(rate, seed)
  log('sample', `rate=${result.rate} seed=${result.seed} → ${result.keep ? 'KEEP' : 'DROP'}`)
}

w.pingWorkers = async () => {
  const workers = await commands.listWorkers()
  for (const w of workers) {
    const ok = await commands.pingWorker(w.port)
    log('ping', `${w.name} :${w.port} → ${ok ? 'reachable' : 'UNREACHABLE'}`)
  }
}

function log(kind: string, msg: string) {
  const el = document.getElementById('parity-log')
  if (!el) return
  const ts = new Date().toLocaleTimeString('en', { hour12: false })
  const line = document.createElement('div')
  line.textContent = `${ts}  [${kind}] ${msg}`
  line.style.cssText = 'padding: 1px 0; color: #4ade80'
  el.appendChild(line)
  el.scrollTop = el.scrollHeight
  while (el.children.length > 30) el.removeChild(el.firstChild!)
}

// ── Poll status every 3s ──────────────────────────────────────────────────────

setInterval(refreshStatus, 3000)
init()
