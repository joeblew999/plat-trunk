#!/usr/bin/env bun
// smoke.ts — Quick live-system check for dev or production.
//
// Usage:
//   bun run test:smoke          Local dev (requires bun run dev)
//   bun run test:smoke:prod     Production (cad.ubuntusoftware.net)
//
// Checks the full unidirectional data flow is live:
//   Rust cad-schema.json → Worker routes → API → Browser

const isProd = process.argv.includes('--prod');

const PROD_URL = 'https://cad.ubuntusoftware.net';
// Ports from mise env ([env] in .mise.toml) — fall back to defaults if run outside mise
const ROUTER_PORT  = process.env.ROUTER_PORT    ?? '8788';
const TRUCK_PORT   = process.env.TRUCK_PORT     ?? '8789';
const TRUCK_WEB_PORT = process.env.TRUCK_WEB_PORT ?? '5173';
const BASE   = isProd ? PROD_URL : `http://localhost:${ROUTER_PORT}`;
const WORKER = isProd ? PROD_URL : `http://localhost:${TRUCK_PORT}`;
const VITE   = isProd ? null     : `http://localhost:${TRUCK_WEB_PORT}`;

let pass = 0, fail = 0;

async function check(label: string, url: string, expect: (r: Response, body: string) => boolean) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const body = await r.text();
    if (expect(r, body)) {
      console.log(`  ✓  ${label}`);
      pass++;
    } else {
      console.error(`  ✗  ${label}  (${r.status}) — unexpected response`);
      fail++;
    }
  } catch (e: any) {
    console.error(`  ✗  ${label}  — ${e.message}`);
    fail++;
  }
}

const env = isProd ? 'PRODUCTION' : 'LOCAL DEV';
console.log(`\n── Smoke test (${env}) ──────────────────────────────────────`);
console.log(`   Base: ${BASE}`);
console.log('───────────────────────────────────────────────────────────────\n');

// Health
await check('API health',           `${BASE}/api/health`,        (r, b) => r.ok && b.includes('"status":"ok"'));

// CAD schema
await check('CAD schema',           `${BASE}/api/cad/schema`,    (r, b) => r.ok && b.includes('"commands"'));

// OpenAPI spec
await check('OpenAPI paths',        `${BASE}/api/openapi.json`,  (r, b) => {
  if (!r.ok) return false;
  const d = JSON.parse(b);
  const n = Object.keys(d.paths).length;
  if (n < 10) { console.error(`       too few paths: ${n}`); return false; }
  console.log(`       (${n} paths, v${d.info?.version})`);
  return true;
});

// MCP endpoint
await check('MCP endpoint',         `${BASE}/mcp`, (r, _b) => r.status < 500);

// HTML app
await check('App HTML',             `${BASE}/`,                  (r, b) => r.ok && b.includes('<!DOCTYPE html>'));

// Docs
await check('Docs',                 `${BASE}/docs/`,             (r, b) => r.ok && b.includes('<!DOCTYPE html>'));

// Vite-only checks (local dev)
if (VITE) {
  await check('Vite main.ts',       `${VITE}/main.ts`,           (r) => r.ok && r.headers.get('content-type')?.includes('javascript') === true);
  await check('Vite CSS',           `${VITE}/style.css`,         (r, b) => r.ok && b.includes('tailwindcss'));
}

console.log(`\n───────────────────────────────────────────────────────────────`);
if (fail === 0) {
  console.log(`  ✓  All ${pass} checks passed — ${env.toLowerCase()} is healthy\n`);
  process.exit(0);
} else {
  console.error(`  ✗  ${fail} failed, ${pass} passed\n`);
  process.exit(1);
}
