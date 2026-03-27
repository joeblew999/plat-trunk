/**
 * SyncDoc E2E tests.
 *
 * Tests the full stack: SyncDoc → automerge-repo → automerge-partyserver → DO.
 * Two peers add ops, undo, redo — all converge via PartyKit. No truck-cad.
 *
 * Requires: npx wrangler dev --port 1999 (running in test/partykit/)
 *
 * Run: npx vitest run
 */

import { describe, it, expect, afterEach } from 'vitest';
import { SyncDoc } from '../../ts/partykit/sync-doc.ts';
import type { Operation } from '../../ts/shared/types.ts';

// Node.js needs WebSocket global for SyncDoc
import WebSocket from 'ws';
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}

const HOST = '127.0.0.1:1999';

/** Create a test Operation. */
function makeOp(overrides: Partial<Operation> = {}): Operation {
  return {
    id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'test_op',
    params: { value: 1 },
    enabled: true,
    timestamp: Date.now(),
    actorId: 'test-actor',
    groupId: null,
    ...overrides,
  };
}

/** Wait for a condition with timeout. */
function waitFor(
  fn: () => boolean,
  timeoutMs = 5000,
  label = 'condition',
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout waiting for ${label}`)), timeoutMs);
    const check = () => {
      if (fn()) { clearTimeout(timeout); resolve(); }
      else setTimeout(check, 100);
    };
    check();
  });
}

// Track peers for cleanup
const peers: SyncDoc[] = [];
afterEach(() => {
  peers.forEach(p => p.close());
  peers.length = 0;
});

function createPeer(room: string, actorId: string): SyncDoc {
  const peer = new SyncDoc({ host: HOST, room, actorId, protocol: 'ws' });
  peers.push(peer);
  return peer;
}

describe('SyncDoc — ops over PartyKit E2E', () => {
  it('peer creates doc and adds an op', async () => {
    const room = `syncdoc-create-${Date.now()}`;
    const peer = createPeer(room, 'actor-A');
    await peer.create();

    const op = makeOp({ actorId: 'actor-A', type: 'add_cube', params: { size: 1 } });
    peer.addOp(op);

    const ops = peer.getOps();
    expect(ops.length).toBe(1);
    expect(ops[0].id).toBe(op.id);
    expect(ops[0].type).toBe('add_cube');
  });

  it('peer A adds op, peer B joins and sees it', async () => {
    const room = `syncdoc-join-${Date.now()}`;

    // A creates and adds op
    const peerA = createPeer(room, 'actor-A');
    const docId = await peerA.create();

    const op = makeOp({ actorId: 'actor-A', type: 'add_cube' });
    peerA.addOp(op);

    // Wait for sync to server
    await new Promise(r => setTimeout(r, 500));

    // B joins same doc
    const peerB = createPeer(room, 'actor-B');
    await peerB.join(docId);

    // Wait for B to receive ops
    await waitFor(() => peerB.getOpCount() >= 1, 5000, 'B to see 1 op');

    const opsB = peerB.getOps();
    expect(opsB.length).toBe(1);
    expect(opsB[0].id).toBe(op.id);
    expect(opsB[0].type).toBe('add_cube');
    expect(opsB[0].actorId).toBe('actor-A');
  });

  it('undo syncs: A disables op, B sees it disabled', async () => {
    const room = `syncdoc-undo-${Date.now()}`;

    const peerA = createPeer(room, 'actor-A');
    const docId = await peerA.create();

    const op = makeOp({ actorId: 'actor-A' });
    peerA.addOp(op);
    await new Promise(r => setTimeout(r, 500));

    const peerB = createPeer(room, 'actor-B');
    await peerB.join(docId);
    await waitFor(() => peerB.getOpCount() >= 1, 5000, 'B to see 1 op');

    // A undoes
    peerA.undo(op.id);

    // B should see it disabled
    await waitFor(() => {
      const ops = peerB.getOps();
      return ops.length > 0 && !ops[0].enabled;
    }, 5000, 'B to see op disabled');

    expect(peerB.getReplayOps().length).toBe(0);
  });

  it('redo syncs: A re-enables op, B sees it', async () => {
    const room = `syncdoc-redo-${Date.now()}`;

    const peerA = createPeer(room, 'actor-A');
    const docId = await peerA.create();

    const op = makeOp({ actorId: 'actor-A' });
    peerA.addOp(op);
    peerA.undo(op.id);
    await new Promise(r => setTimeout(r, 500));

    const peerB = createPeer(room, 'actor-B');
    await peerB.join(docId);
    await waitFor(() => peerB.getOpCount() >= 1, 5000, 'B to see 1 op');
    expect(peerB.getReplayOps().length).toBe(0); // still undone

    // A redoes
    peerA.redo(op.id);

    await waitFor(() => peerB.getReplayOps().length === 1, 5000, 'B to see op re-enabled');
    expect(peerB.getReplayOps()[0].id).toBe(op.id);
  });

  it('both peers add ops, both see all ops', async () => {
    const room = `syncdoc-multi-${Date.now()}`;

    const peerA = createPeer(room, 'actor-A');
    const docId = await peerA.create();

    const peerB = createPeer(room, 'actor-B');
    await peerB.join(docId);
    await new Promise(r => setTimeout(r, 300));

    const opA = makeOp({ actorId: 'actor-A', type: 'add_cube' });
    peerA.addOp(opA);
    await waitFor(() => peerB.getOpCount() >= 1, 5000, 'B to see A op');

    const opB = makeOp({ actorId: 'actor-B', type: 'add_sphere' });
    peerB.addOp(opB);
    await waitFor(() => peerA.getOpCount() >= 2, 5000, 'A to see 2 ops');
    await waitFor(() => peerB.getOpCount() >= 2, 5000, 'B to see 2 ops');

    const idsA = new Set(peerA.getOps().map(o => o.id));
    const idsB = new Set(peerB.getOps().map(o => o.id));
    expect(idsA.has(opA.id)).toBe(true);
    expect(idsA.has(opB.id)).toBe(true);
    expect(idsB.has(opA.id)).toBe(true);
    expect(idsB.has(opB.id)).toBe(true);
  });

  it('replay only includes enabled ops', async () => {
    const room = `syncdoc-replay-${Date.now()}`;

    const peer = createPeer(room, 'actor-A');
    await peer.create();

    const op1 = makeOp({ actorId: 'actor-A', type: 'add_cube' });
    const op2 = makeOp({ actorId: 'actor-A', type: 'add_sphere' });
    const op3 = makeOp({ actorId: 'actor-A', type: 'add_cylinder' });

    peer.addOp(op1);
    peer.addOp(op2);
    peer.addOp(op3);
    peer.undo(op2.id);

    expect(peer.getOps().length).toBe(3);
    expect(peer.getReplayOps().length).toBe(2);
    expect(peer.getReplayOps().find(o => o.id === op2.id)).toBeUndefined();
  });

  it('group undo/redo syncs', async () => {
    const room = `syncdoc-group-${Date.now()}`;

    const peerA = createPeer(room, 'actor-A');
    const docId = await peerA.create();

    const groupId = 'group-1';
    const op1 = makeOp({ actorId: 'actor-A', groupId });
    const op2 = makeOp({ actorId: 'actor-A', groupId });
    const op3 = makeOp({ actorId: 'actor-A', groupId: null }); // different group

    peerA.addOp(op1);
    peerA.addOp(op2);
    peerA.addOp(op3);
    await new Promise(r => setTimeout(r, 500));

    const peerB = createPeer(room, 'actor-B');
    await peerB.join(docId);
    await waitFor(() => peerB.getOpCount() >= 3, 5000, 'B to see 3 ops');

    // A disables the group
    peerA.setGroupEnabled(groupId, false);

    await waitFor(() => peerB.getReplayOps().length === 1, 5000, 'B to see group disabled');

    // Only op3 (no group) should be in replay
    const replay = peerB.getReplayOps();
    expect(replay.length).toBe(1);
    expect(replay[0].id).toBe(op3.id);
  });

  it('model name syncs between peers', async () => {
    const room = `syncdoc-name-${Date.now()}`;

    const peerA = createPeer(room, 'actor-A');
    const docId = await peerA.create();
    peerA.setName('My Model');
    await new Promise(r => setTimeout(r, 500));

    const peerB = createPeer(room, 'actor-B');
    await peerB.join(docId);

    await waitFor(() => peerB.getName() === 'My Model', 5000, 'B to see name');
    expect(peerB.getName()).toBe('My Model');
  });
});
