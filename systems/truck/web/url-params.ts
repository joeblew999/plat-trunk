// url-params.ts — typed contract for browser URL routing.
//
// URL patterns:
//   /model/:id      — named model
//   /model/new      — generates random ID (index.html inline script handles the redirect)
//   /?model=:id     — query param form (legacy, normalised by inline script before modules load)
//   ?example=:file  — load example scene instead of cloud
//   ?reset=1        — wipe local IDB before loading (E2E test isolation)
//
// The index.html inline script runs synchronously before modules, handles redirects,
// and normalises the URL. By the time parseUrlParams() is called, the URL is already
// resolved (e.g. /model/new → /model/<random_id>). At boot time, modelId is always
// non-null for a live session.
//
// TESTED: url-params.test.ts covers all patterns via vitest (no browser needed).

export interface BrowserUrlParams {
    modelId: string | null;   // null only if URL has no model segment (pre-redirect state)
    example: string | null;
    reset: boolean;
}

export function parseUrlParams(loc?: { pathname: string; search: string }): BrowserUrlParams {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { pathname, search } = loc ?? globalThis.location ?? { pathname: '/', search: '' };
    const params = new URLSearchParams(search);
    const pathMatch = pathname.match(/^\/model\/([^/]+)/);
    const rawId = pathMatch?.[1] ?? params.get('model');
    return {
        modelId: (rawId && rawId !== 'new') ? rawId : null,
        example: params.get('example'),
        reset: params.get('reset') === '1',
    };
}
