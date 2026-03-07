#!/usr/bin/env node
// scripts/test.mjs — Test pipeline with architectural descriptions.
//
// Each phase explains WHY it runs, what layer it owns, and what it catches.
// Ordered inside-out: innermost contract first, browser last.
//
// SYSTEM-AWARE: each system declares its test config in systems/{name}/system.mjs.
// To add a new system's tests:
//   1. Add `export const testing = { ... }` to systems/{name}/system.mjs
//   2. Add one import below and push to SYSTEMS
//
// Usage:
//   bun run test          ← all phases (no browser)
//   bun run test:e2e      ← browser/GPU layer (needs server, runs separately)
//   bun run test:all      ← everything

import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';

// ── System registry ──────────────────────────────────────────────────────────
// To add a system: add one import + push to SYSTEMS
import { testing as truckTesting } from '../systems/truck/system.mjs';

const SYSTEMS = [
  truckTesting,
  // mvtTesting,   ← add when systems/mvt/system.mjs exists
  // ifcTesting,   ← add when systems/ifc/system.mjs exists
];

// ────────────────────────────────────────────────────────────────────────────

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LOCKFILE = ROOT + '/target/.test-lock';

// Prevent concurrent test runs — cargo can only compile one at a time,
// so multiple `bun run test` invocations deadlock on the target dir lock.
if (existsSync(LOCKFILE)) {
  let info = '';
  try { info = readFileSync(LOCKFILE, 'utf8').trim(); } catch {}
  // Check if the PID in the lock is still alive
  if (info) {
    const pid = parseInt(info.split('\n')[0], 10);
    if (pid && pid !== process.pid) {
      try { process.kill(pid, 0); /* just checks if alive */ } catch {
        // Process is dead — stale lock, remove and continue
        unlinkSync(LOCKFILE);
      }
    }
    if (existsSync(LOCKFILE)) {
      console.error(`\n\x1b[31m\x1b[1mAnother test run is already in progress (PID ${info.split('\\n')[0]}).\x1b[0m`);
      console.error(`\x1b[2mIf stuck, delete: ${LOCKFILE}\x1b[0m\n`);
      process.exit(1);
    }
  }
}
writeFileSync(LOCKFILE, `${process.pid}\n${new Date().toISOString()}`);
process.on('exit', () => { try { unlinkSync(LOCKFILE); } catch {} });
process.on('SIGINT', () => { try { unlinkSync(LOCKFILE); } catch {} process.exit(130); });
process.on('SIGTERM', () => { try { unlinkSync(LOCKFILE); } catch {} process.exit(143); });

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

function subheader(name) {
  // Only print system label when there are multiple systems (avoids redundancy for single-system)
  if (SYSTEMS.length > 1) console.log(`\n${dim}  ▶ ${name}${reset}`);
}

const PHASE_TIMEOUT = 5 * 60 * 1000; // 5 minutes per phase

function run(cmd, opts = {}) {
  const t = Date.now();
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit', timeout: PHASE_TIMEOUT, ...opts });
    const ms = Date.now() - t;
    console.log(`\n${green}✓ passed${reset} ${dim}(${(ms/1000).toFixed(1)}s)${reset}`);
    passed++;
  } catch (err) {
    const ms = Date.now() - t;
    if (err.killed) {
      console.log(`\n${red}✗ TIMED OUT after ${(ms/1000).toFixed(0)}s${reset}`);
      console.log(`${dim}Command: ${cmd}${reset}`);
    } else {
      console.log(`\n${red}✗ FAILED${reset} ${dim}(${(ms/1000).toFixed(1)}s)${reset}`);
    }
    failed++;
    console.log(`\n${red}${bold}Pipeline stopped. Fix the failure above and re-run.${reset}\n`);
    process.exit(1);
  }
}

// Compute which phases will actually run (skip phases with no participating system)
const phaseActive = [
  true,
  SYSTEMS.some(s => s.rust?.schemaContract),
  SYSTEMS.some(s => s.rust?.crdt),
  SYSTEMS.some(s => s.rust?.domain),
  SYSTEMS.some(s => s.typecheck),
  SYSTEMS.some(s => s.vitest),
];
const TOTAL = phaseActive.filter(Boolean).length;
let phase = 0;
const next = () => ++phase;

// ── 1. Project Structure ────────────────────────────────────────
header(next(), TOTAL,
  'PROJECT STRUCTURE',
  'check-alignment.mjs',
  'Catches config drift before anything compiles. Verifies every system.mjs,\n' +
  '        wrangler.toml name, migration dir, and crate reference is consistent.\n' +
  '        If this fails, the project is misconfigured — no point running code.'
);
run('node check-alignment.mjs');

// ── 2. Schema Contract ──────────────────────────────────────────
if (phaseActive[1]) {
  header(next(), TOTAL,
    'SCHEMA CONTRACT  (innermost — Rust types → committed schema JSON)',
    SYSTEMS.filter(s => s.rust?.schemaContract).map(s => s.name).join(', '),
    'build_schema() must deep-equal the committed schema JSON per system.\n' +
    '        Rust param structs are the single source of truth for the entire API\n' +
    '        surface (MCP tools, OpenAPI, browser cadCommand, TypeScript types).\n' +
    '        Fail here = schema is stale → run: bun run build:truck'
  );
  for (const sys of SYSTEMS) {
    if (sys.rust?.schemaContract) { subheader(sys.name); run(sys.rust.schemaContract); }
  }
}

// ── 3. CRDT Layer ───────────────────────────────────────────────
if (phaseActive[2]) {
  header(next(), TOTAL,
    'CRDT LAYER',
    SYSTEMS.filter(s => s.rust?.crdt).map(s => s.name).join(', '),
    'Tests the operation log that powers multi-user sync (Automerge-compatible).\n' +
    '        Verifies: merge commutativity, replay determinism, offline/online\n' +
    '        convergence, rollback, model isolation. Pure math — no geometry.'
  );
  for (const sys of SYSTEMS) {
    if (sys.rust?.crdt) { subheader(sys.name); run(sys.rust.crdt); }
  }
}

// ── 4. Geometry & Domain Layer ──────────────────────────────────
if (phaseActive[3]) {
  header(next(), TOTAL,
    'GEOMETRY & DOMAIN LAYER  (headless — no GPU, no browser)',
    SYSTEMS.filter(s => s.rust?.domain).map(s => s.name).join(', '),
    'Tests every command through the headless controller (no GPU, no browser).\n' +
    '        Typed param structs (p() helper) bind tests to the API — field renames\n' +
    '        fail at compile time. Covers: primitives, booleans, sketch/extrude,\n' +
    '        scene import/export, style, rendering-only error handling, CRDT replay.'
  );
  for (const sys of SYSTEMS) {
    if (sys.rust?.domain) { subheader(sys.name); run(sys.rust.domain); }
  }
}

// ── 5. TypeScript Boundary ──────────────────────────────────────
if (phaseActive[4]) {
  header(next(), TOTAL,
    'TYPESCRIPT BOUNDARY  (Rust → TypeScript)',
    'tsc --noEmit  (' + SYSTEMS.filter(s => s.typecheck).map(s => s.name).join(', ') + ')',
    'Type-checks the Cloudflare Worker and browser TypeScript per system.\n' +
    '        Command name types are derived from schema JSON — renames that slipped\n' +
    '        past Rust tests cause TS errors here before HTTP tests run.\n' +
    '        api-types.ts is generated from schema JSON → OpenAPI → TS types.'
  );
  for (const sys of SYSTEMS) {
    if (sys.typecheck) { subheader(sys.name); run(sys.typecheck); }
  }
}

// ── 6. HTTP / MCP Contract ──────────────────────────────────────
if (phaseActive[5]) {
  header(next(), TOTAL,
    'HTTP / MCP CONTRACT  (TypeScript → HTTP boundary)',
    'vitest run  (' + SYSTEMS.filter(s => s.vitest).map(s => s.name).join(', ') + ')',
    'Verifies each worker serves exactly the committed schema JSON\n' +
    '        (deep equality — catches add/delete/rename at the HTTP layer).\n' +
    '        Also verifies: MCP tool list, MCP tool count formula, OpenAPI 3.1 spec,\n' +
    '        model persistence (R2 CRUD), thumbnail round-trip, MCP tool call flow.'
  );
  for (const sys of SYSTEMS) {
    if (sys.vitest) { subheader(sys.name); run(sys.vitest); }
  }
}

// ── Summary ─────────────────────────────────────────────────────
const total_s = ((Date.now() - startAll) / 1000).toFixed(1);
console.log(`\n${cyan}${line}${reset}`);
console.log(`${bold}${green}All ${TOTAL} phases passed${reset}  ${dim}(${total_s}s total)${reset}`);
console.log(`${dim}Next: bun run test:e2e  ← browser + WebGPU (outermost layer)${reset}`);
console.log(`${cyan}${line}${reset}\n`);
