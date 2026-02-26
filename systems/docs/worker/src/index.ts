// Docs Worker — minimal pass-through to Workers Static Assets.
// Static files are served automatically by the [assets] directive in wrangler.toml.
// This Worker only handles requests that DON'T match a static file.

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Fall through to static assets (returns 404.html for missing paths)
    return env.ASSETS.fetch(request);
  },
};
