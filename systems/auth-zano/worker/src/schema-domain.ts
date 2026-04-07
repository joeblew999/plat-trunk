/**
 * Domain schema — ReBAC entities for plat-trunk application resources.
 *
 * Actors:
 *   User:alice          — human user (from Better Auth session)
 *   Agent:claude-mcp    — MCP AI agent (ADR-0039)
 *   Service:ricos       — service account (pipeline worker)
 *
 * Resources:
 *   Project   — top-level container for CadModels and Drones
 *   CadModel  — CAD assembly/part/sketch; hierarchical under Project
 *   Drone     — robot/drone instance; operable by operator or agent
 *
 * Example tuples:
 *   User:gerard  operator Drone:123
 *   Agent:claude editor   CadModel:abc
 *   User:max     owner    Project:xyz
 */

import { ZanzoBuilder } from '@zanzojs/core';

export const domainSchema = new ZanzoBuilder()

  // ── Actors ────────────────────────────────────────────────────────────
  .entity('User',    { actions: [], relations: {} })
  .entity('Agent',   { actions: [], relations: {} })   // MCP agents (ADR-0039)
  .entity('Service', { actions: [], relations: {} })   // service accounts

  // ── Projects ──────────────────────────────────────────────────────────
  .entity('Project', {
    actions: ['read', 'edit', 'delete', 'manage'],
    relations: { owner: 'User', editor: 'User', viewer: 'User' },
    permissions: {
      read:   ['owner', 'editor', 'viewer'],
      edit:   ['owner', 'editor'],
      delete: ['owner'],
      manage: ['owner'],
    },
  })

  // ── CAD Models ────────────────────────────────────────────────────────
  .entity('CadModel', {
    actions: ['read', 'edit', 'delete', 'execute_command'],
    relations: {
      owner:   'User',
      editor:  'User',
      viewer:  'User',
      agent:   'Agent',
      project: 'Project',
    },
    permissions: {
      read:            ['owner', 'editor', 'viewer', 'agent', 'project.viewer', 'project.owner'],
      edit:            ['owner', 'editor', 'agent', 'project.editor', 'project.owner'],
      delete:          ['owner', 'project.owner'],
      execute_command: ['owner', 'editor', 'agent', 'project.owner'],
    },
  })

  // ── Drones ────────────────────────────────────────────────────────────
  .entity('Drone', {
    actions: ['read_telemetry', 'execute_command'],
    relations: {
      operator: 'User',
      viewer:   'User',
      agent:    'Agent',
      project:  'Project',
    },
    permissions: {
      read_telemetry:  ['operator', 'viewer', 'agent', 'project.viewer'],
      execute_command: ['operator', 'agent', 'project.owner'],
    },
  })

  .build();
