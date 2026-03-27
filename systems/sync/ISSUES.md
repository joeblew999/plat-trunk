# Upstream Issues to File

## 1. partysession — published but empty

**Repo:** `cloudflare/partykit`
**Package:** `partysession@0.0.4`

The package is published to npm but has no code — `dist/` is empty. Only contains `package.json` and `README.md`.

```bash
npm info partysession
# published, but:
ls node_modules/partysession/dist/
# empty
```

**Expected:** Per-user Durable Object class for session/user state management.

---

## 2. partywhen — Scheduler crashes in miniflare local dev

**Repo:** `cloudflare/partykit`
**Package:** `partywhen@0.1.4`

The `Scheduler` class uses `this.ctx.storage.sql.exec()` in the constructor via `blockConcurrencyWhile`. This crashes in miniflare/wrangler local dev:

```
Error: Internal Server Error
```

The SQL table creation runs before the DO is fully initialized in miniflare.

**Reproduction:**
```typescript
import { Scheduler } from 'partywhen';
export { Scheduler };
// wrangler.toml: { name = "SCHEDULER", class_name = "Scheduler" }
// npx wrangler dev
// curl http://localhost:1999/parties/scheduler/test → 500
```

**Expected:** Scheduler should work in local dev with `wrangler dev`.

---

## 3. partysub — client not implemented

**Repo:** `cloudflare/partykit`
**Package:** `partysub@2.0.2`

The server (`partysub/server`) works. The client (`partysub/client`) is a stub:

```javascript
// node_modules/partysub/dist/client/index.js
console.error("To be implemented");
export {  };
```

**Expected:** Client-side topic subscription API matching the server.

---

## 4. automerge-repo — FinalizationRegistry in CF Workers

**Repo:** `automerge/automerge-repo`
**Package:** `@automerge/automerge-repo@2.5.4`

`automerge-repo` uses `FinalizationRegistry` at module scope. This is unavailable in Cloudflare Workers local dev (miniflare/workerd). Requires a no-op polyfill loaded before any imports:

```typescript
// Must run BEFORE importing automerge-repo
if (typeof globalThis.FinalizationRegistry === 'undefined') {
  globalThis.FinalizationRegistry = class { register() {} unregister() {} };
}
```

Works fine in deployed CF Workers (production workerd has FinalizationRegistry).

**Expected:** Graceful fallback or conditional use of FinalizationRegistry.
