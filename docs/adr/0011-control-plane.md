# [ADR-011] Control Plane — State Management as API

**Author**: Claude (Anthropic) — derived from codebase audit and architecture discussion.
**Date**: 2026-02-20

## Intent

**Make every aspect of the CAD system — modeling, mode switching, document management, undo/redo history, and sync status — controllable through a single API contract**, so that end users (GUI), AI agents (MCP), and developers (tests/HTTP) all use the exact same paths. Today only modeling commands go through the contract. Everything else is ad hoc JS, query params, or DOM state that only the GUI can reach. This ADR specifies the commands, routes, MCP tools, and visual indicators needed to close that gap.

### This is a Control Plane

Every serious system separates the **data plane** (the work it does) from the **control plane** (managing how it does it). Our data plane is modeling — `add_cube`, `boolean_subtract`, `translate`. Our control plane is everything else — mode, documents, history, sync status. The key insight: **both planes use the same dispatch mechanism**.

This is a well-established pattern:

| System | Data plane | Control plane | Same API? |
|--------|-----------|---------------|-----------|
| Kubernetes | Pods, Deployments | Nodes, Namespaces, Config | Yes — same `kubectl` / API server |
| SQL databases | `INSERT`, `SELECT` | `CREATE TABLE`, `SHOW STATUS`, `SET GLOBAL` | Yes — same SQL connection |
| Git | `add`, `commit`, `diff` | `remote`, `config`, `gc` | Yes — same CLI |
| **Our CAD system** | `add_cube`, `translate` | `set_mode`, `list_models`, `undo` | **Yes — same `cadCommand()`** |

Most systems build a separate admin API with different auth, different schemas, different tests. We don't — the control plane commands go through the same `cadCommand()` dispatch, the same `cad-schema.json`, the same MCP tools, the same `mountModule()` routes. Zero new infrastructure.

### Why This Matters

**This is essentially a debug/management API** built on the exact same architecture as the modeling commands. It uses the same `cadCommand()` dispatch, the same schema, the same MCP tools — just targeting the browser environment itself (mode, documents, history, sync) instead of the 3D scene. Having this surface was vital in earlier versions of the GUI for tracking down sync issues and toggling offline/online mode with a single button press. It enables:

- **Dev workflow**: Toggle offline/online, inspect sync state, reset documents — from a button or from the terminal
- **AI agents**: Can't be useful if they can only make cubes but can't manage models, undo mistakes, or check sync status
- **Tests**: Need full control to set up scenarios (create model, add objects, undo, verify history, check mode)

**The querystring approach (`?local`) stays** — it works well for URL-level control and bookmarkable modes. This ADR adds runtime switching (a GUI button that calls `cadCommand('set_mode', ...)`) on top of that, plus full programmatic control over documents and history for AI agents and test automation.

## Status

**Implemented** (core local/online split). **In Progress** (full state management API).

## Problem

The system has three actors — **end users** (clicking buttons), **AI agents** (calling MCP tools), and **developers** (running tests / calling HTTP API). Today they each see a different surface:

| Actor | Modeling (add/boolean/transform) | Mode (local/online) | Documents (create/load/list) | History (undo/redo/rollback) | Sync status |
|-------|----------------------------------|----------------------|-------------------------------|------------------------------|-------------|
| User (GUI) | Toolbar → `cadCommand()` | `?local` URL param (hidden) | Click "New"/"Share" (ad hoc JS) | Undo button → `docManager.undo()` | Status bar text |
| AI (MCP) | `cad_add_cube` etc. | **No access** | **No access** | **No access** | **No access** |
| Dev (API/test) | `POST /cad/:id/exec` | **No access** | Legacy `/docs` routes (separate) | **No access** | **No access** |

**This is broken.** Modeling commands go through the schema-driven contract (`cadCommand()` → `execute()` → `reconcile()`), but everything else is ad hoc. Mode is a query param. Document management is direct JS on `CadDocumentManager`. History is method calls. Sync status is a DOM string.

**The fix**: Route ALL state management through the **same contract**. Same `cadCommand()` dispatch. Same schema. Same MCP tools. Same API routes. Same tests. One path for everything, three actors using it identically.

## Decision: Everything Through the Contract

Every piece of state the system manages becomes a **command type** in `cad-schema.json`, dispatched through the same `cadCommand()` → `execute()` / JS handler → `reconcile()` path that modeling commands use.

### Principle: If the GUI Can Do It, MCP Can Do It

| GUI action | Command | MCP tool |
|------------|---------|----------|
| Click "Add Cube" | `cadCommand('add_cube', {size: 1})` | `cad_add_cube({size: 1})` |
| Click "Undo" | `cadCommand('undo')` | `cad_undo()` |
| Toggle timeline chip | `cadCommand('toggle_operation', {opId})` | `cad_toggle_operation({opId})` |
| Click "New" document | `cadCommand('create_model', {name})` | `cad_create_model({name})` |
| Open a shared model | `cadCommand('open_model', {modelId})` | `cad_open_model({modelId})` |
| Switch to local mode | `cadCommand('set_mode', {mode: 'local'})` | `cad_set_mode({mode: 'local'})` |
| Check sync status | `cadCommand('get_status')` | `cad_get_status()` |

**All of these go through the same dispatch, return the same JSON shape, hit the same `reconcile()`, and are tested the same way.** The GUI, the AI, and the test harness are interchangeable callers.

### What This Means for Testing

```javascript
// Test: AI agent can create a model and add geometry
const model = await apiCommand(page, 'create_model', { name: 'test-bracket' });
expect(model.modelId).toBeDefined();
await apiCommand(page, 'add_cube', { size: 2 });
await apiCommand(page, 'add_cylinder', { radius: 0.5, height: 3 });
const ids = await getObjectIds(page);
await apiCommand(page, 'boolean_subtract', { idA: ids[0], idB: ids[1] });
const status = await apiCommand(page, 'get_status');
expect(status.objectCount).toBe(1);
expect(status.canUndo).toBe(true);

// Test: AI agent can undo and inspect history
await apiCommand(page, 'undo');
expect(await getObjectCount(page)).toBe(2);
const history = await apiCommand(page, 'list_operations');
expect(history.operations[history.operations.length - 1].enabled).toBe(false);
```

Same commands work from GUI clicks, MCP calls, or HTTP API. **One contract. Three actors. Zero drift.**

## Architecture: Unified State Surface

### Command Categories

All commands go through `cadCommand()`. WASM commands dispatch to Rust `execute()`. JS-layer commands are handled before the WASM call.

```
cadCommand(type, params, opts)
  │
  ├─ WASM commands (Rust execute())
  │   add_cube, add_sphere, translate, boolean_subtract, ...
  │   select, deselect, pick_at, get_state, export_scene, ...
  │
  ├─ History commands (JS → CadDocumentManager)
  │   undo, redo, rollback_to, toggle_operation,
  │   list_operations, get_history_stats
  │
  ├─ Document commands (JS → CadDocumentManager + URL routing)
  │   create_model, open_model, list_models, delete_model,
  │   rename_model, share_model, get_model_info
  │
  └─ System commands (JS → window state)
      get_status, set_mode, get_mode
```

### Command Definitions (New)

These are added to `cad-schema.json` alongside the existing 27 modeling commands:

#### History Commands

| Command | Params | Returns | Ephemeral | Notes |
|---------|--------|---------|-----------|-------|
| `undo` | — | `{success, objectCount, canUndo, canRedo}` | No | Disables last own op/group, replays |
| `redo` | — | `{success, objectCount, canUndo, canRedo}` | No | Re-enables first disabled own op, replays |
| `rollback_to` | `{opIndex}` | `{success, objectCount}` | No | Disables all own ops after index, replays |
| `toggle_operation` | `{opId}` | `{success, enabled, objectCount}` | No | Toggle single op/group enabled state |
| `list_operations` | `{limit?, offset?}` | `{operations: [{id, type, params, enabled, timestamp, actorId}], total}` | Yes (readonly) | For timeline display and AI introspection |
| `get_history_stats` | — | `{total, enabled, disabled, canUndo, canRedo}` | Yes (readonly) | Summary of op log |

#### Document Commands

| Command | Params | Returns | Ephemeral | Notes |
|---------|--------|---------|-----------|-------|
| `create_model` | `{name?}` | `{modelId, automergeUrl}` | No | Creates new Automerge doc, navigates to `/model/:id` |
| `open_model` | `{modelId}` | `{modelId, automergeUrl, name, objectCount}` | No | Loads existing model |
| `list_models` | — | `{models: [{modelId, name, lastOpened, opCount}]}` | Yes (readonly) | Lists all local models from IndexedDB |
| `delete_model` | `{modelId}` | `{success}` | No | Removes from IndexedDB (not Automerge — CRDT is append-only) |
| `rename_model` | `{modelId, name}` | `{success}` | No | Updates display name |
| `share_model` | — | `{shareUrl, automergeUrl}` | Yes (readonly) | Returns shareable URL for current model |
| `get_model_info` | — | `{modelId, name, automergeUrl, createdAt, opCount}` | Yes (readonly) | Current model metadata |

#### System Commands

| Command | Params | Returns | Ephemeral | Notes |
|---------|--------|---------|-----------|-------|
| `get_status` | — | Full status object (see below) | Yes (readonly) | Complete system state snapshot |
| `get_mode` | — | `{mode: 'local'\|'online', workerConnected, sseActive}` | Yes (readonly) | Current connectivity mode |
| `set_mode` | `{mode: 'local'\|'online'}` | `{mode, workerConnected}` | No | Switch mode at runtime (loads/unloads worker-relay) |

#### Status Object

`get_status` returns a comprehensive snapshot — everything an AI agent or test needs to understand the current state:

```json
{
  "mode": "online",
  "workerConnected": true,
  "sseActive": true,
  "model": {
    "modelId": "bracket-v2",
    "name": "Bracket v2",
    "automergeUrl": "automerge:4NkEz..."
  },
  "scene": {
    "objectCount": 3,
    "objectIds": ["abc...", "def...", "ghi..."],
    "selectedId": "abc...",
    "boolSelA": "abc...",
    "boolSelB": "def...",
    "boolReady": true
  },
  "history": {
    "total": 8,
    "enabled": 7,
    "disabled": 1,
    "canUndo": true,
    "canRedo": true
  },
  "sync": {
    "crossTabPeers": 2,
    "lastBroadcast": 1708444800000,
    "automergeReady": true,
    "indexedDBReady": true
  }
}
```

### Dispatch Routing

`cadCommand()` in `state.js` routes by category:

```javascript
function cadCommand(type, params = {}, opts = {}) {
  const ctrl = window.sceneController;
  if (!ctrl && !JS_COMMANDS.has(type)) return { error: 'SceneController not ready' };

  let result;

  if (JS_COMMANDS.has(type)) {
    // JS-layer commands: history, documents, system
    result = handleJsCommand(type, params, opts);
  } else {
    // WASM commands: modeling, selection, queries
    try { result = executeWasm(ctrl, type, params); }
    catch (err) { return { error: String(err) }; }
  }

  // Record to Automerge (modeling commands only, not history/doc/system)
  if (!opts.ephemeral && !opts.skipAutomerge && !JS_COMMANDS.has(type)) {
    const mgr = window.cadDocManager?.handle ? window.cadDocManager : null;
    if (mgr) mgr.record(type, params, { objectId: result.objectId, groupId: opts.groupId });
  }

  // Reconcile: WASM + JS state → Datastar signals → UI
  const state = reconcile(result);

  // Broadcast (non-ephemeral, online mode only)
  if (!opts.ephemeral && !window.__cadLocalMode && opts.source !== 'api') {
    broadcast(state);
  }

  return { ...result, ...state };
}

const JS_COMMANDS = new Set([
  'undo', 'redo', 'rollback_to', 'toggle_operation',
  'list_operations', 'get_history_stats',
  'create_model', 'open_model', 'list_models', 'delete_model',
  'rename_model', 'share_model', 'get_model_info',
  'get_status', 'get_mode', 'set_mode',
]);
```

### Schema Extension

These commands are added to `cad-schema.json`. Unlike WASM commands (generated from Rust structs via schemars), JS-layer commands are defined in a separate section:

```json
{
  "module": "cad",
  "version": "0.4.0",
  "commands": {
    "add_cube": { "...existing..." },
    "undo": {
      "description": "Undo last own operation",
      "params": { "type": "object", "properties": {} },
      "returns": "status",
      "ephemeral": false,
      "readonly": false,
      "layer": "js"
    },
    "list_operations": {
      "description": "List operation history",
      "params": {
        "type": "object",
        "properties": {
          "limit": { "type": "number", "default": 100 },
          "offset": { "type": "number", "default": 0 }
        }
      },
      "returns": "operations",
      "ephemeral": true,
      "readonly": true,
      "layer": "js"
    },
    "get_status": {
      "description": "Get complete system status",
      "params": { "type": "object", "properties": {} },
      "returns": "status",
      "ephemeral": true,
      "readonly": true,
      "layer": "js"
    }
  }
}
```

The `layer` field tells the Worker/MCP which commands execute in WASM vs JS. For the Worker relay: WASM commands go through SSE → browser → WASM. JS commands could either go through the same SSE relay (browser executes) or be handled directly by the Worker (for model listing from R2, etc.).

### Worker Routes — Schema-Driven, Model-Scoped

All routes are generated by `mountModule()` from the schema. Including the new commands:

```
POST /api/cad/:modelId/async/undo           → queue undo
POST /api/cad/:modelId/sync/undo            → undo + wait for result
POST /api/cad/:modelId/sync/list_operations  → get history
POST /api/cad/:modelId/sync/get_status       → get full status
POST /api/cad/:modelId/sync/create_model     → create new model
GET  /api/cad/schema                         → full schema (all commands)
```

### MCP Tools — Same Contract

The `mountModule()` loop generates MCP tools for all non-ephemeral, non-readonly commands:

```
cad_add_cube({size: 1})                  → SSE relay → WASM
cad_undo()                               → SSE relay → JS
cad_create_model({name: "bracket"})      → SSE relay → JS
cad_set_mode({mode: "online"})           → SSE relay → JS
```

Readonly commands become MCP **resources** (not tools):
```
cad://status                → get_status
cad://history               → list_operations
cad://models                → list_models
cad://model/bracket-v2      → get_model_info
```

## Visual Status — The Ribbon

The user, AI, and developer all need to **see** the system state, not just query it. The GUI renders a persistent status ribbon and enriches the existing timeline.

### Status Bar (Footer)

Already exists. Enhanced to show all state:

```
[Objects: 3] [Selected: abc1] [A:abc1 | B:def2] | [Doc: bracket-v2 (8 ops)] | [Online ●] [2 tabs]
```

Driven entirely by Datastar signals that `reconcile()` sets:

```javascript
// In reconcile():
r.statusMode = window.__cadLocalMode ? 'Local' : 'Online';
r.statusConnected = !!eventSource;  // worker-relay SSE active
r.statusPeers = /* BroadcastChannel peer count */;
r.statusDocName = mgr?.handle?.doc()?.name || 'Untitled';
r.statusOpCount = mgr?.stats?.total || 0;
```

### Header Bar — Mode + Model Info

The header already has undo/redo buttons and mode indicator. Enhanced:

```
[CAD] [bracket-v2 ▾] ← dropdown: New / Open / Rename / Share / Delete
                                    [Undo][Redo] [Local ○ / Online ●] [API]
```

The model dropdown and mode toggle are **buttons that call `cadCommand()`**:
- "New" → `cadCommand('create_model', {name: 'Untitled'})`
- "Share" → `cadCommand('share_model')`
- Mode toggle → `cadCommand('set_mode', {mode: 'online'})`

### Timeline Strip (Enriched)

Already exists as horizontal chip strip. Enhanced with:
- **Mode indicator**: colored dot at start (green = online, gray = local)
- **Sync markers**: small dot between chips when a sync event occurred
- **Undo boundary**: visual divider showing the undo/redo split point
- **Ghost chips**: disabled ops shown with dashed border + reduced opacity (already implemented)
- **AI attribution**: chips from MCP/API source get a small robot badge

All driven by `list_operations` data — the timeline component calls `cadCommand('list_operations')` to render, same data the AI can query.

## Local/Online Mode — Implementation

### Current Implementation (Shipped)

```javascript
// index.html — detected at page load
window.__cadLocalMode = new URLSearchParams(location.search).has('local');
```

| Concern | Local Mode (`?local`) | Online Mode (default) |
|---------|----------------------|----------------------|
| WASM execution | Local (always) | Local (always) |
| Automerge op log | Local (always) | Local (always) |
| Undo/redo | Works | Works |
| Cross-tab sync | BroadcastChannel | BroadcastChannel |
| IndexedDB persistence | Works | Works |
| Worker SSE relay | Not loaded | `worker-relay.js` loaded |
| State broadcast | Skipped | `POST /api/cad/:modelId/state` |
| MCP/API access | No (no relay) | Yes (via Worker) |

### Future: Runtime Mode Switching

`set_mode` command enables switching without page reload:

```javascript
function handleSetMode({ mode }) {
  if (mode === 'local' && !window.__cadLocalMode) {
    window.__cadLocalMode = true;
    // Disconnect SSE, stop broadcasting
    window.__workerRelay?.disconnect();
  } else if (mode === 'online' && window.__cadLocalMode) {
    window.__cadLocalMode = false;
    // Load worker-relay.js, connect SSE
    window.__workerRelay?.connect();
  }
  return { mode: window.__cadLocalMode ? 'local' : 'online' };
}
```

### Future: Auto-Detection

```javascript
// Detect network, auto-switch
window.addEventListener('online', () => cadCommand('set_mode', {mode: 'online'}));
window.addEventListener('offline', () => cadCommand('set_mode', {mode: 'local'}));
```

## URL Routing — Model-Scoped

| URL | Behavior |
|-----|----------|
| `/` | Redirect to last model or `/model/new` |
| `/model/new` | Create new model, redirect to `/model/:id` |
| `/model/:id` | Open model (online mode) |
| `/model/:id?local` | Open model (local mode) |
| `/models` | Model dashboard (list, create, delete) |

Model ID ↔ Automerge URL mapping stored in IndexedDB:
```javascript
{ modelId: "bracket-v2", automergeUrl: "automerge:4NkEz...", name: "Bracket v2", createdAt: "...", lastOpened: "..." }
```

Worker routes are model-scoped: `/api/cad/:modelId/events`, `/api/cad/:modelId/exec`, etc. Each model gets an isolated `ModelSession` with separate command queue, scene state, and SSE listeners. Inactive models are GC'd after 5 minutes; browser re-syncs state on reconnect.

## Graceful Degradation

| Failure | Impact | Recovery |
|---------|--------|----------|
| Worker down | No API/MCP. Local modeling + cross-tab sync still work. | Auto-reconnect (EventSource, 5s retry). `get_status` shows `workerConnected: false`. |
| Network lost | Same as local mode. Automerge continues locally. | `set_mode` auto-triggers. State broadcast resumes on reconnect. |
| Automerge init fail | No undo/redo/history. Modeling still works. | `get_status` shows `automergeReady: false`. Warning in status bar. |
| WebGPU unsupported | Fatal — no rendering. | Error shown. |

## Files

| File | Role |
|------|------|
| `web/gui/state.js` | `cadCommand()` dispatch — routes JS commands vs WASM commands |
| `web/gui/history.js` | `CadDocumentManager` — handles history + document commands |
| `web/gui/worker-relay.js` | SSE connection, command relay |
| `web/gui/index.html` | Status bar, header, timeline, mode indicator — all data-testid'd |
| `web/cad-schema.json` | Schema — includes history, document, and system commands |
| `systems/truck/worker/src/index.ts` | `mountModule()` generates routes + MCP tools from schema |

## AI Agent Workflow Example

An AI agent (Claude, GPT-4, etc.) connected via MCP can do everything a user can:

```
# Create a project
cad_create_model({ name: "Mounting Bracket" })
  → { modelId: "brkt-2x9f", automergeUrl: "automerge:..." }

# Model the geometry
cad_add_cube({ size: 2, modelId: "brkt-2x9f" })
cad_add_cylinder({ radius: 0.3, height: 3 })
cad_boolean_subtract({ idA: "abc...", idB: "def..." })

# Check work
cad_get_status()
  → { scene: { objectCount: 1 }, history: { total: 3 } }

# Made a mistake — undo
cad_undo()
  → { success: true, objectCount: 2 }

# Inspect what happened
cad_list_operations()
  → { operations: [ {type: "add_cube", enabled: true}, {type: "add_cylinder", enabled: true}, {type: "boolean_subtract", enabled: false} ] }

# Re-do it
cad_redo()

# Share with the team
cad_share_model()
  → { shareUrl: "https://cad.ubuntusoftware.net/model/brkt-2x9f" }
```

**The AI has the same power as the user.** No special API. No separate interface. Same contract, same schema, same tests verify it.

## Future

- **Auto-detection**: Network events trigger `set_mode` automatically
- **Model dashboard**: `/models` route with list/search/import/export
- **Shared Worker**: Kernel in SharedWorker for multi-tab memory sharing
- **Service Worker**: Cache WASM + assets for true offline-first (no server for initial load)
- **Durable Objects**: Replace SSE poll with WebSocket rooms (<100ms latency)
- **R2 sync**: Document commands with `persist: true` flag sync to R2 for cloud backup
- **Auth**: Per-model access control (read/write/admin)
