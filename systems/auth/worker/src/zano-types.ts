/**
 * RPC contract for auth-zano-worker.
 *
 * Import this in any Worker that has a Service Binding to auth-zano-worker:
 *
 *   import type { AuthZanoRPC } from 'auth-zano-worker/types';
 *   interface Env { ZANO: AuthZanoRPC }
 *
 * Zero dependencies — safe to import from any Worker.
 */

/** Minimal stat info — enough for UI display and conditional logic. */
export interface FileStat {
  type: 'file' | 'directory' | 'symlink';
  size: number;
  mtime: Date;
}

export interface AuthZanoRPC {
  // ── Permissions ────────────────────────────────────────────────────────
  grant(subject: string, relation: string, type: string, id: string): Promise<void>;
  revoke(subject: string, relation: string, type: string, id: string): Promise<number>;
  check(actor: string, action: string, type: string, id: string): Promise<boolean>;

  // ── Read ───────────────────────────────────────────────────────────────
  readFile(path: string, actor: string): Promise<string | null>;
  exists(path: string, actor: string): Promise<boolean>;
  stat(path: string, actor: string): Promise<FileStat | null>;
  listDir(path: string, actor: string): Promise<string[]>;
  glob(pattern: string, actor: string): Promise<string[]>;

  // ── Write ──────────────────────────────────────────────────────────────
  writeFile(path: string, content: string, actor: string): Promise<void>;
  appendFile(path: string, content: string, actor: string): Promise<void>;
  mkdir(path: string, actor: string): Promise<void>;

  // ── Move / Copy ────────────────────────────────────────────────────────
  moveFile(from: string, to: string, actor: string): Promise<void>;
  copyFile(from: string, to: string, actor: string): Promise<void>;
  moveDir(from: string, to: string, actor: string): Promise<void>;
  copyDir(from: string, to: string, actor: string): Promise<void>;

  // ── Delete ─────────────────────────────────────────────────────────────
  deleteFile(path: string, actor: string): Promise<void>;
  deleteDir(path: string, actor: string): Promise<void>;
}
