/**
 * Module Router — routes commands to WASM modules by schema domain (ADR-0019).
 *
 * Today (Phase 1): single module ('core'), pass-through. Zero behavior change.
 * Tomorrow (ADR-0018 Stage 3): multiple modules, routes by schema `domain` tag.
 *
 * Interface:
 *   execute(type, params)      — Tier 1: dispatch mutation to correct module
 *   query(method, ...args)     — Tier 2: read-only queries (always core)
 *   core()                     — Tier 3: direct access for 60fps gizmo
 *   combinedSchema()           — schema discovery for cad_search
 */

export class BrowserModuleRouter {
  declare modules: Map<string, { instance: any; commands: Set<string> | null }>;

  constructor() {
    this.modules = new Map(); // name → { instance, commands }
  }

  /**
   * Register a WASM module. For Phase 1, only 'core' is registered.
   * @param {string} name - Module name ('core', 'sketch', 'bim', etc.)
   * @param {object} wasmInstance - WASM instance with execute(type, paramsJson)
   * @param {Set<string>} [commands] - Command names this module handles (optional)
   */
  register(name, wasmInstance, commands?) {
    this.modules.set(name, {
      instance: wasmInstance,
      commands: commands || null, // null = accepts all (Phase 1 pass-through)
    });
  }

  /** Check if any module is registered and ready. */
  get ready() {
    return this.modules.size > 0;
  }

  /**
   * Tier 1: Dispatch mutation to the module that owns this command.
   * Today: everything goes to 'core'. Tomorrow: routes by command set.
   */
  execute(type, params) {
    // Phase 1: single module fast path
    if (this.modules.size === 1) {
      const mod = this.modules.values().next().value;
      return this._call(mod.instance, type, params);
    }

    // Multi-module: find the module that owns this command
    for (const [name, mod] of this.modules) {
      if (!mod.commands || mod.commands.has(type)) {
        return this._call(mod.instance, type, params);
      }
    }

    return { error: `Unknown command: ${type}` };
  }

  /** Internal: call WASM execute() with error handling. */
  _call(instance, type, params) {
    try {
      const res = instance.execute(type, JSON.stringify(params || {}));
      if (!res) return { error: 'Empty response' };
      return JSON.parse(res);
    } catch (err) {
      console.error(`WASM execute(${type}) failed:`, err);
      return { error: String(err) };
    }
  }

  /**
   * Tier 2: Read-only queries (always core module).
   * These don't mutate state — no Automerge, no broadcast.
   */
  query(method, ...args) {
    const inst = this.core();
    if (!inst) return null;

    switch (method) {
      case 'objectIds':
        return inst.object_ids() || [];
      case 'getInteractionMode':
        return inst.get_interaction_mode();
      case 'getState':
        try { return JSON.parse(inst.execute('get_state', '{}')); }
        catch { return {}; }
      case 'select':
        try { inst.select(args[0] || ''); } catch {}
        return null;
      default:
        return null;
    }
  }

  /**
   * Tier 3: Direct access to core WASM instance (gizmo, 60fps).
   * Only cad-viewport should call this — all other access goes through
   * execute() (Tier 1) or query() (Tier 2).
   */
  core() {
    const mod = this.modules.get('core');
    return mod ? mod.instance : null;
  }

  /**
   * Schema discovery — returns merged schema from all modules.
   * Used by cad_search MCP tool (ADR-0018).
   */
  combinedSchema() {
    const merged = { commands: {} };
    for (const [name, mod] of this.modules) {
      if (mod.instance.schema) {
        try {
          const schema = JSON.parse(mod.instance.schema());
          Object.assign(merged.commands, schema.commands || {});
        } catch {}
      }
    }
    return merged;
  }
}

// ── Singleton ────────────────────────────────────────────────────

export const moduleRouter = new BrowserModuleRouter();

// Expose globally for cad-viewport Tier 3 access and debugging
window.moduleRouter = moduleRouter;
