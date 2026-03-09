// Minimal worker stub — required by @cloudflare/vitest-pool-workers.
// The sync system has no deployed worker; this exists only for test execution.
export default {
  fetch() {
    return new Response('sync-test-worker');
  },
};
