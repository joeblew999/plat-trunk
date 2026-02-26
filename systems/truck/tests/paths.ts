import path from 'path';

/**
 * Centralized path constants for truck tests.
 *
 * Anchor: this file lives at systems/truck/tests/paths.ts
 * If the tests dir moves, update SYSTEM_DIR here — everything else follows.
 */
export const SYSTEM_DIR = path.resolve(__dirname, '..');        // systems/truck
export const ROOT_DIR   = path.resolve(SYSTEM_DIR, '../..'); // repo root

// Cross-system paths (docs site)
export const DOCS_WEBSITE_DIR = path.join(ROOT_DIR, 'systems/docs/website');
export const SCREENSHOTS_DIR  = path.join(DOCS_WEBSITE_DIR, 'public/screenshots');
export const VIDEOS_DIR       = path.join(DOCS_WEBSITE_DIR, 'public/videos');

// Truck-local paths
export const WEB_DIR      = path.join(SYSTEM_DIR, 'web');
export const EXAMPLES_DIR = path.join(WEB_DIR, 'examples');

// External source deps (cloned to .src/ at repo root)
export const SRC_DIR = path.join(ROOT_DIR, '.src');
