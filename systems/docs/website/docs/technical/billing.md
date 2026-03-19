# Billing & Payments

plat-trunk uses **Stripe** for payment processing. Subscription tiers gate
access to MCP tools — both human UI and AI agent paths check the same
entitlement model.

## Tiers

| Tier | Tools | Projects | Exports/month |
|---|---|---|---|
| Free | Basic geometry (sketch, view) | 1 | 0 |
| Pro | All tools | 10 | 100 |
| Enterprise | All tools | Unlimited | Unlimited |

## Payment Methods

- **Cards** — Visa, Mastercard (global)
- **PromptPay** — QR code scan via Thai bank app (Thailand)

Stripe's Payment Element surfaces the right method automatically based
on the user's locale. No custom payment UI required.

## How It Works

```
User clicks Upgrade
  → POST /billing/checkout  (creates Stripe Checkout Session)
    → Stripe-hosted checkout (card or PromptPay QR)
      → Stripe webhook → D1 tier updated
        → Datastar SSE push → tool palette unlocks in real time
```

The tool palette expands the instant payment confirms — no page reload.

## Real-Time Unlock

Payment confirmation fires a Stripe webhook to the CF Worker.
The worker updates D1 and pushes a Datastar SSE signal:

```json
{ "billing_tier": "pro" }
```

The browser receives this signal and immediately shows the full tool set.
There is no polling and no page reload required.

## MCP Tool Gating

AI agents connecting via MCP are subject to the same tier gates as the
human UI. A gated tool returns:

```json
{ "code": "TIER_REQUIRED", "required": "pro" }
```

The agent surfaces this to the human user. Agents cannot trigger payments —
payment always requires a human on the Stripe-hosted checkout page.

## Architecture

See [ADR-0021](https://github.com/joeblew999/plat-trunk/blob/main/docs/adr/0021-billing-stripe-promptpay.md)
for the full architecture decision record including use cases, data ownership,
and implementation order.

## Developer Setup

For step-by-step Stripe account and local dev setup, see the billing library guide:

→ [Billing — Stripe Setup Guide](/libs/billing/stripe-setup)

Covers:
- Creating your Stripe account and completing business verification
- Getting API keys and adding to Doppler
- Creating Products and Prices with correct lookup keys
- Configuring webhooks (local Stripe CLI + staging/production Dashboard)
- Test mode verification with test cards and simulated PromptPay
- Go-live checklist
- Ongoing operations (refunds, customer portal, tax, secret rotation)
