#!/usr/bin/env node
// run.mjs — Unified dev/deploy orchestrator.
// Reads workers.mjs, starts/builds/deploys all workers.
//
// Usage:
//   node run.mjs dev      Start all workers + watchers (auto-reloads on file changes)
//   node run.mjs deploy   Build + deploy all workers

import { spawn, execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { workers, devServers } from './workers.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const children = [];

// --- Dev log file: readable by Claude Code / other agents ---
const LOG_DIR = join(homedir(), '.cache', 'plat-trunk');
mkdirSync(LOG_DIR, { recursive: true });
const LOG_FILE = join(LOG_DIR, 'dev.log');
const logStream = createWriteStream(LOG_FILE, { flags: 'w' }); // overwrite each run
console.error(`[run.mjs] Dev log: ${LOG_FILE}`);

// Color codes for process output prefixes
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
      const out = prefix + line + '\n';
      process.stdout.write(out);
      logStream.write(`[${new Date().toISOString()}] ${out}`);
    }
  });
  child.stderr?.on('data', (d) => {
    for (const line of d.toString().split('\n').filter(Boolean)) {
      const out = prefix + line + '\n';
      process.stderr.write(out);
      logStream.write(`[${new Date().toISOString()}] ${out}`);
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

  // 2. Build workers that need it (initial build before starting)
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

  // 3. Start all wrangler dev processes (auto-reload TypeScript on save)
  let idx = 0;
  workers.forEach((w) => {
    start(w.name, 'bun x wrangler dev', w.dir, idx++);
  });

  // 4. Start file watchers (rebuild on source changes)
  for (const w of workers) {
    if (w.watch) {
      const paths = w.watch.paths.map(p => `-w ${p}`).join(' ');
      const exts = w.watch.extensions.map(e => `-e ${e}`).join(' ');
      const debounce = w.watch.debounce ? `--debounce ${w.watch.debounce}ms` : '';
      const cmd = `watchexec ${paths} ${exts} ${debounce} -- ${w.watch.command}`;
      start(w.watch.name, cmd, '.', idx++);
    }
  }

  // 5. Start dev servers (VitePress, etc.)
  for (const s of devServers) {
    start(s.name, s.command, '.', idx++);
  }

  console.log('\nAll workers started. Press Ctrl+C to stop.\n');
}

async function deploy() {
  // Release build (not dev build) — uses package.json scripts
  exec('bun run build');
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
