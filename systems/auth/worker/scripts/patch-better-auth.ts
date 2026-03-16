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

// Already correctly patched with adaptive version?
if (content.includes('bun:sqlite') && content.includes('not bun') && content.includes('nodeSqlite')) {
  console.log('✓ patch-better-auth: already patched, skipping');
  process.exit(0);
}

// Replacement: runtime-adaptive SQLite — bun:sqlite in bun, node:sqlite in Node 22+
// Uses dynamic string concatenation so bun's static resolver won't pre-resolve node:sqlite.
const replacement = `async function getSqlite() {
\t\t// Patched by scripts/patch-better-auth.ts: bun:sqlite (bun) or node:sqlite (Node 22+)
\t\ttry {
\t\t\tconst { Database } = await import("bun:sqlite");
\t\t\treturn new Database(":memory:");
\t\t} catch { /* not bun — try node:sqlite below */ }
\t\t// Dynamic string prevents bun's static pre-resolver from failing on "node:sqlite"
\t\tconst nodeSqlite = "node" + ":" + "sqlite";
\t\tconst { DatabaseSync } = await import(nodeSqlite);
\t\treturn new DatabaseSync(":memory:");`;

// Normalize: handle original and any previously-patched states
const patched = content
  // Original: node:sqlite
  .replace(
    `async function getSqlite() {\n\t\tconst { DatabaseSync } = await import("node:sqlite");\n\t\treturn new DatabaseSync(":memory:");`,
    replacement,
  )
  // Previous wrong patch: bun:sqlite only
  .replace(
    `async function getSqlite() {\n\t\tconst { Database } = await import("bun:sqlite");\n\t\treturn new Database(":memory:");`,
    replacement,
  )
  // Previous wrong patch: better-sqlite3
  .replace(
    `async function getSqlite() {\n\t\tconst { default: BetterSqlite3 } = await import("better-sqlite3");\n\t\treturn new BetterSqlite3(":memory:");`,
    replacement,
  )
  // Previous adaptive patch (without nodeSqlite variable — bun static resolve issue)
  .replace(
    `async function getSqlite() {\n\t\t// Patched by scripts/patch-better-auth.ts: bun:sqlite (bun) or node:sqlite (Node 22+)\n\t\ttry {\n\t\t\tconst { Database } = await import("bun:sqlite");\n\t\t\treturn new Database(":memory:");\n\t\t} catch { /* not bun */ }\n\t\tconst { DatabaseSync } = await import("node:sqlite");\n\t\treturn new DatabaseSync(":memory:");`,
    replacement,
  );

if (patched === content) {
  console.error('✗ patch-better-auth: pattern not found — update this script');
  process.exit(1);
}

writeFileSync(file, patched);
console.log('✓ patch-better-auth: node:sqlite → adaptive (bun:sqlite + node:sqlite)');
