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

The Playwright config has `retries: 1`. If a test fails on first attempt but passes on retry, it's reported as passed. This hides flaky tests — exactly the timing bugs this ADR is trying to eliminate. With deterministic waits (Phase 3), retries should be unnecessary.

### Problem 9: `pause()` hidden inside `clickToolbar()` and `clickOutlinerItem()`

**Severity: Medium** — silently infects every UI test.

Both helpers end with `await pause(page)`:

```typescript
// helpers.ts:81-84
export async function clickToolbar(page: Page, testId: string) {
  await page.click(`[data-testid="${testId}"]`);
  await pause(page);  // ← hidden inside helper
}
```

Every test calling `clickToolbar()` inherits the `pause()` anti-pattern without the caller knowing. Phase 3 must fix these helpers too — replace the internal `pause()` with `waitForObjectCount()` or remove it entirely and let the caller wait for the specific condition they care about.

### Problem 10: `waitForReady()` has a trailing sleep

**Severity: Medium** — undermines the readiness contract.

The current `waitForReady()` checks for `sceneController + cadCommand + cadDocManager.handle`, then immediately adds a fixed sleep:

```typescript
await page.waitForTimeout(IS_SLOW ? 1000 : 50);  // ← band-aid after "ready"
```

If the app is truly ready when the conditions are met, this sleep is unnecessary. If it's needed, then the readiness check is incomplete. Phase 1's `__appReady` flag must eliminate this trailing sleep entirely — the flag should only be set when the app is genuinely ready, with no post-ready stabilization needed.

### Problem 11: BIM test reads Datastar signals directly

**Severity: Low** — violates the "assert WASM state, not Datastar" principle.

`bim.spec.ts` lines 33-34 read `_ds.root.bimType` and `_ds.root.bimId` directly from Datastar signals after a `pause()`. This is the exact anti-pattern the ADR identifies as fragile — Datastar signals may not have reconciled yet. BIM metadata should either be queryable from WASM or the test should use a `waitFor*` helper.

### Problem 12: Actors test bypasses `apiCommand()` helper

**Severity: Low** — inconsistency, not a bug.

`actors.spec.ts` line 23 calls `page.evaluate(() => (window as any).cadCommand('clear'))` directly instead of `apiCommand(page, 'clear')`. This loses the `{ source: 'test' }` tag and bypasses the helper that the ADR says is "the ONLY mutation entry point."

The same file also has a hand-rolled 10-iteration polling loop (lines 59-68) with 500ms sleeps to poll the Worker's REST API — essentially a manual `waitFor*` pattern that should be extracted into a reusable helper.

-----

## Decision

> **Reading guide:** Phases are detailed below (some in this section, some in their own `##` sections). See **Sequencing** for execution order and APP/TEST labels showing what each phase changes.

### Phase 1: Readiness contract (single "app ready" signal)

Add a single `window.__appReady` flag that the app sets after ALL init phases complete:

```javascript
// In app init (after WASM + cadCommand + Automerge + tier manager):
window.__appReady = true;
```

Update `waitForReady()` to check this single flag — **with no trailing sleep**:

```typescript
export async function waitForReady(page: Page) {
  await page.waitForFunction(() => (window as any).__appReady === true, { timeout: 30_000 });
  // NO trailing waitForTimeout — if __appReady is true, the app is ready. Period.
}
```

**Why:** One flag, one place to update, no band-aid sleeps. The trailing sleep in the current `waitForReady()` (Problem 10) is eliminated because `__appReady` should only be set when all subsystems — including Automerge doc creation — are genuinely complete.

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

### Phase 3: Eliminate `pause()` after mutations (was Phase 2)

> **Why after Phase 2?** Phase 2 (rationalization) merges 73 tests down to 45. Running this phase on the 45 survivors avoids wasting effort fixing `pause()` in tests that get deleted. Merges are safe with `pause()` still in place — they move the same assertions with the same timing, so no new flakes are introduced.

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

/** Wait for arbitrary WASM state condition */
export async function waitForWasmState(
  page: Page,
  checkFn: () => boolean,  // runs in browser context
  timeoutMs = 5_000,
) {
  // Pass the function body as a string — Playwright serializes it safely
  await page.waitForFunction(checkFn, { timeout: timeoutMs });
}

/** Pure animation delay — only for visual pauses (video recording, etc.) */
export async function animationFrame(page: Page) {
  await page.waitForTimeout(IS_SLOW ? 500 : 50);
}
```

**Fix `clickToolbar()` and `clickOutlinerItem()` (Problem 9):** Remove the embedded `pause()` from both helpers. The caller should wait for the specific condition they expect:

```typescript
export async function clickToolbar(page: Page, testId: string) {
  await page.click(`[data-testid="${testId}"]`);
  // NO pause — caller waits for the specific effect (e.g., waitForObjectCount)
}
```

**`IS_SLOW` strategy:** After Phase 3, `IS_SLOW` should only affect `videoPause()` / `animationFrame()` — delays that are purely visual. It should NOT affect `waitForReady()` (eliminated by `__appReady`) or any `waitFor*` helpers (they poll until a condition is met, so speed doesn't matter). Remove `IS_SLOW` from timeout multipliers in `playwright.config.ts` — polling-based waits are inherently speed-independent.

**After Phase 3, set `retries: 0` in `playwright.config.ts`.** If tests are deterministic, retries are a crutch. Any test that needs a retry is a bug to fix, not a flake to suppress.

### Phase 4: Test isolation — full state reset (was Phase 3)

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

### Phase 7a: Consistent patterns — lint rule + docs (was Phase 4)

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
| Clear scene (actors) | `apiCommand(page, 'clear')` | `page.evaluate(() => cadCommand('clear'))` (bypasses helper) |
| Poll Worker state | `waitForWorkerState(request, modelId, predicate)` (new) | hand-rolled `for` loop with `waitForTimeout(500)` |

### Phase 7b: Test health reporting (was Phase 5)

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
- **Easier to maintain** — 45 Playwright tests with clear purpose vs 73 with overlapping coverage
- **Docs never drift** — screenshots and videos are byproducts of passing tests, not separate artifacts
- **~18 fewer Vitest tests** — drop redundant CAD operation tests that Playwright already covers
- **Prepares for ADR-0024** — clean, deterministic tests + documented completion contract make it safe to swap the dispatch path (Future Work) without debugging test noise

### Negative

- **Migration effort** — every `pause()` call after a mutation needs manual review to determine the right `waitFor*` replacement
- **New helpers needed** — `waitForSelectedId`, `waitForWasmState`, `animationFrame`, `docCapture`, `docPause` add to the helper surface area
- **App-side work for Phase 4** — `?reset=1` support or `DELETE /api/cad/{modelId}` endpoint
- **`retries: 0` will initially surface hidden flakes** — some tests may fail that were previously masked by retry; these are real bugs to fix, not a regression
- **Merge effort requires care** — every assertion from dropped tests must be transplanted to a surviving test, or coverage is lost
- **Doc capture adds complexity to tests** — `docCapture()` and `docPause()` calls in test bodies are noise in fast mode (they're no-ops, but they're visible in the code)

### What this does NOT solve

- **Cloudflare-MCP Vitest tests (6 files in `.src/cloudflare-mcp/`)** — these test the generic Cloudflare MCP framework, not the CAD application. They're orthogonal to this ADR.
- **WebGPU rendering correctness** — visual regression testing (screenshot comparison) is a separate concern
- **Multi-device sync testing** — Automerge sync across devices needs a different setup (two browser contexts + sync server)
- **Performance benchmarks** — timing tests (e.g., "progressive load of 1000 objects in < 2s") need dedicated fixtures, not e2e tests
- **Rust unit tests** — WASM kernel correctness is tested via `cargo test`, orthogonal to this ADR
- **`headless: false` requirement** — WebGPU requires a headed Chrome. CI environments need a display server (Xvfb or similar). This is a deployment constraint, not a test design issue.

-----

## Sequencing

Each phase is marked with what it changes:
- **APP** = changes to application code (state.js, index.html, Worker endpoints)
- **TEST** = changes to test files (helpers.ts, spec files, playwright.config.ts)
- **DOCS** = documentation artifacts only

**Key ordering principle:** Rationalize (merge/drop) tests _before_ fixing timing issues — don't spend effort fixing `pause()` in tests you're about to delete.

```
Phase 1: Readiness contract (__appReady flag)                          APP + TEST
  ↓                     Foundation — all subsequent phases depend on reliable readiness
Phase 2: Test rationalization (73 → 45 Playwright)                     TEST
  ↓                     Reduce test count BEFORE fixing — don't fix doomed tests
Phase 3: Eliminate pause() + retries: 0                                TEST
  ↓                     Fix the 45 survivors, not all 73
Phase 4: Test isolation (?reset=1 + Worker cleanup)                    APP + TEST
  ↓                     Requires DELETE /api/cad/{modelId} endpoint + ?reset=1 param
Phase 5: Unified test + doc capture (delete doc-videos.spec.ts)        TEST
  ↓                     Add docCapture/docPause to rationalized, pause-free tests
Phase 6: Vitest rationalization (32 → ~14)                             TEST
  ↓                     Drop tests that Playwright already covers
Phase 7: Pattern docs + health tests + lint                            DOCS + TEST
                        Document and guard the final state — not an intermediate one
```

**Phases 1-7 are the scope of this ADR.** The unified Hono router (ADR-0024 Phase 3) has major test benefits but is an app architecture change — see **Future Work** below.

-----

## Phase 2: Test Rationalization (was Phase 6)

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
| actors.spec.ts | 6 | 6 | Keep — but fix: use `apiCommand()` helper (Problem 12), extract Worker polling helper |
| bim.spec.ts | 1 | 1 | Keep — but fix: replace Datastar signal reads with WASM query or `waitFor*` (Problem 11) |
| tier.spec.ts | 8 | 8 | Keep — but fix: 5 `pause()` calls + hardcoded `waitForTimeout()` need Phase 3 treatment |
| cad-ui.spec.ts | 16 | 10 | Merge toolbar buttons, drop duplicate undo/select/canvas |
| cross-tab-sync.spec.ts | 2 | 2 | Keep (must run isolated) |
| doc-videos.spec.ts | 5 | 0 | Move to separate `task truck:test:videos` (not part of CI) |
| health.spec.ts (new) | 0 | 3 | Phase 7 health tests |

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

## Phase 5: Unified Test + Doc Capture (was Phase 7)

Currently documentation assets (videos, screenshots, examples) are produced by a **separate** `doc-videos.spec.ts` file that re-implements the same workflows as the real tests — add primitives, translate, boolean subtract, save/load. This means:

- The same workflow is coded twice (once for testing, once for recording)
- The doc videos can drift from the real behavior (they don't assert anything)
- 5 extra browser sessions just to re-do operations that already run in `cad.spec.ts`

**Proposal: Tests ARE the docs. Docs ARE the tests.**

Instead of separate test and demo files, each e2e test produces documentation assets as a byproduct when the `DOCS=1` flag is set:

```typescript
// helpers.ts
export const DOCS_MODE = !!process.env.DOCS;

/** Visual pause — only takes effect in docs mode */
export async function docPause(page: Page, ms = 800) {
  if (DOCS_MODE) await page.waitForTimeout(ms);
}

/** Screenshot at a named point — only in docs mode */
export async function docCapture(page: Page, name: string) {
  if (!DOCS_MODE) return;
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${name}.png`, fullPage: false });
}
```

Then the **same test** does both:

```typescript
test('add primitives via cadCommand return UUIDs', async ({ page }) => {
  // --- Assertions (always run) ---
  const sphere = await apiCommand(page, 'add_sphere', { radius: 0.8 });
  expect(sphere.objectId).toMatch(/^[0-9a-f]{8}-/);
  expect(await getObjectCount(page)).toBe(2);
  await docCapture(page, '02-add-sphere');   // ← screenshot if DOCS=1
  await docPause(page);                       // ← visual pause if DOCS=1

  const cyl = await apiCommand(page, 'add_cylinder', { radius: 0.5, height: 1.0 });
  expect(cyl.objectId).toMatch(/^[0-9a-f]{8}-/);
  expect(await getObjectCount(page)).toBe(3);
  await docCapture(page, '03-add-cylinder');

  // ... more assertions + captures
});
```

**Mapping:** Each doc page maps to a specific test (or sequence of tests):

| Doc page | Hugo path | Source test | Captures |
|----------|-----------|------------|----------|
| Getting Started | docs/user/getting-started.md | `page loads with WebGPU canvas + gizmo interaction` | video + 1 screenshot |
| Creating Shapes | docs/user/creating-shapes.md | `add primitives via cadCommand` | video + 4 screenshots |
| Moving Objects | docs/user/moving-objects.md | `translate object by UUID` | video + 1 screenshot |
| Boolean Ops | docs/user/boolean-operations.md | `boolean subtract via cadCommand` | video + 2 screenshots |
| Save & Load | docs/user/save-load.md | `export/import preserves UUIDs` | video + 1 screenshot |

**Running:**
- `task truck:test:e2e` — fast, no docs, no video
- `task truck:test:docs` — same tests with `DOCS=1 SLOW=1 video=on`, produces all assets
- `doc-videos.spec.ts` is **deleted** — no longer needed

**Benefits:**
- Docs never drift from reality — if the test passes, the video shows working software
- 5 fewer browser sessions
- One place to maintain each workflow
- Screenshots automatically update when the UI changes

**What about the camera orbit/zoom choreography in `getting-started`?** That's the one doc video that does things no test does (mouse drag for orbit, scroll for zoom). This becomes a small `docExtra()` block appended to the gizmo test, gated behind `DOCS_MODE`:

```typescript
if (DOCS_MODE) {
  // Camera choreography for getting-started video
  await page.mouse.move(cx, cy);
  for (let i = 0; i < 20; i++) { /* orbit */ }
  await page.mouse.wheel(0, -200);  // zoom in
  await docPause(page, 500);
}
```

-----

## Phase 6: Vitest Rationalization (was Phase 8)

### Current state

The 32 Vitest tests in `systems/truck/worker/src/index.test.ts` test the Worker HTTP layer in isolation (no browser, no WASM rendering). They use Hono's `app.request()` to test endpoints directly.

### Overlap analysis

| Vitest test block | Overlaps with Playwright? | Verdict |
|---|---|---|
| Health check | Yes — trivial, `actors.spec.ts` hits `/api/health` implicitly | **Drop** |
| CAD Schema endpoint | Partially — Playwright implicitly relies on schema correctness | **Keep** (fast contract check) |
| Schema Contract (ephemeral/readonly flags) | No — Playwright never inspects schema metadata directly | **Keep** (guards MCP tool leakage) |
| CAD Command Execution (queue) | Yes — `actors.spec.ts` tests the exact same endpoints | **Drop** |
| Result Round-Trip | Yes — `actors.spec.ts` tests result retrieval | **Drop** |
| CAD State persistence | Yes — `actors.spec.ts` polls `/api/cad/{modelId}/state` | **Drop** |
| CAD Queue/Pending | Low value — internal endpoints, no external consumer | **Drop** |
| OpenAPI Spec validation | No overlap — unique | **Keep** |
| API Docs page | No overlap — unique but low value | **Drop** |
| MCP Initialize | No overlap — protocol-level | **Keep** |
| MCP Tools List | No overlap — protocol-level | **Keep** |
| MCP Tool Call | No overlap — protocol-level | **Keep** |
| MCP Edge Cases (batch, notifications, 405) | No overlap — protocol-level | **Keep** |
| Model Isolation (queue/state separation) | Yes — Playwright uses unique modelIds per test | **Drop** |

**Proposed: 32 → ~14 tests.** Keep MCP protocol suite + schema contract + OpenAPI. Drop everything that `actors.spec.ts` already exercises through the real stack.

### Why keep any Vitest?

The MCP protocol tests are genuinely valuable and **cannot be replaced by Playwright**:
- They test JSON-RPC 2.0 wire format compliance (batch requests, notifications without `id`, method-not-found errors)
- They verify tool filtering logic (ephemeral + readonly commands excluded from `tools/list`)
- They run in milliseconds (no browser boot) — fast CI feedback on protocol regressions
- They don't need WebGPU, so they run on any CI runner including ARM64

The schema contract tests catch a specific bug class: someone adds a new command in Rust but forgets to mark it `ephemeral: true`, causing it to leak into MCP tools. This is a one-line test that prevents real damage.

-----

## Future Work: Unified Hono Router (ADR-0024 Phase 3)

> **Not in scope for this ADR.** This is an app architecture change (ADR-0024 Phase 3) that has major test benefits. It's documented here to show how the test cleanup prepares for it, but the implementation belongs in ADR-0024.

When ADR-0024 Phase 3 lands, it also enables **two-level readiness** for plugin testing:
- `window.__appReady` = core ready (WASM + cadCommand + Automerge)
- `window.__plugins` = `Set` tracking loaded plugins
- `waitForPlugin(page, 'cad-bim')` = wait for a specific plugin to load on demand

This avoids delaying `__appReady` for optional plugins that load lazily (e.g., cad-bim loads on IFC file drop).

### The forcing function: ADR-0024 Multi-WASM Modules

ADR-0024 splits the Rust monolith into independent WASM plugins (cad-core, cad-bim, cad-mvt, cad-sketch, cad-export). Each plugin generates its own schema (`cad-schema-{name}.json`). With N plugins, the system needs something that can:

1. **Route commands to the correct plugin's `execute()`** — `import_ifc` → cad-bim, `add_cube` → cad-core
2. **Validate params per-plugin** — each schema has different param types
3. **Merge N schemas** into one OpenAPI spec, one MCP `tools/list`, one discovery endpoint
4. **Work identically in both environments** — Worker serves HTTP, browser calls in-process

That something is Hono. The Worker already uses it. ADR-0024 Phase 3 explicitly calls for replacing `BrowserModuleRouter` with the same Hono app running in-process via `app.request()`.

### Why this matters for testing

Today the browser has **no validation** — `cadCommand('add_cube', { size: "oops" })` passes raw JSON to WASM, which returns an opaque "deserialization failed" error. The Worker validates the same call with Zod and returns `{ error: "Expected number, received string" }`.

With one Hono router in both environments:

```
                            ┌── Worker: serves HTTP externally
cad-schema-*.json           │   mountSchema() per plugin → Zod → OpenAPI → MCP
  → mountSchema()     ──────┤
  → Zod validators          │
  → OpenAPI routes          └── Browser: app.request() in-process
                                mountSchema() per plugin → same Zod → same validation
```

- **Same validation**: Invalid params fail with the same error message in both environments
- **Same routing**: `cadCommand()` calls `app.request('/api/cad/.../exec/add_cube')` — same path the Worker uses
- **Same schema merging**: `/api/openapi.json` works locally in the browser, auto-merged from all loaded plugins
- **Local MCP**: Browser could serve `tools/list` locally — every loaded plugin's tools, validated, without a Worker round-trip

### What this replaces

| Today (3 browser routers) | Tomorrow (1 Hono app) |
|---|---|
| `BrowserModuleRouter` (128 lines, single-module pass-through) | `mountSchema(app, prefix, schema)` per plugin |
| Hand-rolled URL regex in `index.html` (20 lines) | `app.get('/model/:id', ...)` |
| Manual `moduleRouter.execute(type, params)` — no validation | `app.request()` — Zod validates before dispatch |

### Implementation strategy

This is **not a new piece of work** — it's ADR-0024 Phase 3 arriving via test cleanup. The steps:

1. **Extract `mountSchema()` from Worker's `mountModule()`** — the portable part (Zod validators + command routing) becomes a shared module. The Worker-only part (SSE, command queue, result callbacks) stays in `mountWorkerRelay()`.

2. **Create `shared/router.ts`** — imported by both Worker and browser:
   ```typescript
   export function createPluginRouter(schemas: Record<string, ModuleSchema>) {
     const app = new OpenAPIHono();
     for (const [prefix, schema] of Object.entries(schemas))
       mountSchema(app, prefix, schema);
     return app;
   }
   ```

3. **Replace `cadCommand()` dispatch** — instead of `moduleRouter.execute()`, call `app.request()`:
   ```javascript
   // Before: raw dispatch, no validation
   const result = moduleRouter.execute(type, params);

   // After: Hono route, Zod validation, correct plugin routing
   const res = await app.request(`/api/cad/${modelId}/exec/${type}`, {
     method: 'POST', body: JSON.stringify(params)
   });
   ```

4. **60fps gizmo escape hatch stays direct** — `cad-viewport.js` calls `plugins.get('cad').execute()` directly, bypassing Hono entirely (same as today). The gizmo path is synchronous, zero-overhead — ADR-0013 requirement.

### Cost/benefit

| | Cost | Benefit |
|---|---|---|
| **Bundle size** | Hono ~14KB + Zod ~14KB gzipped | Unified routing + validation + OpenAPI + MCP |
| **Runtime overhead** | ~0.2ms per command (Hono routing + Zod parse) | Catch type errors before WASM (prevents panics) |
| **Maintenance** | `mountSchema()` is shared code — changes apply everywhere | N plugins just work, no per-plugin browser glue |
| **Migration** | `cadCommand()` calls `app.request()` instead of `moduleRouter.execute()` | `BrowserModuleRouter` deleted (128 lines), URL regex deleted (20 lines) |

### Offline — 100% local operation

The app already supports offline mode via `window.__cadLocalMode` (set by `?local` URL param) and the `set_mode` cadCommand (toggleable via MCP). Today this works by conditionally loading `worker-relay.js` — if local mode, the relay is never imported and all commands go through the in-process `moduleRouter.execute()`.

With the unified Hono router, offline gets **stronger**:

| | Today (offline) | With Hono in browser |
|---|---|---|
| Command dispatch | `moduleRouter.execute()` — no validation | `app.request()` — Zod validates in-process |
| Schema discovery | Hardcoded in `cad-schema.json` | `app.request('/api/openapi.json')` — live from loaded plugins |
| MCP tools | Unavailable offline | `app.request('/mcp')` — full JSON-RPC, local |
| Mode toggle | `set_mode` → sets `__cadLocalMode` flag | Same — but `app.request()` routing doesn't change (always in-process) |
| Error messages | WASM deserialization errors (opaque) | Zod validation errors (clear) |

The key insight: with Hono in the browser, the **online/offline distinction shrinks to just the sync layer**. Command routing, validation, schema discovery, and MCP all work identically. The only difference is whether Automerge syncs to a remote peer or stays local. The `set_mode` MCP tool continues to work — it was never lost (Hono was never in the browser before, so removing it couldn't have broken anything).

### Late binding — dynamic plugin loading

ADR-0024 introduces lazy plugin loading: WASM modules are loaded on demand (e.g., `cad-bim` loads when an IFC file is dropped). This changes `__appReady` semantics (see two-level readiness above) and requires the Hono router to accept plugins at runtime:

```typescript
// Plugin loaded on demand
const bimSchema = await loadPlugin('cad-bim');
mountSchema(app, 'bim', bimSchema);  // ← routes added dynamically

// MCP tools update automatically
// app.request('/mcp', { method: 'POST', body: toolsListRequest })
// → now includes cad-bim tools
```

The unified router handles this naturally — `mountSchema()` is called once per plugin, whenever that plugin loads. For testing:

- **Core tests** run without optional plugins (fast)
- **Plugin tests** load their plugin in `beforeEach`, then exercise commands through the same `apiCommand()` path
- **Late-binding test** verifies that calling a plugin command before loading the plugin returns a clear error (not a WASM panic)

### Relationship to testing

The unified router directly improves test quality:
- **Faster failure**: Invalid params fail at Zod validation, not at WASM deserialization — test errors are immediately clear
- **Same error contract**: Browser and Worker return the same error format, so `actors.spec.ts` tests work identically whether driving via GUI or API
- **Schema contract tests apply everywhere**: The Vitest schema contract tests (Phase 6 "keep") validate the schema that both browser and Worker use
- **Plugin tests are automatic**: When `cad-bim` adds a new command, `mountSchema()` gives it Zod validation + routing + MCP tools in both environments. No separate test setup needed.
- **Local MCP testing**: Tests could call `app.request('/mcp', ...)` in the browser directly — testing the real MCP dispatch path without a Worker round-trip

-----

## Definition of Done

The test cleanup is complete when all of these are true:

| # | Criterion | Phase | Verification |
|---|-----------|-------|-------------|
| 1 | **`__appReady` flag** — `waitForReady()` checks single flag, no trailing `waitForTimeout()` | 1 | `grep waitForTimeout tests/e2e/helpers.ts` returns 0 in `waitForReady` |
| 2 | **Test count ≤ 48** — 45 rationalized Playwright + 3 health tests | 2 | `grep -c "test\(" tests/e2e/*.spec.ts` |
| 3 | **Zero `pause()` after mutations** — only `animationFrame()` survives. `clickToolbar()`/`clickOutlinerItem()` no longer call `pause()`. | 3 | `grep -r 'pause(page)' tests/e2e/*.spec.ts` returns 0 |
| 4 | **`retries: 0`** — all tests pass on first attempt for 5 consecutive runs | 3 | `grep retries tests/playwright.config.ts` → 0 |
| 5 | **`IS_SLOW` only affects visual delays** — `animationFrame()` and `docPause()`. Not readiness, not timeouts. | 3 | `grep IS_SLOW tests/e2e/helpers.ts` → only in `animationFrame` |
| 6 | **All spec files use `apiCommand()`** — no raw `cadCommand()` calls (except gizmo `// ADR-0013` + sketch L1) | 3 | `grep 'cadCommand(' tests/e2e/*.spec.ts` → only marked exceptions |
| 7 | **No Datastar signal assertions without `waitFor*`** — `_ds.root.*` preceded by polling wait, or replaced with WASM queries | 3 | `grep '_ds.root' tests/e2e/*.spec.ts` → 0 outside waitFor* |
| 8 | **Worker cleanup in `afterEach`** — `DELETE /api/cad/{modelId}` called after every test with unique modelId | 4 | Exists in shared `afterEach` in helpers.ts |
| 9 | **`doc-videos.spec.ts` deleted** — doc capture integrated into e2e tests via `docCapture()`/`docPause()` | 5 | File doesn't exist; `DOCS=1` mode produces screenshots |
| 10 | **Vitest ≤ 14 tests** — MCP protocol + schema contract + OpenAPI kept; redundant CAD ops dropped | 6 | `grep -c 'test(' systems/truck/worker/src/index.test.ts` ≤ 14 |
| 11 | **PATTERNS.md exists** — documents canonical patterns table | 7 | File exists at `tests/e2e/PATTERNS.md` |
| 12 | **Health suite passes** — bootstrapping, isolation, completion contract, IDB cleanup all green | 7 | `health.spec.ts` passes |

-----

## Existing Code

| File | What | Phase | Change |
|------|------|-------|--------|
| [helpers.ts](tests/e2e/helpers.ts) | Shared test utilities | **1, 3, 4** | Modify `waitForReady`, remove `pause()` from `clickToolbar`/`clickOutlinerItem`, document contract, add new waiters, add cleanup |
| [cad.spec.ts](tests/e2e/cad.spec.ts) | Core CAD tests (24) | **2, 3** | Merge select/export tests, drop trivials (Phase 2); replace `pause()` with `waitForObjectCount()` (Phase 3) |
| [cad-ui.spec.ts](tests/e2e/cad-ui.spec.ts) | UI interaction tests (16) | **2, 3** | Merge toolbar buttons, drop duplicate undo/select (Phase 2); fix `pause()` in survivors (Phase 3) |
| [sketch.spec.ts](tests/e2e/sketch.spec.ts) | WASM kernel tests (11) | **2** | Merge into 3 multi-assertion workflows |
| [actors.spec.ts](tests/e2e/actors.spec.ts) | Actor hybrid tests (6) | **3** | Replace raw `cadCommand()` with `apiCommand()`, extract Worker polling helper |
| [bim.spec.ts](tests/e2e/bim.spec.ts) | BIM/IFC test (1) | **3** | Replace Datastar signal reads + `pause()` with WASM query or `waitFor*` |
| [tier.spec.ts](tests/e2e/tier.spec.ts) | Tier tests (8) | **3, 4** | Replace 5 `pause()` calls + hardcoded timeouts (Phase 3); add model-scoped cleanup (Phase 4) |
| [cross-tab-sync.spec.ts](tests/e2e/cross-tab-sync.spec.ts) | Cross-tab sync (2) | — | No changes needed — already uses `waitFor*` helpers correctly |
| [doc-videos.spec.ts](tests/e2e/doc-videos.spec.ts) | Doc video recording (5) | **5** | Delete entirely, doc capture moves into e2e tests |
| [playwright.config.ts](tests/playwright.config.ts) | Playwright config | **3** | Set `retries: 0`, remove `IS_SLOW` timeout multipliers |
| [index.test.ts](systems/truck/worker/src/index.test.ts) | Vitest Worker tests (32) | **6** | Drop ~18 redundant CAD operation tests, keep MCP protocol suite |
| [state.js](web/gui/state.js) | App init + cadCommand | **1** | Set `window.__appReady` after all init phases |
| [history.js](web/gui/history.js) | Automerge doc manager | **1** | Participates in readiness signal |
| [index.html](web/gui/index.html) | App entry + init | **1** | Sets `window.__appReady` at end of init sequence |

## References

- ADR-0005: Schema-Driven Unified API (cadCommand as single dispatch)
- ADR-0011: Control Plane — State Management as API
- ADR-0013: Lit + Three.js + Passive WASM Interaction (gizmo exception)
- ADR-0024: Multi-WASM Module Architecture (Phase 3 = unified Hono router — Future Work, not this ADR)
- ADR-0025: Bug #9 (waitForReady bootstrap) — the triggering incident
- Playwright best practices: https://playwright.dev/docs/best-practices
