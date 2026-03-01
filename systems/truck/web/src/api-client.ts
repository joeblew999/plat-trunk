// api-client.ts — Typed Hono RPC client for the truck-cad API.
// Compiled to ../api-client.js by esbuild (bun run build:api-client).
// Browser JS files import from './api-client.js' for type-safe API calls.

import { hc } from 'hono/client';
import type { AppType } from '../../worker/src/index';

const client = hc<AppType>('/');
export const api = client.api;
export { client };
