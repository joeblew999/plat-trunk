/**
 * e2e/fixtures.ts — canonical test fixtures for the auth system
 *
 * This is the complete expression of every user and permission in the system.
 * It drives globalSetup (which creates all state via the public API) and
 * is the contract that both e2e tests and integration tests run against.
 *
 * The permission model is Zanzibar-style ReBAC: every permission is a tuple
 *   (subject, relation, type:id)
 * where subject is any actor string, relation is any string, and type:id is
 * any resource. The system is generic — CadModel, Drone, Project are just
 * strings. Any domain maps its entities onto this same tuple store.
 *
 * ALL actors are real Better Auth accounts. After globalSetup, every actor
 * resolves to a real User:{uuid} string that can be used with any API.
 */

// ── Accounts ──────────────────────────────────────────────────────────────────

export const ACCOUNTS = {
  // Platform roles
  admin:  { email: 'admin@cad.dev',   password: 'admin1234!', name: 'Admin',  role: 'admin' as const },
  user:   { email: 'user@cad.dev',    password: 'user12345!', name: 'User',   role: 'user'  as const },
  // Test users — cover every access pattern in the permission schema
  alice:  { email: 'alice@test.dev',  password: 'Alice1234!', name: 'Alice',  role: 'user'  as const },
  bob:    { email: 'bob@test.dev',    password: 'Bob12345!',  name: 'Bob',    role: 'user'  as const },
  carol:  { email: 'carol@test.dev',  password: 'Carol123!',  name: 'Carol',  role: 'user'  as const },
  gerard: { email: 'gerard@test.dev', password: 'Gerard12!',  name: 'Gerard', role: 'user'  as const },
} as const;

export type AccountKey = keyof typeof ACCOUNTS;

// ── Non-user actors (no Better Auth account needed) ───────────────────────────

export const AGENTS = {
  claudeMcp: 'Agent:claude-mcp',
} as const;

// ── Permission tuples ─────────────────────────────────────────────────────────
//
// Each tuple is { subject, relation, type, id } — identical to the
// PUT /zano/grant body. Subject keys (e.g. 'alice') resolve to real
// User:{id} strings at seed time; literal strings are used as-is.
//
// This is the full set of permissions the system is tested against.
// Every test assertion should trace back to a tuple defined here.

export type GrantTemplate = {
  subject:  AccountKey | string;  // AccountKey resolves to User:{id}; string used as-is
  relation: string;
  type:     string;
  id:       string;
};

export const GRANTS: GrantTemplate[] = [

  // ── Filesystem ─────────────────────────────────────────────────────────────

  // Private home dirs — each user owns their own
  { subject: 'admin',  relation: 'owner',  type: 'Directory', id: '/home/admin' },
  { subject: 'user',   relation: 'owner',  type: 'Directory', id: '/home/user'  },
  { subject: 'alice',  relation: 'owner',  type: 'Directory', id: '/home/alice' },
  { subject: 'bob',    relation: 'owner',  type: 'Directory', id: '/home/bob'   },

  // Shared workspace — admin owns, others can write
  { subject: 'admin',  relation: 'owner',  type: 'Directory', id: '/shared' },
  { subject: 'user',   relation: 'editor', type: 'Directory', id: '/shared' },
  { subject: 'alice',  relation: 'editor', type: 'Directory', id: '/shared' },

  // Alice's project dir — used by filesystem integration tests
  { subject: 'alice',  relation: 'owner',  type: 'Directory', id: '/projects/demo' },

  // ── Domain: Project ────────────────────────────────────────────────────────
  // owner > editor > viewer — manage/edit/read

  { subject: 'admin', relation: 'owner',  type: 'Project', id: 'demo' },
  { subject: 'alice', relation: 'editor', type: 'Project', id: 'demo' },
  { subject: 'user',  relation: 'viewer', type: 'Project', id: 'demo' },
  // bob and carol have NO access — used to test denial

  // ── Domain: CadModel ───────────────────────────────────────────────────────
  // Linked to Project via 'project' relation — inherits project permissions.
  // Plus direct assignments for owner + agent editor.

  { subject: 'CadModel:demo',       relation: 'project', type: 'Project',  id: 'demo' },
  { subject: 'admin',               relation: 'owner',   type: 'CadModel', id: 'demo' },
  { subject: AGENTS.claudeMcp,      relation: 'editor',  type: 'CadModel', id: 'demo' },
  // bob has no CadModel permission — used to test denial

  // ── Domain: Drone ──────────────────────────────────────────────────────────
  // operator > viewer — execute_command / read_telemetry

  { subject: 'admin',  relation: 'operator', type: 'Drone', id: 'demo' },
  { subject: 'gerard', relation: 'operator', type: 'Drone', id: 'demo' },
  { subject: 'user',   relation: 'viewer',   type: 'Drone', id: 'demo' },
  { subject: 'carol',  relation: 'viewer',   type: 'Drone', id: 'demo' },
  // alice and bob have no Drone permission — used to test denial

];

// ── Resolved state ────────────────────────────────────────────────────────────

export interface SeededUser {
  id:    string;
  actor: string;
  email: string;
}

export interface SeededState {
  admin:  SeededUser;
  user:   SeededUser;
  alice:  SeededUser;
  bob:    SeededUser;
  carol:  SeededUser;
  gerard: SeededUser;
}
