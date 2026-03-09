#!/usr/bin/env bun
// scripts/build.mjs — Release build pipeline.
//
// SYSTEM-AWARE: each system declares its build config in systems/{name}/system.mjs.
// To add a new system's build:
//   1. Add `export const building = { ... }` to systems/{name}/system.mjs
//   2. Add one import below and push to SYSTEMS
//
// Usage:
//   bun run build          ← all systems (sync → truck → docs)
//   bun run build:sync     ← just sync
//   bun run build:truck    ← just truck (assumes sync already built)
//   bun run build:docs     ← just docs

import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// ── System registry ──────────────────────────────────────────────────────────
// To add a system: add one import + push to SYSTEMS
import { building as syncBuilding } from '../systems/sync/system.mjs';
import { building as truckBuilding } from '../systems/truck/system.mjs';
import { building as docsBuilding } from '../systems/docs/system.mjs';

const SYSTEMS = [
  syncBuilding,
  truckBuilding,
  docsBuilding,
  // mvtBuilding,   ← add when systems/mvt/system.mjs exists
].sort((a, b) => a.order - b.order);

// ────────────────────────────────────────────────────────────────────────────

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const W = 66;
const reset = '\x1b[0m';
const bold  = '\x1b[1m';
const green = '\x1b[32m';
const cyan  = '\x1b[36m';
const red   = '\x1b[31m';
const dim   = '\x1b[2m';
const line  = '━'.repeat(W);

const PHASE_TIMEOUT = 10 * 60 * 1000; // 10 minutes per step (WASM builds are slow)

function run(cmd) {
  const t = Date.now();
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit', timeout: PHASE_TIMEOUT });
    const ms = Date.now() - t;
    console.log(`  ${green}✓${reset} ${dim}(${(ms/1000).toFixed(1)}s)${reset}`);
    return true;
  } catch (err) {
    const ms = Date.now() - t;
    if (err.killed) {
      console.log(`  ${red}✗ TIMED OUT after ${(ms/1000).toFixed(0)}s${reset}`);
    } else {
      console.log(`  ${red}✗ FAILED${reset} ${dim}(${(ms/1000).toFixed(1)}s)${reset}`);
    }
    return false;
  }
}

// ── Filter: build specific system or all ─────────────────────────────────────

const target = process.argv[2]; // e.g. "sync", "truck", "docs"
const systems = target
  ? SYSTEMS.filter(s => s.name === target)
  : SYSTEMS;

if (target && systems.length === 0) {
  console.error(`${red}Unknown system: ${target}${reset}`);
  console.error(`Available: ${SYSTEMS.map(s => s.name).join(', ')}`);
  process.exit(1);
}

// ── Run ──────────────────────────────────────────────────────────────────────

const startAll = Date.now();
let failed = false;

for (const sys of systems) {
  console.log(`\n${cyan}${line}${reset}`);
  console.log(`${bold}${cyan}BUILD: ${sys.name}${reset}`);
  console.log(`${cyan}${line}${reset}`);

  for (const step of sys.steps) {
    console.log(`\n${dim}  ${sys.name}/${step.name}${reset}`);
    if (!run(step.command)) {
      console.log(`\n${red}${bold}Build failed at ${sys.name}/${step.name}. Fix and re-run.${reset}\n`);
      failed = true;
      break;
    }
  }
  if (failed) break;
}

if (failed) {
  process.exit(1);
}

const total_s = ((Date.now() - startAll) / 1000).toFixed(1);
console.log(`\n${cyan}${line}${reset}`);
console.log(`${bold}${green}Build complete${reset} ${dim}(${systems.map(s => s.name).join(' → ')}, ${total_s}s)${reset}`);
console.log(`${cyan}${line}${reset}\n`);
