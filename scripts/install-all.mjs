#!/usr/bin/env bun
// install-all.mjs — Install JS deps for root + all systems that have a package.json.
//
// Auto-discovers package.json files under systems/ (depth 3, excludes node_modules/dist/.wrangler).
// Adding a new system with a package.json is automatically picked up — no manual list to update.
//
// Usage: bun scripts/install-all.mjs

import { readdirSync, existsSync } from 'fs';
import { join, resolve, relative } from 'path';
import { execSync } from 'child_process';

const ROOT = resolve(import.meta.dir, '..');

function findPackageDirs(dir, depth = 3) {
  if (depth === 0) return [];
  const results = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (['node_modules', 'dist', '.wrangler', 'pkg', 'target'].includes(entry.name)) continue;
    const sub = join(dir, entry.name);
    if (existsSync(join(sub, 'package.json'))) results.push(sub);
    results.push(...findPackageDirs(sub, depth - 1));
  }
  return results;
}

const dirs = [ROOT, ...findPackageDirs(join(ROOT, 'packages')), ...findPackageDirs(join(ROOT, 'systems'))];

for (const dir of dirs) {
  const label = relative(ROOT, dir) || '.';
  console.log(`\n▶ bun install — ${label}`);
  execSync('bun install', { cwd: dir, stdio: 'inherit' });
}

console.log('\n✓ All JS deps installed');
