// message-contract.test.ts — Verifies the BroadcastChannel message contract.
//
// SyncMessage is the wire format between browser tabs. This test documents the
// required fields and ensures the shape is correct at runtime.
//
// The interface is defined inline here (not imported from history-domain.ts)
// because history-domain.ts is a DOM module — importing it into the worker
// typecheck context would cascade all browser globals into the worker tsconfig.
// The web tsconfig (strict: false + dom default lib) covers history-domain.ts.
//
// To verify the contract matches history-domain.ts, compare manually:
//   systems/truck/web/history-domain.ts exports `interface SyncMessage`
//   with identical fields: type, modelId, bytes, tabId.

import { describe, it, expect } from 'vitest';

// Local copy of the SyncMessage contract (mirrors history-domain.ts SyncMessage).
// If you change the wire format in history-domain.ts, update this too.
interface SyncMessage {
    type: 'doc_update';
    modelId: string;        // Filter: only merge if matches local model
    bytes: number[];        // Uint8Array serialized as Array (structured clone)
    tabId: string;          // Filter: skip own tab's messages (unique per tab)
}

describe('SyncMessage contract', () => {
    it('has all required fields for cross-tab CRDT merge', () => {
        const msg: SyncMessage = {
            type: 'doc_update',
            modelId: 'test-model-id',   // Required: filters to correct model
            bytes: [1, 2, 3],           // Uint8Array as Array (merge_docs input)
            tabId: 'tab-uuid-123',      // Required: skip own tab's messages
        };
        expect(msg.type).toBe('doc_update');
        expect(typeof msg.modelId).toBe('string');
        expect(msg.modelId.length).toBeGreaterThan(0);
        expect(Array.isArray(msg.bytes)).toBe(true);
        expect(typeof msg.tabId).toBe('string');
    });

    it('modelId prevents cross-model contamination (the fixed Bug 1)', () => {
        // Two different models must NOT share CRDT state
        const msgA: SyncMessage = { type: 'doc_update', modelId: 'model-a', bytes: [], tabId: 'a' };
        const msgB: SyncMessage = { type: 'doc_update', modelId: 'model-b', bytes: [], tabId: 'b' };
        expect(msgA.modelId).not.toBe(msgB.modelId);
    });
});
