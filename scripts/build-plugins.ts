#!/usr/bin/env bun
/**
 * scripts/build-plugins.ts
 *
 * Builds all first-party plugins in systems/plugins/.
 *
 * For each plugin directory:
 *   1. Bundle plugin.ts → public/plugin.js  (bun build)
 *   2. If crate/ exists → wasm-pack build → public/crate/pkg/
 *   3. Copy public/ → systems/truck/web/dist/plugins/{name}/  (prod assets)
 *
 * Dev serving:  Vite middleware serves systems/plugins/{name}/public/ at /plugins/{name}/
 * Prod serving: dist/plugins/{name}/ picked up by wrangler ASSETS binding
 *
 * Usage:
 *   bun run build:plugins             # all plugins, release
 *   bun run build:plugins howick      # one plugin
 *   bun run build:plugins --dev       # dev mode (no --release for wasm-pack)
 */

import { join, basename } from 'path'
import { existsSync, mkdirSync, readdirSync, statSync, cpSync } from 'fs'

const PLUGINS_DIR = join(import.meta.dir, '..', 'systems', 'plugins')
const DIST_PLUGINS_DIR = join(import.meta.dir, '..', 'systems', 'truck', 'web', 'dist', 'plugins')
const args = process.argv.slice(2)
const isDev = args.includes('--dev')
const filterName = args.find(a => !a.startsWith('--'))

// ── Discover plugins ──────────────────────────────────────────────────────────

function getPluginDirs(): string[] {
  return readdirSync(PLUGINS_DIR)
    .filter(name => {
      if (filterName && name !== filterName) return false
      const p = join(PLUGINS_DIR, name)
      return statSync(p).isDirectory() && existsSync(join(p, 'plugin.ts'))
    })
    .map(name => join(PLUGINS_DIR, name))
}

// ── Run shell command, inherit stdio ─────────────────────────────────────────

async function run(cmd: string, cwd: string): Promise<void> {
  console.log(`  $ ${cmd}`)
  const proc = Bun.spawn(cmd.split(' '), {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const code = await proc.exited
  if (code !== 0) throw new Error(`Command failed (exit ${code}): ${cmd}`)
}

// ── Build one plugin ──────────────────────────────────────────────────────────

async function buildPlugin(dir: string): Promise<void> {
  const name = basename(dir)
  const publicDir = join(dir, 'public')
  mkdirSync(publicDir, { recursive: true })

  console.log(`\n▶ Building plugin: ${name}`)

  // 1. Bundle plugin.ts → public/plugin.js
  console.log('  [1/3] Bundling plugin.ts…')
  const result = await Bun.build({
    entrypoints: [join(dir, 'plugin.ts')],
    outdir: publicDir,
    target: 'browser',
    format: 'esm',
    minify: !isDev,
    sourcemap: isDev ? 'inline' : 'none',
    naming: 'plugin.js',
  })
  if (!result.success) {
    for (const log of result.logs) console.error(log)
    throw new Error(`Bun.build failed for ${name}`)
  }
  console.log(`  → public/plugin.js`)

  // Copy index.html to public/ if not already there
  const srcHtml = join(dir, 'index.html')
  const dstHtml = join(publicDir, 'index.html')
  if (existsSync(srcHtml)) {
    await Bun.write(dstHtml, Bun.file(srcHtml))
  }

  // 2. wasm-pack if crate/ exists
  const crateDir = join(dir, 'crate')
  if (existsSync(crateDir)) {
    console.log('  [2/3] Building WASM crate…')
    const wasmOutDir = join(publicDir, 'crate', 'pkg')
    mkdirSync(wasmOutDir, { recursive: true })
    const releaseFlag = isDev ? '--dev' : '--release'
    await run(
      `wasm-pack build ${releaseFlag} --target web --out-dir ${wasmOutDir}`,
      crateDir,
    )
    console.log(`  → public/crate/pkg/`)
  } else {
    console.log('  [2/3] No crate — skipping WASM build')
  }

  // 3. Copy public/ → dist/plugins/{name}/ for prod wrangler ASSETS
  console.log('  [3/3] Copying to dist/plugins…')
  const distDir = join(DIST_PLUGINS_DIR, name)
  mkdirSync(distDir, { recursive: true })
  cpSync(publicDir, distDir, { recursive: true })
  console.log(`  → dist/plugins/${name}/`)

  console.log(`  ✓ ${name} built`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

const dirs = getPluginDirs()
if (!dirs.length) {
  console.log(filterName
    ? `No plugin named "${filterName}" found in systems/plugins/`
    : 'No plugins found in systems/plugins/')
  process.exit(0)
}

console.log(`Building ${dirs.length} plugin(s) [${isDev ? 'dev' : 'release'}]…`)

let failed = 0
for (const dir of dirs) {
  try {
    await buildPlugin(dir)
  } catch (err) {
    console.error(`✗ ${basename(dir)}: ${err}`)
    failed++
  }
}

if (failed) {
  console.error(`\n${failed} plugin(s) failed to build`)
  process.exit(1)
} else {
  console.log(`\n✓ All plugins built`)
}
