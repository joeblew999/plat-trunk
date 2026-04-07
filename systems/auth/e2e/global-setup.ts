/**
 * e2e/global-setup.ts — Playwright globalSetup
 *
 * Runs once before all tests. Creates all accounts and grants all permissions
 * defined in fixtures.ts using only the worker's public APIs.
 *
 * Writes resolved state to /tmp/auth-seed-state.json and a shell env file
 * alongside it so test.sh can source real actor IDs without hardcoding them.
 */
import fs from 'fs';
import { ACCOUNTS, GRANTS, type AccountKey, type SeededState, type SeededUser } from './fixtures';

const WORKER = process.env.WORKER_URL || 'http://localhost:8790';
const STATE_FILE = '/tmp/auth-seed-state.json';
const ENV_FILE   = '/tmp/auth-seed-state.env';

async function post(path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${WORKER}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json', 'Origin': WORKER } : { 'Origin': WORKER },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function put(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${WORKER}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Origin': WORKER },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status}: ${await res.text()}`);
}

async function signUpOrIn(email: string, password: string, name: string): Promise<string> {
  try {
    const res = await post('/auth/api/sign-up/email', { email, password, name });
    return res.user.id;
  } catch {
    const res = await post('/auth/api/sign-in/email', { email, password });
    return res.user.id;
  }
}

export default async function globalSetup() {
  console.log('\n[seed] running fixtures…');

  // ── Migrate (idempotent) ──────────────────────────────────────────────────
  await fetch(`${WORKER}/auth/migrate`, { method: 'POST', headers: { 'Origin': WORKER } });
  await fetch(`${WORKER}/zano/migrate`, { method: 'POST', headers: { 'Origin': WORKER } });

  // ── Create all accounts ───────────────────────────────────────────────────
  const seeded: Record<string, SeededUser> = {};
  for (const [key, acc] of Object.entries(ACCOUNTS)) {
    const id = await signUpOrIn(acc.email, acc.password, acc.name);
    seeded[key] = { id, actor: `User:${id}`, email: acc.email };
    console.log(`[seed]   ${key}: ${seeded[key].actor}`);
  }

  const state = seeded as SeededState;

  // ── Apply all permission grants ───────────────────────────────────────────
  // AccountKey subjects resolve to real actor strings; literal strings used as-is.
  const accountKeys = new Set(Object.keys(ACCOUNTS));

  for (const g of GRANTS) {
    const subject = accountKeys.has(g.subject)
      ? state[g.subject as AccountKey].actor
      : g.subject;
    await put('/zano/grant', { subject, relation: g.relation, type: g.type, id: g.id });
  }

  console.log(`[seed] ${GRANTS.length} permission tuples applied`);

  // ── Ensure every seeded user owns their /home/{userId} directory ──────────
  // databaseHooks fires only on CREATE — existing accounts won't have it.
  // This is idempotent: granting an existing tuple is a no-op.
  for (const [, user] of Object.entries(state)) {
    await put('/zano/grant', {
      subject: user.actor,
      relation: 'owner',
      type: 'Directory',
      id: `/home/${user.id}`,
    });
  }
  console.log(`[seed] home dirs granted for ${Object.keys(state).length} seeded users`);

  // ── Persist state for tests ───────────────────────────────────────────────
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  // Shell env file for test.sh — sources real actor IDs
  fs.writeFileSync(ENV_FILE, Object.entries(state)
    .map(([k, v]) => `ACTOR_${k.toUpperCase()}=${v.actor}`)
    .join('\n') + '\n',
  );

  console.log(`[seed] state written to ${STATE_FILE}`);
}

// Self-invoke when run directly via tsx (ci.sh, mise run seed)
// Playwright calls the default export itself when used as globalSetup.
const isMain = process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\/g, '/'));
if (isMain) {
  globalSetup().catch(err => { console.error('[seed] ERROR:', err); process.exit(1); });
}
