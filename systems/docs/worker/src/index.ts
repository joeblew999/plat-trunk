// Docs Worker — serves VitePress static site via Workers Static Assets.
// Accessed via service binding from truck-cad Worker at /docs/*.
// Handles clean URL resolution and redirect rewriting for the /docs/ mount.

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      let response = await env.ASSETS.fetch(request);

      // Clean URLs: if not found and no file extension, try .html
      if (response.status === 404 && !url.pathname.match(/\.\w+$/) && url.pathname !== '/') {
        const htmlUrl = new URL(request.url);
        htmlUrl.pathname = url.pathname.replace(/\/$/, '') + '.html';
        response = await env.ASSETS.fetch(new Request(htmlUrl.toString(), request));
      }

      // Rewrite redirect Location to include /docs/ prefix
      // (VitePress cleanUrls redirects are relative to the docs worker root,
      //  but the browser sees /docs/* via the truck worker mount)
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
      return new Response(`Docs worker error: ${err.message}`, { status: 500 });
    }
  },
};
