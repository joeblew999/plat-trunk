# E2E Test Patterns (ADR-0026)

## Completion Contract

When `apiCommand()` returns:
- **Guaranteed**: WASM state updated (`object_count()`, `object_ids()`, etc.)
- **NOT guaranteed**: Automerge recording, Datastar reconcile, Lit re-render, SSE push, tier manager reaction, IndexedDB blob write

## Canonical Patterns

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
| Visual delay only | `animationFrame(page)` | `pause(page)` |
| Doc screenshots | `docCapture(page, 'name')` (DOCS mode only) | separate doc-videos.spec.ts |

## Helpers

| Helper | Purpose | Returns |
|--------|---------|---------|
| `waitForReady(page)` | Wait for `__appReady` flag (all subsystems) | void |
| `apiCommand(page, type, params)` | Execute cadCommand via page | result object |
| `getObjectCount(page)` | Query WASM `object_count()` | number |
| `getObjectIds(page)` | Query WASM `object_ids()` | string[] |
| `waitForObjectCount(page, N)` | Poll until WASM count matches | number |
| `waitForSelectedId(page, id)` | Poll until WASM selection matches | void |
| `clickToolbar(page, testId)` | Click toolbar button (no implicit wait) | void |
| `clickOutlinerItem(page, oid)` | Click outliner item (no implicit wait) | void |
| `animationFrame(page)` | Pure visual delay (video/slow mode) | void |
| `docCapture(page, name)` | Screenshot in DOCS mode only | void |
| `docPause(page, ms)` | Visual pause in DOCS mode only | void |

## Rules

1. **Every interactive HTML element** must have a `data-testid` attribute
2. **No Datastar signal assertions** without a `waitFor*` helper (or replaced with WASM query)
3. **No raw `cadCommand()` calls** in tests — use `apiCommand()` (except gizmo `// ADR-0013` and sketch L1)
4. **`clickToolbar()` and `clickOutlinerItem()` have no implicit pause** — caller waits for the specific effect
5. **`IS_SLOW` only affects `animationFrame()`** — not readiness, not timeouts
6. **`retries: 0`** — every test must pass on first attempt
