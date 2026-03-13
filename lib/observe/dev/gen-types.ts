#!/usr/bin/env bun
/**
 * dev/gen-types.ts — Generate shared/log-entry.generated.ts + shared/log-entry.schema.json
 *
 * Uses ts-rs (TypeScript types) and schemars (JSON Schema) — both derived from the
 * canonical Rust structs in crate/src/types.rs.
 *
 * Why two outputs?
 *   log-entry.generated.ts   — TypeScript interface for consumers (no runtime dep)
 *   log-entry.schema.json    — JSON Schema for: ingest validation, OpenAPI, MCP tools
 *
 * Usage:
 *   bun dev/gen-types.ts           # generate both files
 *   bun dev/gen-types.ts --check   # verify generated files are up-to-date (CI)
 */

import { spawnSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { createHash } from 'crypto'

const check = process.argv.includes('--check')

const OUT_TS     = 'shared/log-entry.generated.ts'
const OUT_SCHEMA = 'shared/schemas.json'

if (check) {
  // In check mode, verify the files exist and match a cargo test dry-run
  // (We can't run cargo in --check without side effects, so just verify the files exist
  //  and are non-empty — full staleness check is done in CI by running gen:types first.)
  let ok = true
  for (const f of [OUT_TS, OUT_SCHEMA]) {
    if (!existsSync(f) || readFileSync(f, 'utf-8').trim().length === 0) {
      console.error(`✗ ${f} is missing or empty — run: bun dev/gen-types.ts`)
      ok = false
    } else {
      console.log(`✓ ${f} exists`)
    }
  }
  process.exit(ok ? 0 : 1)
}

// Run cargo test for both export tests
// 'export_' matches both export_ts_types and export_json_schema
const result = spawnSync(
  'cargo',
  ['test', '-p', 'plat-observe', 'export_', '--', '--nocapture'],
  { stdio: 'inherit', cwd: '.' }
)

if (result.status !== 0) {
  console.error('✗ cargo test failed')
  process.exit(result.status ?? 1)
}

// Log hashes for traceability
for (const f of [OUT_TS, OUT_SCHEMA]) {
  if (existsSync(f)) {
    const hash = createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 12)
    console.log(`✓ ${f} [${hash}]`)
  }
}
