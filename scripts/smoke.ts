#!/usr/bin/env bun
// smoke.ts — Quick live-system check. Runs while dev server is up, no restart needed.
//
// Usage: bun run test:smoke   (requires bun run dev to be running)
//
// Checks the full unidirectional data flow is live:
//   Rust cad-schema.json → Worker routes → API → Browser Vite

const WORKER = 'http://localhost:8789';
const VITE   = 'http://localhost:5173';
const ROUTER = 'http://localhost:8788';

let pass = 0, fail = 0;

async function check(label: string, url: string, expect: (r: Response, body: string) => boolean) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
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

console.log('\n── Smoke test ─────────────────────────────────────────────────');
console.log(`   Worker: ${WORKER}   Vite: ${VITE}   Router: ${ROUTER}`);
console.log('───────────────────────────────────────────────────────────────\n');

// Worker: health
await check('Worker health',         `${WORKER}/api/health`,      (r, b) => r.ok && b.includes('"status":"ok"'));

// Worker: CAD schema (cad-schema.json served live)
await check('Worker cad-schema',     `${WORKER}/api/cad/schema`,  (r, b) => r.ok && b.includes('"commands"'));

// Worker: OpenAPI spec (mirrors gen-openapi.ts) — path count driven by cad-schema.json
await check('Worker openapi paths',  `${WORKER}/api/openapi.json`, (r, b) => {
  if (!r.ok) return false;
  const d = JSON.parse(b);
  const n = Object.keys(d.paths).length;
  if (n < 10) { console.error(`       too few paths: ${n}`); return false; }
  console.log(`       (${n} paths, v${d.info?.version})`);
  return true;
});

// Worker: MCP endpoint accepts POST
await check('Worker MCP endpoint',   `${WORKER}/mcp`, (r, _b) => {
  // MCP returns 4xx for bad requests — just check it's reachable (not 502/503)
  return r.status < 500;
});

// Vite dev server
await check('Vite dev server',       `${VITE}/`,                  (r, b) => r.ok && b.includes('<!DOCTYPE html>'));

// Vite: datastar served from public/
await check('Vite datastar.js',      `${VITE}/datastar.js`,       (r) => r.ok && r.headers.get('content-type')?.includes('javascript') === true);

// Vite: CSS compiled (Tailwind v4 + DaisyUI)
await check('Vite CSS (Tailwind+DaisyUI)', `${VITE}/style.css`,   (r, b) => r.ok && b.includes('tailwindcss'));

// Router
await check('Router (plat-router)',  `${ROUTER}/api/health`,      (r, b) => r.ok && b.includes('"status":"ok"'));

console.log(`\n───────────────────────────────────────────────────────────────`);
if (fail === 0) {
  console.log(`  ✓  All ${pass} checks passed — system is live and healthy\n`);
  process.exit(0);
} else {
  console.error(`  ✗  ${fail} failed, ${pass} passed — run "bun run dev" first\n`);
  process.exit(1);
}
