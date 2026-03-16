/// <reference types="../../plugin/types/index.d.ts" />
/**
 * plugin.ts — Howick plugin logic.
 *
 * Runs in the sandboxed plat context. Has access to `plat.*` only.
 * No DOM, no window, no fetch. Just `plat.*` and optional WASM.
 *
 * Responsibilities:
 *   - Open the Howick panel UI
 *   - Bridge UI actions → CAD commands (add members, stud layouts)
 *   - Load Howick WASM kernel for profile geometry + cut-list calculations
 *   - React to scene/selection changes and push updates to UI
 *
 * WASM kernel (crate/) handles:
 *   - Howick profile cross-sections (C, Z, U, track)
 *   - Member parametrics (length, gauge, lip, web, flange)
 *   - Stud layout generation (spacing, headers, noggins)
 *   - Cut-list output (CSV / JSON)
 */

// ── Open panel ────────────────────────────────────────────────────────────────

plat.ui.open("Howick", "", { width: 360, height: 560 })

// ── WASM kernel ───────────────────────────────────────────────────────────────

// The Howick Rust crate compiles to WASM via wasm-pack.
// It has NO access to plat — pure geometry + scheduling compute only.

type HowickExecuteFn = (cmd: string, params: string) => string

let howick: HowickExecuteFn | null = null

async function loadWasm() {
  try {
    const mod = await import('./crate/pkg/howick.js')
    await mod.default()               // wasm-pack init()
    howick = mod.execute
    plat.ui.sendMessage({ type: 'WASM_READY' })
    console.log('[howick] WASM kernel loaded')
  } catch (err) {
    console.warn('[howick] WASM not available:', err)
    plat.ui.sendMessage({ type: 'WASM_UNAVAILABLE', error: String(err) })
  }
}

loadWasm()

// ── Helper: call WASM or return error ─────────────────────────────────────────

function wasmCall(cmd: string, params: unknown): unknown {
  if (!howick) return { error: 'WASM not loaded' }
  try {
    return JSON.parse(howick(cmd, JSON.stringify(params)))
  } catch (err) {
    return { error: String(err) }
  }
}

// ── UI message handler ────────────────────────────────────────────────────────

plat.ui.onMessage(async (msg: any) => {

  // ── Member operations ────────────────────────────────────────────────────

  if (msg.type === 'ADD_MEMBER') {
    // params: { profile, gauge, length, x, y, z, rotation }
    // WASM computes the B-Rep geometry description; host CAD kernel executes it
    const geo = wasmCall('member_geometry', msg.params)
    if ((geo as any).error) {
      plat.ui.sendMessage({ type: 'ERROR', error: (geo as any).error })
      return
    }
    const result = await plat.cad.dispatch('add_brep', { geometry: geo, meta: msg.params })
    plat.ui.sendMessage({ type: 'MEMBER_ADDED', objectId: result.objectId, error: result.error })
  }

  if (msg.type === 'GENERATE_STUD_LAYOUT') {
    // params: { wallLength, wallHeight, spacing, gauge, profile, openings[] }
    const layout = wasmCall('stud_layout', msg.params)
    if ((layout as any).error) {
      plat.ui.sendMessage({ type: 'ERROR', error: (layout as any).error })
      return
    }
    // layout.members is an array of member descriptors — add each to scene
    const members = (layout as any).members ?? []
    const objectIds: string[] = []
    for (const m of members) {
      const geo = wasmCall('member_geometry', m)
      const result = await plat.cad.dispatch('add_brep', { geometry: geo, meta: m })
      if (result.objectId) objectIds.push(result.objectId)
    }
    plat.ui.sendMessage({ type: 'LAYOUT_GENERATED', objectIds, count: objectIds.length })
  }

  if (msg.type === 'GET_CUT_LIST') {
    // Reads all Howick objects from scene, computes cut list via WASM
    const objects = await plat.model.getObjects()
    const howickObjects = objects.filter((o: any) => o.meta?.howick)
    const cutList = wasmCall('cut_list', { members: howickObjects })
    plat.ui.sendMessage({ type: 'CUT_LIST_RESULT', cutList })
  }

  // ── Selection ────────────────────────────────────────────────────────────

  if (msg.type === 'GET_SELECTION') {
    const ids = await plat.selection.get()
    // Fetch full objects for selected ids
    const objects = await Promise.all(ids.map((id: string) => plat.model.getObject(id)))
    plat.ui.sendMessage({ type: 'SELECTION_RESULT', objects: objects.filter(Boolean) })
  }

  if (msg.type === 'SELECT_MEMBER') {
    plat.selection.set([msg.objectId])
  }

  // ── Scene query ──────────────────────────────────────────────────────────

  if (msg.type === 'GET_HOWICK_OBJECTS') {
    const all = await plat.model.getObjects()
    const howickObjs = all.filter((o: any) => o.meta?.howick)
    plat.ui.sendMessage({ type: 'HOWICK_OBJECTS', objects: howickObjs })
  }

  // ── Profiles query (from WASM) ───────────────────────────────────────────

  if (msg.type === 'GET_PROFILES') {
    const profiles = wasmCall('list_profiles', {})
    plat.ui.sendMessage({ type: 'PROFILES_RESULT', profiles })
  }

})

// ── Host event reactions ──────────────────────────────────────────────────────

plat.on('selectionchange', async ({ objectIds }) => {
  if (!objectIds.length) {
    plat.ui.sendMessage({ type: 'SELECTION_CLEARED' })
    return
  }
  const objects = await Promise.all(objectIds.map((id: string) => plat.model.getObject(id)))
  const howickObjs = objects.filter((o: any) => o?.meta?.howick)
  plat.ui.sendMessage({ type: 'SELECTION_CHANGED', objects: howickObjs, all: objectIds })
})

plat.on('modelchange', ({ objectIds, actorId }) => {
  // Nudge the UI to refresh its member list if the scene changed elsewhere
  plat.ui.sendMessage({ type: 'MODEL_CHANGED', objectIds, actorId })
})

plat.on('close', () => {
  console.log('[howick] plugin closed')
})
