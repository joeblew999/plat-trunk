// systems/auth-zano/system.mjs — TOMBSTONE
// This system has been consolidated into systems/auth.
// All zanzo routes (/zano/*) are now served by auth-worker at port 8790.
// See systems/auth-zano/README.md for the migration map.

export const workers    = [];
export const devServers = [];
export const building   = { name: 'auth-zano', order: 99, steps: [] };
export const testing    = { name: 'auth-zano' };
export const testFiles  = { vitest: [] };
