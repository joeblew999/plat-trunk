// WorkerSyncAdapter — Automerge NetworkAdapter that syncs via HTTP POST + SSE.
// Sends Automerge document state to the Worker's /api/docs/:docId/sync endpoint.
// Listens for changes via SSE (EventSource) on /api/docs/:docId/events.
//
// CF Workers have a 30s connection limit for SSE, so EventSource reconnects
// automatically (built-in browser behavior with ~3s retry).

const SYNC_INTERVAL_MS = 10_000; // periodic sync every 10s
const SSE_RETRY_MS = 5_000;

class WorkerSyncAdapter {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || '';
        this.docId = null;
        this.eventSource = null;
        this._syncTimer = null;
        this._onRemoteChange = null;
        this._lastVersion = '0';
    }

    /** Connect to a document — starts SSE listener + periodic sync */
    connect(docId, onRemoteChange) {
        this.docId = docId;
        this._onRemoteChange = onRemoteChange;

        // Start SSE listener
        this._startSSE();

        // Start periodic sync
        this._syncTimer = setInterval(() => {
            this._periodicSync();
        }, SYNC_INTERVAL_MS);
    }

    /** Disconnect — stop SSE and periodic sync */
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        if (this._syncTimer) {
            clearInterval(this._syncTimer);
            this._syncTimer = null;
        }
    }

    /** Save document state to the server */
    async saveDocument(docId, data) {
        try {
            const base64 = this._toBase64(data);
            const res = await fetch(`${this.baseUrl}/api/docs/${docId}/sync`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ data: base64 }),
            });
            if (!res.ok) {
                console.warn('Sync save failed:', res.status);
                return null;
            }
            const result = await res.json();
            this._lastVersion = String(result.version || '0');
            return result;
        } catch (err) {
            console.warn('Sync save error:', err);
            return null;
        }
    }

    /** Load document state from the server */
    async loadDocument(docId) {
        try {
            const res = await fetch(`${this.baseUrl}/api/docs/${docId}`);
            if (!res.ok) return null;
            const result = await res.json();
            if (result.data) {
                return this._fromBase64(result.data);
            }
            return null;
        } catch (err) {
            console.warn('Sync load error:', err);
            return null;
        }
    }

    /** Create a new document on the server */
    async createDocument(docId, name, data) {
        try {
            const body = { docId, name };
            if (data && data.length > 0) {
                body.data = this._toBase64(data);
            }
            const res = await fetch(`${this.baseUrl}/api/docs`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                console.warn('Create doc failed:', res.status);
                return null;
            }
            return await res.json();
        } catch (err) {
            console.warn('Create doc error:', err);
            return null;
        }
    }

    /** List documents on the server */
    async listDocuments() {
        try {
            const res = await fetch(`${this.baseUrl}/api/docs`);
            if (!res.ok) return [];
            const result = await res.json();
            return result.docs || [];
        } catch (err) {
            console.warn('List docs error:', err);
            return [];
        }
    }

    _startSSE() {
        if (!this.docId) return;

        try {
            this.eventSource = new EventSource(
                `${this.baseUrl}/api/docs/${this.docId}/events`
            );

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.version && data.version !== this._lastVersion) {
                        this._lastVersion = data.version;
                        if (this._onRemoteChange) {
                            this._onRemoteChange(data);
                        }
                    }
                } catch (err) {
                    // ignore parse errors
                }
            };

            this.eventSource.onerror = () => {
                // EventSource auto-reconnects; just log
                console.debug('SSE reconnecting...');
            };
        } catch (err) {
            console.warn('SSE setup failed:', err);
        }
    }

    async _periodicSync() {
        // Trigger a remote change check via onRemoteChange callback
        if (this._onRemoteChange && this.docId) {
            this._onRemoteChange({ type: 'periodic-sync' });
        }
    }

    _toBase64(uint8Array) {
        return btoa(String.fromCharCode(...uint8Array));
    }

    _fromBase64(base64) {
        return Uint8Array.from(atob(base64), ch => ch.charCodeAt(0));
    }
}

// Export for use by cad-document.js
window.WorkerSyncAdapter = WorkerSyncAdapter;
