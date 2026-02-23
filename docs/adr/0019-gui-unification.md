# ADR-0019: GUI Unification — Layered Architecture for Multi-Module WASM

> **Living document** — Review and update this ADR after completing each phase.
> Verify that diagrams, code samples, file paths, and the implementation plan
> still match reality. If implementation diverges from the ADR, update the ADR
> first, then proceed.

## Status
**In Progress** — Phase 0–8 complete. Prerequisite for ADR-0018 Stage 3 (multi-module WASM). Can proceed independently.

## Context

The browser GUI (`web/gui/`) works but has no coherent architecture. Seven files use five different patterns to access WASM, manage state, and render UI. This isn't just messy — it structurally blocks multi-module WASM (ADR-0018 Stage 3) because direct WASM calls like `ctrl().sketch_add_point()` are hardwired to a single WASM module. When sketch becomes its own `.wasm`, those calls break.

### What We Have Today (The Mess)

```
┌────────────────────────────────────────────────────────────────────┐
│ index.html (inline scripts, WASM globals, signal defaults)         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  cad-viewport.js ──┐                                               │
│  (Lit component)   │   ui.js ──────────┐                           │
│  • OrbitControls   │   (vanilla events)│   sketch.js ──────────┐   │
│  • gizmo drag ◄────┤   • gizmo drag ◄──┤   (non-module)        │   │
│  • cadCommand() ◄──┤   • cadCommand()  │   • window.__sketch   │   │
│  • sceneCtrl.*  ◄──┤   • ctrl().*   ◄──┤   • ctrl().sketch_*  │   │
│       │            │        │          │        │               │   │
│       │            │        │          │        │               │   │
│  ─────┴────────────┴────────┴──────────┴────────┴───────────    │   │
│       │ 4 different WASM access patterns                        │   │
│       ▼                                                         │   │
│  state.js                                                       │   │
│  • cadCommand() ── executeWasm() ── ctrl.execute()              │   │
│  • reconcile() (99 lines: signals + metadata + DOM)             │   │
│  • renderObjectList() (innerHTML)                               │   │
│       │                                                         │   │
│  history.js                                                     │   │
│  • Automerge CRDT                                               │   │
│  • _replayScene() via cadCommand (Phase 3 ✓)                    │   │
│  • ctrl.export_scene() still direct (snapshot only, read-only)  │   │
│       │                                                         │   │
│  ─────┴─────────────────────────────────────────────────────    │   │
│       ▼                                                         │   │
│  ┌──────────────────────────────────────┐                       │   │
│  │ window.sceneController (ONE .wasm)   │                       │   │
│  │ • execute(type, params_json)         │                       │   │
│  │ • sketch_add_point(), gizmo_drag()   │                       │   │
│  │ • object_ids(), export_scene()       │                       │   │
│  └──────────────────────────────────────┘                       │   │
│                                                                    │
│  Datastar signals: scattered defaults in HTML data-signals attr    │
│  DOM rendering: innerHTML in state.js + Lit templates in viewport  │
│  Communication: window globals (8+), no module boundaries          │
└────────────────────────────────────────────────────────────────────┘
```

**Problems this creates:**

1. **4 WASM access paths**: `cadCommand()`, `executeWasm()`, `ctrl().method()`, `window.sceneController.method()` — only the first records to Automerge
2. **Duplicate gizmo code**: cad-viewport.js and ui.js both implement gizmo drag (~140 lines duplicated)
3. **sketch.js hardwired to one WASM**: Direct `ctrl().sketch_add_point()` can't route to a separate sketch module
4. **history.js bypasses dispatch**: `_replayScene()` calls `ctrl.clear_scene()` and `ctrl.import_scene()` directly — invisible to MCP, untestable
5. **reconcile() is a god function**: reads WASM, syncs signals, loads metadata, renders DOM — 4 concerns in 99 lines
6. **No module boundaries**: 8+ window globals, files call each other's internals freely

## Decision: Target Architecture

### The Layered Model

```
┌──────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                            │
│  Lit Components + Datastar Signals                                   │
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │ <cad-viewport>│ │<cad-outliner>│ │  <cad-props> │ │<cad-sketch>│  │
│  │  • Canvas     │ │  • Object    │ │  • Color     │ │  • Points  │  │
│  │  • Camera     │ │    list      │ │  • Opacity   │ │  • Edges   │  │
│  │  • HUD        │ │  • Selection │ │  • BIM data  │ │  • Solve   │  │
│  │  • Gizmo      │ │  • Focus     │ │  • Material  │ │  • Extrude │  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬─────┘  │
│         │                │                │                │         │
│  ───────┴────────────────┴────────────────┴────────────────┴──────   │
│         │                                                            │
│         │  Datastar signals (read) + cadCommand() calls (write)      │
│         │  Components NEVER call WASM directly (except Tier 3)       │
│         │                                                            │
├─────────┴────────────────────────────────────────────────────────────┤
│                         DISPATCH LAYER                               │
│                                                                      │
│  cadCommand(type, params, options) ─── THE SINGLE GATE               │
│         │                                                            │
│         ├── record: true/false    (Automerge)                        │
│         ├── broadcast: true/false (Worker API)                       │
│         ├── reconcile: true/false (signal sync)                      │
│         │                                                            │
│         │   ┌─── JS commands ──── handleJsCommand()                  │
│         ├───┤                     (undo, redo, set_mode, etc.)       │
│         │   └─── WASM commands ── moduleRouter.execute(type, params) │
│         │                                                            │
│         ▼                                                            │
│  reconcile pipeline (after every mutation):                          │
│         │                                                            │
│    reconcileSignals()  →  Sync object IDs, counts, selection         │
│         │                 → Datastar signals                         │
│    reconcileMetadata() →  Load style + BIM for selected object       │
│         │                 → Datastar signals                         │
│    reconcileView()     →  Notify Lit components via signals          │
│                           (no manual DOM — components re-render)     │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                        MODULE ROUTER                                 │
│                                                                      │
│  Maps command names → WASM modules                                   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ moduleRouter.execute(type, params)                              │ │
│  │                                                                 │ │
│  │   // Today: single module (pass-through)                        │ │
│  │   return ctrl.execute(type, JSON.stringify(params))             │ │
│  │                                                                 │ │
│  │   // Tomorrow (ADR-0018 Stage 3): route by domain tag            │ │
│  │   const mod = commandToModule(type)  // domain:"sketch" → sketch.wasm │ │
│  │   return modules.get(mod).execute(type, JSON.stringify(params)) │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  moduleRouter.query(method, ...args)  — read-only helpers            │
│    • objectIds()                                                     │
│    • getInteractionMode()                                            │
│    • getState()                                                      │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                        WASM KERNEL(S)                                 │
│                                                                      │
│  Today:  ┌──────────────────────────────────────┐                    │
│          │ truck-webgpu-gui (.wasm)              │                    │
│          │ • execute(type, params_json) → result │                    │
│          │ • schema() → JSON                     │                    │
│          │ • begin_gizmo_drag() (Tier 3)         │                    │
│          │ • update_gizmo_drag() (Tier 3)        │                    │
│          │ • end_gizmo_drag() (Tier 3)           │                    │
│          └──────────────────────────────────────┘                    │
│                                                                      │
│  Future: ┌────────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐  │
│  (0018)  │ geometry   │ │  sketch   │ │    bim    │ │   export   │  │
│          │ .wasm      │ │  .wasm    │ │   .wasm   │ │   .wasm    │  │
│          │ execute()  │ │ execute() │ │ execute() │ │ execute()  │  │
│          │ schema()   │ │ schema()  │ │ schema()  │ │ schema()   │  │
│          └────────────┘ └───────────┘ └───────────┘ └────────────┘  │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                        STATE LAYER                                   │
│                                                                      │
│  Automerge CRDT (persistent)    Datastar Signals (ephemeral view)    │
│  • Operation log                • selectedId, objectCount            │
│  • Undo/redo                    • propColor, propOpacity             │
│  • Cross-tab sync               • bimType, bimId                     │
│  • Snapshots for replay         • canUndo, canRedo                   │
│                                 • statusMode, feedback               │
│  Owned by: CadDocumentManager   Owned by: reconcile pipeline         │
│  Written by: cadCommand()       Written by: reconcile() ONLY         │
│  Read by: history UI            Read by: ALL Lit components          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Three Tiers of WASM Access

This is the core architectural rule. Every WASM call in the GUI fits one of three tiers:

```
┌─────────────────────────────────────────────────────────────────────┐
│ TIER 1: MUTATIONS (through cadCommand)                              │
│                                                                     │
│ cadCommand('add_cube', {size: 1})                                   │
│ cadCommand('sketch_add_point', {x, y}, {record: false})             │
│ cadCommand('import_scene', {json})                                  │
│ cadCommand('set_style', {objectId, color: '#ff0000'})               │
│                                                                     │
│ Flow: cadCommand() → moduleRouter → WASM execute()                  │
│       → reconcile() → Datastar signals → Lit re-render              │
│       → Automerge record (if record: true)                          │
│       → Worker broadcast (if broadcast: true)                       │
│                                                                     │
│ WHO: All components, all subsystems, no exceptions                  │
│ WHY: Single place for Automerge, MCP visibility, testability        │
│ MULTI-MODULE: moduleRouter dispatches to correct .wasm by command   │
├─────────────────────────────────────────────────────────────────────┤
│ TIER 2: QUERIES (direct, read-only)                                 │
│                                                                     │
│ moduleRouter.objectIds()                                            │
│ moduleRouter.getInteractionMode()                                   │
│ moduleRouter.getState()                                             │
│                                                                     │
│ Flow: direct call → WASM → return value (no side effects)           │
│                                                                     │
│ WHO: reconcile pipeline, cad-viewport (mode check)                  │
│ WHY: Non-mutating, no Automerge, no broadcast needed                │
│ MULTI-MODULE: queries go through moduleRouter (knows which module)  │
├─────────────────────────────────────────────────────────────────────┤
│ TIER 3: LATENCY-CRITICAL (direct, 60fps)                           │
│                                                                     │
│ sceneController.begin_gizmo_drag(ndcX, ndcY)                       │
│ sceneController.update_gizmo_drag(ndcX, ndcY, prevX, prevY)        │
│ sceneController.end_gizmo_drag()                                   │
│ sceneController.cancel_gizmo_drag()                                │
│                                                                     │
│ Flow: direct call → WASM → immediate result                        │
│       end_gizmo_drag() result → cadCommand('translate') for record  │
│                                                                     │
│ WHO: cad-viewport ONLY (the gizmo traffic controller, ADR-0013)    │
│ WHY: 60fps pointer events cannot afford dispatch overhead           │
│ MULTI-MODULE: always core geometry module — no routing needed       │
└─────────────────────────────────────────────────────────────────────┘
```

**The rule is simple: If it changes state, it's Tier 1. If it reads state, it's Tier 2. If it's 60fps, it's Tier 3. Everything fits one tier.**

### Data Flow: Unidirectional Signal Architecture

Today, data flows in multiple directions — components read WASM directly, reconcile() writes DOM directly, history.js calls WASM and updates signals. The target is strictly unidirectional:

```
User action (click, drag, keyboard, MCP command)
  │
  ▼
cadCommand(type, params, options)          ── WRITE gate
  │
  ├── moduleRouter.execute(type, params)   ── WASM mutation
  │
  ├── Automerge record (if record: true)   ── persistence
  │
  ├── Worker broadcast (if broadcast: true)── API sync
  │
  ▼
reconcile(result)                          ── STATE sync
  │
  ├── reconcileSignals(result)             ── WASM → Datastar
  │     • reads objectIds, counts
  │     • updates selectedId, objectCount, boolReady, etc.
  │
  ├── reconcileMetadata()                  ── WASM → Datastar
  │     • loads style for selected object
  │     • loads BIM metadata
  │     • updates propColor, propOpacity, bimType, etc.
  │
  ▼
Datastar signals mutated                   ── REACTIVE boundary
  │
  ├── data-attr:selected-id="$selectedId"  ── Datastar → HTML attribute
  │     │
  │     ▼
  │   Lit @property({ attribute: 'selected-id' })  ── attribute → property
  │     │
  │     ▼
  │   updated() → component re-renders     ── Lit lifecycle
  │
  ├── data-bind:value="$propColor"         ── Datastar → form inputs
  │
  └── data-text="$objectCount"             ── Datastar → text content

NO REVERSE FLOW. Components do not write signals. Components do not call WASM.
Components call cadCommand() — which writes signals via reconcile().
```

**Why this matters for multi-module:**
- reconcile() reads from WASM via moduleRouter queries (Tier 2)
- moduleRouter knows which module to query
- Components never touch WASM directly — they don't even know modules exist
- Swapping one monolith WASM for four modules is invisible to the presentation layer

### The Signal Contract

Datastar signals are the API between the dispatch layer and the presentation layer. This is the full list:

```javascript
// ── Object State (written by reconcileSignals) ──
selectedId:     String   // UUID of selected object, '' if none
selectedIdB:    String   // UUID of second selection for booleans, '' if none
objectCount:    Number   // Total objects in scene
sceneEmpty:     Boolean  // objectCount === 0
boolReady:      Boolean  // Both A and B selected
boolLabel:      String   // "A ∪ B" etc. for UI display

// ── Properties (written by reconcileMetadata) ──
propColor:      String   // Hex color '#rrggbb'
propOpacity:    Number   // 0.0–1.0
propRoughness:  Number   // 0.0–1.0
propReflectance:Number   // 0.0–1.0
bimType:        String   // IFC type or ''
bimId:          String   // IFC GlobalId or ''

// ── History (written by CadDocumentManager) ──
canUndo:        Boolean  // Undo available
canRedo:        Boolean  // Redo available

// ── UI State (written by controllers) ──
statusMode:     String   // 'local' or 'online'
feedback:       String   // Toast message text
sketchActive:   Boolean  // Sketch tool engaged

// ── Tab State (written by cadUI) ──
activeTab:      String   // 'outliner' | 'sketch' | 'props'
```

**Rule: reconcile() is the ONLY writer of object/property signals. Components are readers only.** History signals are written by CadDocumentManager. UI signals are written by their respective controllers. No signal has two writers.

### The cadCommand Options Contract

Replace the ambiguous `ephemeral` / `skipAutomerge` with explicit named options:

```javascript
cadCommand(type, params, {
  record:    true,    // Record to Automerge? (default: true)
  broadcast: true,    // POST to Worker API? (default: true)
  reconcile: true,    // Run reconcile pipeline? (default: true)
  source:    'local', // Who initiated? 'local' | 'api' | 'replay'
})
```

**Command categories and their default options:**

| Category | Example | record | broadcast | reconcile | source |
|----------|---------|--------|-----------|-----------|--------|
| Normal mutation | `add_cube`, `translate` | true | true | true | local |
| Ephemeral query | `pick_at`, `select`, `deselect` | false | false | true | local |
| Camera sync | `set_camera` | false | false | true | local |
| Style preview | `set_style` (while dragging slider) | false | false | true | local |
| Style commit | `set_style` (on slider release) | true | true | true | local |
| Sketch intermediate | `sketch_add_point`, `sketch_solve` | false | false | true | local |
| Sketch final | `sketch_extrude` | true | true | true | local |
| History replay | any command during `_replayScene()` | false | false | false | replay |
| Remote command | any command from Worker SSE | varies | false | true | api |

Backward compat: if `ephemeral: true` is passed, map to `{ record: false, broadcast: false }`.

### The Module Router — One Interface, Two Platforms

The module router is the key architectural piece. It presents the same interface to `cadCommand()` regardless of whether modules are local WASM binaries (browser) or remote Workers connected via RPC (Cloudflare). `cadCommand()` never knows the difference.

#### The Interface Contract

Both platforms implement the same four methods:

```typescript
interface ModuleRouter {
  // Tier 1: Dispatch mutation to the module that owns this command
  execute(type: string, params: object): Promise<Result>;

  // Tier 2: Read-only queries (always core module)
  query(method: string, ...args: any[]): any;

  // Tier 3: Direct access to core module (gizmo, 60fps — browser only)
  core(): WasmInstance;

  // Schema discovery (for cad_search, ADR-0018)
  combinedSchema(): Promise<Schema>;
}
```

`cadCommand()` calls `moduleRouter.execute()`. It doesn't know if that's a local WASM call or a Workers RPC call. Same code path, same reconcile, same Automerge recording.

#### Browser Implementation: JS Linker

In the browser, modules are `.wasm` files loaded via `WebAssembly.instantiate`. The router holds references to instantiated modules and dispatches by command name.

```javascript
// core/module-router.js (browser)

class BrowserModuleRouter {
  constructor() {
    this.modules = new Map();  // name → { instance, schema, commands }
  }

  // Register a WASM module (called during init)
  register(name, wasmInstance) {
    const schema = JSON.parse(wasmInstance.schema());
    this.modules.set(name, {
      instance: wasmInstance,
      schema,
      commands: new Set(Object.keys(schema.commands)),
    });
  }

  // Tier 1: Dispatch mutation to correct module
  async execute(type, params) {
    for (const [name, mod] of this.modules) {
      if (mod.commands.has(type)) {
        const result = mod.instance.execute(type, JSON.stringify(params));
        return JSON.parse(result);
      }
    }
    throw new Error(`Unknown command: ${type}`);
  }

  // Tier 2: Read-only queries (always core module)
  query(method, ...args) {
    const core = this.modules.get('core').instance;
    switch (method) {
      case 'objectIds':          return core.object_ids();
      case 'getInteractionMode': return core.get_interaction_mode();
      case 'getState':           return JSON.parse(core.execute('get_state', '{}'));
    }
  }

  // Tier 3: Direct access to core module (gizmo, 60fps)
  core() { return this.modules.get('core').instance; }

  // Schema discovery (for cad_search, ADR-0018)
  async combinedSchema() {
    const merged = { commands: {} };
    for (const [name, mod] of this.modules) {
      Object.assign(merged.commands, mod.schema.commands);
    }
    return merged;
  }
}

// ── Today: single module (pass-through) ──
const router = new BrowserModuleRouter();
router.register('core', sceneController);
// Everything routes to 'core' — zero behavior change
// Schema domain tags (geometry, booleans, sketch, scene, style) already present

// ── Tomorrow (ADR-0018 Stage 3): multi-module ──
// router.register('core', geometryWasm);    // domain: "geometry", "booleans"
// router.register('sketch', sketchWasm);    // domain: "sketch"
// router.register('bim', bimWasm);          // domain: "scene" (IFC subset)
// router.register('export', exportWasm);    // domain: "scene" (export subset)
// Routing uses schema `domain` field — no prefix matching needed
```

**Key properties:**
- Modules are in-process — `execute()` is a synchronous WASM call (wrapped in async for interface compat)
- No size limit — browser can load as many `.wasm` files as needed
- Tier 3 (gizmo) calls `router.core()` directly — same in-process WASM instance, zero overhead
- Schema discovery reads from in-memory module instances

#### Cloudflare Worker Implementation: RPC via Service Bindings

On Cloudflare, each module is its own Worker. The router Worker dispatches via **Workers RPC** — `WorkerEntrypoint` classes connected through Service Bindings. Same interface, different transport.

```
┌──────────────────────────────────────────────────────────────────────┐
│ CLOUDFLARE EDGE                                                      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ truck-cad (ROUTER WORKER)                                      │ │
│  │                                                                 │ │
│  │  /mcp endpoint                                                  │ │
│  │    │                                                            │ │
│  │    ▼                                                            │ │
│  │  WorkerModuleRouter                                             │ │
│  │    │                                                            │ │
│  │    ├── execute('add_cube', params)                               │ │
│  │    │     → env.GEOMETRY.execute('add_cube', params)              │ │
│  │    │       Workers RPC — zero network, same colo, same thread   │ │
│  │    │                                                            │ │
│  │    ├── execute('sketch_add_point', params)                       │ │
│  │    │     → env.SKETCH.execute('sketch_add_point', params)       │ │
│  │    │                                                            │ │
│  │    ├── execute('import_ifc', params)                             │ │
│  │    │     → env.BIM.execute('import_ifc', params)                │ │
│  │    │                                                            │ │
│  │    └── combinedSchema()                                         │ │
│  │          → Promise.all([env.GEOMETRY.schema(),                   │ │
│  │                         env.SKETCH.schema(),                    │ │
│  │                         env.BIM.schema()])                      │ │
│  │          → mergeSchemas()                                       │ │
│  └──────┬──────────────────┬──────────────────┬────────────────────┘ │
│         │ Service Binding   │ Service Binding   │ Service Binding     │
│         ▼                  ▼                  ▼                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ cad-geometry  │  │ cad-sketch   │  │ cad-bim      │               │
│  │ Worker        │  │ Worker       │  │ Worker       │               │
│  │               │  │              │  │              │               │
│  │ GeometryModule│  │ SketchModule │  │ BimModule    │               │
│  │ extends       │  │ extends      │  │ extends      │               │
│  │ WorkerEntry-  │  │ WorkerEntry- │  │ WorkerEntry- │               │
│  │ point         │  │ point        │  │ point        │               │
│  │               │  │              │  │              │               │
│  │ execute()     │  │ execute()    │  │ execute()    │               │
│  │ schema()      │  │ schema()     │  │ schema()     │               │
│  │               │  │              │  │              │               │
│  │ ┌──────────┐  │  │ ┌──────────┐ │  │ ┌──────────┐ │               │
│  │ │geometry  │  │  │ │sketch   │ │  │ │bim      │ │               │
│  │ │.wasm     │  │  │ │.wasm    │ │  │ │.wasm    │ │               │
│  │ │(≤10MB)   │  │  │ │(≤10MB)  │ │  │ │(≤10MB)  │ │               │
│  │ └──────────┘  │  │ └──────────┘ │  │ └──────────┘ │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                      │
│  Each module Worker: own V8 isolate, own 10MB size budget,           │
│  independently deployable, crash-isolated                            │
└──────────────────────────────────────────────────────────────────────┘
```

**Each module Worker wraps a headless WASM binary:**

```typescript
// cad-geometry-worker/src/index.ts
import { WorkerEntrypoint } from "cloudflare:workers";
import { initGeometryWasm } from "./wasm-loader";

export class GeometryModule extends WorkerEntrypoint {
  async execute(cmd: string, params: string): Promise<string> {
    const wasm = await initGeometryWasm();
    return wasm.execute(cmd, params);
  }
  async schema(): Promise<string> {
    const wasm = await initGeometryWasm();
    return wasm.schema();
  }
}
```

**The router Worker implements the same ModuleRouter interface:**

```typescript
// truck-cad (router Worker) — src/module-router.ts

class WorkerModuleRouter {
  private env: Env;
  private commandMap: Map<string, string> | null = null;

  constructor(env: Env) {
    this.env = env;
  }

  // Build command → module mapping from schemas (cached per request)
  private async ensureCommandMap() {
    if (this.commandMap) return;
    this.commandMap = new Map();

    // Discover which bindings exist (graceful degradation)
    const bindings = [
      ['GEOMETRY', this.env.GEOMETRY],
      ['SKETCH',   this.env.SKETCH],
      ['BIM',      this.env.BIM],
      ['EXPORT',   this.env.EXPORT],
    ].filter(([_, binding]) => binding != null);

    // Fetch schemas from all bound modules in parallel
    const schemas = await Promise.all(
      bindings.map(async ([name, binding]) => {
        const schemaJson = await binding.schema();
        const schema = JSON.parse(schemaJson);
        return { name, schema };
      })
    );

    // Build command → module name lookup
    for (const { name, schema } of schemas) {
      for (const cmd of Object.keys(schema.commands)) {
        this.commandMap.set(cmd, name);
      }
    }
  }

  // Tier 1: Dispatch mutation via Workers RPC
  async execute(type: string, params: object): Promise<Result> {
    await this.ensureCommandMap();
    const moduleName = this.commandMap.get(type);
    if (!moduleName) throw new Error(`Unknown command: ${type}`);

    const binding = this.env[moduleName];
    const resultJson = await binding.execute(type, JSON.stringify(params));
    return JSON.parse(resultJson);
  }

  // Tier 2: Read-only queries (always GEOMETRY)
  async query(method: string, ...args: any[]) {
    return await this.env.GEOMETRY.query(method, ...args);
  }

  // Tier 3: N/A on Worker (no gizmo, no 60fps — headless)
  core() { throw new Error('Tier 3 not available in Worker (headless)'); }

  // Schema discovery (for cad_search)
  async combinedSchema(): Promise<Schema> {
    await this.ensureCommandMap();
    // commandMap already built from all module schemas
    // Return merged schema for cad_search tool
    const schemas = await Promise.all(
      [...new Set(this.commandMap.values())].map(name =>
        this.env[name].schema().then(s => JSON.parse(s))
      )
    );
    return mergeSchemas(schemas);
  }
}
```

**wrangler.toml — Service Bindings connect modules:**

```toml
# truck-cad (router Worker)
name = "truck-cad"
main = "src/index.ts"

# Module Workers bound via RPC
[[services]]
binding = "GEOMETRY"
service = "cad-geometry"

[[services]]
binding = "SKETCH"
service = "cad-sketch"

[[services]]
binding = "BIM"
service = "cad-bim"

[[services]]
binding = "EXPORT"
service = "cad-export"
```

#### Same Interface, Different Bus

```
┌─────────────────────────────────────────────────────────────────────┐
│                     cadCommand('add_cube', {size: 1})               │
│                              │                                      │
│                     moduleRouter.execute('add_cube', {size: 1})     │
│                              │                                      │
│              ┌───────────────┴───────────────┐                      │
│              ▼                               ▼                      │
│     BROWSER                         CLOUDFLARE WORKER               │
│                                                                     │
│     BrowserModuleRouter             WorkerModuleRouter              │
│     modules.get('core')             env.GEOMETRY                    │
│       .execute('add_cube',            .execute('add_cube',          │
│         '{"size":1}')                   '{"size":1}')               │
│              │                               │                      │
│              ▼                               ▼                      │
│     In-process WASM call            Workers RPC (same colo)         │
│     ~0.01ms                         ~0.1ms (zero network)           │
│              │                               │                      │
│              ▼                               ▼                      │
│     geometry.wasm                   GeometryModule Worker           │
│     execute('add_cube',             → geometry.wasm                 │
│       '{"size":1}')                 → execute('add_cube',           │
│              │                          '{"size":1}')               │
│              ▼                               ▼                      │
│     { objectId: "abc" }             { objectId: "abc" }             │
│                                                                     │
│     Same interface. Same result. Same schema. Different bus.        │
└─────────────────────────────────────────────────────────────────────┘
```

| Property | Browser (JS Linker) | CF Worker (RPC) |
|----------|---------------------|-----------------|
| Module bus | `WebAssembly.instantiate` per module | Service Bindings + `WorkerEntrypoint` |
| Call overhead | ~0.01ms (in-process) | ~0.1ms (same-colo RPC, zero network) |
| Size budget | Unlimited | 10 MB per module Worker (paid plan) |
| Tier 3 (gizmo) | `router.core()` — same WASM instance | N/A — headless, no gizmo |
| Discovery | `schema()` on in-memory instances | `schema()` via RPC on each binding |
| Isolation | Same JS thread | Separate V8 isolates — crash-isolated |
| Deployment | Single page load | Independent Workers — deploy geometry without touching BIM |
| Shared state | Automerge in browser memory | Automerge in Durable Objects |
| MCP entry | `navigator.modelContext` (ADR-0016) | `/mcp` JSON-RPC endpoint |

#### Why Tier 3 Is Browser-Only

Workers are headless — no canvas, no pointer events, no gizmo. Gizmo drag (`begin_gizmo_drag`, `update_gizmo_drag`, `end_gizmo_drag`) is a browser interaction pattern. On the Worker side, transforms arrive as Tier 1 commands: `cadCommand('translate', {objectId, dx, dy, dz})`.

This means `core()` (Tier 3) is a browser-only method. The Worker router throws if you call it — by design.

#### Today vs Tomorrow

**Today (Phase 0–8 done):** Single module, pass-through router. Schema carries `domain` tags for all 34 commands across 5 domains (geometry, booleans, sketch, scene, style). Module Router wired into cadCommand — all WASM access goes through `moduleRouter.execute()`. cadCommand options contract (`record/broadcast/reconcile/source`) replaces ephemeral/skipAutomerge. History replay goes through cadCommand with `source:'replay'`. Sketch operations route through cadCommand (async/await). sketch.js is an ES module with proper imports. Legacy gizmo fallback removed (cad-viewport owns interaction). Keyboard shortcuts extracted to keyboard.js. reconcile() split into reconcileSignals + reconcileMetadata + reconcileView. `<cad-outliner>` Lit component replaces imperative renderObjectList() innerHTML — all UI rendering is now reactive.

```
Rust:     commands/ split into 5 domain modules — each owns params + schema entries
Schema:   { "add_cube": { "domain": "geometry", ... }, "sketch_extrude": { "domain": "sketch", ... } }
Browser:  router.register('core', sceneController)  // all domains → single module
Worker:   env.GEOMETRY (single binding, all commands)
```

**Tomorrow (ADR-0018 Stage 3):** Multiple modules, automatic routing by domain.

```
Browser:  router.register('core', geometryWasm)      // domain: geometry, booleans
          router.register('sketch', sketchWasm)       // domain: sketch
          router.register('bim', bimWasm)             // domain: scene (IFC subset)

Worker:   env.GEOMETRY, env.SKETCH, env.BIM (Service Bindings)
          WorkerModuleRouter auto-discovers from schema domain tags
```

**The transition:** Add `router.register()` calls (browser) or Service Bindings (Worker). The `domain` field in each command's schema tells the router where to dispatch. No changes to cadCommand, reconcile, components, signals, Automerge, or MCP tools. The router is the only code that knows modules exist.

### Component Architecture

Each subsystem becomes a Lit component with clear boundaries:

```
┌─────────────────────────────────────────────────────────────────┐
│ <cad-viewport>  (EXISTS — ADR-0013)                             │
│                                                                 │
│ Owns:     Three.js camera, OrbitControls, WebGPU canvas         │
│ Reads:    selectedId, objectCount, sceneEmpty (via data-attr)   │
│ Writes:   cadCommand('set_camera'), cadCommand('pick_at')       │
│ Tier 3:   begin/update/end_gizmo_drag (60fps, direct to core)  │
│ Boundary: ONLY component that touches Tier 3 WASM              │
├─────────────────────────────────────────────────────────────────┤
│ <cad-outliner>  (NEW — replaces renderObjectList innerHTML)     │
│                                                                 │
│ Owns:     Object tree rendering, selection highlight, focus     │
│ Reads:    objectList signal (array of {id, name})               │
│ Writes:   cadCommand('select'), cadCommand('deselect')          │
│ Tier 3:   None                                                  │
│ Boundary: Pure presentation — receives data via signals         │
├─────────────────────────────────────────────────────────────────┤
│ <cad-props>  (EXTRACT from index.html inline Datastar)          │
│                                                                 │
│ Owns:     Color picker, opacity/roughness sliders, BIM fields   │
│ Reads:    propColor, propOpacity, propRoughness, bimType, bimId │
│ Writes:   cadCommand('set_style'), cadCommand('set_bim_metadata')│
│ Tier 3:   None                                                  │
│ Boundary: Style preview = cadCommand with record:false           │
│           Style commit = cadCommand with record:true             │
├─────────────────────────────────────────────────────────────────┤
│ sketch.js → ES MODULE  (CONVERT from window.__sketch global)   │
│                                                                 │
│ Owns:     Local sketch state (points, edges, constraints)       │
│ Reads:    sketchActive signal                                   │
│ Writes:   cadCommand('sketch_add_point'), cadCommand('sketch_   │
│           extrude'), etc. — ALL through cadCommand               │
│ Tier 3:   None (sketch ops are ~10hz, not 60fps)                │
│ Boundary: Intermediate ops are cadCommand with record:false      │
│           Final extrude is cadCommand with record:true           │
├─────────────────────────────────────────────────────────────────┤
│ CadDocumentManager  (STAYS — Automerge logic)                   │
│                                                                 │
│ Owns:     Automerge doc, undo/redo, cross-tab sync, timeline    │
│ Reads:    Called by cadCommand() (record step)                   │
│ Writes:   canUndo, canRedo signals                               │
│ Replay:   cadCommand(type, params, {source:'replay',             │
│           record:false, reconcile:false})                        │
│ Boundary: NEVER calls WASM directly for replay — uses cadCommand │
├─────────────────────────────────────────────────────────────────┤
│ keyboard.js  (EXTRACT from ui.js)                               │
│                                                                 │
│ Owns:     Keyboard shortcut bindings                             │
│ Writes:   cadCommand('undo'), cadCommand('select'), etc.        │
│ Boundary: Maps keys → cadCommand calls. No WASM, no DOM.        │
├─────────────────────────────────────────────────────────────────┤
│ relay.js  (STAYS — SSE Worker command relay)                    │
│                                                                 │
│ Owns:     EventSource connection to Worker                       │
│ Writes:   cadCommand(type, params, {source:'api'})              │
│ Boundary: Pure pass-through. No WASM, no DOM.                   │
└─────────────────────────────────────────────────────────────────┘
```

**Each component follows one rule: call `cadCommand()` to mutate, read Datastar signals to render.**

### History Replay: The Hardest Part

Today, `_replayScene()` in history.js calls WASM directly:
```javascript
ctrl.clear_scene();
ctrl.import_scene(snapshotJson);
executeWasm(ctrl, op.type, op.params);  // for each enabled op
```

This bypasses cadCommand(), which means:
- No module routing (breaks with multi-module)
- No reconcile (stale UI during replay)
- No MCP visibility

**Target: replay goes through cadCommand with `source: 'replay'`:**

```javascript
async _replayScene() {
  // Clear
  await cadCommand('clear_scene', {}, {
    record: false, broadcast: false, reconcile: false, source: 'replay'
  });

  // Restore snapshot if valid
  if (this.snapshotJson) {
    await cadCommand('import_scene', { json: this.snapshotJson }, {
      record: false, broadcast: false, reconcile: false, source: 'replay'
    });
  }

  // Replay each enabled operation
  for (const op of enabledOps) {
    await cadCommand(op.type, op.params, {
      record: false, broadcast: false, reconcile: false, source: 'replay'
    });
  }

  // Single reconcile at the end (not per-op)
  reconcile({});
}
```

**Why `reconcile: false` per-op, then one reconcile at end?** Replay can be 50+ operations. Running reconcile (which reads all object IDs, loads metadata, updates DOM) after each one would be visibly slow. Batch it.

The module router handles this transparently — `add_cube` goes to geometry module, `sketch_add_point` goes to sketch module, `import_ifc` goes to BIM module. The replay code doesn't need to know.

## Migration: Before → After

### File Mapping

| Before | After | What changes |
|--------|-------|-------------|
| `state.js` | `core/dispatch.js` | cadCommand + reconcile pipeline. reconcile split into 3 functions. moduleRouter replaces direct ctrl.execute() |
| — | `core/module-router.js` | **NEW**. Wraps WASM modules, routes by schema `domain` tag. Today: 1 module (pass-through). Tomorrow: N modules |
| `sketch.js` | `sketch.js` (ES module) | Convert to module export. All ctrl().sketch_* → cadCommand(). Remove window.__sketch |
| `ui.js` | `controllers/keyboard.js` + delete gizmo code | Extract keyboard shortcuts. Delete duplicate gizmo (lines 114-201). File save/load → cadCommand |
| `history.js` | `core/automerge.js` | _replayScene() uses cadCommand with source:'replay'. No more direct ctrl.* calls |
| `cad-viewport.js` | `components/cad-viewport.js` | No changes needed — already correct per ADR-0013 |
| `worker-relay.js` | `controllers/relay.js` | No changes needed — already uses cadCommand |
| `index.html` | `index.html` | Remove inline sketch loader. Signal defaults stay (fine for no-bundler setup) |

### What Does NOT Change

| Element | Reason |
|---------|--------|
| **cad-viewport.js** (Lit component) | Already correct per ADR-0013. Gizmo Tier 3 calls stay direct |
| **worker-relay.js** | Already uses cadCommand exclusively |
| **Datastar as signal store** | Working well, unidirectional flow preserved |
| **Automerge for undo/redo** | Working well per ADR-0008 |
| **Vendor libraries** (Datastar, Lit, Three.js, Automerge) | No bundler — vendored intentionally |
| **Window globals** (`cadCommand`, `sceneController`, `cadDocManager`) | Eliminating requires bundler. Not in scope. But ModuleRouter wraps sceneController access |
| **Rust domain modules** (`commands/`) | Phase 0 complete — 5 domain modules with schema `domain` tags. Module Router reads these tags |
| **`<live-signals>` debug panel** | Phase 0 complete — real-time Datastar signal viewer for development verification |

## Multi-Module Readiness: What This Buys Us

After ADR-0019, adding a second WASM module (ADR-0018 Stage 3) requires:

```javascript
// 1. Load the new module
const sketchWasm = await WebAssembly.instantiate(sketchWasmBytes, glueImports);

// 2. Register it
moduleRouter.register('sketch', sketchWasm);
// "sketch_add_point" now routes to sketch.wasm automatically

// 3. Done. No other code changes.
```

**Why zero other changes?**
- Components call `cadCommand('sketch_add_point')` — already module-agnostic
- reconcile() reads via `moduleRouter.objectIds()` — already module-agnostic
- History replay uses `cadCommand()` — already module-agnostic
- cad_search (ADR-0018) calls `moduleRouter.combinedSchema()` — auto-discovers new module

**Without ADR-0019**, adding a second module would require changing every file that calls `ctrl().sketch_*()` — a fragile, error-prone migration.

## Consequences

### Positive
- **Multi-module WASM is a config change**, not a code change
- **Every mutation is visible**: Automerge, MCP, test harnesses — one dispatch path
- **Testable**: Mock cadCommand, assert it was called with correct args. No WASM mocking needed
- **Onboarding**: One rule — "call cadCommand() to change things"
- **Sketch undo/redo becomes possible**: intermediate sketch ops can optionally record to Automerge

### Negative
- **Sketch latency**: ~0.1ms overhead per cadCommand() call for sketch ops. Negligible (sketch is ~10hz interaction, not 60fps)
- **History replay latency**: Going through cadCommand() adds overhead per replayed op. Mitigated by `reconcile: false` batching
- **Migration risk**: Changing dispatch paths in sketch.js and history.js could introduce regressions

### Risks & Mitigations
- **Risk**: Replay breaks because cadCommand() has side effects replay doesn't expect → **Mitigation**: `source: 'replay'` flag lets cadCommand skip all side effects except the WASM call
- **Risk**: Sketch feels sluggish through cadCommand() → **Mitigation**: Measure. If >1ms per op, add a Tier 2.5 fast-path in cadCommand for `record:false, broadcast:false` calls (skip everything except WASM + reconcile)

## Implementation Plan

| Phase | What | Effort | Status |
|-------|------|--------|--------|
| **0** | **Rust domain modules + schema domain tags** — split `commands.rs` into 5 domain modules (`geometry`, `booleans`, `sketch`, `scene`, `style`), add `domain` field to schema, refactor `headless.rs` dispatch into domain methods, add `<live-signals>` debug panel | Small | **Done** |
| **1** | **Module Router** — create `core/module-router.js`, register single module, wire into cadCommand. Uses schema `domain` field for routing | Small | **Done** |
| **2** | **cadCommand options** — replace ephemeral/skipAutomerge with record/broadcast/reconcile/source | Small | **Done** |
| **3** | **History replay** — _replayScene() through cadCommand with source:'replay' | Small | **Done** |
| **4** | **Sketch dispatch** — all ctrl().sketch_* → cadCommand() | Small | **Done** |
| **5** | **sketch.js → ES module** | Small | **Done** |
| **6** | **Delete duplicate gizmo** from ui.js, extract keyboard.js | Small | **Done** |
| **7** | **Split reconcile()** into reconcileSignals + reconcileMetadata + reconcileView | Small | **Done** |
| **8** | **`<cad-outliner>` Lit component** (optional) | Medium | **Done** |

### Phase 0 Details (completed)

**Rust domain module split** (`crates/truck-webgpu-gui/src/commands/`):
- `mod.rs` — schema infrastructure, `build_schema()`, control plane, shared defaults
- `geometry.rs` — primitives + transforms (8 commands)
- `booleans.rs` — boolean ops + clash detect (4 commands)
- `sketch.rs` — sketch extrude (1 command)
- `scene.rs` — delete, clear, selection, import/export (13 commands)
- `style.rs` — styling, naming, camera, queries (8 commands)

**Schema `domain` field**: Every command in `cad-schema.json` now carries a `domain` tag. The Module Router (Phase 1) uses this to route commands to the correct WASM module — no convention-based prefix matching needed.

**Headless dispatch refactor** (`headless.rs`): `execute()` chains `dispatch_geometry().or_else(|| dispatch_booleans())...` — same domain pattern as the Module Router will use in JS.

**Live Signals debug panel** (`web/gui/live-signals.js`): Lit component showing all Datastar signals in real-time with tree view and change highlighting. Invaluable for verifying signal flow during subsequent phases.

**Verification**: 11 Rust tests pass, 34 commands across 5 domains, schema generation works, Playwright verified signals update on shape creation.

### Phase 1 Details (completed)

**Module Router** (`web/gui/core/module-router.js`):
- `BrowserModuleRouter` class with 4-method interface: `execute()`, `query()`, `core()`, `combinedSchema()`
- Phase 1: single 'core' module registered — pure pass-through, zero behavior change
- Multi-module path ready: iterates `modules` Map, matches by command set or accepts-all
- Exported as singleton + `window.moduleRouter` for cross-file access

**state.js wiring** — ALL WASM access now goes through moduleRouter:
- `executeWasm()` delegates to `moduleRouter.execute()` (kept for history.js backward compat)
- `reconcile()` reads objectIds via `moduleRouter.query('objectIds')`
- `loadStyle()`, `loadBim()` use `moduleRouter.execute()` directly (not cadCommand — would recurse)
- `applyStyle()` preview path uses `moduleRouter.execute()`
- `renderObjectList()` uses `moduleRouter.query('objectIds')` and `moduleRouter.query('getState')`
- `cadCommand()` WASM dispatch: `moduleRouter.execute(type, params)`
- Lazy registration fallback: handles timing race between cad-viewport init and state.js load

**cad-viewport.js wiring** — registers WASM with moduleRouter after init:
- `window.moduleRouter.register('core', controller)` after `SceneController` construction
- Dual registration: both `window.sceneController` (legacy) and moduleRouter (new gate)

**Verification**: Playwright end-to-end — page loads, WASM initializes through moduleRouter, Add Cube dispatches through `cadCommand → moduleRouter.execute → WASM`, reconcile updates all signals (objectCount, selectedId, outliner, properties panel, litState bridge), no console errors. Zero behavior change confirmed.

### Phase 2 Details (completed)

**cadCommand options contract** — replaced ambiguous `ephemeral`/`skipAutomerge` with explicit named options:
- `record: boolean` (default: true) — Record to Automerge?
- `broadcast: boolean` (default: true) — POST state to Worker API?
- `reconcile: boolean` (default: true) — Run reconcile pipeline? (enables batched replay in Phase 3)
- `source: string` (default: 'local') — Who initiated? `'local'` | `'api'` | `'replay'`

**Mapping from old to new**:
- `{ ephemeral: true }` → `{ record: false, broadcast: false }`
- `{ ephemeral: true, skipAutomerge: true }` → `{ record: false, broadcast: false }`
- `{ skipAutomerge: true }` → `{ record: false }`
- `{ source: 'api' }` → `{ source: 'api' }` (unchanged)

**Files updated**: `state.js` (cadCommand implementation + 2 callers), `cad-viewport.js` (5 callers), `ui.js` (6 callers). `worker-relay.js` already used `{ source: 'api' }` — no change needed.

**Re-entrancy guard**: `_busy` check now tests `record` flag instead of `!ephemeral`, which is semantically correct — only recording commands need the busy guard.

**Verification**: Playwright end-to-end — Add Cube works (recording mutation), outliner click works (non-recording select), boolean auto-B assignment works, all signals update correctly, zero console errors.

### Phase 3 Details (completed)

**History replay through cadCommand** — `_replayScene()` in `history.js` no longer calls WASM directly:

**Import change**: `import { executeWasm, reconcile }` → `import { cadCommand, reconcile, moduleRouter }`

**REPLAY options constant**: All replay ops use `{ record: false, broadcast: false, reconcile: false, source: 'replay' }` — no Automerge recording, no API broadcast, no per-op reconcile (single reconcile at end).

**_replayScene() refactored**:
- `ctrl.clear_scene()` → `cadCommand('clear', {}, REPLAY)`
- `ctrl.import_scene(snapshotJson)` → `cadCommand('import_scene', { json: snapshotJson }, REPLAY)`
- `executeWasm(ctrl, op.type, op.params)` → `cadCommand(op.type, op.params, REPLAY)`
- `ctrl.object_ids()` → `moduleRouter.query('objectIds')`
- Readiness check: `ctrl` → `moduleRouter.ready`

**executeWasm removed**: The legacy `executeWasm()` wrapper function was removed from `state.js` — no longer used anywhere in the codebase. All WASM access is now either `cadCommand()` (Tier 1), `moduleRouter.query()` (Tier 2), or direct core access (Tier 3 gizmo).

**Why this matters for multi-module**: When sketch becomes a separate `.wasm`, replay ops like `sketch_extrude` will automatically route to the sketch module via `cadCommand → moduleRouter.execute()`. No replay code changes needed.

**Verification**: Playwright end-to-end — Add Cube + Add Sphere (objectCount: 2), Ctrl+Z undo (objectCount: 1, Sphere removed, console shows `WASM: add_cube(1)` replay), Ctrl+Shift+Z redo (objectCount: 2, Sphere restored, console shows `WASM: add_cube(1)` + `WASM: add_sphere(1)` replay). canUndo/canRedo signals update correctly. Zero console errors.

### Phase 4 Details (completed)

**Sketch dispatch** — all `ctrl().sketch_*` direct WASM calls → `cadCommand()`:

**Rust changes** (`crates/truck-webgpu-gui/src/commands/sketch.rs`):
- Added 4 param structs: `BeginSketchParams`, `SketchAddPointParams`, `SketchAddEdgeParams`, `SketchAddConstraintParams`
- Extracted `parse_constraint_kind()` shared helper (used by both `wasm_app.rs` and `headless.rs`)
- Added 7 new schema entries (all ephemeral except `sketch_extrude`)

**wasm_app.rs**: Added 7 new match arms in `execute()` for `begin_sketch`, `sketch_add_point`, `sketch_add_edge`, `sketch_add_constraint`, `sketch_solve`, `sketch_cancel`, `sketch_export`. Refactored `sketch_add_constraint` to use shared `parse_constraint_kind()`.

**headless.rs**: Expanded `dispatch_sketch()` from 1 command (sketch_extrude) to 8 commands.

**sketch.js**: All sketch WASM calls now go through `cadCommand()`. Key fix: `cadCommand` is async, so all sketch methods now use `async/await`. Intermediate sketch ops use `{ record: false, broadcast: false }` (ephemeral). `sketch_extrude` uses defaults (`record: true, broadcast: true`) as the final commit.

**Verification**: Playwright — click "Extrude Rectangle" → objectCount 2→3, new "Extruded 1" in scene. Console confirms full chain: `begin_sketch` → `sketch imported, 4 points, 4 edges, 7 constraints` → `sketch extruded, height=1`. Zero errors.

### Phase 5 Details (completed)

**sketch.js → ES module** — proper `import`/`export` instead of classic script:

- Added `import { cadCommand, reconcile, showFeedback } from './state.js'`
- Replaced `window.cadCommand`/`window.showFeedbackSignal`/`window.reconcile` references with direct imports
- Added `export { sketch }` for consumers; `window.__sketch = sketch` retained for HTML onclick handlers
- Removed classic script injection from index.html, replaced with `await import('./sketch.js?v=' + v)` in module init chain
- Removed redundant `if (!window.cadCommand)` guards — module only loads after state.js

### Phase 6 Details (completed)

**Delete duplicate gizmo, extract keyboard.js:**

- **Deleted** `setupGizmo()` IIFE from ui.js (90 lines) — legacy fallback for when `<cad-viewport>` is not present. Was dead code since ADR-0013 (Passive WASM) made `<cad-viewport>` the standard. The gizmo guard `if (document.querySelector('cad-viewport')) return;` meant it never executed.
- **Extracted** keyboard shortcuts to `keyboard.js` (new ES module): `s` (sketch tab), `Escape` (cancel sketch), `Ctrl+Z` (undo), `Ctrl+Shift+Z`/`Ctrl+Y` (redo), `Ctrl+D` (duplicate). Imports `cadCommand` from state.js, uses `window.cadUI`/`window.__sketch`/`window.cadDocManager` globals.
- **ui.js** reduced from 292 → 168 lines. Now only: document management, save/load, example scenes, responsive layout.
- Removed unused `reconcile` import and `ds()` helper from ui.js.

### Phase 7 Details (completed)

**Split reconcile()** into three focused functions:

- **`reconcileSignals(r, ids, result)`** — Selection state: prune stale selections (deleted objects), apply `result.selectedId` with auto-B logic, auto-select new objects from `result.objectId`.
- **`reconcileMetadata(r, ids, mgr)`** — Derived/computed signals: `objectCount`, `sceneEmpty`, `boolLabel`, `boolReady`, `canUndo`/`canRedo`, `statusMode`, `automergeEnabled`, `litState`. Returns `{ a, b }` for return value construction.
- **`reconcileView(selectedId, ids)`** — DOM side effects (outside Datastar batch): `loadStyle()`, `loadBim()`, `renderObjectList()`.
- **`reconcile(result)`** — Orchestrator: guards, batch transaction, calls the three functions in order, returns backward-compatible result object. No API change for callers.

**Verification**: Playwright — Add Cube (objectCount 3→4, signals sync), Ctrl+Z undo (objectCount 4→3, canRedo: true), Extrude Rectangle (objectCount 3→4, full sketch pipeline). Zero console errors.

### Phase 8 Details (completed)

**`<cad-outliner>` Lit component** — replaces imperative `renderObjectList()` innerHTML with reactive Lit component:

- **Created** `web/gui/cad-outliner.js` — Lit web component with 4 reactive properties: `objectIds` (Array), `selectedId` (String), `boolSelA` (String), `boolSelB` (String). Light DOM (`createRenderRoot() { return this; }`) for page stylesheet compatibility.
- **Datastar → Lit bridge**: `<cad-outliner>` uses `data-attr:object-ids="JSON.stringify($litState.objectIds || [])"` etc. — Datastar sets HTML attributes, Lit `@property({ attribute })` auto-parses them. Same pattern as `<cad-viewport>`.
- **Object names**: `willUpdate()` fetches object names from WASM via `window.__moduleRouter.query('getState')` when `objectIds` changes. Falls back to truncated UUID.
- **Selection**: Click handler calls `window.cadCommand('select', { id }, { record: false, broadcast: false })`. Focus button calls `document.getElementById('viewport')?.zoomTo(id)`.
- **Boolean badges**: A/B labels rendered as bold badges based on `boolSelA`/`boolSelB` matching.
- **Deleted** `renderObjectList()` from `state.js` (was innerHTML-based imperative rendering).
- **Updated** `reconcileView()` — removed `renderObjectList()` call, now only handles `loadStyle()` and `loadBim()`.
- **Added** `window.__moduleRouter = moduleRouter` export in `state.js` for component access.
- **index.html**: Replaced `<div id="objectList">` with `<cad-outliner>` element. Added `await import('./cad-outliner.js')` to module init chain.

**Verification**: Playwright — Add Cube (2 items in outliner: "Box 2", "Box 3 A"), click outliner item (selection changes, auto-B assigns, boolean buttons enable), Add Sphere (3 items, reactive update). Zero console errors. No residual "loading..." text.

## Verification

After each phase:
1. `task truck:test:full` passes
2. MCP tools still work (cadCommand dispatch unchanged for existing commands)
3. Gizmo drag + orbit + zoom at 60fps (Tier 3 unchanged)
4. Undo/redo works for all operations
5. Cross-tab Automerge sync works
6. Sketch workflow: draw points → add edges → solve constraints → extrude

## References

- [ADR-0013](0013-lit-threejs.md) — Lit + Three.js + Passive WASM (the component pattern this extends)
- [ADR-0018](0018-code-mode-mcp.md) — Code Mode MCP (Stage 3 multi-module depends on this ADR)
- [ADR-0005](done/0005-schema-driven-unified-api.md) — Schema-Driven Unified API (single dispatch principle)
- [ADR-0008](done/0008-undo-redo.md) — Undo/Redo Strategy (Automerge recording)
- [ADR-0006](done/0006-wasm-boundary.md) — WASM Boundary (execute() contract this formalizes into moduleRouter)
