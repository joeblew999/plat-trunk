// Test Worker — minimal health-check worker for validating cf-deploy topology.
// Uses Hono for consistency with all other workers.

import { Hono } from 'hono';

const app = new Hono();

app.get('/api/health', (c) => c.json({ status: 'ok', worker: 'test-worker' }));

app.all('*', (c) => c.text('test-worker is running'));

export default app;
