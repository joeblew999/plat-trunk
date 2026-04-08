# ADR-002: Plugin Parity — Backend and Frontend

**Status:** Implemented
**Date:** 2026-04-08
**Depends on:** ADR-001

---

## Source of truth

| Side | File |
|------|------|
| Frontend | `.src/better-auth-ui/src/types/auth-client.ts` |
| Backend | `.src/better-auth/packages/better-auth/src/plugins/` + `packages/api-key/` + `packages/passkey/` |

---

## Plugin parity table

| Plugin | Frontend client | Backend server | `auth-better/worker/` |
|--------|----------------|---------------|----------------------|
| twoFactor | `twoFactorClient` | `twoFactor` | ✅ |
| magicLink | `magicLinkClient` | `magicLink` | ✅ |
| emailOTP | `emailOTPClient` | `emailOTP` | ✅ |
| multiSession | `multiSessionClient` | `multiSession` | ✅ |
| anonymous | `anonymousClient` | `anonymous` | ✅ |
| organization | `organizationClient({ teams: { enabled: true } })` | `organization` | ⚠️ missing teams config |
| username | `usernameClient` | `username` | ❌ add |
| apiKey | `apiKeyClient` (`@better-auth/api-key/client`) | `apiKey` (`@better-auth/api-key`) | ❌ add |
| passkey | `passkeyClient` (`@better-auth/passkey/client`) | `passkey` (`@better-auth/passkey`) | ❌ add |
| oneTap | `oneTapClient` | `oneTap` | ⛔ skip — requires Google clientId |
| genericOAuth | `genericOAuthClient` | `genericOAuth` | ⛔ skip — requires OAuth provider credentials |

---

## What needs doing in `auth-better/worker/`

### Add username plugin
```ts
import { username } from 'better-auth/plugins'

username()
```

### Add apiKey plugin
```bash
bun add @better-auth/api-key
```
```ts
import { apiKey } from '@better-auth/api-key'

apiKey()
```

### Add passkey plugin
```bash
bun add @better-auth/passkey
```
```ts
import { passkey } from '@better-auth/passkey'

passkey()
```

### Fix organization — add teams
```ts
organization({
  teams: {
    enabled: true,
  },
})
```

---

## What to skip and why

| Plugin | Reason |
|--------|--------|
| `oneTap` | Requires Google `clientId` to verify JWT — no credentials in dev |
| `genericOAuth` | Requires at least one OAuth provider with `clientId` + `clientSecret` |

Both can be added in Phase 2 when real credentials exist.

---

## Frontend auth-client.ts for `auth-better/web/`

Copy directly from `.src/better-auth-ui/src/types/auth-client.ts`, removing `oneTapClient` and `genericOAuthClient`:

```ts
import { apiKeyClient } from '@better-auth/api-key/client'
import { passkeyClient } from '@better-auth/passkey/client'
import {
    anonymousClient,
    emailOTPClient,
    magicLinkClient,
    multiSessionClient,
    organizationClient,
    twoFactorClient,
    usernameClient,
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
    plugins: [
        apiKeyClient(),
        passkeyClient(),
        multiSessionClient(),
        anonymousClient(),
        usernameClient(),
        magicLinkClient(),
        emailOTPClient(),
        twoFactorClient(),
        organizationClient({ teams: { enabled: true } }),
    ],
})
```
