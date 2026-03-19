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

## Use Cases

### UC-1: Individual Designer — Free to Pro (e.g. Max Kusterman)

Max is an industrial designer using Fusion 360 / Siemens NX. He finds plat-trunk
via the Show HN post, signs up free, and tries the sketch tools.

```
1. Signs up → lands on Free tier automatically (no Stripe interaction)
2. Hits a gated tool (e.g. boolean operations, export) → UI shows upgrade prompt
3. Clicks "Upgrade to Pro" → POST /billing/checkout → redirected to Stripe Checkout
4. Pays by card (Visa/Mastercard) — takes ~30 seconds
5. Stripe fires webhook → D1 updated → Datastar SSE pushes tier: "pro"
6. Tool palette unlocks in real time — no page reload
7. Monthly invoice emailed automatically by Stripe Billing
8. Can self-serve cancel via Customer Portal (post-launch)
```

**What Max sees:** Plan selector page, Stripe-hosted checkout (his card details
never touch plat-trunk servers), then the tool palette simply expands.

---

### UC-2: Thai User — PromptPay QR

A Thai architect discovers plat-trunk, wants to pay in THB without a card.

```
1. Lands on checkout → Stripe Payment Element detects TH locale
2. PromptPay option surfaces automatically — no extra code on our side
3. Stripe renders a QR code on the checkout page
4. User opens their Thai bank app (Kasikorn, SCB, Bangkok Bank, etc.)
5. Scans QR → bank app shows amount + "STRIPE PAYMENTS (THAILAND) LTD"
6. Authenticates with PIN or biometric — entirely inside their bank app
7. Stripe fires webhook → same flow as UC-1 from step 5 onwards
```

**Our UI does nothing for steps 4–6.** The bank app owns that experience entirely.

**Known limitation:** Merchant name on the bank app is "STRIPE PAYMENTS (THAILAND) LTD"
not plat-trunk. This is a Stripe constraint — PromptPay does not support custom
statement descriptors.

---

### UC-3: RICOS Partnership — Enterprise Tier

RICOS Co. Ltd (Fukumitsu-san, Tanimura-san) are the Truck kernel authors.
Their use case is enterprise: multiple seats, FEA pipeline integration, no hard
tool limits, priority support.

```
1. Enterprise deal negotiated offline
2. Stripe subscription created manually via Dashboard (or API) — not self-serve
3. stripe_customer_id stored against their organisation user record in D1
4. All RICOS users under that org inherit the enterprise tier via D1 lookup
5. All MCP tools unlocked: geometry authoring, IFC integration, MVT export,
   FEA solver pipeline, assembly hierarchy ops
6. Invoice issued monthly to RICOS accounts (JPY or USD)
```

**No self-serve checkout for enterprise.** The tier is provisioned manually
and billed via Stripe Invoicing. This is standard practice — enterprise pricing
is always negotiated, not listed.

---

### UC-4: AI Agent — MCP Tool Gate

An AI agent (Claude Code, Cursor, or any MCP client) connects to plat-trunk's
MCP server and attempts to call CAD tools on behalf of a user.

```
1. Agent connects to MCP server, presents user session token
2. Agent calls cadCommand("boolean_subtract", { solidA, solidB })
3. Tool dispatch calls isToolAllowed("boolean_subtract", userTier)
4. If Free → returns MCP error: { code: "TIER_REQUIRED", required: "pro" }
5. If Pro/Enterprise → executes, returns result
```

**The agent cannot trigger a payment.** Payment always requires a human
in the loop on the Stripe-hosted checkout page. The gate either allows
or denies — the agent is responsible for surfacing the upgrade message
to the human user.

**Why this matters:** without gating at the tool dispatch layer, a Pro user
could share their MCP credentials and an agent could use Pro tools on behalf
of Free accounts. The gate fires on every call regardless of who initiated it.

---

### UC-5: Subscription Lapse — Downgrade

A Pro user's card fails, or they cancel. Stripe fires `customer.subscription.deleted`.

```
1. Stripe fires webhook → subscription.deleted event
2. D1 updated: subscription_tier = "free", subscription_status = "inactive"
3. Datastar SSE pushes tier: "free" if user is currently active in browser
4. Tool palette shrinks to Free set — gated tools show upgrade prompt again
5. User's existing geometry data is untouched — data is never deleted on downgrade
6. Pro-only exports (if any) are blocked until resubscription
```

**Data is never deleted on downgrade.** A user who resubscribes gets
everything back immediately.

---

### UC-6: Webhook Replay / Recovery

Stripe guarantees webhook delivery with retries. If our worker is down briefly,
Stripe retries for up to 72 hours. When the worker recovers, the event arrives
and D1 is updated correctly. No special recovery code needed on our side.

If D1 gets out of sync with Stripe (unlikely but possible), the source of truth
is **Stripe**. The `stripe.subscriptions.retrieve(stripeCustomerId)` call
can always be used to reconcile D1 against Stripe's state.

---

## Who Holds What

This section is the definitive answer to "where does X live?"

### Stripe Holds (permanent, queryable via API or Dashboard)

| Data | Where in Stripe |
|---|---|
| Customer name, email, country | Customer object |
| Card / bank details (tokenised) | PaymentMethod object — **we never see raw card numbers** |
| Every charge, amount, currency, timestamp | Charge / PaymentIntent objects |
| Subscription status, tier, renewal date | Subscription object |
| Invoices and receipts (PDF) | Invoice objects — emailed automatically |
| Refund records | Refund objects |
| Product names and descriptions | Product objects |
| Price IDs, amounts, currencies | Price objects |
| Webhook event log (72hr) | Stripe Dashboard → Developers → Webhooks |

**Stripe is the source of truth for all payment and financial data.**
Never replicate this into D1 — just query Stripe when needed.

---

### D1 Holds (plat-trunk's operational state)

| Data | Table / Column |
|---|---|
| Foreign key link to Stripe | `users.stripe_customer_id` |
| Current tier (free/pro/enterprise) | `users.subscription_tier` |
| Subscription status (active/inactive) | `users.subscription_status` |
| Payment event log (foreign keys only) | `payments` table |

**D1 is the source of truth for access control decisions.**
Every MCP gate check and UI feature flag reads from D1 — not from Stripe.
This keeps latency low (D1 is local to the CF Worker) and means Stripe
being temporarily unreachable does not break the product.

D1 is kept in sync by the webhook handler. It is a **derived view** of
Stripe state, not an independent ledger.

---

### Browser Holds (ephemeral, in-memory via Datastar signals)

| Data | Source |
|---|---|
| Current tier (for UI rendering) | SSE push from worker on login + on change |
| Tool palette visibility state | Derived from tier signal |
| Stripe publishable key | Injected by worker into page HTML — not secret |

**The browser never holds:** card details, customer IDs, subscription IDs,
or any Stripe secret keys. The publishable key is safe to expose — it is
design intentionally public and can only be used to tokenise payment details
on Stripe's servers.

---

### plat-trunk Holds (source code + config)

| Data | Location |
|---|---|
| Tier definitions | `lib/billing/shared/schema.ts` |
| Stripe price IDs | `lib/billing/shared/schema.ts` (post-Dashboard creation) |
| Stripe secret keys | Wrangler secrets — never in source, never in git |
| Webhook signing secret | Wrangler secrets |
| Generated types / validators / gates | `lib/billing/shared/generated/` — in git, regenerated from schema |

---

### Nobody Holds

| Data | Why |
|---|---|
| Raw card numbers (PAN) | Stripe handles PCI compliance — we never touch them |
| Bank account details | Same — Stripe's tokenisation layer |
| Thai national ID numbers | PromptPay links phone/ID to bank — this lives entirely in the Thai banking system, not in Stripe or plat-trunk |

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
