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

**Accepted** (Core implementation deployed 2026-02-21).

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
| Toggle Mode | `cadCommand('set_mode', {mode: 'online'})` | `cad_set_mode({mode: 'online'})` |
| Click "New" document | `cadCommand('create_model', {name})` | `cad_create_model({name})` |
| Check sync status | `cadCommand('get_status')` | `cad_get_status()` |

**All of these go through the same dispatch, return the same JSON shape, hit the same `reconcile()`, and are tested the same way.** The GUI, the AI, and the test harness are interchangeable callers.

### Architecture: Unified State Surface

#### Command Categories

All commands go through `cadCommand()`. WASM commands dispatch to Rust `execute()`. JS-layer commands are handled in `state.js` before the WASM call.

```
cadCommand(type, params, opts)
  │
  ├─ WASM commands (Rust execute())
  │   add_cube, add_sphere, translate, boolean_subtract, ...
  │   select, deselect, pick_at, get_state, export_scene, ...
  │
  └─ JS commands (state.js → CadDocumentManager / Window)
      undo, redo, get_status, set_mode, create_model
```

#### Command Definitions

These are added to `cad-schema.json` with `layer: "js"` to distinguish them from WASM commands:

| Command | Params | Returns | Layer | Notes |
|---------|--------|---------|-------|-------|
| `undo` | — | `{success}` | JS | Disables last own op/group, replays |
| `redo` | — | `{success}` | JS | Re-enables first disabled own op, replays |
| `get_status` | — | `{mode, automergeReady, objectCount}` | JS | Get complete system status |
| `set_mode` | `{mode: 'local'\|'online'}` | `{mode}` | JS | Switch mode at runtime |
| `create_model` | `{name?}` | `{success, modelId}` | JS | Creates new Automerge doc, resets scene |

### Dispatch Routing

`cadCommand()` in `state.js` routes by category:

```javascript
const JS_COMMANDS = new Set(['undo', 'redo', 'get_status', 'set_mode', 'create_model']);

async function cadCommand(type, params = {}, opts = {}) {
  // ... check guards ...

  let result;
  if (JS_COMMANDS.has(type)) {
    result = await handleJsCommand(type, params);
  } else {
    result = executeWasm(ctrl, type, params);
  }

  // ... record to Automerge (except JS commands which handle own state) ...
  // ... reconcile and broadcast ...
}
```

## Visual Status — The Ribbon

The GUI renders a persistent status ribbon and enhanced File panel controls.

### Status Bar (Footer)

Shows object count, selection, and mode status (Online/Local). Driven by Datastar signals updated in `reconcile()`.

### File Panel

The side panel includes:
- **Mode Toggle**: A button calling `cadCommand('set_mode')` to switch between Local (offline-first) and Online (Worker relay) modes.
- **New Document**: Calls `cadCommand('create_model')` to reset the workspace.

## Future Work

- **History Inspection**: Implement `list_operations` and `get_history_stats` for full timeline introspection via MCP.
- **Model Management**: Implement `open_model`, `list_models`, `delete_model` for full CRUD.
- **Auto-Detection**: Listen for network events to trigger `set_mode` automatically.
