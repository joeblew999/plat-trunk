// Minimal worker stub — required by @cloudflare/vitest-pool-workers.
export default {
  fetch() {
    return new Response('sync-test-worker');
  },
};
