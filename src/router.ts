// Root router — routes to sub-workers, serves docs assets.
// Keep this thin. No business logic here.

interface Env {
  DOCS_ASSETS: Fetcher;
  TRUCK: Fetcher;
  TEST: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // /docs → redirect to /docs/
    if (url.pathname === '/docs') {
      return Response.redirect(url.origin + '/docs/', 301);
    }

    // /docs/* → serve from DOCS_ASSETS with clean URLs
    if (url.pathname.startsWith('/docs/')) {
      return handleDocs(request, url, env);
    }

    // /test → redirect to /test/
    if (url.pathname === '/test') {
      return Response.redirect(url.origin + '/test/', 301);
    }

    // /test/* → forward to test-worker
    if (url.pathname.startsWith('/test/')) {
      const stripped = new URL(request.url);
      stripped.pathname = stripped.pathname.replace(/^\/test/, '') || '/';
      return env.TEST.fetch(new Request(stripped.toString(), request));
    }

    // Everything else → forward to truck-cad
    return env.TRUCK.fetch(request);
  },
};

async function handleDocs(request: Request, url: URL, env: Env): Promise<Response> {
  const assetPath = url.pathname.replace(/^\/docs/, '') || '/';
  const assetUrl = new URL(request.url);
  assetUrl.pathname = assetPath;

  try {
    let response = await env.DOCS_ASSETS.fetch(new Request(assetUrl.toString(), request));

    // Clean URLs: if 404 and no file extension, try .html
    if (response.status === 404 && !assetPath.match(/\.\w+$/) && assetPath !== '/') {
      const htmlUrl = new URL(request.url);
      htmlUrl.pathname = assetPath.replace(/\/$/, '') + '.html';
      response = await env.DOCS_ASSETS.fetch(new Request(htmlUrl.toString(), request));
    }

    // Rewrite redirect Location to include /docs/ prefix
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location && location.startsWith('/') && !location.startsWith('/docs/')) {
        const headers = new Headers(response.headers);
        headers.set('location', '/docs' + location);
        return new Response(response.body, { status: response.status, headers });
      }
    }

    return response;
  } catch (err: any) {
    return new Response(`Router docs error: ${err.message}`, { status: 500 });
  }
}
