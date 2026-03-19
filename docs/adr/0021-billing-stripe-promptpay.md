# ADR-0021: Billing — Stripe + PromptPay, Codegen-Driven Tier Gates

**Status:** Proposed
**Date:** 2026-03-19
**Author:** Gerard Webb
**Depends on:** ADR-0004 (WASM boundary contracts), ADR-0008 (sync architecture), ADR-0009 (observability)

---

## Context

plat-trunk needs a payment layer before the planned Show HN launch. Requirements:

- Accept payments globally (cards) and locally in Thailand (QR scan via PromptPay)
- Gate MCP tool access by subscription tier — the primary monetisation surface
- Real-time UI response when payment confirms — no reload, no polling
- Minimal code: leverage existing Hono + D1 + Datastar SSE stack
- Single source of truth for tier definitions — consistent with `lib/observe` codegen pattern

**PromptPay** is Thailand's government-backed instant payment rail. Users open their
bank app, scan a QR code, authenticate, and confirm. Stripe surfaces this automatically
via the Payment Element for Thai users. The QR is rendered by Stripe — no custom
payment UI required.

**MCP tool gating** is the natural monetisation surface. plat-trunk exposes 29–52+
MCP tools for AI agent geometry authoring. Tier gating at the tool dispatch layer
means both human UI and AI agents are subject to the same entitlement model without
duplicating logic.

---

## Decision

### Payment Provider

**Stripe**, registered under Ubuntu Software Pty Ltd (Australian entity). Reasons:

- Native PromptPay support — Thai users scan QR, no extra integration work
- Stripe Payment Element auto-surfaces PromptPay for TH users, cards for all others
- Single integration covers all markets
- CF Workers native SDK support — `stripe-node` works without shims
- Billing, Invoicing, Customer Portal included — no build required

### Folder Structure

Mirrors `lib/observe` exactly: schema drives codegen, demos are standalone CF Workers,
`dev/` holds codegen scripts, `shared/` holds everything imported by both worker and browser.

```
lib/
  billing/
    package.json           ← scripts: gen, check, dev:demo, test, deploy:demo
    mise.toml              ← toolchain pins matching lib/observe
    index.ts               ← public API re-exports

    shared/                ← imported by worker AND browser, no CF-specific deps
      schema.ts            ← source of truth: tiers, features, limits, stripe price IDs
      types.ts             ← Tier enum, SubscriptionStatus (generated from schema)
      zod.ts               ← Zod validators for Stripe webhook payloads (generated)
      api-contract.ts      ← Hono route types: checkout, portal, webhook (generated)
      mcp-gates.ts         ← per-tier allowed MCP tool list (generated)
      tsconfig.json

    dev/                   ← codegen scripts, run via `bun dev/gen-*.ts`
      gen-types.ts
      gen-zod.ts
      gen-mcp-gates.ts
      gen-api-contract.ts
      gen.ts               ← runs all of the above

    demo-worker/           ← standalone CF Worker: full billing flow in test mode
      worker.ts            ← Hono app with /billing/* routes + inline browser UI
      wrangler.toml        ← CF observability enabled, D1 binding for test DB
      .dev.vars.example    ← STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLISHABLE_KEY

    tests/
      integration.test.ts  ← webhook handler, tier gate, D1 writes
      e2e.spec.ts          ← Playwright: full checkout → QR scan simulation → SSE unlock

systems/
  billing/
    stripe-webhook.ts      ← Hono POST /webhook handler (worker only)
    subscription.ts        ← D1 read/write helpers (worker only)
```

`lib/billing/shared/` is imported by worker and browser alike.
`systems/billing/` is worker-only — never touches the browser.

### lib/observe Dependency

`lib/billing` imports `lib/observe` for all logging. Every billing event —
checkout session created, webhook received, tier updated, tool gate denied —
is emitted as a structured log via the existing `pt-log` infrastructure.

This means billing events flow into the same CF observability stack
(Workers Logs, Logpush, OTLP) as the rest of plat-trunk. No separate
billing log sink to maintain.

```typescript
// systems/billing/stripe-webhook.ts
import { setupLog } from '../../lib/observe/setup'

const { createLogger } = setupLog(app, 'billing')
const billing = createLogger('stripe')

// inside webhook handler:
billing.info('subscription.created', { userId, tier, stripeCustomerId })
billing.warn('subscription.deleted', { userId, previousTier })
```

### Demo Worker

`lib/billing/demo-worker/` is a self-contained CF Worker that exercises
the full billing flow against Stripe test mode:

- `GET /`                   — browser UI: plan selector + payment button + SSE status panel
- `POST /billing/checkout`  — creates Stripe Checkout Session, returns URL
- `POST /billing/webhook`   — handles Stripe events, writes to local D1, fires SSE
- `GET  /billing/status`    — SSE stream: pushes tier update when webhook fires
- `GET  /billing/tier`      — returns current tier for a user (D1 read)

The browser UI shows the PromptPay QR (rendered by Stripe Checkout),
then listens on the SSE stream and updates a tier indicator in real time
when Stripe fires the test webhook. This is the exact same pattern as
`lib/observe/demo1/` — run it, poke it, verify the chain works end to end
before wiring into the main truck-cad worker.

### Tier Schema (source of truth)

```typescript
// lib/billing/schema.ts
export const BillingSchema = {
  tiers: {
    free: {
      stripe_price_id: null,
      limits: { projects: 1, exports: 0 },
      mcp_tools: ["sketch_create", "view_model", "get_metadata"],
    },
    pro: {
      stripe_price_id: "price_xxx",   // set after Stripe Dashboard creation
      limits: { projects: 10, exports: 100 },
      mcp_tools: ["*"],               // all tools
    },
    enterprise: {
      stripe_price_id: "price_yyy",
      limits: { projects: -1, exports: -1 },
      mcp_tools: ["*"],
    },
  },
} as const
```

This is the only place tiers are defined. Everything else is derived.

### D1 Schema Addition

Two columns added to the existing `users` table:

```sql
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN subscription_tier  TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'inactive';
```

A separate `payments` table stores foreign keys only — Stripe holds the full record:

```sql
CREATE TABLE payments (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(id),
  stripe_payment_intent TEXT NOT NULL,
  tier                  TEXT NOT NULL,
  paid_at               INTEGER NOT NULL   -- unix epoch
);
```

### Payment Flow

```
Browser (Lit + Datastar)
  → POST /billing/checkout  (Hono, creates Stripe Checkout Session)
    → redirect to Stripe-hosted checkout
      → user pays (card) or scans QR (PromptPay)
        → Stripe webhook POST /billing/webhook
          → verify signature (constructEventAsync)
            → D1 update: subscription_tier, subscription_status
              → Datastar SSE push: { tier: "pro" }
                → browser tool palette unlocks in real time
```

### Webhook Handler (systems/billing/stripe-webhook.ts)

Handles two events only to start:

| Event | Action |
|---|---|
| `customer.subscription.created` | Set tier = pro/enterprise, status = active |
| `customer.subscription.deleted` | Set tier = free, status = inactive |

Signature verification uses `constructEventAsync` (required for CF Workers async runtime).
Raw body must be read via `context.req.text()` before any JSON middleware.

### MCP Tool Gate (lib/billing/generated/mcp-gates.ts)

Generated from schema. Single function imported by `cadCommand()` dispatch:

```typescript
export function isToolAllowed(tool: string, tier: Tier): boolean {
  const allowed = MCP_GATES[tier]
  return allowed.includes("*") || allowed.includes(tool)
}
```

Called at the MCP tool dispatch boundary — one check, no duplication between
human UI and AI agent paths.

### Stripe Secrets (CF Workers)

Stored as Wrangler secrets, never in source:

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PUBLISHABLE_KEY   ← exposed to browser via worker env
```

---

## Implementation Order

1. **`lib/billing/schema.ts`** — define tiers and Stripe price ID placeholders
2. **`lib/billing/codegen.ts`** — generate types, zod, mcp-gates
3. **D1 migration** — add columns to users, create payments table
4. **`systems/billing/stripe-webhook.ts`** — Hono webhook handler, two events
5. **`systems/billing/subscription.ts`** — D1 helpers (read tier, write tier)
6. **Checkout session route** — `POST /billing/checkout` creates Stripe session, returns URL
7. **MCP gate** — wire `isToolAllowed()` into `cadCommand()` dispatch
8. **Datastar SSE signal** — push tier update on webhook success
9. **Browser tool palette** — reads tier signal, shows/hides tool groups
10. **Stripe Dashboard** — create Products and Prices, paste IDs into schema.ts, regenerate

---

## Deferred

- Customer Portal (self-service cancel/upgrade) — post-launch
- Annual pricing — post-launch
- Usage-based billing for heavy compute ops — post-launch
- Stripe Tax automation — when VAT obligations materialise
- Thai entity (Stripe TH account) — if Thai market traction justifies it

---

## Consequences

**Positive:**
- One integration covers cards (global) and PromptPay QR (Thailand)
- Tier definition in one file — drift between D1, UI, and MCP gates is impossible
- Real-time unlock via existing Datastar SSE — no new infrastructure
- Stripe holds all payment records — D1 stores foreign keys only
- Pattern is generic enough to extract as open-source template post-launch

**Negative:**
- PromptPay refunds must be issued outside Stripe (cash / store credit)
- Merchant name on Thai bank apps shows "STRIPE PAYMENTS (THAILAND) LTD" not plat-trunk
- Stripe Australia account may not surface PromptPay — verify before launch, Thai entity may be needed
