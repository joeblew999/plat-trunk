import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';

type Bindings = {
  MY_VAR: string;
  DOCS_BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

// API routes under /api/
const api = new Hono<{ Bindings: Bindings }>();
api.use('*', cors());

api.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'truck-cad' });
});

// CAD command endpoint — server-side modeling operations
const cadCommandSchema = z.object({
  type: z.enum(['createCube', 'createSphere', 'createCylinder', 'createTorus']),
  params: z.record(z.string(), z.number()).optional(),
});

api.post('/cad-command', async (c) => {
  try {
    const json = await c.req.json();
    const command = cadCommandSchema.parse(json);
    console.log(`CAD command: ${command.type}`, command.params);
    return c.json({ status: 'ok', command });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid command', details: error.issues }, 400);
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Mount API routes
app.route('/api', api);

// Serve doc assets (screenshots, lesson videos) from R2
// Files are uploaded via `wrangler r2 object put` — not bundled with deploys
const MIME_TYPES: Record<string, string> = {
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
};

app.get('/docs/*', async (c) => {
  const key = c.req.path.slice(1); // strip leading /
  const obj = await c.env.DOCS_BUCKET.get(key);
  if (!obj) {
    return c.notFound();
  }
  const ext = key.slice(key.lastIndexOf('.'));
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  return new Response(obj.body, {
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=86400',
    },
  });
});

// Static assets (web/gui/) are served automatically by Wrangler [assets]
// Any request not matched above falls through to static asset serving

export default app;
