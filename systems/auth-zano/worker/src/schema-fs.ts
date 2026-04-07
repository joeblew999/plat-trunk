/**
 * Filesystem schema — ReBAC entities for @cloudflare/shell file storage.
 *
 * File and Directory entities mirror the resource types that @cloudflare/shell
 * operates on. PermissionedBackend from @zanzojs/better-auth walks parent
 * directory paths so that owning /projects/demo grants access to all files
 * inside it automatically.
 *
 * Actors (User, Agent, Service) are defined in schema-domain.ts.
 * mergeSchemas() in schema.ts combines both.
 */

import { ZanzoBuilder } from '@zanzojs/core';

export const fsSchema = new ZanzoBuilder()

  .entity('Directory', {
    actions: ['read', 'write', 'delete', 'share'],
    relations: { owner: 'User', editor: 'User', viewer: 'User' },
    permissions: {
      read:   ['owner', 'editor', 'viewer'],
      write:  ['owner', 'editor'],
      delete: ['owner'],
      share:  ['owner'],
    },
  })

  .entity('File', {
    actions: ['read', 'write', 'delete', 'share'],
    relations: { owner: 'User', editor: 'User', viewer: 'User' },
    permissions: {
      read:   ['owner', 'editor', 'viewer'],
      write:  ['owner', 'editor'],
      delete: ['owner'],
      share:  ['owner'],
    },
  })

  .build();
