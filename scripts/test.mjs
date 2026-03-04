#!/usr/bin/env node
// scripts/test.mjs — Test pipeline with architectural descriptions.
//
// Each phase explains WHY it runs, what layer it owns, and what it catches.
// Ordered inside-out: innermost contract first, browser last.
//
// Usage:
//   bun run test          ← all phases (no browser)
//   bun run test:e2e      ← browser/GPU layer (needs server, runs separately)

import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const W = 66;
const line  = '━'.repeat(W);
const reset = '\x1b[0m';
const bold  = '\x1b[1m';
const green = '\x1b[32m';
const cyan  = '\x1b[36m';
const red   = '\x1b[31m';
const dim   = '\x1b[2m';

let passed = 0;
let failed = 0;
const startAll = Date.now();

function header(n, total, title, subtitle, why) {
  console.log(`\n${cyan}${line}${reset}`);
  console.log(`${bold}${cyan}[${n}/${total}] ${title}${reset}`);
  console.log(`${dim}        ${subtitle}${reset}`);
  console.log(`${dim}        WHY: ${why}${reset}`);
  console.log(`${cyan}${line}${reset}`);
}

function run(cmd, opts = {}) {
  const t = Date.now();
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
    const ms = Date.now() - t;
    console.log(`\n${green}✓ passed${reset} ${dim}(${(ms/1000).toFixed(1)}s)${reset}`);
    passed++;
  } catch {
    const ms = Date.now() - t;
    console.log(`\n${red}✗ FAILED${reset} ${dim}(${(ms/1000).toFixed(1)}s)${reset}`);
    failed++;
    console.log(`\n${red}${bold}Pipeline stopped. Fix the failure above and re-run.${reset}\n`);
    process.exit(1);
  }
}

const TOTAL = 6;

// ── 1. Project Structure ────────────────────────────────────────
header(1, TOTAL,
  'PROJECT STRUCTURE',
  'check-alignment.mjs',
  'Catches config drift before anything compiles. Verifies every system.mjs,\n' +
  '        wrangler.toml name, migration dir, and crate reference is consistent.\n' +
  '        If this fails, the project is misconfigured — no point running code.'
);
run('node check-alignment.mjs');

// ── 2. Schema Contract ──────────────────────────────────────────
header(2, TOTAL,
  'SCHEMA CONTRACT  (innermost — Rust types → cad-schema.json)',
  'cargo test --test schema_contract',
  'build_schema() must deep-equal the committed cad-schema.json.\n' +
  '        Rust param structs are the single source of truth for the entire API\n' +
  '        surface (MCP tools, OpenAPI, browser cadCommand, TypeScript types).\n' +
  '        Fail here = schema is stale → run: bun run build:truck'
);
run('cargo test -p truck-webgpu-gui --no-default-features --features native --test schema_contract');

// ── 3. CRDT Layer ───────────────────────────────────────────────
header(3, TOTAL,
  'CRDT LAYER  (truck-sync)',
  'cargo test -p truck-sync',
  'Tests the operation log that powers multi-user sync (Automerge-compatible).\n' +
  '        Verifies: merge commutativity, replay determinism, offline/online\n' +
  '        convergence, rollback, model isolation. Pure math — no geometry.'
);
run('cargo test -p truck-sync');

// ── 4. Geometry & Domain Layer ──────────────────────────────────
header(4, TOTAL,
  'GEOMETRY & DOMAIN LAYER  (truck-webgpu-gui, headless)',
  'cargo test -p truck-webgpu-gui --no-default-features --features native',
  'Tests every CAD command through HeadlessController (no GPU, no browser).\n' +
  '        Typed param structs (p() helper) bind tests to the API — field renames\n' +
  '        fail at compile time. Covers: primitives, booleans, sketch/extrude,\n' +
  '        scene import/export, style, rendering-only error handling, CRDT replay.'
);
run('cargo test -p truck-webgpu-gui --no-default-features --features native');

// ── 5. TypeScript Boundary ──────────────────────────────────────
header(5, TOTAL,
  'TYPESCRIPT BOUNDARY  (Rust → TypeScript)',
  'tsc --noEmit  (worker + web)',
  'Type-checks the Cloudflare Worker and browser TypeScript.\n' +
  '        CadCommandName is derived from cad-schema.json — command renames\n' +
  '        that slipped past Rust tests cause TS errors here before HTTP tests run.\n' +
  '        api-types.ts is generated from cad-schema.json → OpenAPI → TS types.'
);
run('cd systems/truck/worker && bunx tsc --noEmit && cd ../web && bun run typecheck');

// ── 6. HTTP / MCP Contract ──────────────────────────────────────
header(6, TOTAL,
  'HTTP / MCP CONTRACT  (TypeScript → HTTP boundary)',
  'vitest run  (systems/truck/worker)',
  'Verifies the Cloudflare Worker serves exactly the committed cad-schema.json\n' +
  '        (deep equality — catches add/delete/rename at the HTTP layer).\n' +
  '        Also verifies: MCP tool list, MCP tool count formula, OpenAPI 3.1 spec,\n' +
  '        model persistence (R2 CRUD), thumbnail round-trip, MCP tool call flow.'
);
run('cd systems/truck/worker && bun x vitest run');

// ── Summary ─────────────────────────────────────────────────────
const total_s = ((Date.now() - startAll) / 1000).toFixed(1);
console.log(`\n${cyan}${line}${reset}`);
console.log(`${bold}${green}All ${TOTAL} phases passed${reset}  ${dim}(${total_s}s total)${reset}`);
console.log(`${dim}Next: bun run test:e2e  ← browser + WebGPU (outermost layer)${reset}`);
console.log(`${cyan}${line}${reset}\n`);
