#!/usr/bin/env node
// check-alignment.mjs — Verify workers.mjs, wrangler.toml, crates, and package.json are in sync.
//
// Checks:
//   1. Every systems/* directory has a system.mjs
//   2. Every worker in workers.mjs has a wrangler.toml whose `name` matches
//   3. Every worker with `migrate` has a migrations/ dir with ≥1 .sql file
//   4. Every crate under systems/*/crate/ is referenced in a system.mjs build command
//   5. build:sync in package.json references the same output dirs as sync/system.mjs devBuild
//   6. Every devServer with `dir` has that directory on disk
//
// Usage:  node check-alignment.mjs
// Exit:   0 = all OK, 1 = mismatches found

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { workers, devServers } from './workers.mjs';
import { DEV_BUILD as syncDevBuild } from './systems/sync/system.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
let errors = 0;
let warnings = 0;

function ok(msg)   { console.log(`  ✓  ${msg}`); }
function fail(msg) { console.error(`  ✗  ${msg}`); errors++; }
function warn(msg) { console.warn(`  ⚠  ${msg}`); warnings++; }

function readToml(path) {
  try { return readFileSync(resolve(ROOT, path), 'utf8'); } catch { return null; }
}

function tomlName(content) {
  const m = content.match(/^name\s*=\s*"([^"]+)"/m);
  return m ? m[1] : null;
}

function outDirs(str) {
  return [...str.matchAll(/--out-dir\s+(\S+)/g)].map(m => m[1].replace(/[()]/g, ''));
}

const systemsDir = resolve(ROOT, 'systems');
const systemNames = readdirSync(systemsDir);

// ── 1. Every systems/* has a system.mjs ────────────────────────────────────
console.log('\n[1] system.mjs presence');
for (const sys of systemNames) {
  const systemMjs = join(systemsDir, sys, 'system.mjs');
  if (!existsSync(systemMjs)) {
    fail(`systems/${sys}/system.mjs missing`);
  } else {
    ok(`systems/${sys}/system.mjs exists`);
  }
}

// ── 2. Worker name vs wrangler.toml name ───────────────────────────────────
console.log('\n[2] Worker name vs wrangler.toml');
for (const w of workers) {
  const tomlPath = join(w.dir, 'wrangler.toml');
  const content = readToml(tomlPath);
  if (!content) {
    fail(`${w.name}: no wrangler.toml at ${tomlPath}`);
    continue;
  }
  const name = tomlName(content);
  if (name !== w.name) {
    fail(`${w.name}: workers.mjs name="${w.name}" but wrangler.toml name="${name}" (${tomlPath})`);
  } else {
    ok(`${w.name}: wrangler.toml name matches`);
  }
}

// ── 3. migrate field → migrations dir has .sql files ──────────────────────
console.log('\n[3] Migration directories');
for (const w of workers) {
  if (!w.migrate) {
    ok(`${w.name}: no migrate field (skip)`);
    continue;
  }
  const tomlPath = join(w.dir, 'wrangler.toml');
  const content = readToml(tomlPath);
  let migrationsDir = 'migrations';
  if (content) {
    const m = content.match(/migrations_dir\s*=\s*"([^"]+)"/);
    if (m) migrationsDir = m[1];
  }
  const fullPath = resolve(ROOT, w.dir, migrationsDir);
  if (!existsSync(fullPath)) {
    fail(`${w.name}: migrate field set but migrations dir missing: ${fullPath}`);
    continue;
  }
  const sqlFiles = readdirSync(fullPath).filter(f => f.endsWith('.sql'));
  if (sqlFiles.length === 0) {
    fail(`${w.name}: migrations dir exists but has no .sql files: ${fullPath}`);
  } else {
    ok(`${w.name}: ${sqlFiles.length} migration(s) in ${migrationsDir}/`);
  }
}

// ── 4. Every crate referenced in a system.mjs build command ───────────────
console.log('\n[4] Crate coverage in system.mjs build commands');

// Collect all system.mjs source text
let allSystemSrc = '';
for (const sys of systemNames) {
  const p = join(systemsDir, sys, 'system.mjs');
  if (existsSync(p)) allSystemSrc += readFileSync(p, 'utf8');
}

let crateDirs = [];
for (const sys of systemNames) {
  const crateDir = join(systemsDir, sys, 'crate');
  if (existsSync(crateDir)) crateDirs.push(`systems/${sys}/crate`);
}

for (const crateDir of crateDirs) {
  if (allSystemSrc.includes(crateDir)) {
    ok(`${crateDir}: referenced in a system.mjs build command`);
  } else {
    fail(`${crateDir}: NOT referenced in any system.mjs build command`);
  }
}

// ── 5. package.json build:sync output dirs match sync/system.mjs devBuild ──
console.log('\n[5] package.json build:sync vs sync/system.mjs devBuild outputs');

const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
const pkgSync = pkg.scripts?.['build:sync'] ?? '';

const devDirs = outDirs(syncDevBuild).sort();
const relDirs = outDirs(pkgSync).sort();

if (devDirs.length === 0) {
  warn('Could not parse out-dirs from sync/system.mjs devBuild');
} else if (relDirs.length === 0) {
  warn('Could not parse build:sync out-dirs from package.json');
} else {
  const missing = devDirs.filter(d => !relDirs.includes(d));
  const extra   = relDirs.filter(d => !devDirs.includes(d));
  if (missing.length === 0 && extra.length === 0) {
    ok(`SYNC output dirs match: ${devDirs.join(', ')}`);
  } else {
    if (missing.length) fail(`build:sync missing output dirs vs sync devBuild: ${missing.join(', ')}`);
    if (extra.length)   warn(`build:sync has extra output dirs not in sync devBuild: ${extra.join(', ')}`);
  }
}

// ── 6. devServer dirs exist ────────────────────────────────────────────────
console.log('\n[6] devServer directories');
for (const s of devServers) {
  if (!s.dir) {
    ok(`${s.name}: no dir field (skip)`);
    continue;
  }
  const fullPath = resolve(ROOT, s.dir);
  if (!existsSync(fullPath)) {
    fail(`${s.name}: dir="${s.dir}" does not exist`);
  } else {
    ok(`${s.name}: dir exists`);
  }
}

// ── Summary ────────────────────────────────────────────────────────────────
console.log('');
if (errors === 0 && warnings === 0) {
  console.log('All alignment checks passed.');
  process.exit(0);
} else {
  if (warnings) console.warn(`${warnings} warning(s)`);
  if (errors)   console.error(`${errors} error(s) — fix mismatches before deploying.`);
  process.exit(errors > 0 ? 1 : 0);
}
