# ADR-006: Cloudflare Email Service for magicLink and emailOTP

**Status:** In Progress  
**Date:** 2026-04-09  
**Depends on:** ADR-002 (plugins)

---

## Problem

`sendMagicLink` and `sendVerificationOTP` in `worker/src/plugins.ts` log to console only.
No email is delivered in production. magicLink and emailOTP are non-functional for real users.

---

## Decision: Cloudflare Email Service (`send_email` binding)

Native CF Workers binding — no external API keys, no secrets management, no third-party
dependency. CF handles SPF/DKIM/DMARC DNS records automatically.

Private beta launched September 2025. Access may require enabling via CF dashboard.

**Binding (wrangler.toml):**
```toml
[[send_email]]
name = "SEND_EMAIL"
```

**API:**
```ts
await env.SEND_EMAIL.send({
  to:      [{ email: "user@example.com" }],
  from:    { email: "noreply@yourdomain.com" },
  subject: "Your sign-in link",
  text:    "Click here: https://...",
  html:    "<a href='https://...'>Sign in</a>",
});
```

No `cloudflare:email` import, no `EmailMessage` constructor, no `mimetext`, no API key.

**Local dev:** `wrangler dev` emulates email sending locally — no emails actually sent,
visible in wrangler terminal output. Full user journey testable without external tools.

---

## Prerequisites (check dashboard first)

1. **Email Routing enabled** on `ubuntusoftware.net`  
   Dashboard → ubuntusoftware.net → Email → Routing → Enable

2. **Email Service private beta access**  
   Dashboard → Workers & Pages → Email → check if binding is available  
   If not: apply for access (paid account may already have it)

3. **Verified sender address**  
   Add `noreply@ubuntusoftware.net` as a verified sender in Email settings

CF automatically adds SPF/DKIM/DMARC DNS records when Email Routing is enabled.

---

## Implementation plan

### Step 1 — wrangler.toml

Add binding to `[vars]` section and production env. Also add `AUTH_EMAIL_FROM` var:

```toml
[vars]
AUTH_EMAIL_FROM      = "noreply@ubuntusoftware.net"
AUTH_EMAIL_FROM_NAME = "Auth"

[[send_email]]
name = "SEND_EMAIL"

[env.production.vars]
AUTH_EMAIL_FROM      = "noreply@ubuntusoftware.net"
AUTH_EMAIL_FROM_NAME = "Auth"

[[env.production.send_email]]
name = "SEND_EMAIL"
```

### Step 2 — Env type in worker/src/auth.ts

```ts
export interface Bindings {
  AUTH_DB: D1Database;
  AUTH_KV: KVNamespace;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  AUTH_BETTER_WEB_PORT?: string;
  AUTH_EMAIL_FROM?: string;
  AUTH_EMAIL_FROM_NAME?: string;
  SEND_EMAIL?: {
    send(msg: {
      to:      { email: string }[];
      from:    { email: string; name?: string };
      subject: string;
      text:    string;
      html?:   string;
    }): Promise<void>;
  };
}
```

`SEND_EMAIL` is optional — if the binding is absent (local dev without wrangler, Phase 1 CI)
the code falls back to console.log.

### Step 3 — worker/src/plugins.ts

Close over `env` from `getPlugins(env)`. Add a shared `sendEmail` helper:

```ts
export function getPlugins(env: Bindings) {

  async function sendEmail(to: string, subject: string, text: string, html: string) {
    if (!env.SEND_EMAIL) {
      console.log('[email] fallback — to:', to, 'subject:', subject, '\n', text);
      return;
    }
    await env.SEND_EMAIL.send({
      to:      [{ email: to }],
      from:    { email: env.AUTH_EMAIL_FROM!, name: env.AUTH_EMAIL_FROM_NAME },
      subject,
      text,
      html,
    });
  }

  return [
    magicLink({
      async sendMagicLink(data) {
        await sendEmail(
          data.email,
          'Your sign-in link',
          `Click to sign in: ${data.url}\n\nExpires in 5 minutes.`,
          `<p><a href="${data.url}">Click here to sign in</a></p><p>Link expires in 5 minutes.</p>`,
        );
      },
    }),

    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        const subject = type === 'sign-in' ? 'Your sign-in code' : 'Your verification code';
        await sendEmail(
          email,
          subject,
          `Your code: ${otp}\n\nExpires in 10 minutes.`,
          `<p>Your code: <strong style="font-size:1.5em;letter-spacing:0.1em">${otp}</strong></p><p>Expires in 10 minutes.</p>`,
        );
      },
    }),

    // ... rest of plugins unchanged
  ];
}
```

---

## CI behaviour by phase

| Phase | `SEND_EMAIL` binding | Behaviour |
|-------|---------------------|-----------|
| Phase 1 (pitchfork dev) | absent | console.log fallback — OTP/URL visible in terminal |
| Phase 2 (wrangler dev) | present (local emulation) | wrangler writes email to temp `.eml`, visible in terminal |
| Phase 3 (production) | present (live CF) | Email actually delivered |

---

## What's done

| Item | Status |
|------|--------|
| Research — Cloudflare Email Service confirmed correct choice | ✅ |
| ADR written with correct binding + API | ✅ |

## Still to do

| Item | Blocker |
|------|---------|
| Confirm Email Routing enabled on ubuntusoftware.net | Check CF dashboard |
| Confirm private beta access on account | Check CF dashboard |
| Update wrangler.toml | After dashboard confirms access |
| Update Env type in auth.ts | After dashboard confirms access |
| Update plugins.ts | After dashboard confirms access |
| Deploy + test email delivery | After all above |
