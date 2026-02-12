import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';

type Bindings = {
  MY_VAR: string;
  DOCS_BUCKET: R2Bucket;
  CAD_DOCS_BUCKET: R2Bucket;
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

// --- Automerge Document Sync (Phase 3) ---
// Documents are stored in R2 as binary Automerge data.
// Sync uses HTTP POST for exchanging Automerge sync messages.
// SSE (GET /events) notifies clients of changes.

// Create a new document
api.post('/docs', async (c) => {
  try {
    const body = await c.req.json();
    const docId = body.docId || crypto.randomUUID();

    // Store initial document data (base64-encoded Automerge binary)
    if (body.data) {
      const bytes = Uint8Array.from(atob(body.data), ch => ch.charCodeAt(0));
      await c.env.CAD_DOCS_BUCKET.put(`docs/${docId}`, bytes, {
        customMetadata: {
          name: body.name || 'Untitled',
          createdAt: new Date().toISOString(),
          version: '1',
        },
      });
    } else {
      // Empty document placeholder
      await c.env.CAD_DOCS_BUCKET.put(`docs/${docId}`, new Uint8Array(0), {
        customMetadata: {
          name: body.name || 'Untitled',
          createdAt: new Date().toISOString(),
          version: '1',
        },
      });
    }

    return c.json({ status: 'ok', docId });
  } catch (error) {
    return c.json({ error: 'Failed to create document' }, 500);
  }
});

// Get document data
api.get('/docs/:docId', async (c) => {
  const docId = c.req.param('docId');
  const obj = await c.env.CAD_DOCS_BUCKET.get(`docs/${docId}`);

  if (!obj) {
    return c.json({ error: 'Document not found' }, 404);
  }

  const bytes = new Uint8Array(await obj.arrayBuffer());
  // Return as base64 for JSON transport
  const base64 = btoa(String.fromCharCode(...bytes));

  return c.json({
    docId,
    data: base64,
    metadata: obj.customMetadata,
  });
});

// Sync endpoint — receive Automerge sync message, merge, return response
api.post('/docs/:docId/sync', async (c) => {
  const docId = c.req.param('docId');

  try {
    const body = await c.req.json();
    const incomingBase64 = body.data;

    if (!incomingBase64) {
      return c.json({ error: 'Missing sync data' }, 400);
    }

    // Get existing document
    const existing = await c.env.CAD_DOCS_BUCKET.get(`docs/${docId}`);
    let existingBytes = new Uint8Array(0);
    let metadata: Record<string, string> = {};

    if (existing) {
      existingBytes = new Uint8Array(await existing.arrayBuffer());
      metadata = existing.customMetadata || {};
    }

    // Decode incoming data
    const incomingBytes = Uint8Array.from(atob(incomingBase64), ch => ch.charCodeAt(0));

    // Simple strategy: store the larger/newer document
    // In production, use proper Automerge sync protocol on the server.
    // For now, the client-side Automerge handles merging — server is just R2 storage.
    const version = parseInt(metadata.version || '0') + 1;

    // If incoming is larger or existing is empty, accept it
    if (incomingBytes.length >= existingBytes.length) {
      await c.env.CAD_DOCS_BUCKET.put(`docs/${docId}`, incomingBytes, {
        customMetadata: {
          ...metadata,
          version: String(version),
          lastSync: new Date().toISOString(),
        },
      });
    }

    // Return current server state
    const currentBytes = incomingBytes.length >= existingBytes.length ? incomingBytes : existingBytes;
    const responseBase64 = btoa(String.fromCharCode(...currentBytes));

    return c.json({
      status: 'ok',
      data: responseBase64,
      version,
    });
  } catch (error) {
    return c.json({ error: 'Sync failed' }, 500);
  }
});

// SSE events endpoint — clients poll this for change notifications
// CF Workers can't hold long connections, so this returns immediately
// with any pending changes. Clients reconnect with EventSource.
api.get('/docs/:docId/events', async (c) => {
  const docId = c.req.param('docId');

  // Get current version from R2 metadata
  const obj = await c.env.CAD_DOCS_BUCKET.head(`docs/${docId}`);
  const version = obj?.customMetadata?.version || '0';
  const lastSync = obj?.customMetadata?.lastSync || '';

  // Return SSE format with current version info
  const encoder = new TextEncoder();
  const body = encoder.encode(
    `data: ${JSON.stringify({ docId, version, lastSync })}\n\n`
  );

  return new Response(body, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      'connection': 'keep-alive',
    },
  });
});

// List documents
api.get('/docs', async (c) => {
  const list = await c.env.CAD_DOCS_BUCKET.list({ prefix: 'docs/' });
  const docs = list.objects.map((obj) => ({
    docId: obj.key.replace('docs/', ''),
    size: obj.size,
    uploaded: obj.uploaded.toISOString(),
    metadata: obj.customMetadata,
  }));
  return c.json({ docs });
});

// Delete a document
api.delete('/docs/:docId', async (c) => {
  const docId = c.req.param('docId');
  await c.env.CAD_DOCS_BUCKET.delete(`docs/${docId}`);
  return c.json({ status: 'ok' });
});

// Mount API routes
app.route('/api', api);

// Serve doc media (screenshots, lesson videos) from R2
// Files are uploaded via `wrangler r2 object put` — not bundled with deploys
// HTML files (guide.html etc.) are served as static assets by Wrangler [assets]
const R2_MIME_TYPES: Record<string, string> = {
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
};

app.get('/docs/*', async (c, next) => {
  const key = c.req.path.slice(1); // strip leading /
  const ext = key.slice(key.lastIndexOf('.'));

  // Only serve media files from R2; let HTML/other fall through to static assets
  if (!R2_MIME_TYPES[ext]) {
    return next();
  }

  const obj = await c.env.DOCS_BUCKET.get(key);
  if (!obj) {
    return c.notFound();
  }
  return new Response(obj.body, {
    headers: {
      'content-type': R2_MIME_TYPES[ext],
      'cache-control': 'public, max-age=86400',
    },
  });
});

// Static assets (web/gui/) are served automatically by Wrangler [assets]
// Any request not matched above falls through to static asset serving

export default app;
