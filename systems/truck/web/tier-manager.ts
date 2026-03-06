// tier-manager.js — Camera-based tier management (ADR-0025 Phase 2).
// Automatically evicts distant/idle Hot objects to Warm (IndexedDB + LOD proxy)
// and promotes nearby Warm objects back to Hot (full WASM + GPU).

import { evictObject, promoteObject, clearObjects } from './object-store';

// ── Thresholds (tunable via setThresholds) ──────────────────────────────────

let NEAR_THRESHOLD = 50;      // Warm→Hot when camera closer than this
let FAR_THRESHOLD = 200;      // Hot→Warm when camera farther than this
let IDLE_TIMEOUT = 30_000;    // ms — don't evict objects touched recently
const TICK_INTERVAL = 100;      // ms — ~10 Hz tier management tick
const MAX_EVICTIONS_PER_TICK = 2;   // limit work per tick to avoid jank
const MAX_PROMOTIONS_PER_TICK = 1;  // promotions are heavier (WASM deserialize)

// ── State ───────────────────────────────────────────────────────────────────

let _enabled = false;
let _tickTimer = null;
let _modelId = 'default';
let _tickInProgress = false; // re-entrancy guard

// Warm object metadata (saved before eviction for camera distance + LOD proxy)
// Map<objectId, { center: [x,y,z], radius: number, color: [r,g,b,a] }>
const _warmSpheres = new Map();

// Track when each object was last interacted with (selection, edit, etc.)
// Map<objectId, timestamp>
const _lastInteraction = new Map();

// ── Camera helpers ──────────────────────────────────────────────────────────

/** Extract camera position from a Three.js matrixWorld (column-major 16 elements). */
function cameraPositionFromMatrix(matrixWorld: number[]): [number, number, number] {
    // Translation is in elements [12, 13, 14] (column-major)
    return [matrixWorld[12], matrixWorld[13], matrixWorld[14]];
}

/** Euclidean distance from camera to the surface of a bounding sphere. */
function cameraDistToSphere(camPos: number[], center: number[], radius: number): number {
    const dx = camPos[0] - center[0];
    const dy = camPos[1] - center[1];
    const dz = camPos[2] - center[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) - radius;
    return Math.max(0, dist);
}

// ── Core tick ───────────────────────────────────────────────────────────────

async function tick() {
    if (_tickInProgress) return; // skip if previous tick still running
    _tickInProgress = true;
    try { await _tickInner(); } finally { _tickInProgress = false; }
}

async function _tickInner() {
    const ctrl = window.sceneController;
    if (!ctrl || !window.cadQuery) return;

    // Get camera + selection from WASM state.
    // cadQuery is sync and returns the full WASM result including camera.
    const state = window.cadQuery('get_state', {}, { reconcile: false });
    if (!state?.camera?.matrixWorld) return;
    const camPos = cameraPositionFromMatrix(state.camera.matrixWorld);

    // Get bounding spheres for all Hot objects
    let hotSpheres;
    try {
        hotSpheres = JSON.parse(ctrl.get_bounding_spheres());
    } catch { return; }

    const selectedId = state.selectedId || '';
    const now = Date.now();

    // ── Evict: Hot → Warm ───────────────────────────────────────────────
    let evictions = 0;
    for (const sphere of hotSpheres) {
        if (evictions >= MAX_EVICTIONS_PER_TICK) break;
        const { objectId, center, radius, color } = sphere;

        // Never evict the selected object
        if (objectId === selectedId) continue;

        const dist = cameraDistToSphere(camPos, center, radius);
        if (dist <= FAR_THRESHOLD) continue;

        // Check idle timeout — objects with no interaction record are treated as
        // recently created (don't evict), preventing race with object creation.
        const lastTouch = _lastInteraction.get(objectId);
        if (lastTouch === undefined) {
            // First time seeing this object — record now, check next tick
            _lastInteraction.set(objectId, now);
            continue;
        }
        if (now - lastTouch < IDLE_TIMEOUT) continue;

        // Evict: save sphere data → serialize to IDB → delete from WASM → add LOD proxy
        _warmSpheres.set(objectId, { center, radius, color });
        const ok = await evictObject(_modelId, objectId);
        if (ok) {
            ctrl.add_lod_proxy(JSON.stringify({ objectId, center, radius, color }));
            evictions++;
            console.debug('[TierManager] evict', objectId.slice(0, 8), 'dist=', dist.toFixed(1));
        } else {
            _warmSpheres.delete(objectId);
        }
    }

    // ── Promote: Warm → Hot ─────────────────────────────────────────────
    let promotions = 0;
    for (const [objectId, sphere] of _warmSpheres) {
        if (promotions >= MAX_PROMOTIONS_PER_TICK) break;
        const dist = cameraDistToSphere(camPos, sphere.center, sphere.radius);
        if (dist >= NEAR_THRESHOLD) continue;

        // Promote: remove LOD proxy → read from IDB → import to WASM
        ctrl.remove_lod_proxy(objectId);
        const result = await promoteObject(_modelId, objectId);
        if (result) {
            _warmSpheres.delete(objectId);
            _lastInteraction.set(objectId, now);
            promotions++;
            console.debug('[TierManager] promote', objectId.slice(0, 8), 'dist=', dist.toFixed(1));
        }
    }

    // Publish warm count for UI (read by reconcileMetadata in state.js)
    if (evictions > 0 || promotions > 0) {
        _publishWarmCount();
    }
}

// ── Warm count → UI bridge ───────────────────────────────────────────────────

function _publishWarmCount() {
    window.__warmCount = _warmSpheres.size;
    // Trigger Datastar reconcile so footer updates (use reconcile directly,
    // NOT cadCommand — avoids recording spurious get_state ops in Automerge)
    if (window.reconcile) {
        try { window.reconcile({}); } catch {}
    }
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Start the tier manager. Call once after WASM is initialized. */
export function startTierManager(modelId = 'default') {
    if (_enabled) return;
    _modelId = modelId;
    _enabled = true;
    _tickTimer = setInterval(() => {
        // Use requestIdleCallback if available for lower priority
        if (window.requestIdleCallback) {
            window.requestIdleCallback(() => tick(), { timeout: TICK_INTERVAL * 2 });
        } else {
            tick();
        }
    }, TICK_INTERVAL);
    console.log('[TierManager] started, model=', modelId);
}

/** Reset tier state (call on scene clear/replay to avoid stale warm refs).
 *  Also clears IDB entries for the model to prevent stale data accumulating. */
export async function resetTierState() {
    _warmSpheres.clear();
    _lastInteraction.clear();
    _publishWarmCount();
    try { await clearObjects(_modelId); } catch (e) { console.warn('[TierManager] clearObjects failed:', e); }
}

/** Notify the tier manager that an object was interacted with (resets idle timer). */
export function touchObject(objectId: string): void {
    _lastInteraction.set(objectId, Date.now());
}

/** Get the number of Warm-tier objects. */
export function warmCount() {
    return _warmSpheres.size;
}

/** Register Warm objects created by progressive loading (Phase 3).
 *  These objects were never Hot — they went straight from snapshot → IDB → LOD proxy.
 *  The tier manager needs to know about them to promote when camera gets close.
 *  @param {Map<string, { center: [x,y,z], radius: number, color: [r,g,b,a] }>} sphereMap */
export function registerWarmObjects(sphereMap: Map<string, { center: number[]; radius: number; color: number[] }>): void {
    for (const [objectId, sphere] of sphereMap) {
        _warmSpheres.set(objectId, sphere);
    }
    _publishWarmCount();
}

/** Update thresholds at runtime (for UI slider or tests). */
export function setThresholds({ near, far, idle }: { near?: number; far?: number; idle?: number } = {}) {
    if (near !== undefined) NEAR_THRESHOLD = near;
    if (far !== undefined) FAR_THRESHOLD = far;
    if (idle !== undefined) IDLE_TIMEOUT = idle;
}
