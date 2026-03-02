#!/usr/bin/env bun
// vendor/update.mjs — Rebuild all vendored browser ESM bundles.
// Usage: bun run systems/truck/web/vendor/update.mjs
//
// Each vendor lib is installed to a temp dir, bundled with esbuild into a
// single self-contained ESM file, then written to this directory.
//
// WHY VENDORED?
// Cloudflare Workers serve static assets — no node_modules, no CDN at runtime.
// Each vendor lib must be a single self-contained ESM file (<script type="module">).
//
// WHY IS AUTOMERGE SPECIAL?
// Automerge ships Rust→WASM. Its npm package has two entry points:
//   - "browser" condition → fullfat_bundler.js → needs Vite/webpack to resolve .wasm
//   - default "import"   → fullfat_base64.js  → WASM inlined as base64 (self-contained)
// esbuild defaults to "browser" → broken. We use --platform=neutral to get base64.

import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const VENDOR_DIR = import.meta.dirname;

function bundle(name, pkg, entryCode, opts = {}) {
    const tmp = mkdtempSync(join(tmpdir(), `vendor-${name}-`));
    try {
        console.log(`[vendor] ${name}: installing ${pkg}...`);
        execSync(`bun add ${pkg}`, { cwd: tmp, stdio: 'pipe' });

        const entry = join(tmp, 'entry.mjs');
        writeFileSync(entry, entryCode);

        const out = join(VENDOR_DIR, `${name}.js`);
        const flags = [];
        if (opts.platform) flags.push(`--platform=${opts.platform}`);
        if (opts.mainFields) flags.push(`--main-fields=${opts.mainFields}`);
        if (opts.conditions) flags.push(`--conditions=${opts.conditions}`);
        if (opts.external) opts.external.forEach(e => flags.push(`--external:${e}`));
        if (opts.define) Object.entries(opts.define).forEach(([k, v]) => flags.push(`--define:${k}=${v}`));
        if (opts.minify !== false) flags.push('--minify');

        console.log(`[vendor] ${name}: bundling...`);
        execSync(
            `bun x esbuild ${entry} --bundle --format=esm ${flags.join(' ')} --outfile=${out}`,
            { cwd: tmp, stdio: 'pipe' }
        );

        const stat = readFileSync(out);
        console.log(`[vendor] ${name}: ${(stat.length / 1024).toFixed(0)} KB -> ${out}`);
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
}

// ── Lit (production — suppress dev-mode warnings) ───────────────
bundle('lit', 'lit', `export { LitElement, html, css } from 'lit';`, {
    define: { 'globalThis.litIssuedWarnings': 'undefined' },
});

// ── Three.js (core only, no addons) ────────────────────────────
bundle('three', 'three', `export * from 'three';`);

// ── Three.js OrbitControls ─────────────────────────────────────
// Standalone — bundles only what OrbitControls needs from Three.
bundle('three-orbit-controls', 'three',
    `export { OrbitControls } from 'three/addons/controls/OrbitControls.js';`
);

// ── Automerge (WASM inlined as base64) ─────────────────────────
// Automerge has two entry points in its exports map:
//   "browser" condition → fullfat_bundler.js (needs Vite/webpack for .wasm)
//   "import"  condition → fullfat_base64.js  (WASM inlined, self-contained)
// --platform=neutral skips "browser" condition → picks fullfat_base64.js.
// --main-fields=browser,module,main ensures other packages (debug, etc) still resolve.
// --conditions=import ensures exports-map "import" conditions still work.
bundle('automerge-bundle',
    '@automerge/automerge @automerge/automerge-repo @automerge/automerge-repo-storage-indexeddb @automerge/automerge-repo-network-broadcastchannel',
    `
export { Repo, isValidAutomergeUrl } from '@automerge/automerge-repo';
export { IndexedDBStorageAdapter } from '@automerge/automerge-repo-storage-indexeddb';
export { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
`, { platform: 'neutral', mainFields: 'browser,module,main', conditions: 'import' });

console.log('[vendor] Done.');
