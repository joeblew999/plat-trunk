# ADR-006: Email Delivery for magicLink and emailOTP

**Status:** In Progress  
**Date:** 2026-04-09  
**Depends on:** ADR-002 (plugins)

---

## Problem

`sendMagicLink` and `sendVerificationOTP` in `worker/src/plugins.ts` log to console only.
No email is delivered in production. magicLink and emailOTP are non-functional for real users.

---

## Research findings

### Cloudflare `send_email` binding (GA)

Part of Cloudflare Email Routing. Sends via `import { EmailMessage } from "cloudflare:email"`.

**Hard limitation:** destination addresses must be pre-verified on the Cloudflare account.
Cannot send to an arbitrary new user. **Not suitable for auth transactional email.**

Suitable only for: alerting/notifications to a fixed known address (e.g. admin@yourdomain.com).

### Cloudflare native transactional email

Does not exist as a GA product. Cloudflare's own docs point to third-party providers.
Source: https://developers.cloudflare.com/workers/tutorials/send-emails-with-resend/

### Conclusion

For magicLink and emailOTP — sending to arbitrary user email addresses — a third-party
transactional email provider is required. Cloudflare recommends **Resend**.

---

## Decision: Resend

**Why Resend:**
- Cloudflare's own tutorial uses Resend
- Simple HTTP API — one `fetch()` call, no SDK required in Workers
- Free tier: 3,000 emails/month, 100/day
- Fast setup: verify domain via DNS, get API key, done
- Used by better-auth's own example projects

**API (no SDK needed in Workers):**
```ts
await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from:    'Auth <noreply@yourdomain.com>',
    to:      [data.email],
    subject: 'Your sign-in link',
    html:    `<a href="${data.url}">Click to sign in</a>`,
    text:    `Sign in: ${data.url}`,
  }),
});
```

---

## Implementation plan

### Step 1 — Set up Resend (MacBook, one-time)

1. Create account at https://resend.com
2. Add domain `ubuntusoftware.net` → verify DNS records (Resend provides SPF/DKIM records)
3. Create API key → add to Doppler as `RESEND_API_KEY`
4. Run `mise run secrets:pull` to pull into `.env`

### Step 2 — Add secret to worker

```bash
# Doppler already has it after Step 1. Wire into worker:
wrangler secret put RESEND_API_KEY --env production
```

For local dev: add to `worker/.dev.vars`:
```
RESEND_API_KEY=re_test_xxxx   # Resend test key (emails go to Resend dashboard, not delivered)
```

### Step 3 — Update Env type in worker/src/auth.ts

```ts
export interface Bindings {
  AUTH_DB: D1Database;
  AUTH_KV: KVNamespace;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  AUTH_BETTER_WEB_PORT?: string;
  RESEND_API_KEY?: string;           // optional — falls back to console.log if absent
  AUTH_EMAIL_FROM?: string;          // e.g. "noreply@ubuntusoftware.net"
  AUTH_EMAIL_FROM_NAME?: string;     // e.g. "Auth"
}
```

### Step 4 — Add vars to wrangler.toml

```toml
[vars]
AUTH_EMAIL_FROM      = "noreply@ubuntusoftware.net"
AUTH_EMAIL_FROM_NAME = "Auth"
# RESEND_API_KEY — set via wrangler secret, NOT in [vars] (never commit secrets)
```

### Step 5 — Update worker/src/plugins.ts

Close over `env` from `getPlugins(env)` — callbacks already have access this way.

```ts
// worker/src/plugins.ts

export function getPlugins(env: Bindings) {

  async function sendEmail(opts: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }) {
    if (!env.RESEND_API_KEY) {
      // Dev fallback — no key present
      console.log('[email] to:', opts.to, 'subject:', opts.subject, 'text:', opts.text);
      return;
    }
    const from = env.AUTH_EMAIL_FROM_NAME
      ? `${env.AUTH_EMAIL_FROM_NAME} <${env.AUTH_EMAIL_FROM}>`
      : env.AUTH_EMAIL_FROM!;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text }),
    });
    if (!res.ok) {
      console.error('[email] Resend error:', res.status, await res.text());
    }
  }

  return [
    magicLink({
      async sendMagicLink(data) {
        await sendEmail({
          to:      data.email,
          subject: 'Your sign-in link',
          text:    `Click to sign in: ${data.url}\n\nExpires in 5 minutes.`,
          html:    `<p><a href="${data.url}">Click here to sign in</a></p><p>Link expires in 5 minutes.</p>`,
        });
      },
    }),

    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        const subject = type === 'sign-in' ? 'Your sign-in code' : 'Your verification code';
        await sendEmail({
          to:      email,
          subject,
          text:    `Your code: ${otp}\n\nExpires in 10 minutes.`,
          html:    `<p>Your code: <strong style="font-size:1.5em;letter-spacing:0.1em">${otp}</strong></p><p>Expires in 10 minutes.</p>`,
        });
      },
    }),

    // ... rest of plugins unchanged
  ];
}
```

### Step 6 — Update worker unit tests (ADR-005)

Existing smoke tests (`POST /email-otp/send-verification-otp → 200`) still pass without
`RESEND_API_KEY` — the fallback logs to console. No test changes needed.

To test with Resend in CI, set `RESEND_API_KEY` to a Resend test key in `.dev.vars`.

---

## Local dev behaviour

| `RESEND_API_KEY` present | Behaviour |
|--------------------------|-----------|
| Not set | Logs to console — URL/OTP visible in wrangler terminal |
| Set to test key | Resend receives email, visible in Resend dashboard, not delivered to inbox |
| Set to live key | Email actually delivered |

Phase 1 CI (pitchfork dev) and Phase 2 CI (wrangler) both work without a key.

---

## What's done

| Item | Status |
|------|--------|
| Research Cloudflare email options | ✅ Done — `send_email` not suitable |
| Decision: Resend | ✅ Done |
| ADR written | ✅ Done |

## Still to do

| Item | Status | Blocker |
|------|--------|---------|
| Create Resend account + verify domain | Pending | MacBook — DNS records on ubuntusoftware.net |
| Add `RESEND_API_KEY` to Doppler | Pending | After Resend setup |
| Update Env type in auth.ts | Pending | |
| Add vars to wrangler.toml | Pending | |
| Update plugins.ts with sendEmail helper | Pending | |
| Set wrangler secret in production | Pending | After Resend setup |
| Deploy + test email delivery end-to-end | Pending | After all above |
