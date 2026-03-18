// keyboard.ts — Global keyboard shortcuts (ADR-0019 Phase 6).
// Extracted from ui.ts to separate concerns.

import { cadCommand } from './dispatch';
import { cadDocManager } from './history-ui';

function docMgr() { return cadDocManager?._sync?.modelId ? cadDocManager : null; }

document.addEventListener('keydown', (e) => {
    // 's' — open sketch tab (unmodified, not in input)
    if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'select' && tag !== 'textarea') {
            window.cadUI?.setTab('sketch');
            e.preventDefault();
            return;
        }
    }

    // Escape — cancel active sketch
    if (e.key === 'Escape' && window.__sketch?.isActive) {
        window.__sketch.cancel();
        e.preventDefault();
        return;
    }

    // Ctrl+Z — undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        docMgr()?.undo();
    }

    // Ctrl+Shift+Z / Ctrl+Y — redo
    if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        docMgr()?.redo();
    }

    // Ctrl+D — duplicate selected
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        const sel = window._ds?.root?.selectedId;
        if (sel) cadCommand('duplicate', { objectId: sel });
    }

    // Delete / Backspace — delete selected object
    if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'select' && tag !== 'textarea') {
            e.preventDefault();
            const sel = window._ds?.root?.selectedId;
            if (sel) cadCommand('delete', { objectId: sel });
        }
    }
});
