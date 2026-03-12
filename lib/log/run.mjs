#!/usr/bin/env bun
/**
 * lib/log task runner.
 *
 *   bun lib/log/run.mjs <command>
 *
 * Commands:
 *   typecheck   — TypeScript type check
 *   test        — unit tests (no server needed)
 *   test:int    — integration tests (starts wrangler + Playwright)
 *   test:prod   — integration tests against deployed worker
 *   test:all    — unit + integration
 *   demo        — Bun dev server on :3333
 *   demo:cf     — wrangler dev on :3335
 *   deploy      — deploy to CF
 *   tail        — wrangler tail (live CF logs)
 */

import { spawnSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const LOG_DIR = resolve(ROOT, 'lib/log')
const DEMO_DIR = resolve(LOG_DIR, 'demo')

const cmd = process.argv[2]

const commands = {
  typecheck:    { cmd: 'bunx', args: ['tsc', '--noEmit'], cwd: LOG_DIR },
  test:         { cmd: 'bun', args: ['test', 'lib/log/tests/test.test.ts'], cwd: ROOT },
  'test:int':   { cmd: 'bun', args: ['lib/log/tests/integration.test.ts'], cwd: ROOT },
  'test:prod':  { cmd: 'bun', args: ['lib/log/tests/integration.test.ts'], cwd: ROOT, env: { LOG_URL: 'https://log-demo.gedw99.workers.dev' } },
  'test:all':   null, // special: runs test then test:int
  demo:         { cmd: 'bun', args: ['lib/log/demo/bun.ts'], cwd: ROOT },
  'demo:cf':    { cmd: 'bunx', args: ['wrangler', 'dev', 'worker.ts', '--port', '3335'], cwd: DEMO_DIR },
  deploy:       { cmd: 'bunx', args: ['wrangler', 'deploy', 'worker.ts'], cwd: DEMO_DIR },
  tail:         { cmd: 'bunx', args: ['wrangler', 'tail', 'log-demo', '--format', 'json'], cwd: DEMO_DIR },
}

if (!cmd || !commands.hasOwnProperty(cmd)) {
  console.log('Usage: bun lib/log/run.mjs <command>\n')
  console.log('Commands:')
  for (const k of Object.keys(commands)) console.log(`  ${k}`)
  process.exit(cmd ? 1 : 0)
}

function run(key) {
  const c = commands[key]
  const env = { ...process.env, ...c.env }
  console.log(`\n  → ${key}\n`)
  const result = spawnSync(c.cmd, c.args, { cwd: c.cwd, env, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (cmd === 'test:all') {
  run('test')
  run('test:int')
} else {
  run(cmd)
}
