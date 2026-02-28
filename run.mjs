#!/usr/bin/env node
// run.mjs — Unified dev/deploy orchestrator.
// Reads workers.mjs, starts/builds/deploys all workers.
//
// Usage:
//   node run.mjs dev      Start all workers + watchers
//   node run.mjs deploy   Build + deploy all workers

import { spawn, execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { workers, watchers } from './workers.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const children = [];

// Color codes for worker output prefixes
const colors = ['\x1b[36m', '\x1b[33m', '\x1b[35m', '\x1b[32m', '\x1b[34m', '\x1b[31m'];
const reset = '\x1b[0m';

function start(name, cmd, cwd, colorIdx = 0) {
  const color = colors[colorIdx % colors.length];
  const prefix = `${color}[${name}]${reset} `;
  const child = spawn('sh', ['-c', cmd], {
    cwd: resolve(ROOT, cwd || '.'),
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  child.stdout?.on('data', (d) => {
    for (const line of d.toString().split('\n').filter(Boolean)) {
      process.stdout.write(prefix + line + '\n');
    }
  });
  child.stderr?.on('data', (d) => {
    for (const line of d.toString().split('\n').filter(Boolean)) {
      process.stderr.write(prefix + line + '\n');
    }
  });
  child.on('exit', (code) => {
    if (code) console.error(`${prefix}exited with code ${code}`);
  });
  children.push(child);
  return child;
}

function cleanup() {
  for (const child of children) {
    try { child.kill('SIGTERM'); } catch {}
  }
  setTimeout(() => process.exit(0), 500);
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

function exec(cmd, cwd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: resolve(ROOT, cwd || '.'), stdio: 'inherit' });
}

// ─── Commands ──────────────────────────────────────────

async function dev() {
  // 1. Install deps for each worker
  for (const w of workers) {
    exec('bun install --silent', w.dir);
  }

  // 2. Build workers that need it
  for (const w of workers) {
    if (w.build) {
      console.log(`\nBuilding ${w.name}...`);
      try {
        exec(w.build, '.');
      } catch (err) {
        console.error(`Build failed for ${w.name}: ${err.message}`);
        console.error('Continuing without build — wrangler will start but may error.');
      }
    }
  }

  console.log('\nStarting workers...\n');

  // 3. Start all workers
  workers.forEach((w, i) => {
    start(w.name, 'bun x wrangler dev', w.dir, i);
  });

  // 4. Start watchers
  watchers.forEach((w, i) => {
    start(w.name, w.command, '.', workers.length + i);
  });

  console.log('\nAll workers started. Press Ctrl+C to stop.\n');
}

async function deploy() {
  // Build all
  for (const w of workers) {
    if (w.build) {
      console.log(`Building ${w.name}...`);
      exec(w.build, '.');
    }
  }
  // Deploy via cf-deploy.ts (handles correct order: sub-workers first, then router)
  exec('bun scripts/cf-deploy.ts deploy-all');
}

// ─── Entry ─────────────────────────────────────────────

const cmd = process.argv[2];
switch (cmd) {
  case 'dev': dev(); break;
  case 'deploy': deploy(); break;
  default:
    console.log('Usage: node run.mjs [dev|deploy]');
    process.exit(1);
}
