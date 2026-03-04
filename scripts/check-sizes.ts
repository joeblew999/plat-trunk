#!/usr/bin/env bun
// check-sizes.ts — Validate worker artifact sizes before deploy.
//
// Cloudflare Workers has a 3 MB limit per worker (script + WASM combined,
// uncompressed). Exceeding this causes deploy failures and unexpected billing.
// Run automatically as part of `bun run build` and `bun run deploy`.
//
// Exit 0 if all sizes OK, exit 1 if any limit is exceeded (blocks deploy).

import { statSync, existsSync } from "fs";
import { join, resolve } from "path";
import { execSync } from "child_process";

const rootDir = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();

const LIMIT_BYTES = 3 * 1024 * 1024; // 3 MB

interface Artifact {
  label: string;
  path: string;
  limit?: number; // optional per-artifact override
}

// Key artifacts to check. The worker WASM (headless) is the critical one —
// it is bundled INTO the Cloudflare Worker. The browser WASM is served as a
// static asset (ASSETS binding) so it is not subject to the worker size limit,
// but we track it for awareness.
const artifacts: Artifact[] = [
  {
    label: "truck-cad worker WASM (headless)",
    path: "systems/truck/worker/pkg/truck_webgpu_gui_bg.wasm",
  },
  {
    label: "truck-cad browser WASM (rendering, static asset — info only)",
    path: "systems/truck/web/pkg-browser-renderer/truck_webgpu_gui_bg.wasm",
    limit: Infinity, // static asset, no CF worker limit — warn only
  },
  {
    label: "truck-cad headless JS glue",
    path: "systems/truck/worker/pkg/truck_webgpu_gui_bg.js",
  },
];

function fmt(bytes: number): string {
  if (bytes === Infinity) return "∞";
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

let failed = false;

console.log("\n── Worker size check ─────────────────────────────────────────");
for (const { label, path, limit } of artifacts) {
  const fullPath = resolve(rootDir, path);
  if (!existsSync(fullPath)) {
    console.log(`  ⚠  ${label}: NOT FOUND (${path})`);
    continue;
  }
  const bytes = statSync(fullPath).size;
  const max = limit ?? LIMIT_BYTES;
  const ok = bytes <= max;
  const pct = max === Infinity ? "" : ` (${((bytes / max) * 100).toFixed(0)}% of limit)`;
  const icon = ok ? "✓" : "✗";
  console.log(`  ${icon}  ${label}`);
  console.log(`     ${fmt(bytes)}${pct} — limit ${fmt(max)}`);
  if (!ok) {
    console.error(`     ERROR: exceeds ${fmt(max)} limit by ${fmt(bytes - max)}`);
    failed = true;
  }
}
console.log("──────────────────────────────────────────────────────────────\n");

if (failed) {
  console.error("❌  Size check FAILED — reduce worker bundle before deploying.");
  process.exit(1);
} else {
  console.log("✅  All sizes within limits.\n");
}
