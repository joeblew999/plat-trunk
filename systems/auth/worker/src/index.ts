// systems/auth/worker/src/index.ts
//
// Auth worker — identity (better-auth) + ReBAC permissions + filesystem (zanzojs)
//
// Identity routes:
//   /auth/health     → GET:  health check
//   /auth/migrate    → POST: run better-auth DB migrations
//   /auth/seed       → POST: create dev accounts (admin@cad.dev, user@cad.dev)
//   /auth/api/*      → better-auth handler (sign-in, sign-up, session, OAuth…)
//   /auth/sign-in    → server-side rendered login page
//   /auth/sign-up    → server-side rendered login page (sign-up mode)
//   /auth/demo       → server-side rendered permission + filesystem tester
//   /auth/reset-password → server-side rendered reset password page
//   /auth/verify-email   → server-side rendered email verification page
//   /auth/consent        → server-side rendered OAuth consent page
//
// Permission + filesystem routes (zanzojs):
//   /zano/health     → GET:  health check
//   /zano/migrate    → POST: create zanzo_tuples table
//   /zano/check      → GET:  check if actor can perform action on resource
//   /zano/grant      → PUT:  grant a permission tuple
//   /zano/revoke     → DELETE: revoke a permission tuple
//   /zano/snapshot   → GET:  full permission snapshot for actor
//   /zano/tuples     → GET:  debug — all tuples
//   /zano/files/*    → GET/PUT/DELETE: permissioned file read/write/delete
//   /zano/ls/*       → GET:  list directory
//   (+ append, exists, stat, mkdir, rmdir, glob, cp, mv, cpdir, mvdir, fs)
//
// API docs:
//   /openapi.json    → OpenAPI 3.0 spec
//   /doc             → Swagger UI
//
// Actor resolution:
//   1. Better Auth session cookie  (production)
//   2. ?actor= query param         (dev/test)
//   3. x-actor header              (service-to-service)
//   4. 'User:anonymous' fallback

import { WorkerEntrypoint } from 'cloudflare:workers';
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { z } from 'zod';
import { createRoute } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { getMigrations } from 'better-auth/db/migration';
import { createAuth } from './auth';
import { getZanzo, getPermissionedBackend, forbid } from './zano-state';
import type { AuthZanoRPC, FileStat } from './zano-types';
import type { AppEnv, Bindings } from './types';
import { sessionMiddleware } from './middleware/session';
import loginRoutes from './routes/login';
import demoRoutes from './routes/demo';
import resetPasswordRoutes from './routes/reset-password';
import verifyEmailRoutes from './routes/verify-email';
import consentRoutes from './routes/consent';
import zanoRoutes from './routes/zano';

// ── App ───────────────────────────────────────────────────────────────────────

const app = new OpenAPIHono<AppEnv>();

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  throw err;
});

// Security schemes — appear in OpenAPI spec + Swagger UI
app.openAPIRegistry.registerComponent('securitySchemes', 'Session', {
  type: 'http',
  scheme: 'bearer',
  description: 'Better Auth session token (browser cookie)',
});
app.openAPIRegistry.registerComponent('securitySchemes', 'BearerToken', {
  type: 'http',
  scheme: 'bearer',
  description: 'Better Auth bearer token (CLI, MCP clients)',
});

// ── Session middleware ────────────────────────────────────────────────────────

app.use('*', sessionMiddleware);

// ── CORS ──────────────────────────────────────────────────────────────────────

app.use('/auth/api/*', cors({
  origin: [
    'https://cad.ubuntusoftware.net',
    'http://localhost:8788',
    'http://localhost:8790',
    'http://localhost:5174',
  ],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// ── Server-side rendered pages ────────────────────────────────────────────────

app.route('/', loginRoutes);
app.route('/', demoRoutes);
app.route('/', resetPasswordRoutes);
app.route('/', verifyEmailRoutes);
app.route('/', consentRoutes);

// ── Zano routes (OpenAPI) ─────────────────────────────────────────────────────

app.route('/', zanoRoutes);

// ── Identity — health ─────────────────────────────────────────────────────────

const HealthResult = z.object({ ok: z.boolean(), service: z.string() }).openapi('AuthHealthResult');

app.openapi(createRoute({
  method: 'get', path: '/auth/health',
  tags: ['Auth'],
  responses: {
    200: { description: 'Auth worker health', content: { 'application/json': { schema: HealthResult } } },
  },
}), (c) => c.json({ ok: true, service: 'auth-worker' }));

// ── Identity — migrate ────────────────────────────────────────────────────────

const MigrateResult = z.object({
  ok:      z.boolean(),
  message: z.string().optional(),
  created: z.array(z.unknown()).optional(),
  added:   z.array(z.unknown()).optional(),
  error:   z.string().optional(),
}).openapi('AuthMigrateResult');

app.openapi(createRoute({
  method: 'post', path: '/auth/migrate',
  tags: ['Auth'],
  responses: {
    200: { description: 'Migration result', content: { 'application/json': { schema: MigrateResult } } },
    500: { description: 'Error',            content: { 'application/json': { schema: MigrateResult } } },
  },
}), async (c) => {
  try {
    const auth = createAuth(c.env);
    const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);
    if (toBeCreated.length === 0 && toBeAdded.length === 0) {
      return c.json({ ok: true, message: 'No migrations needed' });
    }
    await runMigrations();
    return c.json({ ok: true, created: toBeCreated, added: toBeAdded });
  } catch (err) {
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

// ── Identity — better-auth handler ───────────────────────────────────────────

app.all('/auth/api/*', async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

// ── Root redirect ─────────────────────────────────────────────────────────────

app.get('/', (c) => c.redirect('/auth/sign-in', 302));

// ── OpenAPI spec + Swagger UI ─────────────────────────────────────────────────

app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: { version: '0.1.0', title: 'Auth Worker API' },
});

app.get('/doc', swaggerUI({ url: '/openapi.json' }));

// ── RPC entrypoint ────────────────────────────────────────────────────────────

export default class AuthWorker extends WorkerEntrypoint<Bindings> implements AuthZanoRPC {
  async fetch(request: Request): Promise<Response> {
    return app.fetch(request, this.env, this.ctx);
  }

  private fs(actor: string): ReturnType<typeof getPermissionedBackend> {
    return getPermissionedBackend(this.env.AUTH_DB, actor, this.env.FILES);
  }

  async grant(subject: string, relation: string, type: string, id: string): Promise<void> {
    await getZanzo(this.env.AUTH_DB).grant(subject, relation, type, id);
  }

  async revoke(subject: string, relation: string, type: string, id: string): Promise<number> {
    return getZanzo(this.env.AUTH_DB).revoke(subject, relation, type, id);
  }

  check(actor: string, action: string, type: string, id: string): Promise<boolean> {
    return getZanzo(this.env.AUTH_DB).check(actor, action, type, id);
  }

  async readFile(path: string, actor: string): Promise<string | null> {
    try { return await this.fs(actor).readFile(path); }
    catch (e: any) {
      if (e?.message?.includes('not found') || e?.message?.includes('ENOENT')) return null;
      throw e;
    }
  }

  async exists(path: string, actor: string): Promise<boolean>       { return this.fs(actor).exists(path); }
  async stat(path: string, actor: string): Promise<FileStat | null> {
    const s = await this.fs(actor).stat(path);
    return s ? { type: s.type, size: s.size, mtime: s.mtime } : null;
  }
  async listDir(path: string, actor: string): Promise<string[]>     { return this.fs(actor).readdir(path); }
  async glob(pattern: string, actor: string): Promise<string[]>     { return this.fs(actor).glob(pattern); }

  async writeFile(path: string, content: string, actor: string): Promise<void>  { await this.fs(actor).writeFile(path, content); }
  async appendFile(path: string, content: string, actor: string): Promise<void> { await this.fs(actor).appendFile(path, content); }
  async mkdir(path: string, actor: string): Promise<void>                       { await this.fs(actor).mkdir(path, { recursive: true }); }
  async moveFile(from: string, to: string, actor: string): Promise<void>        { await this.fs(actor).mv(from, to); }
  async copyFile(from: string, to: string, actor: string): Promise<void>        { await this.fs(actor).cp(from, to); }
  async moveDir(from: string, to: string, actor: string): Promise<void>         { await this.fs(actor).moveTree(from, to); }
  async copyDir(from: string, to: string, actor: string): Promise<void>         { await this.fs(actor).copyTree(from, to); }
  async deleteFile(path: string, actor: string): Promise<void>                  { await this.fs(actor).rm(path); }
  async deleteDir(path: string, actor: string): Promise<void>                   { await this.fs(actor).rm(path, { recursive: true }); }
}
