#!/usr/bin/env bun
// Patch better-auth/test to use better-sqlite3 instead of node:sqlite
// Required because bun 1.3.x doesn't support node:sqlite (Node 22+ API).
// Run automatically via package.json postinstall.
import { readFileSync, writeFileSync } from 'fs';

const file = 'node_modules/better-auth/dist/test-utils/test-instance.mjs';

let content: string;
try {
  content = readFileSync(file, 'utf8');
} catch {
  console.log('⚠ patch-better-auth: test-instance.mjs not found, skipping');
  process.exit(0);
}

// Already correctly patched?
if (content.includes('bun:sqlite')) {
  console.log('✓ patch-better-auth: already patched, skipping');
  process.exit(0);
}

// Normalize: handle both original (node:sqlite) and intermediate (better-sqlite3) states
const patched = content
  // Original: node:sqlite
  .replace(
    `async function getSqlite() {\n\t\tconst { DatabaseSync } = await import("node:sqlite");\n\t\treturn new DatabaseSync(":memory:");`,
    `async function getSqlite() {\n\t\tconst { Database } = await import("bun:sqlite");\n\t\treturn new Database(":memory:");`,
  )
  // Intermediate wrong patch: better-sqlite3
  .replace(
    `async function getSqlite() {\n\t\tconst { default: BetterSqlite3 } = await import("better-sqlite3");\n\t\treturn new BetterSqlite3(":memory:");`,
    `async function getSqlite() {\n\t\tconst { Database } = await import("bun:sqlite");\n\t\treturn new Database(":memory:");`,
  );

if (patched === content) {
  console.error('✗ patch-better-auth: pattern not found — update this script');
  process.exit(1);
}

writeFileSync(file, patched);
console.log('✓ patch-better-auth: node:sqlite → bun:sqlite');
