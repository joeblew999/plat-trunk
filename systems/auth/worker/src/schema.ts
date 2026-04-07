/**
 * schema.ts — merges fsSchema + domainSchema into a single ZanzoEngine.
 *
 * Both schemas share the same zanzo_tuples D1 table.
 * Splitting them into separate files makes the boundary explicit:
 *
 *   schema-fs.ts     — File + Directory (driven by @cloudflare/shell)
 *   schema-domain.ts — User/Agent/Service + Project/CadModel/Drone
 *
 * The merged engine is used by zanzoPlugin() and PermissionedBackend.
 */

import { ZanzoEngine, mergeSchemas } from '@zanzojs/core';
import { fsSchema }     from './schema-fs';
import { domainSchema } from './schema-domain';

export const mergedSchema = mergeSchemas(fsSchema, domainSchema);
export const engine       = new ZanzoEngine(mergedSchema);
