# Stripe Setup Guide

Complete step-by-step setup for plat-trunk billing — from a blank Stripe account
to a working local dev environment with PromptPay + cards.

Two roles covered:

- **Developer** — wiring up local dev, test mode, Stripe CLI, Doppler
- **Operator** — creating products, configuring webhooks, going live

---

## 1. Create Your Stripe Account

**URL:** https://dashboard.stripe.com/register

1. Register with your Ubuntu Software business email (`gerard.webb@ubuntusoftware.net`)
2. Verify your email
3. You land in **test mode** by default — confirm the toggle in the top-left shows `Test mode`

> You stay in test mode throughout all of sections 2–6. Section 7 covers going live.

---

## 2. Complete Business Verification

**URL:** https://dashboard.stripe.com/settings/account

Stripe requires business details before you can accept live payments.
Fill in now so verification runs in the background while you build.

| Field | Value |
|---|---|
| Business type | Company |
| Country | Australia |
| Business name | Ubuntu Software Pty Ltd |
| ACN | *(your ACN)* |
| Business website | https://ubuntusoftware.net |
| Product description | Browser-native CAD platform — subscription SaaS |
| Support email | gerard.webb@ubuntusoftware.net |
| Support phone | +61 449 199 412 |

**Bank account (for payouts):**
**URL:** https://dashboard.stripe.com/settings/payouts

Add your Australian bank account. Payouts settle in AUD.

---

## 3. Get Your API Keys

**URL:** https://dashboard.stripe.com/test/apikeys

You need two keys. Both are in test mode at this stage (`sk_test_...` / `pk_test_...`).

| Key | Starts with | Where it goes |
|---|---|---|
| Secret key | `sk_test_...` | Doppler → `STRIPE_SECRET_KEY` |
| Publishable key | `pk_test_...` | Doppler → `STRIPE_PUBLISHABLE_KEY` |

Copy both. Add them to Doppler now:

**URL:** https://dashboard.doppler.com/workplace/plat-trunk/configs/dev

Add two secrets:
- `STRIPE_SECRET_KEY` = `sk_test_...`
- `STRIPE_PUBLISHABLE_KEY` = `pk_test_...`

Then pull to your local `.env`:

```sh
mise run secrets:pull
```

---

## 4. Create Products and Prices

**URL:** https://dashboard.stripe.com/test/products/create

Create one product per tier. Do **not** create a product for Free — Free is the
default in D1, Stripe never sees Free users until they upgrade.

### Pro Plan

**URL:** https://dashboard.stripe.com/test/products/create

| Field | Value |
|---|---|
| Name | plat-trunk Pro |
| Description | Full CAD tool suite — 10 projects, 100 exports/month, all MCP tools |
| Image | *(optional — add later)* |

After saving, add a price:

| Field | Value |
|---|---|
| Pricing model | Standard pricing |
| Billing period | Monthly |
| Price | 29.00 AUD *(or your chosen amount)* |
| Currency | AUD |
| Price lookup key | `pro_monthly` ← important, used in code |

Click **Add another price** to add annual:

| Field | Value |
|---|---|
| Billing period | Yearly |
| Price | 290.00 AUD *(2 months free)* |
| Price lookup key | `pro_annual` |

Copy the **Price IDs** (`price_...`) from the product page.
Paste them into `lib/billing/shared/schema.ts`:

```ts
pro: {
  stripe_price_id_monthly: 'price_REPLACE_TEST',
  stripe_price_id_annual:  'price_REPLACE_TEST',
  ...
}
```

Then run codegen:

```sh
cd lib/billing && bun run gen
```

### Enterprise Plan

Repeat at: **URL:** https://dashboard.stripe.com/test/products/create

| Field | Value |
|---|---|
| Name | plat-trunk Enterprise |
| Description | Unlimited projects and exports, priority support, all MCP tools, custom integrations |
| Price | Custom / contact sales *(or set a placeholder)* |
| Price lookup key | `enterprise_monthly` |

> Enterprise deals are provisioned manually via the Stripe Dashboard —
> customers do not self-serve this tier. The price can be a placeholder
> until your first enterprise deal.

---

## 5. Configure Webhooks

### Local Dev Webhook (Stripe CLI)

Install the Stripe CLI:

```sh
brew install stripe/stripe-cli/stripe
stripe login
```

Forward webhooks to your local worker:

```sh
stripe listen --forward-to localhost:8789/billing/webhook
```

The CLI prints a **temporary webhook signing secret**: `whsec_...`

> This is **different** from the Dashboard webhook secret.
> Use the CLI-printed value for local `.dev.vars` only.

Add it to Doppler dev config or directly to `.dev.vars`:

```sh
# systems/billing/demo-worker/.dev.vars
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_CLI_VALUE
```

### Staging / Production Webhook

**URL:** https://dashboard.stripe.com/test/webhooks/create

| Field | Value |
|---|---|
| Endpoint URL | `https://truck-cad.gedw99.workers.dev/billing/webhook` |
| Description | plat-trunk billing webhook |
| API version | Latest |

Select these events:

| Event | Why |
|---|---|
| `customer.subscription.created` | User subscribed — set tier in D1 |
| `customer.subscription.updated` | Plan change or renewal — update tier |
| `customer.subscription.deleted` | Cancelled or lapsed — downgrade to Free |
| `invoice.payment_failed` | Card failed — mark status `past_due` |
| `invoice.payment_succeeded` | Renewal confirmed — ensure status `active` |

After saving, click **Reveal** next to the signing secret.

Add to Doppler staging/production configs:

**URL:** https://dashboard.doppler.com/workplace/plat-trunk/configs/staging

- `STRIPE_WEBHOOK_SECRET` = `whsec_...` *(from Dashboard, not CLI)*

Then sync to the CF Worker:

```sh
mise run secrets:set:stripe
```

---

## 6. Verify End-to-End in Test Mode

### Start the billing demo worker

```sh
cd lib/billing/demo-worker
stripe listen --forward-to localhost:8788/billing/webhook &
bunx wrangler dev worker.ts --port 8788
```

Open http://localhost:8788

### Test card payments

Use Stripe's test card numbers — no real card needed:

| Scenario | Card number | Expiry | CVC |
|---|---|---|---|
| Successful payment | `4242 4242 4242 4242` | Any future | Any |
| Payment requires auth | `4000 0025 0000 3155` | Any future | Any |
| Card declined | `4000 0000 0000 9995` | Any future | Any |
| Insufficient funds | `4000 0000 0000 9995` | Any future | Any |

**URL for test card reference:** https://docs.stripe.com/testing#cards

### Test PromptPay (QR)

Stripe provides a simulated PromptPay flow in test mode:

1. At checkout, select **PromptPay**
2. A test QR code renders — do not scan it with a real bank app
3. Instead, click **"Authorize test payment"** in the Stripe test UI
4. Webhook fires → check your worker logs for `subscription.created`
5. SSE should push `{ tier: "pro" }` to the browser

**URL for PromptPay test reference:** https://docs.stripe.com/payments/promptpay/accept-a-payment#test-your-integration

### Verify webhook delivery

**URL:** https://dashboard.stripe.com/test/webhooks

Click your endpoint → **Recent deliveries** — you should see the events
that fired and their response codes. A `200` means your handler received
and verified the signature correctly.

### Check the Stripe CLI output

The CLI terminal should show:

```
--> payment_intent.created      [200]
--> customer.subscription.created [200]
```

If you see `[400]` — signature verification failed. Most likely the
`.dev.vars` has the wrong `STRIPE_WEBHOOK_SECRET` (Dashboard value instead of CLI value).

---

## 7. Go Live Checklist

Only do this when you're ready to accept real money.

**URL:** https://dashboard.stripe.com/settings/account

Complete the business verification if not already done.

### Switch to live mode

Toggle **Live mode** in the Stripe Dashboard top-left.

### Get live API keys

**URL:** https://dashboard.stripe.com/apikeys

| Key | Starts with | Doppler config |
|---|---|---|
| Live secret key | `sk_live_...` | `production` → `STRIPE_SECRET_KEY` |
| Live publishable key | `pk_live_...` | `production` → `STRIPE_PUBLISHABLE_KEY` |

**URL:** https://dashboard.doppler.com/workplace/plat-trunk/configs/production

### Recreate products in live mode

Products created in test mode do **not** carry over to live mode.
Repeat section 4 in live mode.

**URL:** https://dashboard.stripe.com/products/create *(live mode)*

Update `lib/billing/shared/schema.ts` with the live price IDs, regenerate:

```sh
cd lib/billing && bun run gen
```

### Create live webhook

**URL:** https://dashboard.stripe.com/webhooks/create *(live mode)*

Same events as section 5. Endpoint:

```
https://truck-cad.gedw99.workers.dev/billing/webhook
```

Add live webhook secret to Doppler production config, then:

```sh
mise run secrets:set:stripe
```

### Final verification

1. Make a real payment with a real card (refund yourself immediately after)
2. Check **URL:** https://dashboard.stripe.com/payments — confirm it appears
3. Check D1 — confirm `subscription_tier` updated in your users table
4. Check **URL:** https://dashboard.stripe.com/webhooks — confirm `200` delivery

---

## 8. Ongoing Operations

### Customer Portal (post-launch)

Allow customers to self-serve cancel, upgrade, and update card details
without contacting you.

**URL:** https://dashboard.stripe.com/settings/billing/portal

Enable and configure. Then expose via:

```sh
POST /billing/portal  # creates a portal session, returns redirect URL
```

### Viewing payments

**URL:** https://dashboard.stripe.com/payments

All charges, refunds, and disputes. Exportable as CSV.

### Viewing subscriptions

**URL:** https://dashboard.stripe.com/subscriptions

Active, cancelled, and past-due subscriptions. You can manually
cancel, pause, or change tier from here — useful for enterprise provisioning.

### Issuing a refund

**URL:** https://dashboard.stripe.com/payments → find the charge → **Refund**

> PromptPay refunds are not automatic. You must collect the customer's
> bank account number (Stripe emails them automatically) before the refund
> can be processed. Allow 5–10 business days.

### Tax (when VAT obligations materialise)

**URL:** https://dashboard.stripe.com/settings/tax

Stripe Tax automates VAT calculation and collection globally.
Enable when you hit the AU GST threshold (AUD 75,000/year) or expand
into EU/UK markets. Not needed at launch.

### Rotating secrets

```sh
mise run secrets:rotate:stripe
```

This prints the exact steps — rotate at Stripe, update Doppler, sync to CF.
