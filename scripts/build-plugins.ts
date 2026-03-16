#!/usr/bin/env bun
/**
 * scripts/build-plugins.ts
 *
 * Builds all first-party plugins in systems/plugins/.
 *
 * For each plugin directory:
 *   1. Bundle plugin.ts → public/plugin.js  (bun build)
 *   2. If crate/ exists → wasm-pack build → public/crate/pkg/
 *
 * Output always lands in plugin/public/ so the web server can serve it
 * from a predictable path: /plugins/{name}/...
 *
 * Usage:
 *   bun run build:plugins             # all plugins
 *   bun run build:plugins howick      # one plugin
 *   bun run build:plugins --dev       # dev mode (no --release for wasm-pack)
 */

import { join, basename } from 'path'
import { existsSync, mkdirSync, readdirSync, statSync } from 'fs'

const PLUGINS_DIR = join(import.meta.dir, '..', 'systems', 'plugins')
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
  console.log('  [1/2] Bundling plugin.ts…')
  await Bun.build({
    entrypoints: [join(dir, 'plugin.ts')],
    outdir: publicDir,
    target: 'browser',
    format: 'esm',
    minify: !isDev,
    sourcemap: isDev ? 'inline' : 'none',
    naming: 'plugin.js',
  }).then(result => {
    if (!result.success) {
      for (const log of result.logs) console.error(log)
      throw new Error(`Bun.build failed for ${name}`)
    }
    console.log(`  → public/plugin.js (${result.outputs[0]?.path})`)
  })

  // Copy index.html to public/ if not already there
  const srcHtml = join(dir, 'index.html')
  const dstHtml = join(publicDir, 'index.html')
  if (existsSync(srcHtml) && !existsSync(dstHtml)) {
    await Bun.write(dstHtml, Bun.file(srcHtml))
    console.log('  → public/index.html (copied)')
  }

  // 2. wasm-pack if crate/ exists
  const crateDir = join(dir, 'crate')
  if (existsSync(crateDir)) {
    console.log('  [2/2] Building WASM crate…')
    const wasmOutDir = join(publicDir, 'crate', 'pkg')
    mkdirSync(wasmOutDir, { recursive: true })
    const releaseFlag = isDev ? '--dev' : '--release'
    await run(
      `wasm-pack build ${releaseFlag} --target web --out-dir ${wasmOutDir}`,
      crateDir,
    )
    console.log(`  → public/crate/pkg/`)
  } else {
    console.log('  [2/2] No crate — skipping WASM build')
  }

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
