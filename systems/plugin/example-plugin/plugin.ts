/// <reference types="../types/index.d.ts" />
/**
 * plugin.ts — Example plat-trunk plugin logic.
 *
 * This is the ONLY file that can access the `plat` global.
 * It runs in a sandboxed context: no DOM, no window, just `plat.*`.
 *
 * Build: bun run build (outputs plugin.js)
 *
 * Pattern (identical to Penpot):
 *   - Use plat.* to call CAD APIs
 *   - Use plat.ui.open() to show the panel
 *   - Use plat.ui.sendMessage() / plat.ui.onMessage() to talk to index.html
 *   - Optionally load your own WASM for heavy compute
 */

// ── Open the plugin panel ─────────────────────────────────────────────────────

plat.ui.open("Example Plugin", "", { width: 320, height: 480 })

// ── Optional: load our own WASM for compute ───────────────────────────────────
// wasm-pack builds this from crate/ → crate/pkg/example_plugin.js
// The WASM module has NO access to plat — it's pure compute (Rust → WASM → result)

let wasmExecute: ((cmd: string, params: string) => string) | null = null

async function loadWasm() {
  try {
    // Dynamic import of wasm-pack output (bundled separately from plugin.ts)
    // The URL is relative to where plugin.js is served
    const mod = await import('./crate/pkg/example_plugin.js')
    await mod.default()  // wasm-pack init()
    wasmExecute = mod.execute
    console.log('[example-plugin] WASM loaded')
  } catch (err) {
    console.warn('[example-plugin] WASM not available, running without it:', err)
  }
}

loadWasm()

// ── Listen for UI messages (from index.html → plugin.ts) ─────────────────────

plat.ui.onMessage(async (msg: any) => {

  if (msg.type === 'GET_COUNT') {
    const objects = await plat.model.getObjects()
    plat.ui.sendMessage({ type: 'COUNT_RESULT', count: objects.length })
  }

  if (msg.type === 'ADD_CUBE') {
    const size = msg.size ?? 1.0
    const result = await plat.cad.dispatch('add_cube', { size })
    plat.ui.sendMessage({ type: 'ADD_RESULT', objectId: result.objectId, error: result.error })
  }

  if (msg.type === 'GET_SELECTION') {
    const ids = await plat.selection.get()
    plat.ui.sendMessage({ type: 'SELECTION_RESULT', objectIds: ids })
  }

  if (msg.type === 'WASM_ANALYZE') {
    // Run WASM compute and send result back to UI
    if (wasmExecute) {
      const objects = await plat.model.getObjects()
      const raw = wasmExecute('analyze_scene', JSON.stringify({ objects }))
      plat.ui.sendMessage({ type: 'WASM_RESULT', result: JSON.parse(raw) })
    } else {
      plat.ui.sendMessage({ type: 'WASM_RESULT', error: 'WASM not loaded' })
    }
  }

  if (msg.type === 'SAVE_NOTE') {
    plat.storage.set('note', msg.text ?? '')
    plat.ui.sendMessage({ type: 'NOTE_SAVED' })
  }

  if (msg.type === 'LOAD_NOTE') {
    const note = await plat.storage.get('note')
    plat.ui.sendMessage({ type: 'NOTE_LOADED', text: note ?? '' })
  }
})

// ── React to host events ──────────────────────────────────────────────────────

plat.on('selectionchange', ({ objectIds }) => {
  plat.ui.sendMessage({ type: 'SELECTION_CHANGED', objectIds })
})

plat.on('modelchange', ({ objectIds, actorId }) => {
  plat.ui.sendMessage({ type: 'MODEL_CHANGED', objectIds, actorId })
})

plat.on('close', () => {
  // Cleanup — e.g. cancel any pending async work
  console.log('[example-plugin] closed')
})
