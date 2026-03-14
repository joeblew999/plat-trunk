// systems/auth/web/src/main.ts
// Shared auth logic — API calls and Datastar signal helpers.

export type AuthSignals = {
  email: string;
  password: string;
  name: string;
  loading: boolean;
  error: string;
  success: string;
};

const BASE = '/auth/api';

async function post(path: string, body: object): Promise<{ data?: unknown; error?: string }> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const json = await res.json() as { error?: { message?: string } };
    if (!res.ok) return { error: json?.error?.message ?? 'Something went wrong' };
    return { data: json };
  } catch {
    return { error: 'Network error — please try again' };
  }
}

// ── Sign In ──────────────────────────────────────────────

window.authSignIn = async function () {
  const s = window.__ds?.signals as AuthSignals;
  if (!s) return;
  s.loading = true;
  s.error = '';
  const { error } = await post('/sign-in/email', {
    email: s.email,
    password: s.password,
  });
  s.loading = false;
  if (error) { s.error = error; return; }
  window.location.href = '/';
};

// ── Sign Up ──────────────────────────────────────────────

window.authSignUp = async function () {
  const s = window.__ds?.signals as AuthSignals;
  if (!s) return;
  s.loading = true;
  s.error = '';
  const { error } = await post('/sign-up/email', {
    name: s.name,
    email: s.email,
    password: s.password,
  });
  s.loading = false;
  if (error) { s.error = error; return; }
  s.success = 'Account created! Check your email to verify.';
};

// ── Forgot Password ──────────────────────────────────────

window.authForgotPassword = async function () {
  const s = window.__ds?.signals as AuthSignals;
  if (!s) return;
  s.loading = true;
  s.error = '';
  const { error } = await post('/forget-password', {
    email: s.email,
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  s.loading = false;
  if (error) { s.error = error; return; }
  s.success = 'Reset link sent — check your email.';
};

// ── Reset Password ───────────────────────────────────────

window.authResetPassword = async function () {
  const s = window.__ds?.signals as AuthSignals;
  if (!s) return;
  const token = new URLSearchParams(location.search).get('token') ?? '';
  s.loading = true;
  s.error = '';
  const { error } = await post('/reset-password', {
    token,
    newPassword: s.password,
  });
  s.loading = false;
  if (error) { s.error = error; return; }
  s.success = 'Password updated!';
  setTimeout(() => { window.location.href = '/auth/sign-in'; }, 1500);
};

// ── Sign Out (callable from truck UI) ───────────────────

window.authSignOut = async function () {
  await post('/sign-out', {});
  window.location.href = '/auth/sign-in';
};

declare global {
  interface Window {
    authSignIn: () => Promise<void>;
    authSignUp: () => Promise<void>;
    authForgotPassword: () => Promise<void>;
    authResetPassword: () => Promise<void>;
    authSignOut: () => Promise<void>;
    __ds?: { signals: AuthSignals };
  }
}
