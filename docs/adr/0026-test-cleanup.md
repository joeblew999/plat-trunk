# ADR-0026: Test Cleanup — Review & Hardening of the E2E Test Infrastructure

## Status

**Review** — documents current test infrastructure, identifies the root cause of test failures found during ADR-0025 hardening, and proposes concrete fixes.

## Context

The platform has a four-layer test pyramid, all driven by the schema-driven `cadCommand()` dispatch (ADR-0005):

| Layer | What | Framework | Runner | Needs server? |
|-------|------|-----------|--------|---------------|
| L1 | WASM kernel (sketch, extrude) | Playwright | `task truck:test:sketch` | Yes |
| L2 | Worker/MCP contract (32 Vitest tests) | Vitest | `task truck:test:api` | No |
| L3 | cadCommand integration (CAD, BIM, tier, actors) | Playwright | `task truck:test:e2e` | Yes |
| L4 | UI wiring (toolbar, outliner, keyboard) | Playwright | `task truck:test:ui` | Yes |

**Current state: 50 Playwright + 32 Vitest = 82 tests, all passing.**

The test infrastructure was built incrementally as features landed. ADR-0025 hardening exposed several systemic problems that were hidden by coincidence (tests passing for the wrong reasons). This ADR reviews what works, what's broken, and what to fix.

-----

## What Works Well

### 1. Single dispatch via `apiCommand()`

All test mutations go through `cadCommand()` — the same entry point as MCP tools, REST API, and GUI buttons. This means:
- Tests exercise the real dispatch path, not test-only shortcuts
- Schema changes automatically propagate to tests
- Test failures reveal real bugs, not test/prod divergence

```typescript
// tests/e2e/helpers.ts — the ONLY mutation entry point
export async function apiCommand(page, type, params, opts) {
  return await page.evaluate(
    ({ t, p, o }) => window.cadCommand(t, p, { source: 'test', ...o }),
    { t: type, p: params, o: opts },
  );
}
```

### 2. Model isolation via unique `modelId`

Each test gets its own Automerge document, preventing cross-test contamination:

```typescript
test.beforeEach(async ({ page }, testInfo) => {
  const modelId = `test-cad-${testInfo.testId}`;
  await page.goto(`/?model=${modelId}`);
  await waitForReady(page);
});
```

### 3. WASM state as source of truth

Assertions query `sceneController.object_count()` and `sceneController.object_ids()` directly from WASM, not Datastar signals (which can lag).

### 4. `waitForObjectCount()` polling

Robust polling helper that accounts for async Automerge recording and Datastar reconciliation:

```typescript
export async function waitForObjectCount(page, expected, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const count = await getObjectCount(page);
    if (count === expected) return count;
    await page.waitForTimeout(100);
  }
  // fail with clear message
  expect(actual).toBe(expected);
}
```

-----

## The Root Cause: Eventually Consistent Architecture vs Synchronous Test Expectations

The architecture is **eventually consistent by design**. A single `cadCommand('add_cube')` triggers a cascade of async side effects:

```
cadCommand('add_cube', { size: 1 })
  │
  ├─ 1. WASM executes immediately          ← sceneController.add_cube()
  ├─ 2. Result returned to caller           ← { objectId: "abc123" }
  │     ┌── caller gets result HERE ──┐
  ├─ 3. Automerge records op (async)        ← mgr.record('add_cube', params, result)
  ├─ 4. Blob store writes (async)           ← storeBlob() for imports
  ├─ 5. Datastar reconcile (async)          ← reconcile({ objectIds, objectCount })
  ├─ 6. Lit components re-render (async)    ← <cad-outliner> updates DOM
  ├─ 7. SSE push to other tabs (async)      ← Worker broadcasts via SSE
  └─ 8. Tier manager reacts (async, 100ms)  ← evict/promote on next tick
```

**When `apiCommand()` returns, only steps 1-2 are complete.** Steps 3-8 happen later — milliseconds to seconds later depending on the operation and machine speed.

But tests are written as if everything is synchronous:

```typescript
await apiCommand(page, 'add_cube', { size: 1 });
// ← WASM is updated, but Automerge/UI/SSE may not be
await pause(page);  // hope 50ms is enough
expect(await getObjectCount(page)).toBe(2);  // queries WASM, so this works
// but: expect(outliner items).toBe(2) might fail (Lit hasn't re-rendered)
// and: undo might fail (Automerge hasn't recorded the op yet)
```

Every problem found during ADR-0025 hardening is a symptom of this mismatch:

| Problem | What happened | Which async step was missing |
|---------|--------------|------------------------------|
| Undo tests failed | Operations not recorded | Step 3 (Automerge not initialized) |
| `pause()` masked bugs | Sleep happened to be long enough | Steps 3-6 (all of them) |
| IDB ghost entries | Stale data from previous tests | Step 4 (blob store never cleaned) |
| Outliner `data-oid` missing | DOM not updated | Step 6 (Lit re-render) |

**The fix is not to make the architecture synchronous — it's to make the tests respect the async contract.**

-----

## The Completion Contract

Tests need to know: **what is guaranteed when `apiCommand()` returns, and what isn't?**

| Guaranteed on return | NOT guaranteed on return |
|---------------------|------------------------|
| WASM state updated (`object_count()`, `object_ids()`) | Automerge op recorded |
| Result object available (`{ objectId, success, error }`) | Datastar signals reconciled |
| GPU buffers created (for add/boolean ops) | Lit components re-rendered |
| | SSE pushed to other tabs |
| | Tier manager reacted |
| | IndexedDB blob written |

**Rule:** After `apiCommand()`, you can assert WASM state immediately. For anything else, you must poll with a `waitFor*` helper.

This contract must be documented in `helpers.ts` and respected by every test.

-----

## Problems Found

### Problem 1: Incomplete bootstrapping — `waitForReady()` was partial

**Severity: Critical** — caused 3 undo test failures for months.

`waitForReady()` checked for WASM `sceneController` and `cadCommand` function, but not Automerge `cadDocManager.handle`. Operations executed in WASM but were never recorded to Automerge. Undo had nothing to undo.

**Root cause:** The system has three async init phases with different timing:
1. WASM `sceneController` — fast (~200ms)
2. `cadCommand()` function — fast (registered immediately after WASM)
3. Automerge `cadDocManager.handle` — slow (~500-2000ms, IndexedDB open + doc create/load)

Tests ran after phase 2 completed but before phase 3 finished.

**Why it was hidden:** Most tests don't use undo. The 3 undo tests were the only ones that depended on Automerge recording. They "always failed" and were assumed to be unrelated to the tier work.

**Fix applied (ADR-0025 bug #9):** Added `&& cadDocManager?.handle` to the `waitForReady()` check. But this is a band-aid — the real problem is deeper (see Decision).

### Problem 2: No cleanup between tests — state leaks via Automerge and IndexedDB

**Severity: Medium** — masked by model isolation, but causes flaky failures.

Each test uses a unique `modelId`, which gives it a fresh Automerge document. But:
- IndexedDB (`cad-blobs`, `cad-objects`) accumulates entries across tests — not model-scoped
- The tier manager's in-memory state (`_warmSpheres`, `_lastInteraction`) persists across navigations within the same browser context
- Automerge's BroadcastChannel can leak events between tests
- The Worker accumulates per-model state (command queues, SSE connections) that is never cleaned up — over a 50-test run this means 50 stale model entries in memory

**Why it was hidden:** Model isolation prevents most cross-contamination. But the tier tests were the first to exercise IndexedDB directly and discovered that ghost entries from previous test runs caused spurious promotions.

### Problem 3: `pause()` hides timing bugs — tests pass for the wrong reason

**Severity: Medium** — causes false confidence.

`pause()` is a fixed-duration sleep (50ms fast, 500ms slow). It's used after mutations to "wait for things to settle":

```typescript
await apiCommand(page, 'add_cube', { size: 1 });
await pause(page);
expect(await getObjectCount(page)).toBe(2);
```

This works on fast machines but:
- On slow machines (CI), 50ms isn't enough → flaky failure
- On fast machines, the pause masks bugs where the operation doesn't actually complete (like the non-awaited undo)
- Adding `SLOW=1` makes all tests pass by coincidence (500ms is enough for most things)

**The undo bug was invisible because `pause()` happened to be long enough in SLOW mode.** In fast mode, the tests failed — but developers ran them in slow mode for video recording and thought they passed.

### Problem 4: No assertion on bootstrapping completeness

**Severity: Medium** — future init phases will cause the same problem.

When a new async init phase is added (e.g., tier manager startup, WebRTC sync, plugin loading), `waitForReady()` must be updated manually. If someone forgets, tests will pass most of the time (race condition) and fail intermittently.

There is no single "app is fully ready" signal that tests can wait for.

### Problem 5: Mixed patterns for the same operation

**Severity: Low** — makes tests harder to read and maintain.

| Operation | Pattern A (fragile) | Pattern B (robust) |
|-----------|--------------------|--------------------|
| Wait for count | `pause(); expect(count).toBe(N)` | `waitForObjectCount(page, N)` |
| Wait for ready | `waitForReady(page)` | `waitForReady(page); waitForAutomerge(page)` |
| Check state | `getObjectCount(page)` | `getState(page).objectCount` |
| Clear scene | `apiCommand(page, 'clear')` | `apiCommand(page, 'clear'); waitForObjectCount(page, 0)` |

Both patterns exist in the codebase. Some tests use `pause()` after undo (fragile), others use `waitForObjectCount()` (robust).

### Problem 6: Gizmo tests bypass the dispatch path

**Severity: Low** — intentional (ADR-0013 latency requirement), but confusing.

The "Gizmo Interaction" block in `cad.spec.ts` calls `sceneController.begin_gizmo_drag()` directly — the only test code that bypasses `cadCommand()`. This is correct (gizmo drag is 60fps latency-sensitive), but there's no comment explaining why it's an exception.

### Problem 7: No test for "app is ready" itself

**Severity: Low** — the bootstrapping check is load-bearing but untested.

`waitForReady()` is called in every `beforeEach` but there's no test that verifies the readiness contract itself. If the app changes how it signals readiness (e.g., removes `cadDocManager` from `window`), tests would hang with a timeout instead of giving a clear failure.

### Problem 8: `retries: 1` masks flaky tests

**Severity: Low** — but undermines confidence.

The Playwright config has `retries: 1`. If a test fails on first attempt but passes on retry, it's reported as passed. This hides flaky tests — exactly the timing bugs this ADR is trying to eliminate. With deterministic waits (Phase 2), retries should be unnecessary.

-----

## Decision

### Phase 1: Readiness contract (single "app ready" signal)

Add a single `window.__appReady` flag that the app sets after ALL init phases complete:

```javascript
// In app init (after WASM + cadCommand + Automerge + tier manager):
window.__appReady = true;
```

Update `waitForReady()` to check this single flag:

```typescript
export async function waitForReady(page: Page) {
  await page.waitForFunction(() => (window as any).__appReady === true, { timeout: 30_000 });
  await page.waitForTimeout(IS_SLOW ? 1000 : 50);
}
```

**Why:** One flag, one place to update. New init phases (plugin loading, WebRTC, etc.) just need to delay setting `__appReady = true` until they're done. Tests don't need to know the internal init sequence.

Add a test that verifies the readiness contract:

```typescript
test('app ready signal includes all subsystems', async ({ page }) => {
  await page.goto('/');
  await waitForReady(page);

  // Verify all subsystems are actually ready (not just the flag)
  expect(await page.evaluate(() => !!(window as any).sceneController)).toBe(true);
  expect(await page.evaluate(() => typeof (window as any).cadCommand)).toBe('function');
  expect(await page.evaluate(() => !!(window as any).cadDocManager?.handle)).toBe(true);
});
```

**Document the completion contract** in `helpers.ts` as a JSDoc comment on `apiCommand()`:

```typescript
/**
 * Execute a cadCommand via the page.
 *
 * Completion contract:
 * - On return: WASM state is updated (object_count, object_ids, etc.)
 * - NOT on return: Automerge recording, Datastar reconcile, Lit re-render,
 *   SSE push, tier manager reaction, IndexedDB blob write.
 *
 * For WASM assertions: assert immediately after apiCommand().
 * For UI/Automerge/SSE assertions: use waitForObjectCount(), waitForSelectedId(), etc.
 */
export async function apiCommand(...) { ... }
```

### Phase 2: Eliminate `pause()` after mutations

Replace every `pause()` after a state-changing operation with the appropriate `waitFor*` helper:

| After this | Replace `pause()` with |
|-----------|----------------------|
| `add_*`, `delete`, `clear`, `boolean_*` | `waitForObjectCount(page, N)` |
| `undo`, `redo` | `waitForObjectCount(page, N)` |
| `select`, `deselect` | `waitForSelectedId(page, id)` (new helper) |
| `translate`, `set_style`, `set_color` | `waitForWasmState(page, fn)` (new helper) |
| UI animation only | keep `pause()` (rename to `animationFrame()` for clarity) |

New helpers:

```typescript
/** Wait for selection to match */
export async function waitForSelectedId(page: Page, expectedId: string, timeoutMs = 5_000) {
  await page.waitForFunction(
    (id) => (window as any).sceneController?.get_selected_id?.() === id,
    expectedId,
    { timeout: timeoutMs },
  );
}

/** Wait for arbitrary WASM state condition (pass a function, not a string) */
export async function waitForWasmState(
  page: Page,
  fn: (ctrl: any) => boolean,
  timeoutMs = 5_000,
) {
  await page.waitForFunction(
    (check) => {
      const ctrl = (window as any).sceneController;
      return ctrl && new Function('ctrl', `return (${check})(ctrl)`)(ctrl);
    },
    fn.toString(),
    { timeout: timeoutMs },
  );
}

/** Pure animation delay — only for visual pauses (video recording, etc.) */
export async function animationFrame(page: Page) {
  await page.waitForTimeout(IS_SLOW ? 500 : 50);
}
```

**After Phase 2, set `retries: 0` in `playwright.config.ts`.** If tests are deterministic, retries are a crutch. Any test that needs a retry is a bug to fix, not a flake to suppress.

### Phase 3: Test isolation — full state reset

The cleanup must happen **before navigation**, not after `waitForReady()`. Deleting IDB databases after the app has already opened them mid-session can break things. Two options:

**Option A (preferred): Navigate to a reset URL first.**

Add a `/reset` route (or query param `?reset=1`) that clears all browser-side state before loading:

```typescript
test.beforeEach(async ({ page }, testInfo) => {
  const modelId = `test-${testInfo.testId}`;
  // Navigate with reset flag — app clears IDB + tier state before init
  await page.goto(`/?model=${modelId}&reset=1`);
  await waitForReady(page);
});
```

App-side (in init):
```javascript
if (new URLSearchParams(location.search).has('reset')) {
  await Promise.all([
    new Promise(r => { const req = indexedDB.deleteDatabase('cad-objects'); req.onsuccess = r; req.onerror = r; }),
    new Promise(r => { const req = indexedDB.deleteDatabase('cad-blobs'); req.onsuccess = r; req.onerror = r; }),
  ]);
  resetTierState?.();
}
// then proceed with normal init...
```

**Option B (simpler): Use model-scoped cleanup instead of database deletion.**

```typescript
test.beforeEach(async ({ page }, testInfo) => {
  const modelId = `test-${testInfo.testId}`;
  await page.goto(`/?model=${modelId}`);
  await waitForReady(page);

  // Model-scoped cleanup — only removes entries for THIS model
  await page.evaluate((mid) => {
    if ((window as any).clearObjects) (window as any).clearObjects(mid);
    if ((window as any).resetTierState) (window as any).resetTierState();
  }, modelId);
});
```

Option B is safer (doesn't nuke databases other tests might need) but doesn't solve the cross-model IDB leak. Option A is thorough but requires app-side support.

**Worker-side cleanup:** Add a `DELETE /api/cad/{modelId}` endpoint that clears the Worker's in-memory state for a model. Call it in `afterEach`:

```typescript
test.afterEach(async ({ request }, testInfo) => {
  const modelId = `test-${testInfo.testId}`;
  await request.delete(`/api/cad/${modelId}`).catch(() => {});
});
```

This prevents the Worker from accumulating stale model state across a 50-test run.

### Phase 4: Consistent patterns — lint rule + docs

Establish canonical patterns and enforce them:

1. **Document the patterns** in a `tests/e2e/PATTERNS.md` file
2. **Add ESLint rule** (or grep in CI) to flag `pause()` calls that aren't preceded by a comment explaining why a sleep is needed
3. **Add comment to gizmo tests** explaining why they bypass `cadCommand()`

**Canonical patterns:**

| Situation | Pattern | Anti-pattern |
|-----------|---------|-------------|
| Wait for mutation effect | `waitForObjectCount(page, N)` | `pause(page); expect(count).toBe(N)` |
| Wait for app ready | `waitForReady(page)` | `page.waitForTimeout(2000)` |
| Assert WASM state | `getObjectCount(page)` (WASM) | `page.evaluate(() => _ds.root.objectCount)` (Datastar) |
| Assert UI state | `waitForObjectCount` then check DOM | `pause(); check DOM` |
| Drive mutation | `apiCommand(page, 'add_cube', {...})` | `page.evaluate(() => sceneController.add_cube(1))` |
| UI interaction | `clickToolbar(page, 'add-cube')` | `page.click('#btn-add-cube')` |
| Clear scene | `apiCommand(page, 'clear'); waitForObjectCount(page, 0)` | `apiCommand(page, 'clear'); pause(page)` |
| Gizmo drag (exception) | direct WASM calls with `// ADR-0013` comment | unmarked direct WASM calls |

### Phase 5: Test health reporting

Add a dedicated test suite that catches infrastructure regressions early:

```typescript
test.describe('Test Infrastructure Health', () => {
  test('bootstrapping completes within 5s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/?model=health-check');
    await waitForReady(page);
    expect(Date.now() - start).toBeLessThan(5_000);
  });

  test('model isolation — fresh model has default cube only', async ({ page }) => {
    await page.goto(`/?model=isolation-${Date.now()}`);
    await waitForReady(page);
    expect(await getObjectCount(page)).toBe(1);
  });

  test('completion contract — WASM state available immediately after apiCommand', async ({ page }) => {
    await page.goto(`/?model=contract-${Date.now()}`);
    await waitForReady(page);
    // No pause, no wait — WASM state must be available immediately
    await apiCommand(page, 'add_cube', { size: 1 });
    expect(await getObjectCount(page)).toBe(2);
  });

  test('cleanup — IDB clear before navigation doesn\'t break load', async ({ page }) => {
    await page.evaluate(() => {
      indexedDB.deleteDatabase('cad-objects');
      indexedDB.deleteDatabase('cad-blobs');
    });
    await page.goto(`/?model=cleanup-${Date.now()}`);
    await waitForReady(page);
    expect(await getObjectCount(page)).toBe(1);
  });
});
```

-----

## Consequences

### Positive

- **No more hidden timing bugs** — replacing `pause()` with explicit waits makes failures deterministic
- **Future-proof bootstrapping** — single `__appReady` flag means new init phases can't silently break tests
- **Tests document the contract** — the completion contract and patterns file serve as living documentation
- **CI stability** — deterministic waits + `retries: 0` means every pass is real and every failure is actionable
- **Clean Worker state** — model cleanup prevents memory accumulation across long test runs
- **~2.5 min faster test runs** — 28 fewer browser sessions + doc videos out of CI
- **Easier to maintain** — 45 tests with clear purpose vs 73 tests with overlapping coverage

### Negative

- **Migration effort** — every `pause()` call after a mutation needs manual review to determine the right `waitFor*` replacement
- **New helpers needed** — `waitForSelectedId`, `waitForWasmState`, `animationFrame` add to the helper surface area
- **App-side work for Phase 3** — `?reset=1` support or `DELETE /api/cad/{modelId}` endpoint
- **`retries: 0` will initially surface hidden flakes** — some tests may fail that were previously masked by retry; these are real bugs to fix, not a regression
- **Merge effort requires care** — every assertion from dropped tests must be transplanted to a surviving test, or coverage is lost

### What this does NOT solve

- **WebGPU rendering correctness** — visual regression testing (screenshot comparison) is a separate concern
- **Multi-device sync testing** — Automerge sync across devices needs a different setup (two browser contexts + sync server)
- **Performance benchmarks** — timing tests (e.g., "progressive load of 1000 objects in < 2s") need dedicated fixtures, not e2e tests
- **Rust unit tests** — WASM kernel correctness is tested via `cargo test`, orthogonal to this ADR

-----

## Sequencing

```
Phase 1: Readiness contract (__appReady flag + completion contract docs)  ← prevents future bootstrap bugs
  ↓
Phase 2: Eliminate pause() after mutations + retries: 0                    ← deterministic tests
  ↓
Phase 3: Test isolation (IDB reset + Worker cleanup)                       ← no cross-test contamination
  ↓
Phase 4: Pattern docs + lint                                               ← prevent regression
  ↓
Phase 5: Health reporting test suite                                       ← catch infra issues early
  ↓
Phase 6: Test rationalization (merge/drop/restructure)                     ← fewer tests, same confidence
```

-----

## Phase 6: Test Rationalization

The 73 Playwright tests were built one-at-a-time as features landed, each proving "this thing works." But a test suite isn't a changelog — it should answer: **what is the minimum set that gives maximum confidence?**

Currently every test pays a fixed ~2-5s cost (navigate + WASM boot + Automerge init). With 73 tests that's 2-6 minutes of pure bootstrapping overhead before a single assertion runs. Merging tests that share setup into multi-assertion workflows cuts this dramatically.

### Redundancies Found

**1. Select/deselect tested 3+ times across files**

| Test | File | What it checks |
|------|------|----------------|
| `select and deselect via cadCommand` | cad.spec.ts:70 | select returns selectedId, deselect clears it |
| `select via cadCommand sets interaction mode` | cad.spec.ts:283 | select → mode = 'selected' |
| `deselect via cadCommand sets idle mode` | cad.spec.ts:292 | deselect → mode = 'idle' |
| `canvas click selects object` | cad-ui.spec.ts:160 | mouse click → mode = 'selected' |
| `real mouse click on canvas selects object` | cad.spec.ts:347 | identical to above |
| `Escape deselects` | cad-ui.spec.ts:88 | Escape key → idle |
| `Escape after canvas select deselects` | cad-ui.spec.ts:174 | canvas click + Escape → idle |

**Action:** Merge into 2 tests: (1) "cadCommand select/deselect sets mode" and (2) "canvas click selects, Escape deselects". Drop the rest.

**2. Four identical toolbar button tests**

| Test | File | Assertion |
|------|------|-----------|
| `toolbar add-cube button creates object` | cad-ui.spec.ts:29 | count + 1 |
| `toolbar add-sphere button creates object` | cad-ui.spec.ts:35 | count + 1 |
| `toolbar add-cylinder button creates object` | cad-ui.spec.ts:41 | count + 1 |
| `toolbar add-torus button creates object` | cad-ui.spec.ts:47 | count + 1 |

All four do the same thing: click button, check count increased. The risk being tested is "toolbar button wires to cadCommand" — proving it once for any shape proves it for all (they share the same click handler → cadCommand dispatch).

**Action:** Merge into 1 test: "toolbar buttons create objects" that loops through all four shapes in a single browser session.

**3. Export/import tested twice**

| Test | File | Assertion |
|------|------|-----------|
| `export/import preserves UUIDs` | cad.spec.ts:184 | export → clear → import → same IDs |
| `save and load scene` | cad.spec.ts:200 | export → check JSON shape → clear → import → same count |

These test the same round-trip. The second adds a JSON structure check (3 lines).

**Action:** Merge into 1 test: "export/import round-trip preserves UUIDs and structure".

**4. Keyboard undo/redo tested twice**

| Test | File | Pattern |
|------|------|---------|
| `undo and redo via cadCommand` | cad.spec.ts:133 | Ctrl+Z/Ctrl+Shift+Z with `waitForObjectCount` |
| `Ctrl+Z undoes, Ctrl+Shift+Z redoes` | cad-ui.spec.ts:75 | Ctrl+Z/Ctrl+Shift+Z with `pause()` (fragile!) |

The cad-ui version uses the fragile `pause()` pattern and tests the same keyboard wiring.

**Action:** Drop the cad-ui version. The cad.spec version is more thorough (tests undo after multiple ops, not just one).

**5. Trivial tests that add no coverage**

| Test | File | Why redundant |
|------|------|---------------|
| `cadCommand is available on window` | cad.spec.ts:268 | Every test that calls `apiCommand()` proves this. `waitForReady()` checks it explicitly. |
| `default cube has UUID` | cad.spec.ts:26 | Every test that calls `getObjectIds()` proves this. UUID format is checked in "add primitives" test too. |
| `status bar is visible` | cad-ui.spec.ts:212 | One-liner that checks a DOM element exists. Not a behavior — it's a layout detail. |

**Action:** Drop all three.

**6. Sketch tests pay browser cost for pure WASM operations**

All 11 sketch tests call `sceneController.begin_sketch()` etc. directly — they don't use `cadCommand()`, don't test UI, don't test Automerge. They're L1 kernel tests forced through Playwright because WASM needs a browser.

Each one navigates, boots WASM, boots Automerge (which it doesn't use), then runs a single `page.evaluate()`. That's ~3s overhead for ~50ms of actual test logic.

**Action:** Merge sketch tests that share setup into multi-assertion workflows. The 11 tests can become 3:
1. "sketch geometry — points, edges, constraints, solve" (merges: begin_sketch, add_point/edge, add_constraint, sketch_solve, has_active_sketch)
2. "sketch extrude — rectangle, triangle, XZ plane, failure case" (merges: 4 extrude tests)
3. "sketch export/import round-trip + cancel" (merges: export_import, sketch_cancel)

### Proposed Structure After Rationalization

**Before: 73 Playwright tests (50 e2e + 16 ui + 2 sync + 5 docs)**

**After: ~45 Playwright tests (30 e2e + 10 ui + 2 sync + 3 health)**

| File | Before | After | Change |
|------|--------|-------|--------|
| cad.spec.ts | 24 | 16 | Merge select tests, merge export tests, drop trivials |
| sketch.spec.ts | 11 | 3 | Merge into multi-assertion workflows |
| actors.spec.ts | 6 | 6 | Keep (each tests a distinct actor pattern) |
| bim.spec.ts | 1 | 1 | Keep (singleton, tests IFC import) |
| tier.spec.ts | 8 | 8 | Keep (each tests a distinct tier behavior) |
| cad-ui.spec.ts | 16 | 10 | Merge toolbar buttons, drop duplicate undo/select/canvas |
| cross-tab-sync.spec.ts | 2 | 2 | Keep (must run isolated) |
| doc-videos.spec.ts | 5 | 0 | Move to separate `task truck:test:videos` (not part of CI) |
| health.spec.ts (new) | 0 | 3 | Phase 5 health tests |

**Estimated time savings:**
- ~28 fewer browser sessions × ~3s bootstrap each = **~85s saved** (~1.5 min)
- Doc videos excluded from CI = **~60s saved** (they're documentation, not regression tests)
- Total: **~2.5 min faster** while testing the same behaviors

### Merge Rules

When merging tests, follow these rules to preserve coverage:

1. **Every assertion from every dropped test must exist in a surviving test.** Don't just delete — transplant the assertions.
2. **Merged tests should read as a workflow**, not a grab-bag. "Add primitives → translate → boolean → undo" is a natural sequence.
3. **Don't merge across concerns.** A test about selection should not also test export/import just to save a bootstrap.
4. **Keep tests that found real bugs.** The 3 undo tests stay separate — each found a distinct bug (undo after add, undo after boolean, undo after delete). Merging them would weaken the diagnostic signal when one fails.
5. **Doc video tests are not regression tests.** They record .webm files for documentation. They should run on-demand (`task truck:test:videos`), not in CI.

-----

## Existing Code

| File | What | Relevance |
|------|------|-----------|
| [helpers.ts](tests/e2e/helpers.ts) | Shared test utilities | **Phase 1-3** — modify `waitForReady`, document contract, add new waiters, add cleanup |
| [cad.spec.ts](tests/e2e/cad.spec.ts) | Core CAD tests (20+) | **Phase 2** — replace `pause()` with `waitForObjectCount()` |
| [actors.spec.ts](tests/e2e/actors.spec.ts) | Actor hybrid tests | **Phase 2** — replace polling loop with `waitForObjectCount()` |
| [tier.spec.ts](tests/e2e/tier.spec.ts) | Tier tests (8) | **Phase 3** — add model-scoped cleanup to `beforeEach` |
| [playwright.config.ts](tests/playwright.config.ts) | Playwright config | **Phase 2** — set `retries: 0` after pause elimination |
| [state.js](web/gui/state.js) | App init + cadCommand | **Phase 1** — set `window.__appReady` after all init |
| [history.js](web/gui/history.js) | Automerge doc manager | **Phase 1** — participates in readiness signal |

## References

- ADR-0005: Schema-Driven Unified API (cadCommand as single dispatch)
- ADR-0011: Control Plane — State Management as API
- ADR-0013: Lit + Three.js + Passive WASM Interaction (gizmo exception)
- ADR-0025: Bug #9 (waitForReady bootstrap) — the triggering incident
- Playwright best practices: https://playwright.dev/docs/best-practices
