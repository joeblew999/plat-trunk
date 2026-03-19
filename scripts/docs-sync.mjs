#!/usr/bin/env node
/**
 * docs-sync.mjs — sync lib/*/docs/ into VitePress
 *
 * Copies each lib's docs/ folder into systems/docs/website/docs/libs/{name}/
 * so VitePress can render them without symlinks.
 *
 * Run: bun scripts/docs-sync.mjs
 * Or:  mise run docs:sync
 *
 * Safe to run repeatedly — overwrites, never deletes unlisted files.
 * On macOS/Linux: symlinks in docs/libs/ already handle this at dev time.
 * This script is the fallback for Windows + CI production builds.
 */

import { cpSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root    = join(dirname(fileURLToPath(import.meta.url)), '..')
const libsOut = join(root, 'systems/docs/website/docs/libs')

const libs = [
  { name: 'billing', src: 'lib/billing/docs' },
  // Add new libs here as they get docs/:
  // { name: 'observe', src: 'lib/observe/docs' },
]

let copied = 0
for (const { name, src } of libs) {
  const srcPath = join(root, src)
  const dstPath = join(libsOut, name)
  if (!existsSync(srcPath)) {
    console.warn(`⚠  skipping ${name} — ${src} does not exist`)
    continue
  }
  mkdirSync(dstPath, { recursive: true })
  cpSync(srcPath, dstPath, { recursive: true })
  console.log(`✓  ${src}  →  docs/libs/${name}/`)
  copied++
}
console.log(`\ndocs:sync complete — ${copied} lib(s) synced`)
