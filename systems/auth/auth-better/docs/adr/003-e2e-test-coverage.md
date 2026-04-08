# ADR-003: E2E Test Coverage

**Status:** In Progress
**Date:** 2026-04-08
**Depends on:** ADR-002

---

## What is tested

| Flow | File | Status |
|------|------|--------|
| sign-up (email+password) | auth.spec.ts | ✅ |
| sign-in (email+password) | auth.spec.ts | ✅ |
| sign-out | auth.spec.ts | ✅ |
| forgot password renders | auth.spec.ts | ✅ |
| reset password renders | auth.spec.ts | ✅ |
| UserButton in nav | auth.spec.ts | ✅ |
| account settings page | account.spec.ts | ✅ |
| account update name | account.spec.ts | ✅ |
| account security page | account.spec.ts | ✅ |
| account nav to security | account.spec.ts | ✅ |
| account sessions list | account.spec.ts | ✅ |
| org list renders | organization.spec.ts | ✅ |
| create org via UI | organization.spec.ts | ✅ |
| org members tab | organization.spec.ts | ✅ |
| org settings page | organization.spec.ts | ✅ |

---

## What needs tests (testable now)

| Plugin/Flow | Why testable | File to add to |
|-------------|-------------|----------------|
| username login | form already has username field | auth.spec.ts |
| multiSession | sign in twice, list sessions | account.spec.ts |
| apiKey | `/account/api-keys` route exists | account.spec.ts |
| anonymous | `authClient.signInAnonymously()` then upgrade | auth.spec.ts |

---

## What is not e2e testable

| Plugin | Reason |
|--------|--------|
| magicLink | URL logged to worker console — would need log capture mid-test |
| emailOTP | Code logged to worker console — same problem |
| twoFactor | Needs programmatic TOTP generation + QR secret capture — brittle |
| passkey | Requires hardware/biometrics |
| bearer / jwt | API-only, no UI |
| admin | API-only, no UI |
| oneTimeToken | API-only, no UI |
