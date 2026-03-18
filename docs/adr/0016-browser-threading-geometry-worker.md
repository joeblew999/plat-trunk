# ADR-0016: Browser Threading — Geometry Worker + Render Thread Split

**Status**: Proposed  
**Date**: 2026-03-18  
**Depends on**: ADR-0002 (GeometryStore data/control plane), ADR-0006 (performance)

## Problem

### 1. Geometry WASM blocks the main thread

`moduleRouter.execute()` is synchronous. Every CAD command — `add_cube` (1ms),
`boolean_union` on a complex mesh (2–8s), `import_ifc` (5–30s) — blocks the
main thread completely. During that time:

- WebGPU render loop freezes (frame drops to 0)
- SSE events queue and are not processed
- Datastar signal updates do not fire
- User input (keyboard, mouse) is dropped
- `_busy = true` prevents concurrent commands but does not help the freeze

The `_busy` flag is a symptom of this problem, not a solution.

### 2. Replay blocks proportionally to op count

`executeReplayPlan()` in `replay-executor.ts` calls `cadCommand()` N times
sequentially. For a model with 50 ops that takes 200ms each (boolean-heavy),
replay blocks the main thread for 10 seconds. The user sees a white canvas.

`adoptServerDoc()` in `history-domain.ts` has the same problem — it calls
`window.cadCommand()` for each op in sequence on the main thread.

### 3. Data plane and render plane are coupled on the same thread

ADR-0002 defines the split:
- **Data Plane**: `GeometryStore` — mesh computation, boolean ops, scene state
- **Render Plane**: `SceneController` — WebGPU instances, gizmos, camera, picking

Today both live in `SceneController` on the main thread. This is correct for
rendering (WebGPU requires the main thread and the canvas element) but wrong
for geometry (mesh computation has no dependency on the GPU or the DOM).

ADR-0002 proposes `GeometryStore` as a shared Rust module. ADR-0016 takes that
further: once `GeometryStore` is extracted (ADR-0002), the browser can run it
in a Web Worker, completely decoupled from the render thread.

## Architecture

```
MAIN THREAD (render)
  SceneController (WebGPU + canvas)
    ← receives GeometryUpdate messages from worker
    ← owns gizmo, camera, picking (60fps, no blocking)
    ← owns OffscreenCanvas (transferred at init)

  Datastar signals + UI
    ← reconcile() called after receiving GeometryUpdate
    ← never blocks on geometry

  worker-relay.ts (SSE)
    ← sends commands to GeometryWorker
    ← receives results, updates sync + UI

GEOMETRY WORKER (Web Worker)
  GeometryStore WASM (truck-geometry.wasm, bundler target)
    ← runs all data-plane commands: add_cube, boolean_union, translate, ...
    ← all heavy computation here, never blocks main thread

  SyncClient
    ← Automerge doc bytes live here (not main thread)
    ← postSync via fetch from worker thread (allowed)
    ← BroadcastChannel for cross-tab sync

  Replay executor
    ← full op replay runs here — main thread never sees it
    ← posts GeometryUpdate when complete

MESSAGE PROTOCOL (structured clone, no SharedArrayBuffer needed)
  Main → Worker:  CadCommand { type, params, opts }
  Worker → Main:  GeometryUpdate { sceneJson, result, opCount }
                  SyncUpdate { hadNewOps, opCount }
                  ReplayComplete { sceneJson, totalOps }
                  Error { command, message }
```

## Why not SharedArrayBuffer?

SharedArrayBuffer requires cross-origin isolation headers (`COOP`/`COEP`),
which breaks third-party auth flows (OAuth redirects). Cloudflare Workers can
set these headers but it has implications for the auth worker.

Structured clone via `postMessage` is sufficient. `GeometryUpdate.sceneJson`
is the scene export (JSON string) — the main thread parses it and rebuilds GPU
instances. This is the same data that `export_scene()` already produces. The
overhead is one JSON serialization per command, which is negligible compared
to the geometry computation itself.

## Concrete changes required

### Phase 1: GeometryStore extraction (ADR-0002 prerequisite)

ADR-0002 must land first. `GeometryStore` needs to be a standalone Rust module
compilable without rendering dependencies. Until then, the WASM binary contains
rendering code that cannot run in a Web Worker (no canvas, no GPU).

Once ADR-0002 lands, the `truck-geometry.wasm` bundler-target build (currently
used by the CF worker) can also be used by the browser's Web Worker. Same binary,
two consumers.

### Phase 2: GeometryWorker (new file: `geometry-worker.ts`)

```typescript
// systems/truck/web/geometry-worker.ts
// Runs in a Web Worker — no DOM, no window, no canvas.

import { GeometryWorkerHandler } from './geometry-worker-handler';

const handler = new GeometryWorkerHandler();

self.onmessage = async (e: MessageEvent<CadWorkerMessage>) => {
  const result = await handler.handle(e.data);
  self.postMessage(result);
};
```

`GeometryWorkerHandler` owns:
- WASM init (`initGeometryWasm()` from the bundler-target build)
- `GeometryStore` (or `HeadlessController` until ADR-0002 lands)
- `SyncClient` with `IdbStorageAdapter` (IDB accessible from workers) and
  `NullNetworkAdapter` (fetch works from workers)
- Replay execution (all N ops, never seen by main thread)

### Phase 3: WorkerRelay refactor

`cadCommand()` in `dispatch.ts` currently calls `moduleRouter.execute()` synchronously.
After this ADR:

```typescript
// dispatch.ts (after)
export async function cadCommand(type, params, options) {
  // Control plane (undo/redo/set_mode) — stays on main thread, instant
  if (isJsControlPlane(type)) return handleJsCommand(type, params);
  if (!isDataPlane(type)) return cadQuery(type, params); // read-only, sync WASM fine

  // Data plane — send to geometry worker, await result
  return geometryWorker.send({ type: 'CadCommand', command: type, params, opts: options });
}
```

`geometryWorker.send()` returns a Promise that resolves when the worker posts
the `GeometryUpdate` response. The main thread is free while the worker computes.

### Phase 4: SceneController receives geometry updates

```typescript
// cad-viewport.ts — receives geometry from worker
geometryWorker.onmessage = (update: GeometryUpdate) => {
  if (update.sceneJson) {
    // Rebuild GPU instances from scene JSON — same as current import_scene path
    sceneController.import_scene(update.sceneJson);
  }
  reconcile(update.result);
};
```

The `sync_after_add()`, `sync_after_boolean()` etc. patterns from ADR-0002
become irrelevant in this model — the main thread always rebuilds from the
full `sceneJson` export. This is slightly less efficient than incremental sync
(rebuilds all GPU instances, not just the changed one) but:
- Correct by construction — no stale GPU state possible
- Simple — one code path instead of five
- Fast enough — `import_scene` on 100 objects takes ~5ms GPU-side

If performance profiling shows this is a bottleneck at scale (500+ objects),
switch to delta updates: worker sends `{ added: [], removed: [], modified: [] }`
instead of full `sceneJson`. Do not prematurely optimise this.

### Phase 5: `_busy` flag removal

Once `cadCommand()` is async and the worker serialises its own command queue,
the `_busy` flag in `dispatch.ts` becomes unnecessary. Workers process one
message at a time by default. Remove it.

## What stays on the main thread

| Concern | Thread | Reason |
|---------|--------|--------|
| WebGPU rendering | Main | Canvas, GPU device require main thread |
| Gizmo, camera, picking | Main | 60fps, direct GPU access |
| Datastar signals, UI | Main | DOM, Lit components |
| SSE connection | Main | EventSource requires DOM |
| Control-plane commands | Main | Instant, no geometry (undo, set_mode, select) |
| Read-only queries | Main | cadQuery — synchronous WASM fine for reads |

## What moves to the geometry worker

| Concern | Thread | Reason |
|---------|--------|--------|
| GeometryStore / HeadlessController | Worker | All heavy computation |
| Data-plane command execution | Worker | add_cube, boolean_union, import_ifc, ... |
| Automerge doc bytes (SyncClient) | Worker | Co-located with geometry state |
| Replay execution | Worker | N sequential ops, never blocks main |
| IDB doc storage | Worker | IDB accessible from workers |
| Server sync (fetch) | Worker | fetch() available in workers |
| BroadcastChannel cross-tab | Worker | BroadcastChannel available in workers |

## Impact on circular import problem

Moving `SyncClient` and geometry execution to the worker eliminates the need
for `history-domain.ts` to call `window.cadCommand()` or `window.reconcile()`
at all. The worker sends a `ReplayComplete` message; the main thread calls
`reconcile()` once in response. The circular import problem dissolves because
`history-domain.ts` (in the worker) no longer imports from `dispatch.ts` or
`reconcile.ts` (main thread). The worker boundary is the natural dependency
break.

## Impact on long-running commands

`import_ifc` takes 5–30 seconds. In the current architecture this is a
5–30 second main thread freeze. After this ADR:
- Worker posts progress updates: `{ type: 'Progress', phase: 'parsing', pct: 40 }`
- Main thread shows a progress indicator via Datastar signal
- WebGPU keeps rendering (spinner, loading state)
- User can still interact with the UI (though most commands will queue behind
  the running import)

## Constraints

1. **ADR-0002 must land first** — `GeometryStore` must be extractable from
   `SceneController` before it can run in a worker. Phase 1 is the blocker.

2. **OffscreenCanvas** — if `SceneController` is moved off the main thread
   entirely (for render-loop performance), it requires `OffscreenCanvas`
   transfer. This is out of scope for this ADR — `SceneController` stays on
   the main thread, only `GeometryStore` moves.

3. **IFC/STEP format workers** — ADR-0002 already anticipates splitting heavy
   format parsers into separate CF Workers on the server side. On the browser
   side, the same files can be parsed in the geometry worker (or a further
   nested worker for truly heavy imports). This ADR does not preclude that.

4. **Plugin system** — plugins currently call `window.cadCommand()`. After this
   ADR, plugins call the same `cadCommand()` function, which now proxies to the
   worker. No plugin API changes needed.

## Implementation order

1. **Land ADR-0002** — GeometryStore extraction (prerequisite)
2. **`geometry-worker.ts`** — worker shell + message protocol
3. **`cadCommand()` async proxy** — dispatch.ts sends to worker
4. **`cad-viewport.ts` update receiver** — handle GeometryUpdate
5. **Move SyncClient to worker** — Automerge doc bytes co-located with geometry
6. **Remove `_busy` flag**
7. **Move replay to worker** — `executeReplayPlan` runs in worker
8. **Progress updates** — long-running commands post progress

## Not in scope

- `OffscreenCanvas` / rendering thread separation (separate ADR if needed)
- SharedArrayBuffer / Atomics (not needed, avoids COOP/COEP complexity)
- Service Worker caching (separate concern)
- Streaming geometry (separate concern)
