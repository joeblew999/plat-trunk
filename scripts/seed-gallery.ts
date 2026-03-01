#!/usr/bin/env bun
/**
 * seed-gallery.ts — Seed the model gallery with 10 example CAD models.
 *
 * All 10 models use REAL B-Rep geometry from the existing example files.
 * Models 1-5 are the original examples. Models 6-10 are derived by
 * extracting/recombining individual primitives from the example scenes.
 *
 * Usage:
 *   bun scripts/seed-gallery.ts                    # seed localhost:8789
 *   bun scripts/seed-gallery.ts --url https://truck-cad.gedw99.workers.dev  # seed production
 *   bun scripts/seed-gallery.ts --clean            # delete all models first
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { hc } from 'hono/client';
import type { AppType } from '../systems/truck/worker/src/index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── CLI args ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const urlIdx = args.indexOf('--url');
const BASE = urlIdx >= 0 ? args[urlIdx + 1] : 'http://localhost:8789';
const CLEAN = args.includes('--clean');

console.log(`\nSeeding gallery at ${BASE}\n`);

// ── Typed API client ─────────────────────────────────────────────
const client = hc<AppType>(BASE);
const api = client.api;

async function saveModel(id: string, name: string, description: string, scene: string) {
  const res = await api.models[':id'].$put({
    param: { id },
    json: { name, description, scene },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT /api/models/${id}: ${res.status} — ${text}`);
  }
  const manifest = await res.json();
  console.log(`  ✓ ${name.padEnd(24)} ${String((manifest as any).objectCount).padStart(2)} obj(s) → /model/${id}`);
  return manifest;
}

// Deep-clone a scene object with a new UUID
function cloneObj(obj: any, newName?: string): any {
  const clone = JSON.parse(JSON.stringify(obj));
  clone.id = randomUUID();
  if (newName) clone.name = newName;
  return clone;
}

// Translate all vertices in a solid by (dx, dy, dz)
function translateSolid(obj: any, dx: number, dy: number, dz: number): any {
  const clone = JSON.parse(JSON.stringify(obj));
  clone.id = randomUUID();
  if (clone.solid?.boundaries) {
    for (const boundary of clone.solid.boundaries) {
      if (boundary.vertices) {
        for (const v of boundary.vertices) {
          v.x = (v.x || 0) + dx;
          v.y = (v.y || 0) + dy;
          v.z = (v.z || 0) + dz;
        }
      }
      if (boundary.edges) {
        for (const edge of boundary.edges) {
          if (edge.curve) {
            for (const curveType of Object.values(edge.curve) as any[]) {
              if (Array.isArray(curveType)) {
                for (const pt of curveType) {
                  if (pt && typeof pt === 'object' && 'x' in pt) {
                    pt.x = (pt.x || 0) + dx;
                    pt.y = (pt.y || 0) + dy;
                    pt.z = (pt.z || 0) + dz;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  // Also translate mesh vertices if present
  if (clone.mesh?.vertices) {
    for (const v of clone.mesh.vertices) {
      v.x = (v.x || 0) + dx;
      v.y = (v.y || 0) + dy;
      v.z = (v.z || 0) + dz;
    }
  }
  return clone;
}

// ── Load example scene files ─────────────────────────────────────
const examplesDir = resolve(ROOT, 'systems/truck/web/examples');

function loadExample(filename: string): any[] {
  return JSON.parse(readFileSync(resolve(examplesDir, filename), 'utf8'));
}

const defaultCube = loadExample('default-cube.json');
const punchedCube = loadExample('punched-cube.json');
const mergedCubes = loadExample('two-cubes-union.json');
const multiShape  = loadExample('multi-shape.json');
const stackedCubes = loadExample('stacked-cubes.json');

// Extract individual primitives from multi-shape
const cubePrim     = multiShape.find((o: any) => o.name?.includes('Box'));
const spherePrim   = multiShape.find((o: any) => o.name?.includes('Sphere'));
const cylinderPrim = multiShape.find((o: any) => o.name?.includes('Cylinder'));
const torusPrim    = multiShape.find((o: any) => o.name?.includes('Torus'));

// ── Clean ────────────────────────────────────────────────────────
if (CLEAN) {
  console.log('Cleaning existing models...');
  const res = await api.models.$get();
  const models = await res.json() as any[];
  for (const m of models) {
    await api.models[':id'].$delete({ param: { id: m.id } });
    console.log(`  ✗ Deleted ${m.name} (${m.id})`);
  }
  console.log('');
}

// ── Phase 1: Original examples (real B-Rep geometry) ─────────────
console.log('Phase 1: Loading original examples...\n');

const originals: [string, string, string, any[]][] = [
  ['default-cube',   'Default Cube',   'A single unit cube — the starting scene.',                     defaultCube],
  ['punched-cube',   'Punched Cube',   'A cube with a cylindrical hole through the center.',           punchedCube],
  ['merged-cubes',   'Merged Cubes',   'Two overlapping cubes merged into one solid.',                 mergedCubes],
  ['all-primitives', 'All Primitives', 'All four primitive shapes arranged in a row.',                 multiShape],
  ['stacked-cubes',  'Stacked Cubes',  'Three cubes stacked vertically in decreasing size.',           stackedCubes],
];

for (const [id, name, desc, scene] of originals) {
  await saveModel(id, name, desc, JSON.stringify(scene));
}

// ── Phase 2: Derived models (real B-Rep, recombined) ─────────────
console.log('\nPhase 2: Creating derived models from real geometry...\n');

// Model 6: Solo Sphere — just the sphere from multi-shape
const soloSphere = [cloneObj(spherePrim, 'Sphere')];
await saveModel('solo-sphere', 'Solo Sphere', 'A single sphere — smooth curved B-Rep surface.', JSON.stringify(soloSphere));

// Model 7: Solo Torus — just the torus from multi-shape
const soloTorus = [cloneObj(torusPrim, 'Torus')];
await saveModel('solo-torus', 'Solo Torus', 'A torus (donut) — demonstrates doubly-curved surfaces.', JSON.stringify(soloTorus));

// Model 8: Cube & Cylinder — two primitives side by side
const cubeCyl = [
  cloneObj(cubePrim, 'Cube'),
  cloneObj(cylinderPrim, 'Cylinder'),
];
await saveModel('cube-and-cylinder', 'Cube & Cylinder', 'A cube and cylinder side by side — simple two-object assembly.', JSON.stringify(cubeCyl));

// Model 9: Sphere Grid — 4 spheres in a 2x2 grid
const sphereGrid = [
  translateSolid({ ...cloneObj(spherePrim, 'Sphere NW') }, -1.5, 0, -1.5),
  translateSolid({ ...cloneObj(spherePrim, 'Sphere NE') },  1.5, 0, -1.5),
  translateSolid({ ...cloneObj(spherePrim, 'Sphere SW') }, -1.5, 0,  1.5),
  translateSolid({ ...cloneObj(spherePrim, 'Sphere SE') },  1.5, 0,  1.5),
];
await saveModel('sphere-grid', 'Sphere Grid', 'Four spheres in a 2×2 grid — demonstrates array patterns.', JSON.stringify(sphereGrid));

// Model 10: Tower Assembly — stacked different primitives
const tower = [
  cloneObj(cubePrim, 'Base Cube'),
  cloneObj(cylinderPrim, 'Middle Cylinder'),
  cloneObj(spherePrim, 'Top Sphere'),
  cloneObj(torusPrim, 'Ring'),
];
await saveModel('tower-assembly', 'Tower Assembly', 'All four primitive types stacked — a multi-shape tower.', JSON.stringify(tower));

// ── Summary ──────────────────────────────────────────────────────
console.log('\n─── Gallery Summary ───\n');
const listRes = await api.models.$get();
const allModels = await listRes.json() as any[];
console.log(`Total models: ${allModels.length}\n`);
for (const m of allModels) {
  const thumb = m.hasThumbnail ? '📷' : '  ';
  console.log(`  ${thumb} ${m.id.padEnd(22)} ${m.name.padEnd(22)} ${String(m.objectCount).padStart(2)} obj(s)`);
}
console.log(`\nView gallery: ${BASE}\n`);

if (allModels.length < 10) {
  console.error('WARNING: Expected 10 models but got', allModels.length);
  process.exit(1);
}
